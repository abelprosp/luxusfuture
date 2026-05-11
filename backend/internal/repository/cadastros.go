package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Cadastros struct {
	DB *sql.DB
}

type OperadoraRow struct {
	ID     uuid.UUID `json:"id"`
	Nome   string    `json:"nome"`
	Codigo *string   `json:"codigo,omitempty"`
}

type ClienteRow struct {
	ID                   uuid.UUID `json:"id"`
	Nome                 string    `json:"nome"`
	Documento            string    `json:"documento"`
	Email                *string   `json:"email,omitempty"`
	ValorMensalAcordado  *float64  `json:"valor_mensal_acordado,omitempty"`
	FaturasTotal         int64     `json:"faturas_total"`
	CriadoEm             time.Time `json:"criado_em"`
}

func (c *Cadastros) ListOperadoras(ctx context.Context, orgID uuid.UUID) ([]OperadoraRow, error) {
	rows, err := c.DB.QueryContext(ctx,
		`SELECT id, nome, codigo FROM operadoras WHERE organizacao_id = $1 ORDER BY nome`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OperadoraRow
	for rows.Next() {
		var r OperadoraRow
		var cod sql.NullString
		if err := rows.Scan(&r.ID, &r.Nome, &cod); err != nil {
			return nil, err
		}
		if cod.Valid {
			s := cod.String
			r.Codigo = &s
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// CreateOperadora insere uma operadora na organização (nome obrigatório; código opcional).
func (c *Cadastros) CreateOperadora(ctx context.Context, orgID uuid.UUID, nome string, codigo *string) (uuid.UUID, error) {
	id := uuid.New()
	var cod interface{}
	if codigo != nil && strings.TrimSpace(*codigo) != "" {
		s := strings.TrimSpace(*codigo)
		cod = s
	}
	_, err := c.DB.ExecContext(ctx,
		`INSERT INTO operadoras (id, organizacao_id, nome, codigo) VALUES ($1, $2, $3, $4)`,
		id, orgID, nome, cod,
	)
	return id, err
}

func (c *Cadastros) ListClientes(ctx context.Context, orgID uuid.UUID, limit int) ([]ClienteRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	query := `
		SELECT c.id, c.nome, c.documento, c.email, c.valor_mensal_acordado, c.criado_em,
			COALESCE((
				SELECT COUNT(*)::bigint FROM faturas f
				WHERE f.organizacao_id = c.organizacao_id AND f.cliente_id = c.id
			), 0)::bigint AS faturas_total
		FROM clientes c
		WHERE c.organizacao_id = $1 ORDER BY c.criado_em DESC LIMIT $2`
	rows, err := c.DB.QueryContext(ctx, query, orgID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []ClienteRow
	for rows.Next() {
		var r ClienteRow
		var em sql.NullString
		var vma sql.NullFloat64
		if err := rows.Scan(&r.ID, &r.Nome, &r.Documento, &em, &vma, &r.CriadoEm, &r.FaturasTotal); err != nil {
			return nil, err
		}
		if em.Valid {
			s := em.String
			r.Email = &s
		}
		if vma.Valid {
			v := vma.Float64
			r.ValorMensalAcordado = &v
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

// ClientePertenceOrganizacao confirma que o cliente existe na organização.
func (c *Cadastros) ClientePertenceOrganizacao(ctx context.Context, orgID, clienteID uuid.UUID) (bool, error) {
	var n int
	err := c.DB.QueryRowContext(ctx,
		`SELECT 1 FROM clientes WHERE id = $1 AND organizacao_id = $2 LIMIT 1`,
		clienteID, orgID,
	).Scan(&n)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (c *Cadastros) CountClientes(ctx context.Context, orgID uuid.UUID) (int64, error) {
	var n int64
	err := c.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clientes WHERE organizacao_id = $1`, orgID).Scan(&n)
	return n, err
}

func (c *Cadastros) CountClientesNovosMes(ctx context.Context, orgID uuid.UUID) (int64, error) {
	var n int64
	err := c.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clientes WHERE organizacao_id = $1 
		 AND criado_em >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`, orgID).Scan(&n)
	return n, err
}

func (c *Cadastros) CreateCliente(ctx context.Context, orgID uuid.UUID, nome, documento string, email *string, valorMensalAcordado *float64) (uuid.UUID, error) {
	id := uuid.New()
	var em interface{}
	if email != nil && *email != "" {
		em = *email
	}
	var vma interface{}
	if valorMensalAcordado != nil {
		vma = *valorMensalAcordado
	}
	_, err := c.DB.ExecContext(ctx,
		`INSERT INTO clientes (id, organizacao_id, nome, documento, email, valor_mensal_acordado) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, orgID, nome, documento, em, vma,
	)
	return id, err
}

// CreateClienteComLinha cadastra o cliente com valor mensal acordado e uma linha (operadora + número) para cruzamento com faturas TXT.
func (c *Cadastros) CreateClienteComLinha(
	ctx context.Context,
	orgID uuid.UUID,
	nome, documento string,
	email *string,
	valorMensalAcordado float64,
	operadoraID uuid.UUID,
	numeroLinha string,
) (clienteID, linhaID uuid.UUID, err error) {
	numeroLinha = strings.TrimSpace(numeroLinha)
	if operadoraID == uuid.Nil {
		return uuid.Nil, uuid.Nil, errors.New("operadora é obrigatória")
	}
	if numeroLinha == "" {
		return uuid.Nil, uuid.Nil, errors.New("número da linha é obrigatório")
	}

	var ok bool
	err = c.DB.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM operadoras WHERE id = $1 AND organizacao_id = $2)`,
		operadoraID, orgID,
	).Scan(&ok)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	if !ok {
		return uuid.Nil, uuid.Nil, errors.New("operadora inválida para esta organização")
	}

	tx, err := c.DB.BeginTx(ctx, nil)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	defer func() { _ = tx.Rollback() }()

	clienteID = uuid.New()
	linhaID = uuid.New()
	var em interface{}
	if email != nil && *email != "" {
		em = *email
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO clientes (id, organizacao_id, nome, documento, email, valor_mensal_acordado) VALUES ($1,$2,$3,$4,$5,$6)`,
		clienteID, orgID, nome, documento, em, valorMensalAcordado,
	)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	_, err = tx.ExecContext(ctx,
		`INSERT INTO linhas (id, organizacao_id, cliente_id, operadora_id, numero, status) VALUES ($1,$2,$3,$4,$5,'ativo')`,
		linhaID, orgID, clienteID, operadoraID, numeroLinha,
	)
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	if err = tx.Commit(); err != nil {
		return uuid.Nil, uuid.Nil, err
	}
	return clienteID, linhaID, nil
}

// ValorMensalAcordadoPorNumero retorna o valor mensal acordado no cadastro do cliente vinculado à linha (mesmo número, mesma operadora).
func (c *Cadastros) ValorMensalAcordadoPorNumero(ctx context.Context, orgID, operadoraID uuid.UUID, numero string) (*float64, error) {
	if operadoraID == uuid.Nil || strings.TrimSpace(numero) == "" {
		return nil, nil
	}
	row := c.DB.QueryRowContext(ctx, `
		SELECT c.valor_mensal_acordado
		FROM linhas l
		INNER JOIN clientes c ON c.id = l.cliente_id AND c.organizacao_id = l.organizacao_id
		WHERE l.organizacao_id = $1
		  AND l.operadora_id = $2
		  AND regexp_replace(l.numero, '[^0-9]', '', 'g') = regexp_replace($3::text, '[^0-9]', '', 'g')
		  AND c.valor_mensal_acordado IS NOT NULL
		LIMIT 1`,
		orgID, operadoraID, numero,
	)
	var v sql.NullFloat64
	if err := row.Scan(&v); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if !v.Valid {
		return nil, nil
	}
	x := v.Float64
	return &x, nil
}

// ValorMensalAcordadoCliente retorna valor_mensal_acordado do cliente quando preenchido.
func (c *Cadastros) ValorMensalAcordadoCliente(ctx context.Context, orgID, clienteID uuid.UUID) (*float64, error) {
	if clienteID == uuid.Nil {
		return nil, nil
	}
	row := c.DB.QueryRowContext(ctx,
		`SELECT valor_mensal_acordado FROM clientes WHERE id = $1 AND organizacao_id = $2`,
		clienteID, orgID,
	)
	var v sql.NullFloat64
	if err := row.Scan(&v); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if !v.Valid {
		return nil, nil
	}
	x := v.Float64
	return &x, nil
}

type LinhasStatusAgg struct {
	Status string `json:"status"`
	Total  int64  `json:"total"`
}

func (c *Cadastros) LinhasPorStatus(ctx context.Context, orgID uuid.UUID) ([]LinhasStatusAgg, error) {
	rows, err := c.DB.QueryContext(ctx,
		`SELECT status, COUNT(*)::bigint FROM linhas WHERE organizacao_id = $1 GROUP BY status ORDER BY status`,
		orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []LinhasStatusAgg
	for rows.Next() {
		var x LinhasStatusAgg
		if err := rows.Scan(&x.Status, &x.Total); err != nil {
			return nil, err
		}
		list = append(list, x)
	}
	return list, rows.Err()
}

func (c *Cadastros) LinhasTotal(ctx context.Context, orgID uuid.UUID) (int64, error) {
	var n int64
	err := c.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM linhas WHERE organizacao_id = $1`, orgID).Scan(&n)
	return n, err
}

type FatStatusAgg struct {
	Status    string  `json:"status"`
	Quantidade int64  `json:"quantidade"`
	ValorTotal float64 `json:"valor_total"`
}

func (c *Cadastros) FaturasAggPorStatus(ctx context.Context, orgID uuid.UUID) ([]FatStatusAgg, error) {
	rows, err := c.DB.QueryContext(ctx,
		`SELECT status, COUNT(*)::bigint, COALESCE(SUM(total_declarado),0)::float 
		 FROM faturas WHERE organizacao_id = $1 GROUP BY status ORDER BY status`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []FatStatusAgg
	for rows.Next() {
		var x FatStatusAgg
		if err := rows.Scan(&x.Status, &x.Quantidade, &x.ValorTotal); err != nil {
			return nil, err
		}
		list = append(list, x)
	}
	return list, rows.Err()
}

func (c *Cadastros) FaturasEmAberto(ctx context.Context, orgID uuid.UUID) (qtd int64, valorTotal float64, err error) {
	err = c.DB.QueryRowContext(ctx,
		`SELECT COUNT(*)::bigint, COALESCE(SUM(total_declarado),0)::float FROM faturas 
		 WHERE organizacao_id = $1 AND status IN ('recebida','processando','erro')`, orgID,
	).Scan(&qtd, &valorTotal)
	return
}

func (c *Cadastros) RecebimentosMesFaturasAnalisadas(ctx context.Context, orgID uuid.UUID) (float64, error) {
	var v float64
	err := c.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(total_declarado),0)::float FROM faturas 
		 WHERE organizacao_id = $1 AND status = 'analisada' 
		 AND criado_em >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`, orgID).Scan(&v)
	return v, err
}

// RecebimentosMesAnteriorFaturasAnalisadas: soma igual a RecebimentosMes*, mas apenas no mês civil anterior ao atual.
func (c *Cadastros) RecebimentosMesAnteriorFaturasAnalisadas(ctx context.Context, orgID uuid.UUID) (float64, error) {
	var v float64
	err := c.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(total_declarado),0)::float FROM faturas 
		 WHERE organizacao_id = $1 AND status = 'analisada' 
		 AND criado_em >= date_trunc('month', NOW() AT TIME ZONE 'UTC') - interval '1 month'
		 AND criado_em < date_trunc('month', NOW() AT TIME ZONE 'UTC')`, orgID).Scan(&v)
	return v, err
}

// FaturaMesValor: série dos últimos N meses (calendário UTC), apenas faturas analisadas, somando total_declarado por mês de referência da fatura.
type FaturaMesValor struct {
	Mes        string  `json:"mes"` // YYYY-MM
	ValorTotal float64 `json:"valor_total"`
}

func (c *Cadastros) FaturamentoMensalPorReferenciaAnalisadas(
	ctx context.Context, orgID uuid.UUID, meses uint,
) ([]FaturaMesValor, error) {
	if meses == 0 || meses > 24 {
		meses = 6
	}
	q := `
WITH bounds AS (
  SELECT date_trunc('month', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::date AS cur
),
months AS (
  SELECT (generate_series(
    (SELECT cur FROM bounds) - ($2::int - 1) * interval '1 month',
    (SELECT cur FROM bounds),
    interval '1 month'
  ))::date AS mes_inicio
)
SELECT TO_CHAR(m.mes_inicio, 'YYYY-MM') AS mes,
       COALESCE(SUM(f.total_declarado), 0)::float AS valor_total
FROM months m
LEFT JOIN faturas f ON f.organizacao_id = $1
  AND f.status = 'analisada'
  AND date_trunc('month', f.mes_referencia)::date = m.mes_inicio
GROUP BY m.mes_inicio
ORDER BY m.mes_inicio`
	rows, err := c.DB.QueryContext(ctx, q, orgID, int(meses))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FaturaMesValor
	for rows.Next() {
		var r FaturaMesValor
		if err := rows.Scan(&r.Mes, &r.ValorTotal); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ValorFaturamentoPorOperadoraAnalisadas: total declarado (analisadas) por operadora; inclui entrada agregando faturas sem operadora quando houver valor.
type OperadoraValor struct {
	ID         *uuid.UUID `json:"operadora_id,omitempty"`
	Nome       string     `json:"nome"`
	ValorTotal float64    `json:"valor_total"`
}

func (c *Cadastros) ValorFaturamentoPorOperadoraAnalisadas(ctx context.Context, orgID uuid.UUID) ([]OperadoraValor, error) {
	sqlSums := `
WITH sums AS (
  SELECT operadora_id, COALESCE(SUM(total_declarado), 0)::float AS vt
  FROM faturas
  WHERE organizacao_id = $1 AND status = 'analisada'
  GROUP BY operadora_id
)
SELECT o.id, o.nome, COALESCE(s.vt, 0)::float
FROM operadoras o
LEFT JOIN sums s ON s.operadora_id = o.id
WHERE o.organizacao_id = $1
ORDER BY COALESCE(s.vt, 0) DESC`
	rows, err := c.DB.QueryContext(ctx, sqlSums, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OperadoraValor
	for rows.Next() {
		var id uuid.UUID
		var nome string
		var vt float64
		if scanErr := rows.Scan(&id, &nome, &vt); scanErr != nil {
			return nil, scanErr
		}
		uid := id
		out = append(out, OperadoraValor{ID: &uid, Nome: nome, ValorTotal: vt})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	var orphans float64
	if err := c.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(total_declarado), 0)::float FROM faturas 
		 WHERE organizacao_id = $1 AND status = 'analisada' AND operadora_id IS NULL`,
		orgID).Scan(&orphans); err != nil {
		return nil, err
	}
	if orphans > 0 {
		out = append(out, OperadoraValor{
			ID:         nil,
			Nome:       "Faturas sem operadora definida",
			ValorTotal: orphans,
		})
	}
	return out, nil
}
