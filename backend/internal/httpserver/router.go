package httpserver

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"luxusfuture/backend/internal/config"
	"luxusfuture/backend/internal/repository"
	"luxusfuture/backend/internal/service/fatura"
)

func Router(cfg *config.Config, fh *repository.Fatura, fhSvc *fatura.Servico, cad *repository.Cadastros, usr *repository.Usuario, org *repository.Organizacoes) *gin.Engine {
	if cfg == nil || fh == nil || fhSvc == nil || cad == nil || usr == nil || org == nil {
		panic("router: deps ausentes")
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		log.Printf("| %3d | %13v | %-7s %#v",
			param.StatusCode,
			param.Latency,
			param.Method,
			param.Path,
		)
		return ""
	}))
	r.Use(gin.Recovery())

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "X-Organization-ID", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           300 * time.Second,
	}))

	h := &Handlers{Config: cfg, Svc: fhSvc, FRepo: fh, CRepo: cad, URepo: usr, ORepo: org}

	r.GET("/health", h.Health)
	v1 := r.Group("/api/v1")
	v1.Use(h.JWTContextMiddleware())
	{
		v1.POST("/auth/login", h.Login)
		v1.POST("/auth/register", h.Register)

		aut := v1.Group("")
		aut.Use(h.RequireAuth())
		{
			aut.GET("/auth/me", h.Me)
			aut.PATCH("/organizacao/perfil", h.PatchOrganizacaoPerfil)
		}

		v1.GET("/dashboard/metricas", h.DashboardMetricas)
		v1.GET("/operadoras", h.ListOperadoras)
		v1.POST("/operadoras", h.CreateOperadora)
		v1.GET("/clientes", h.ListClientes)
		v1.POST("/clientes", h.CreateCliente)
		v1.GET("/estoque/resumo", h.EstoqueResumo)

		v1.GET("/faturas", h.ListFaturas)
		v1.POST("/faturas", h.UploadFatura)
		v1.DELETE("/faturas/:id", h.DeleteFatura)
		v1.GET("/faturas/:id/economia", h.EconomiaFatura)
		v1.GET("/resumo/economia", h.ResumoEconomia)
	}

	return r
}

func JobProcessor(an *fatura.Analisador, logErr func(uuid.UUID, error)) func(string) {
	return func(payload string) {
		parts := strings.SplitN(payload, ":", 2)
		if len(parts) != 2 {
			return
		}
		orgID, err := uuid.Parse(parts[0])
		if err != nil {
			return
		}
		faturaID, err := uuid.Parse(parts[1])
		if err != nil {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
		defer cancel()
		if err := an.Processar(ctx, orgID, faturaID); err != nil {
			logErr(faturaID, err)
		}
	}
}
