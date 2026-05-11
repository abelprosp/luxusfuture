package domain

import (
	"time"

	"github.com/google/uuid"
)

type Fatura struct {
	ID                  uuid.UUID  `json:"id"`
	OrganizacaoID       uuid.UUID  `json:"organizacao_id"`
	OperadoraID         *uuid.UUID `json:"operadora_id,omitempty"`
	ClienteID           *uuid.UUID `json:"cliente_id,omitempty"`
	LinhaID             *uuid.UUID `json:"linha_id,omitempty"`
	MesReferencia       time.Time  `json:"mes_referencia"`
	TipoArquivo         string     `json:"tipo_arquivo"`
	NomeArquivo         string     `json:"nome_arquivo"`
	CaminhoArmazenamento string    `json:"-"`
	Status              string     `json:"status"`
	TotalDeclarado      *float64   `json:"total_declarado,omitempty"`
	MensagemErro        *string    `json:"mensagem_erro,omitempty"`
	CriadoEm            time.Time  `json:"criado_em"`
	ProcessadoEm        *time.Time `json:"processado_em,omitempty"`
}

type Refaturamento struct {
	ID              uuid.UUID  `json:"id"`
	FaturaID        uuid.UUID  `json:"fatura_id"`
	ItemFaturaID    *uuid.UUID `json:"item_fatura_id,omitempty"`
	Regra           string     `json:"regra"`
	Motivo          string     `json:"motivo"`
	ValorOriginal   float64    `json:"valor_original"`
	ValorSugerido   float64    `json:"valor_sugerido"`
	EconomiaEstimada float64   `json:"economia_estimada"`
	Resolvido       bool       `json:"resolvido"`
	CriadoEm        time.Time  `json:"criado_em"`
}

type EconomiaResumo struct {
	FaturaID               uuid.UUID `json:"fatura_id"`
	StatusFatura           string    `json:"status_fatura"`
	TotalEconomiaEstimada  float64   `json:"total_economia_estimada"`
	QuantidadeOcorrencias  int       `json:"quantidade_ocorrencias"`
}
