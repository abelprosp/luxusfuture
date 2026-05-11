package fatura

import (
	"context"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"luxusfuture/backend/internal/config"
	"luxusfuture/backend/internal/domain"
	"luxusfuture/backend/internal/repository"
	"luxusfuture/backend/internal/workqueue"
)

// ErrFaturaForaDaOrganizacao indica que o id existe mas o cabeçalho/query de organização não bate com o registro.
var ErrFaturaForaDaOrganizacao = errors.New("fatura não pertence a esta organização")

type Servico struct {
	Config     *config.Config
	Repo       *repository.Fatura
	Planos     *repository.Planos
	Analisador *Analisador
	Queue      *workqueue.Queue
}

func NewServico(cfg *config.Config, db *repository.Fatura, pl *repository.Planos, a *Analisador, q *workqueue.Queue) *Servico {
	return &Servico{
		Config:     cfg,
		Repo:       db,
		Planos:     pl,
		Analisador: a,
		Queue:      q,
	}
}

func inferTipoArquivo(header *multipart.FileHeader) string {
	name := strings.ToLower(header.Filename)
	switch {
	case strings.HasSuffix(name, ".csv"):
		return "csv"
	case strings.HasSuffix(name, ".txt"):
		return "txt"
	case strings.HasSuffix(name, ".pdf"):
		return "pdf"
	default:
		return "outro"
	}
}

func parseMesReferencia(layout string, ref time.Time) (time.Time, error) {
	switch layout {
	case "":
		return time.Date(ref.Year(), ref.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	default:
		return time.Parse("2006-01", layout)
	}
}

func parseOperadora(raw string) (*uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	u, err := uuid.Parse(raw)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Servico) RegistrarUpload(ctx context.Context, organizacao uuid.UUID, file *multipart.FileHeader, mesReferenciaRaw string, operadoraRaw string, clienteID *uuid.UUID) (*domain.Fatura, error) {
	tp := inferTipoArquivo(file)

	mesRef, err := parseMesReferencia(strings.TrimSpace(mesReferenciaRaw), time.Now().UTC())
	if err != nil {
		return nil, err
	}
	opID, err := parseOperadora(operadoraRaw)
	if err != nil {
		return nil, err
	}

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	if err := os.MkdirAll(s.Config.UploadDir, 0750); err != nil {
		return nil, err
	}

	id := uuid.New()
	safeName := sanitizeFilename(filepath.Base(file.Filename))
	destPath := filepath.Join(s.Config.UploadDir, id.String()+"_"+safeName)

	dst, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0640)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return nil, err
	}

	f := &domain.Fatura{
		ID:                    id,
		OrganizacaoID:         organizacao,
		OperadoraID:           opID,
		ClienteID:             clienteID,
		MesReferencia:         mesRef,
		TipoArquivo:           tp,
		NomeArquivo:           file.Filename,
		CaminhoArmazenamento: destPath,
		Status:                "recebida",
	}

	if err := s.Repo.Create(ctx, f); err != nil {
		return nil, err
	}

	orgStr := organizacao.String()
	s.Queue.Enqueue(orgStr + ":" + id.String())

	return f, nil
}

// ExcluirFatura remove o registro e o arquivo enviado em disco.
// Busca primeiro por id para devolver 403 se a organização da requisição não for a da fatura (em vez de 404 genérico).
func (s *Servico) ExcluirFatura(ctx context.Context, orgID, faturaID uuid.UUID) error {
	f, err := s.Repo.GetByFaturaID(ctx, faturaID)
	if err != nil {
		return err
	}
	if f.OrganizacaoID != orgID {
		return ErrFaturaForaDaOrganizacao
	}
	if err := s.Repo.DeleteByID(ctx, orgID, faturaID); err != nil {
		return err
	}
	path := strings.TrimSpace(f.CaminhoArmazenamento)
	if path != "" {
		_ = os.Remove(path)
	}
	return nil
}

func sanitizeFilename(s string) string {
	const max = 200
	s = strings.ReplaceAll(s, "..", "-")
	res := strings.Map(func(r rune) rune {
		switch r {
		case '/', '\\', ':':
			return '-'
		default:
			return r
		}
	}, s)
	if len(res) > max {
		return res[len(res)-max:]
	}
	return res
}
