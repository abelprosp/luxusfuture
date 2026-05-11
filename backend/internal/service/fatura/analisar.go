package fatura

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"luxusfuture/backend/internal/domain"
	"luxusfuture/backend/internal/repository"
)

type Analisador struct {
	Repo          *repository.Fatura
	PlanosRepo    *repository.Planos
	CadastrosRepo *repository.Cadastros
}

func (a *Analisador) Processar(ctx context.Context, organizacaoID, faturaID uuid.UUID) error {
	f, err := a.Repo.GetByID(ctx, organizacaoID, faturaID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	_ = a.Repo.UpdateStatus(ctx, faturaID, "processando", nil, nil, nil)

	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(f.NomeArquivo), "."))
	if ext == "" {
		ext = strings.ToLower(f.TipoArquivo)
	}

	switch ext {
	case "csv":
		return a.analisarCSV(ctx, f, now)
	case "txt":
		return a.analisarTXT(ctx, f, now)
	case "pdf":
		msg := "Integração PDF/OCR pendente para o MVP; envie CSV para análise completa."
		return a.Repo.UpdateStatus(ctx, faturaID, "erro", &msg, nil, nil)
	default:
		msg := "Extensão não suportada no MVP (" + ext + "); use CSV, TXT (Telefônica/Vivo) ou PDF apenas para arquivo."
		return a.Repo.UpdateStatus(ctx, faturaID, "erro", &msg, nil, nil)
	}
}

func (a *Analisador) analisarCSV(ctx context.Context, f *domain.Fatura, proc time.Time) error {
	raw, err := os.ReadFile(f.CaminhoArmazenamento)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	dec := detectDelimiter(raw)
	r := csv.NewReader(bytes.NewReader(normalizeEOL(raw)))
	r.Comma = dec
	r.LazyQuotes = true

	var descricoes []string
	var valores []float64

	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			msg := "CSV inválido: " + err.Error()
			return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
		}
		if len(record) < 2 {
			continue
		}
		d := strings.TrimSpace(record[0])
		vRaw := strings.TrimSpace(record[len(record)-1])
		if strings.EqualFold(d, "descrição") || strings.EqualFold(d, "descricao") ||
			strings.EqualFold(d, "description") || strings.EqualFold(d, "valor") {
			continue
		}
		if d == "" {
			continue
		}
		v, cerr := parseMoneyBR(vRaw)
		if cerr != nil {
			continue
		}
		descricoes = append(descricoes, d)
		valores = append(valores, v)
	}

	if len(descricoes) == 0 {
		msg := "Nenhuma linha válida no CSV (colunas: descrição e valor)."
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	itemIDs, err := a.Repo.InsertItens(ctx, f.ID, descricoes, valores)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	total := sumFloat(valores)

	if err := aplicarDuplicidades(ctx, a.Repo, f.ID, descricoes, valores, itemIDs); err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	if err := aplicarTarifaRefaturamento(ctx, a.Repo, a.PlanosRepo, a.CadastrosRepo, f, descricoes, valores, itemIDs); err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	return a.Repo.UpdateStatus(ctx, f.ID, "analisada", nil, &proc, &total)
}

func aplicarDuplicidades(ctx context.Context, repo *repository.Fatura, faturaID uuid.UUID, descs []string, vals []float64, itemIDs []uuid.UUID) error {
	freq := map[string][]int{}
	for i := range descs {
		fp := fingerprint(descs[i], vals[i])
		freq[fp] = append(freq[fp], i)
	}

	for _, idxs := range freq {
		if len(idxs) < 2 {
			continue
		}
		for k := 1; k < len(idxs); k++ {
			i := idxs[k]
			v := vals[i]
			refID := itemIDs[i]
			motivo := "Item repetido na fatura considerando mesma descrição e mesmo valor cobrado."
			if err := repo.InsertRefaturamentos(ctx, faturaID, "duplicidade", motivo, &refID, v, 0); err != nil {
				return err
			}
		}
	}
	return nil
}

// aplicarTarifaRefaturamento compara cada item ao valor esperado: primeiro contrato do cliente
// (linha no cadastro com mesmo número e operadora da fatura, ou cliente vinculado à fatura),
// depois tarifa principal do plano da operadora quando a descrição indicar mensalidade (ex.: CSV).
func aplicarTarifaRefaturamento(
	ctx context.Context,
	repo *repository.Fatura,
	planos *repository.Planos,
	cad *repository.Cadastros,
	f *domain.Fatura,
	descs []string,
	vals []float64,
	itemIDs []uuid.UUID,
) error {
	const tol = 0.06

	var vmPlano *float64
	if planos != nil && f.OperadoraID != nil {
		vm, err := planos.ValorMensalPrincipal(ctx, *f.OperadoraID, f.MesReferencia)
		if err != nil {
			return err
		}
		vmPlano = vm
	}

	for i := range descs {
		var esperado *float64
		var motivo string

		partes := partesTelefonicaDesc(descs[i])
		if cad != nil && f.OperadoraID != nil && partes.numero != "" {
			v, err := cad.ValorMensalAcordadoPorNumero(ctx, f.OrganizacaoID, *f.OperadoraID, partes.numero)
			if err != nil {
				return err
			}
			if v != nil {
				esperado = v
				motivo = "Valor cobrado diverge do valor mensal acordado com o cliente (cadastro da linha)."
			}
		}
		if esperado == nil && cad != nil && f.ClienteID != nil {
			v, err := cad.ValorMensalAcordadoCliente(ctx, f.OrganizacaoID, *f.ClienteID)
			if err != nil {
				return err
			}
			if v != nil {
				esperado = v
				motivo = "Valor cobrado diverge do valor mensal acordado com o cliente no cadastro."
			}
		}
		if esperado == nil && vmPlano != nil && strings.Contains(strings.ToLower(descs[i]), "mensal") {
			esperado = vmPlano
			motivo = "Valor de mensalidade divergente do plano vigente cadastrado para a operadora."
		}
		if esperado == nil {
			continue
		}
		if math.Abs(vals[i]-*esperado) <= tol {
			continue
		}
		refID := itemIDs[i]
		if err := repo.InsertRefaturamentos(ctx, f.ID, "tarifa_divergente", motivo, &refID, vals[i], *esperado); err != nil {
			return err
		}
	}
	return nil
}

func fingerprint(desc string, v float64) string {
	return strings.TrimSpace(strings.ToLower(desc)) + "|" + strconv.FormatFloat(round2(v), 'f', 2, 64)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func detectDelimiter(sample []byte) rune {
	if bytes.Count(sample, []byte(";")) >= bytes.Count(sample, []byte(",")) && bytes.Contains(sample, []byte(";")) {
		return ';'
	}
	return ','
}

func normalizeEOL(b []byte) []byte {
	return bytes.ReplaceAll(b, []byte("\r\n"), []byte("\n"))
}

func parseMoneyBR(raw string) (float64, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return 0, errors.New("vazio")
	}
	s = strings.ReplaceAll(s, "R$", "")
	s = strings.TrimSpace(s)
	lastComma := strings.LastIndex(s, ",")
	lastDot := strings.LastIndex(s, ".")
	if lastComma > lastDot {
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	} else {
		s = strings.ReplaceAll(s, ",", "")
	}

	for _, ch := range s {
		if ch != '.' && !unicode.IsDigit(ch) && ch != '-' {
			return 0, errors.New("caractere inválido")
		}
	}
	return strconv.ParseFloat(s, 64)
}

func sumFloat(xs []float64) float64 {
	var t float64
	for _, x := range xs {
		t += x
	}
	return t
}
