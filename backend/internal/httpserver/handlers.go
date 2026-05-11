package httpserver

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"luxusfuture/backend/internal/config"
	"luxusfuture/backend/internal/repository"
	"luxusfuture/backend/internal/service/fatura"
)

type Handlers struct {
	Config *config.Config
	Svc    *fatura.Servico
	FRepo  *repository.Fatura
	CRepo  *repository.Cadastros
	URepo  *repository.Usuario
	ORepo  *repository.Organizacoes
}

func (h *Handlers) organizacaoID(c *gin.Context) uuid.UUID {
	if v, ok := c.Get("auth_org_id"); ok {
		if u, ok2 := v.(uuid.UUID); ok2 && u != uuid.Nil {
			return u
		}
	}
	raw := strings.TrimSpace(c.GetHeader("X-Organization-ID"))
	if raw != "" {
		if u, err := uuid.Parse(raw); err == nil {
			return u
		}
	}
	raw = strings.TrimSpace(c.Query("organizacao_id"))
	if raw != "" {
		if u, err := uuid.Parse(raw); err == nil {
			return u
		}
	}
	demo := h.Config.OrganizacaoDemoID
	u, err := uuid.Parse(demo)
	if err != nil {
		return uuid.Nil
	}
	return u
}

func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handlers) ListFaturas(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	var clienteFiltr *uuid.UUID
	if raw := strings.TrimSpace(c.Query("cliente_id")); raw != "" {
		cid, err := uuid.Parse(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cliente_id inválido"})
			return
		}
		ok, err := h.CRepo.ClientePertenceOrganizacao(c.Request.Context(), org, cid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cliente não encontrado nesta organização"})
			return
		}
		clienteFiltr = &cid
	}

	items, err := h.FRepo.ListByOrganizacao(c.Request.Context(), org, 80, clienteFiltr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"faturas": items})
}

func (h *Handlers) UploadFatura(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	file, err := c.FormFile("arquivo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "arquivo obrigatório"})
		return
	}
	mes := c.PostForm("mes_referencia")
	op := c.PostForm("operadora_id")
	cliRaw := strings.TrimSpace(c.PostForm("cliente_id"))
	var cliPtr *uuid.UUID
	if cliRaw != "" {
		cid, err := uuid.Parse(cliRaw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cliente_id inválido"})
			return
		}
		ok, err := h.CRepo.ClientePertenceOrganizacao(c.Request.Context(), org, cid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cliente não encontrado nesta organização"})
			return
		}
		cliPtr = &cid
	}

	f, err := h.Svc.RegistrarUpload(c.Request.Context(), org, file, mes, op, cliPtr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("[fatura] recebida %s organizacao=%s", f.ID, org)
	c.JSON(http.StatusAccepted, gin.H{"fatura": f})
}

func (h *Handlers) DeleteFatura(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	idStr := strings.TrimSpace(c.Param("id"))
	faturaID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	err = h.Svc.ExcluirFatura(c.Request.Context(), org, faturaID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "fatura não encontrada"})
			return
		}
		if errors.Is(err, fatura.ErrFaturaForaDaOrganizacao) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handlers) EconomiaFatura(c *gin.Context) {
	org := h.organizacaoID(c)
	idStr := strings.TrimSpace(c.Param("id"))
	u, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	resumo, refs, err := h.FRepo.EconomiaPorFatura(c.Request.Context(), org, u)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "fatura não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"resumo": resumo, "refaturamentos": refs})
}

func (h *Handlers) ResumoEconomia(c *gin.Context) {
	org := h.organizacaoID(c)
	if org == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organização inválida"})
		return
	}
	sum, cnt, err := h.FRepo.EconomiaAgregadoOrganizacao(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"organizacao_id":               org.String(),
		"total_economia_estimada":      sum,
		"refaturamentos_registrados":   cnt,
	})
}
