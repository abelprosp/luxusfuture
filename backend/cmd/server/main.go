package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"

	"luxusfuture/backend/internal/config"
	"luxusfuture/backend/internal/database"
	"luxusfuture/backend/internal/httpserver"
	"luxusfuture/backend/internal/repository"
	"luxusfuture/backend/internal/service/fatura"
	"luxusfuture/backend/internal/workqueue"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer db.Close()

	fRepo := &repository.Fatura{DB: db}
	pRepo := &repository.Planos{DB: db}
	cRepo := &repository.Cadastros{DB: db}
	uRepo := &repository.Usuario{DB: db}
	oRepo := &repository.Organizacoes{DB: db}

	anal := &fatura.Analisador{Repo: fRepo, PlanosRepo: pRepo, CadastrosRepo: cRepo}

	logProc := func(faturaID uuid.UUID, errProc error) {
		if errProc != nil {
			log.Printf("processamento fatura=%s erro=%v", faturaID, errProc)
		}
	}

	q := workqueue.New(4, 128, httpserver.JobProcessor(anal, logProc))
	q.Start()

	svc := fatura.NewServico(cfg, fRepo, pRepo, anal, q)
	r := httpserver.Router(cfg, fRepo, svc, cRepo, uRepo, oRepo)

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("API em %s", cfg.HTTPAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch

	ctxShut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctxShut); err != nil {
		log.Printf("shutdown servidor: %v", err)
	}
	q.Close()
}
