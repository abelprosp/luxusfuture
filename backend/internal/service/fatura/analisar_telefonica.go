package fatura

import (
	"context"
	"os"
	"strings"
	"time"

	"luxusfuture/backend/internal/domain"
	"luxusfuture/backend/internal/parser/telefonica"
)

func (a *Analisador) analisarTXT(ctx context.Context, f *domain.Fatura, proc time.Time) error {
	rawPeek, err := os.ReadFile(f.CaminhoArmazenamento)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	if telefonica.Sniff(rawPeek) {
		return a.analisarTelefonica(ctx, f, proc)
	}

	msg := strings.TrimSpace(
		"Arquivo texto sem o leiaute Telefônica/Vivo (registros 060B + 110D). " +
			"Este MVP reconhece o export posicional igual ao arquivo de exemplo corporativo.")
	return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
}

func (a *Analisador) analisarTelefonica(ctx context.Context, f *domain.Fatura, proc time.Time) error {
	fl, err := os.Open(f.CaminhoArmazenamento)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}
	defer fl.Close()

	parsed, err := telefonica.Parse(fl)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	if len(parsed.Itens) == 0 {
		msg := "Nenhuma linha 060B/110D com número e valor encontrada neste arquivo."
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	descricoes := make([]string, 0, len(parsed.Itens))
	valores := make([]float64, 0, len(parsed.Itens))
	metas := make([][]byte, 0, len(parsed.Itens))

	for _, it := range parsed.Itens {
		meta, metaErr := it.MetadataJSON()
		if metaErr != nil {
			msg := metaErr.Error()
			return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
		}
		descricoes = append(descricoes, it.DescricaoItem())
		valores = append(valores, it.Valor)
		metas = append(metas, []byte(meta))
	}

	itemIDs, err := a.Repo.InsertItensMeta(ctx, f.ID, descricoes, valores, metas)
	if err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	var total float64
	if parsed.TotalFatura != nil && *parsed.TotalFatura > 0 {
		total = *parsed.TotalFatura
	} else {
		total = sumFloat(valores)
	}

	if err := aplicarDuplicidades(ctx, a.Repo, f.ID, descricoes, valores, itemIDs); err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	if err := aplicarRegrasTelefonica(ctx, a.Repo, f.ID, descricoes, valores, itemIDs); err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	if err := aplicarTarifaRefaturamento(ctx, a.Repo, a.PlanosRepo, a.CadastrosRepo, f, descricoes, valores, itemIDs); err != nil {
		msg := err.Error()
		return a.Repo.UpdateStatus(ctx, f.ID, "erro", &msg, nil, nil)
	}

	return a.Repo.UpdateStatus(ctx, f.ID, "analisada", nil, &proc, &total)
}
