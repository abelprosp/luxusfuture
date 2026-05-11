package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Organizacoes struct {
	DB *sql.DB
}

type OrganizacaoRow struct {
	ID         uuid.UUID `json:"id"`
	Nome       string    `json:"nome"`
	Documento  *string   `json:"documento,omitempty"`
	CriadoEm   time.Time `json:"criado_em"`
}

func (o *Organizacoes) GetByID(ctx context.Context, id uuid.UUID) (*OrganizacaoRow, error) {
	row := o.DB.QueryRowContext(ctx,
		`SELECT id, nome, documento, criado_em FROM organizacoes WHERE id = $1`, id,
	)
	var r OrganizacaoRow
	var doc sql.NullString
	err := row.Scan(&r.ID, &r.Nome, &doc, &r.CriadoEm)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	if doc.Valid {
		s := doc.String
		r.Documento = &s
	}
	return &r, nil
}

func (o *Organizacoes) Create(ctx context.Context, nome string, documento *string) (uuid.UUID, error) {
	id := uuid.New()
	var doc interface{}
	if documento != nil && strings.TrimSpace(*documento) != "" {
		s := strings.TrimSpace(*documento)
		doc = s
	}
	_, err := o.DB.ExecContext(ctx,
		`INSERT INTO organizacoes (id, nome, documento) VALUES ($1,$2,$3)`,
		id, strings.TrimSpace(nome), doc,
	)
	return id, err
}

func (o *Organizacoes) UpdatePerfil(ctx context.Context, id uuid.UUID, nome string, documento *string) error {
	var doc interface{}
	if documento != nil && strings.TrimSpace(*documento) != "" {
		doc = strings.TrimSpace(*documento)
	}
	res, err := o.DB.ExecContext(ctx,
		`UPDATE organizacoes SET nome = $2, documento = $3 WHERE id = $1`,
		id, strings.TrimSpace(nome), doc,
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
