package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
)

type Usuario struct {
	DB *sql.DB
}

type UsuarioAuthRow struct {
	ID             uuid.UUID
	OrganizacaoID  uuid.UUID
	Email          string
	Nome           string
	SenhaHash      string
}

func normEmail(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func (u *Usuario) GetByEmail(ctx context.Context, email string) (*UsuarioAuthRow, error) {
	row := u.DB.QueryRowContext(ctx,
		`SELECT id, organizacao_id, email, nome, senha_hash FROM usuarios WHERE email = $1 AND ativo = TRUE`,
		normEmail(email),
	)
	var r UsuarioAuthRow
	err := row.Scan(&r.ID, &r.OrganizacaoID, &r.Email, &r.Nome, &r.SenhaHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (u *Usuario) Create(ctx context.Context, orgID uuid.UUID, email, nome, senhaHash string) (uuid.UUID, error) {
	id := uuid.New()
	_, err := u.DB.ExecContext(ctx,
		`INSERT INTO usuarios (id, organizacao_id, email, nome, senha_hash) VALUES ($1,$2,$3,$4,$5)`,
		id, orgID, normEmail(email), strings.TrimSpace(nome), senhaHash,
	)
	return id, err
}

func (u *Usuario) GetByID(ctx context.Context, id uuid.UUID) (*UsuarioAuthRow, error) {
	row := u.DB.QueryRowContext(ctx,
		`SELECT id, organizacao_id, email, nome, senha_hash FROM usuarios WHERE id = $1 AND ativo = TRUE`,
		id,
	)
	var r UsuarioAuthRow
	err := row.Scan(&r.ID, &r.OrganizacaoID, &r.Email, &r.Nome, &r.SenhaHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}
