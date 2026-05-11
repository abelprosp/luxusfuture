package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"luxusfuture/backend/internal/domain"
)

type Fatura struct {
	DB *sql.DB
}

func (r *Fatura) Create(ctx context.Context, f *domain.Fatura) error {
	query := `
	INSERT INTO faturas (id, organizacao_id, operadora_id, cliente_id, linha_id, mes_referencia, tipo_arquivo, nome_arquivo, caminho_armazenamento, status, total_declarado)
	VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`
	var op, cl, ln interface{}
	if f.OperadoraID != nil {
		op = *f.OperadoraID
	}
	if f.ClienteID != nil {
		cl = *f.ClienteID
	}
	if f.LinhaID != nil {
		ln = *f.LinhaID
	}
	var total interface{}
	if f.TotalDeclarado != nil {
		total = *f.TotalDeclarado
	}
	_, err := r.DB.ExecContext(ctx, query,
		f.ID, f.OrganizacaoID, op, cl, ln, f.MesReferencia, f.TipoArquivo, f.NomeArquivo,
		f.CaminhoArmazenamento, f.Status, total,
	)
	return err
}

func (r *Fatura) UpdateStatus(ctx context.Context, id uuid.UUID, status string, errMsg *string, processado *time.Time, total *float64) error {
	query := `
	UPDATE faturas SET status=$2, mensagem_erro=$3, processado_em=$4, total_declarado=COALESCE($5, total_declarado)
	WHERE id=$1`
	_, e := r.DB.ExecContext(ctx, query, id, status, errMsg, processado, total)
	return e
}

func (r *Fatura) GetByID(ctx context.Context, orgID, id uuid.UUID) (*domain.Fatura, error) {
	query := `
	SELECT id, organizacao_id, operadora_id, cliente_id, linha_id, mes_referencia, tipo_arquivo, nome_arquivo, caminho_armazenamento,
	       status, total_declarado, mensagem_erro, criado_em, processado_em
	FROM faturas WHERE id=$1 AND organizacao_id=$2`
	row := r.DB.QueryRowContext(ctx, query, id, orgID)
	return scanFatura(row)
}

// GetByFaturaID carrega a fatura só pelo id (usado para validar organização na exclusão).
func (r *Fatura) GetByFaturaID(ctx context.Context, id uuid.UUID) (*domain.Fatura, error) {
	query := `
	SELECT id, organizacao_id, operadora_id, cliente_id, linha_id, mes_referencia, tipo_arquivo, nome_arquivo, caminho_armazenamento,
	       status, total_declarado, mensagem_erro, criado_em, processado_em
	FROM faturas WHERE id=$1`
	row := r.DB.QueryRowContext(ctx, query, id)
	return scanFatura(row)
}

