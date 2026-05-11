package httpserver

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"luxusfuture/backend/internal/auth"
)

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerBody struct {
	Email             string  `json:"email"`
	Password          string  `json:"password"`
	Nome              string  `json:"nome"`
	EmpresaNome       string  `json:"empresa_nome"`
	EmpresaDocumento  *string `json:"empresa_documento"`
}

type perfilEmpresaBody struct {
	Nome       string  `json:"nome"`
	Documento *string `json:"documento"`
}

func (h *Handlers) Login(c *gin.Context) {
	var body loginBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}
	u, err := h.URepo.GetByEmail(c.Request.Context(), body.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "e-mail ou senha incorretos"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !auth.CheckPassword(u.SenhaHash, body.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "e-mail ou senha incorretos"})
		return
	}
	org, err := h.ORepo.GetByID(c.Request.Context(), u.OrganizacaoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	token, err := auth.SignAccessToken(h.Config.JWTSecret, h.Config.JWTExpiryHours, u.ID, u.OrganizacaoID, u.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_in": h.Config.JWTExpiryHours * 3600,
		"usuario": gin.H{
			"id":              u.ID.String(),
			"nome":            u.Nome,
			"email":           u.Email,
			"organizacao_id": u.OrganizacaoID.String(),
		},
		"organizacao": gin.H{
			"id":         org.ID.String(),
			"nome":       org.Nome,
			"documento":  org.Documento,
			"criado_em":  org.CriadoEm,
		},
	})
}

func (h *Handlers) Register(c *gin.Context) {
	var body registerBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}
	body.Nome = strings.TrimSpace(body.Nome)
	body.EmpresaNome = strings.TrimSpace(body.EmpresaNome)
	body.Email = strings.TrimSpace(body.Email)
	if body.Email == "" || len(body.Password) < 8 || body.Nome == "" || body.EmpresaNome == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "informe e-mail, senha (mín. 8 caracteres), nome e nome da empresa"})
		return
	}
	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.URepo.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer func() { _ = tx.Rollback() }()

	orgID := uuid.New()
	userID := uuid.New()
	_, err = tx.ExecContext(c.Request.Context(),
		`INSERT INTO organizacoes (id, nome, documento) VALUES ($1,$2,$3)`,
		orgID, body.EmpresaNome, nullableTrim(body.EmpresaDocumento),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err = tx.ExecContext(c.Request.Context(),
		`INSERT INTO usuarios (id, organizacao_id, email, nome, senha_hash) VALUES ($1,$2,$3,$4,$5)`,
		userID, orgID, strings.ToLower(body.Email), body.Nome, hash,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	org, err := h.ORepo.GetByID(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	token, err := auth.SignAccessToken(h.Config.JWTSecret, h.Config.JWTExpiryHours, userID, orgID, strings.ToLower(body.Email))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token":      token,
		"expires_in": h.Config.JWTExpiryHours * 3600,
		"usuario": gin.H{
			"id":              userID.String(),
			"nome":            body.Nome,
			"email":           strings.ToLower(body.Email),
			"organizacao_id": orgID.String(),
		},
		"organizacao": gin.H{
			"id":        org.ID.String(),
			"nome":      org.Nome,
			"documento": org.Documento,
			"criado_em": org.CriadoEm,
		},
	})
}

func nullableTrim(p *string) interface{} {
	if p == nil || strings.TrimSpace(*p) == "" {
		return nil
	}
	s := strings.TrimSpace(*p)
	return s
}

func (h *Handlers) Me(c *gin.Context) {
	orgID := h.organizacaoID(c)
	vu, _ := c.Get("auth_user_id")
	userID, ok := vu.(uuid.UUID)
	if !ok || orgID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "autenticação necessária"})
		return
	}
	u, err := h.URepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "usuário inválido"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if u.OrganizacaoID != orgID {
		c.JSON(http.StatusForbidden, gin.H{"error": "sessão inconsistente"})
		return
	}
	org, err := h.ORepo.GetByID(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"usuario": gin.H{
			"id":              u.ID.String(),
			"nome":            u.Nome,
			"email":           u.Email,
			"organizacao_id": u.OrganizacaoID.String(),
		},
		"organizacao": gin.H{
			"id":        org.ID.String(),
			"nome":      org.Nome,
			"documento": org.Documento,
			"criado_em": org.CriadoEm,
		},
	})
}

func (h *Handlers) PatchOrganizacaoPerfil(c *gin.Context) {
	orgID := h.organizacaoID(c)
	if orgID == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "autenticação necessária"})
		return
	}
	var body perfilEmpresaBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}
	body.Nome = strings.TrimSpace(body.Nome)
	if body.Nome == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nome da empresa é obrigatório"})
		return
	}
	if err := h.ORepo.UpdatePerfil(c.Request.Context(), orgID, body.Nome, body.Documento); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "organização não encontrada"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	org, err := h.ORepo.GetByID(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"organizacao": org})
}
