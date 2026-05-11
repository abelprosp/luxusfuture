package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
)

type Planos struct {
	DB *sql.DB
}

func (p *Planos) ValorMensalPrincipal(ctx context.Context, operadoraID uuid.UUID, refDate interface{}) (*float64, error) {
	if operadoraID == uuid.Nil {
		return nil, nil
	}
	row := p.DB.QueryRowContext(ctx, `
		SELECT valor_mensal FROM planos_tarifas
		WHERE operadora_id = $1
		  AND (vigencia_fim IS NULL OR vigencia_fim >= $2::date)
		  AND vigencia_inicio <= $2::date
		ORDER BY vigencia_inicio DESC NULLS LAST
		LIMIT 1`,
		operadoraID, refDate,
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