// DeleteByID remove a fatura da organização (itens e refaturamentos em cascata no banco).
func (r *Fatura) DeleteByID(ctx context.Context, orgID, id uuid.UUID) error {
	res, err := r.DB.ExecContext(ctx,
		`DELETE FROM faturas WHERE id = $1 AND organizacao_id = $2`, id, orgID)
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

func (r *Fatura) ListByOrganizacao(ctx context.Context, orgID uuid.UUID, limit int, clienteID *uuid.UUID) ([]domain.Fatura, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var query string
	var args []interface{}
	if clienteID != nil {
		query = `
	SELECT id, organizacao_id, operadora_id, cliente_id, linha_id, mes_referencia, tipo_arquivo, nome_arquivo, caminho_armazenamento,
	       status, total_declarado, mensagem_erro, criado_em, processado_em
	FROM faturas WHERE organizacao_id=$1 AND cliente_id=$2 ORDER BY criado_em DESC LIMIT $3`
		args = []interface{}{orgID, *clienteID, limit}
	} else {
		query = `
	SELECT id, organizacao_id, operadora_id, cliente_id, linha_id, mes_referencia, tipo_arquivo, nome_arquivo, caminho_armazenamento,
	       status, total_declarado, mensagem_erro, criado_em, processado_em
	FROM faturas WHERE organizacao_id=$1 ORDER BY criado_em DESC LIMIT $2`
		args = []interface{}{orgID, limit}
	}
	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Fatura
	for rows.Next() {
		f, err := scanFaturaRows(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *f)
	}
	return out, rows.Err()
}

func scanFatura(row *sql.Row) (*domain.Fatura, error) {
	var f domain.Fatura
	var opID, clID, lnID sql.NullString
	var total sql.NullFloat64
	var msg sql.NullString
	var proc sql.NullTime

	err := row.Scan(
		&f.ID, &f.OrganizacaoID, &opID, &clID, &lnID, &f.MesReferencia, &f.TipoArquivo, &f.NomeArquivo,
		&f.CaminhoArmazenamento, &f.Status, &total, &msg, &f.CriadoEm, &proc,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	if opID.Valid {
		u := uuid.MustParse(opID.String)
		f.OperadoraID = &u
	}
	if clID.Valid {
		u := uuid.MustParse(clID.String)
		f.ClienteID = &u
	}
	if lnID.Valid {
		u := uuid.MustParse(lnID.String)
		f.LinhaID = &u
	}
	if total.Valid {
		v := total.Float64
		f.TotalDeclarado = &v
	}
	if msg.Valid {
		s := msg.String
		f.MensagemErro = &s
	}
	if proc.Valid {
		t := proc.Time
		f.ProcessadoEm = &t
	}
	return &f, nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanFaturaRows(rows rowScanner) (*domain.Fatura, error) {
	var f domain.Fatura
	var opID, clID, lnID sql.NullString
	var total sql.NullFloat64
	var msg sql.NullString
	var proc sql.NullTime

	err := rows.Scan(
		&f.ID, &f.OrganizacaoID, &opID, &clID, &lnID, &f.MesReferencia, &f.TipoArquivo, &f.NomeArquivo,
		&f.CaminhoArmazenamento, &f.Status, &total, &msg, &f.CriadoEm, &proc,
	)
	if err != nil {
		return nil, err
	}
	if opID.Valid {
		u := uuid.MustParse(opID.String)
		f.OperadoraID = &u
	}
	if clID.Valid {
		u := uuid.MustParse(clID.String)
		f.ClienteID = &u
	}
	if lnID.Valid {
		u := uuid.MustParse(lnID.String)
		f.LinhaID = &u
	}
	if total.Valid {
		v := total.Float64
		f.TotalDeclarado = &v
	}
	if msg.Valid {
		s := msg.String
		f.MensagemErro = &s
	}
	if proc.Valid {
		t := proc.Time
		f.ProcessadoEm = &t
	}
	return &f, nil
}

func (r *Fatura) InsertItens(ctx context.Context, faturaID uuid.UUID, descricoes []string, valores []float64) ([]uuid.UUID, error) {
	return r.InsertItensMeta(ctx, faturaID, descricoes, valores, nil)
}

// InsertItensMeta persiste itens; metadados[i] vira JSONB (use nil ou fatia mais curta para {}).
func (r *Fatura) InsertItensMeta(ctx context.Context, faturaID uuid.UUID, descricoes []string, valores []float64, metadados [][]byte) ([]uuid.UUID, error) {
	if len(descricoes) != len(valores) {
		return nil, errors.New("descricoes e valores com tamanhos diferentes")
	}
	if metadados != nil && len(metadados) != 0 && len(metadados) != len(descricoes) {
		return nil, errors.New("metadados deve ter o mesmo tamanho de descricoes")
	}
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `
	INSERT INTO itens_fatura (id, fatura_id, descricao, valor_total, metadata) VALUES ($1,$2,$3,$4,$5::jsonb)`)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	ids := make([]uuid.UUID, 0, len(descricoes))
	for i := range descricoes {
		id := uuid.New()
		ids = append(ids, id)
		var md interface{}
		if metadados != nil && i < len(metadados) && len(metadados[i]) > 0 {
			md = string(metadados[i])
		} else {
			md = "{}"
		}
		if _, err := stmt.ExecContext(ctx, id, faturaID, descricoes[i], valores[i], md); err != nil {
			return nil, err
		}
	}
	return ids, tx.Commit()
}

func (r *Fatura) InsertRefaturamentos(ctx context.Context, faturaID uuid.UUID, regra, motivo string, itemID *uuid.UUID, orig, sug float64) error {
	query := `
	INSERT INTO refaturamentos (id, fatura_id, item_fatura_id, regra, motivo, valor_original, valor_sugerido)
	VALUES ($1,$2,$3,$4,$5,$6,$7)`
	var item interface{}
	if itemID != nil {
		item = *itemID
	}
	_, err := r.DB.ExecContext(ctx, query, uuid.New(), faturaID, item, regra, motivo, orig, sug)
	return err
}

func (r *Fatura) EconomiaPorFatura(ctx context.Context, orgID, faturaID uuid.UUID) (*domain.EconomiaResumo, []domain.Refaturamento, error) {
	var status string
	row := r.DB.QueryRowContext(ctx,
		`SELECT status FROM faturas WHERE id=$1 AND organizacao_id=$2`, faturaID, orgID)
	if err := row.Scan(&status); err != nil {
		return nil, nil, err
	}

	rows, err := r.DB.QueryContext(ctx, `
		SELECT id, fatura_id, item_fatura_id, regra, motivo, valor_original, valor_sugerido, economia_estimada, resolvido, criado_em
		FROM refaturamentos WHERE fatura_id=$1 ORDER BY criado_em`, faturaID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var refs []domain.Refaturamento
	var sum float64
	for rows.Next() {
		var r domain.Refaturamento
		var item sql.NullString
		if err := rows.Scan(&r.ID, &r.FaturaID, &item, &r.Regra, &r.Motivo, &r.ValorOriginal, &r.ValorSugerido, &r.EconomiaEstimada, &r.Resolvido, &r.CriadoEm); err != nil {
			return nil, nil, err
		}
		if item.Valid {
			u := uuid.MustParse(item.String)
			r.ItemFaturaID = &u
		}
		sum += r.EconomiaEstimada
		refs = append(refs, r)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	resumo := &domain.EconomiaResumo{
		FaturaID:              faturaID,
		StatusFatura:          status,
		TotalEconomiaEstimada: sum,
		QuantidadeOcorrencias: len(refs),
	}
	return resumo, refs, nil
}

func (r *Fatura) EconomiaAgregadoOrganizacao(ctx context.Context, orgID uuid.UUID) (float64, int, error) {
	row := r.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(r.economia_estimada),0), COUNT(r.id)::int
		FROM refaturamentos r
		INNER JOIN faturas f ON f.id = r.fatura_id
		WHERE f.organizacao_id = $1`, orgID)

	var sum float64
	var cnt int
	if err := row.Scan(&sum, &cnt); err != nil {
		return 0, 0, err
	}
	return sum, cnt, nil
}
