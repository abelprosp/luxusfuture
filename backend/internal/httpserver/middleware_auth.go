package httpserver

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"luxusfuture/backend/internal/auth"
)

func (h *Handlers) JWTContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		hdr := strings.TrimSpace(c.GetHeader("Authorization"))
		if hdr == "" || !strings.HasPrefix(strings.ToLower(hdr), "bearer ") {
			c.Next()
			return
		}
		raw := strings.TrimSpace(hdr[7:])
		claims, err := auth.ParseAccessToken(h.Config.JWTSecret, raw)
		if err != nil {
			c.Next()
			return
		}
		c.Set("auth_org_id", claims.OrganizacaoID)
		c.Set("auth_user_id", claims.UserID)
		c.Next()
	}
}

func (h *Handlers) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		_, okO := c.Get("auth_org_id")
		_, okU := c.Get("auth_user_id")
		if !okO || !okU {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "autenticação necessária"})
			return
		}
		if v, ok := c.Get("auth_org_id"); ok {
			if id, ok2 := v.(uuid.UUID); !ok2 || id == uuid.Nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "autenticação necessária"})
				return
			}
		}
		c.Next()
	}
}
