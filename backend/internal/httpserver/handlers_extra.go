package httpserver

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handlers) ListOperadoras(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	list, err := h.CRepo.ListOperadoras(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"operadoras": list})
}

type operadoraCreateBody struct {
	Nome   string  `json:"nome"`
	Codigo *string `json:"codigo"`
}

func (h *Handlers) CreateOperadora(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	var body operadoraCreateBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}
	nome := strings.TrimSpace(body.Nome)
	if nome == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nome é obrigatório"})
		return
	}
	if len(nome) > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nome deve ter no máximo 120 caracteres"})
		return
	}
	var cod *string
	if body.Codigo != nil && strings.TrimSpace(*body.Codigo) != "" {
		s := strings.TrimSpace(*body.Codigo)
		if len(s) > 32 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "codigo deve ter no máximo 32 caracteres"})
			return
		}
		cod = &s
	}
	id, err := h.CRepo.CreateOperadora(c.Request.Context(), org, nome, cod)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id.String()})
}

func (h *Handlers) ListClientes(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	list, err := h.CRepo.ListClientes(c.Request.Context(), org, 120)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clientes": list})
}

type clienteCreateBody struct {
	Nome                  string   `json:"nome"`
	Documento             string   `json:"documento"`
	Email                 string   `json:"email"`
	ValorMensalAcordado   *float64 `json:"valor_mensal_acordado"`
	OperadoraID           string   `json:"operadora_id"`
	LinhaNumero           string   `json:"linha_numero"`
}

func (h *Handlers) CreateCliente(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	var body clienteCreateBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}
	body.Nome = strings.TrimSpace(body.Nome)
	body.Documento = strings.TrimSpace(body.Documento)
	if body.Nome == "" || body.Documento == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nome e documento são obrigatórios"})
		return
	}
	var em *string
	if strings.TrimSpace(body.Email) != "" {
		s := strings.TrimSpace(body.Email)
		em = &s
	}
	if body.ValorMensalAcordado == nil || *body.ValorMensalAcordado < 0 || *body.ValorMensalAcordado != *body.ValorMensalAcordado {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valor mensal acordado (R$) é obrigatório e deve ser numérico"})
		return
	}
	opID, err := uuid.Parse(strings.TrimSpace(body.OperadoraID))
	if err != nil || opID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "operadora é obrigatória"})
		return
	}
	numLinha := strings.TrimSpace(body.LinhaNumero)
	if numLinha == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "número da linha é obrigatório para cruzar com a fatura TXT"})
		return
	}

	clienteID, linhaID, err := h.CRepo.CreateClienteComLinha(
		c.Request.Context(),
		org,
		body.Nome,
		body.Documento,
		em,
		*body.ValorMensalAcordado,
		opID,
		numLinha,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": clienteID.String(), "linha_id": linhaID.String()})
}

func (h *Handlers) EstoqueResumo(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	byStatus, err := h.CRepo.LinhasPorStatus(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	total, err := h.CRepo.LinhasTotal(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"por_status": byStatus, "total_linhas": total})
}

func (h *Handlers) DashboardMetricas(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	ctx := c.Request.Context()

	abertoQtd, abertoValor, err := h.CRepo.FaturasEmAberto(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	porFat, err := h.CRepo.FaturasAggPorStatus(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	cli, err := h.CRepo.CountClientes(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cliNovos, err := h.CRepo.CountClientesNovosMes(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	recMes, err := h.CRepo.RecebimentosMesFaturasAnalisadas(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	recPrev, err := h.CRepo.RecebimentosMesAnteriorFaturasAnalisadas(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	econ, refCnt, err := h.FRepo.EconomiaAgregadoOrganizacao(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	fatMensal, err := h.CRepo.FaturamentoMensalPorReferenciaAnalisadas(ctx, org, 6)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	topOp, err := h.CRepo.ValorFaturamentoPorOperadoraAnalisadas(ctx, org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := gin.H{
		"faturas_em_aberto": gin.H{
			"quantidade":  abertoQtd,
			"valor_total": abertoValor,
		},
		"faturas_por_status": porFat,
		"clientes_ativos":    cli,
		"clientes_novos_mes": cliNovos,
		"recebimentos_mes":   recMes,
		"economia_identificada": gin.H{
			"total":                econ,
			"refaturamentos_count": refCnt,
		},
		"faturamento_mensal": fatMensal,
		"top_operadoras":     topOp,
	}
	if recPrev > 1e-9 {
		pct := ((recMes - recPrev) / recPrev) * 100
		out["variacao_recebimentos_pct"] = pct
	}
	c.JSON(http.StatusOK, out)
}
