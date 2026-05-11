package fatura

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"luxusfuture/backend/internal/repository"
)

type partesLinhaTel struct {
	numero string
	plano  string
}

func partesTelefonicaDesc(desc string) partesLinhaTel {
	var p partesLinhaTel
	idx := strings.Index(desc, " | ")
	if idx < 0 {
		return p
	}
	p.numero = strings.TrimSpace(desc[:idx])
	p.plano = strings.TrimSpace(desc[idx+3:])
	return p
}

func aplicarRegrasTelefonica(
	ctx context.Context,
	repo *repository.Fatura,
	faturaID uuid.UUID,
	descs []string,
	vals []float64,
	itemIDs []uuid.UUID,
) error {
	partes := make([]partesLinhaTel, len(descs))
	for i := range descs {
		partes[i] = partesTelefonicaDesc(descs[i])
	}

	if err := duplicidadeNumeroTel(ctx, repo, faturaID, partes, vals, itemIDs); err != nil {
		return err
	}
	return tarifaDominantePorPlano(ctx, repo, faturaID, partes, vals, itemIDs)
}

func duplicidadeNumeroTel(
	ctx context.Context,
	repo *repository.Fatura,
	faturaID uuid.UUID,
	partes []partesLinhaTel,
	vals []float64,
	itemIDs []uuid.UUID,
) error {
	byNum := map[string][]int{}
	for i := range partes {
		if vals[i] <= 0.01 {
			continue
		}
		if partes[i].numero == "" {
			continue
		}
		byNum[partes[i].numero] = append(byNum[partes[i].numero], i)
	}
	for _, idxs := range byNum {
		if len(idxs) < 2 {
			continue
		}
		for k := 1; k < len(idxs); k++ {
			j := idxs[k]
			ref := itemIDs[j]
			msg := fmt.Sprintf(
				"Número %s aparece mais de uma vez com cobrança na mesma fatura; segunda ocorrência considerada cobrança indevida até validação.",
				partes[j].numero,
			)
			if err := repo.InsertRefaturamentos(ctx, faturaID, "duplicidade_linha", msg, &ref, vals[j], 0); err != nil {
				return err
			}
		}
	}
	return nil
}

func tarifaDominantePorPlano(
	ctx context.Context,
	repo *repository.Fatura,
	faturaID uuid.UUID,
	partes []partesLinhaTel,
	vals []float64,
	itemIDs []uuid.UUID,
) error {
	byPlan := map[string][]int{}
	for i := range partes {
		if vals[i] <= 0.01 {
			continue
		}
		pl := strings.TrimSpace(partes[i].plano)
		if pl == "" {
			continue
		}
		key := strings.ToUpper(pl)
		byPlan[key] = append(byPlan[key], i)
	}

	const minLinhasGrupo = 5

	for _, idxs := range byPlan {
		if len(idxs) < minLinhasGrupo {
			continue
		}

		cnt := map[float64]int{}
		for _, j := range idxs {
			r := round2(vals[j])
			cnt[r]++
		}

		var mode float64
		modeN := -1
		total := len(idxs)
		for val, n := range cnt {
			if n > modeN || (n == modeN && val < mode) {
				modeN = n
				mode = val
			}
		}
		if modeN*2 <= total {
			continue
		}

		for _, j := range idxs {
			if mode <= 1 {
				continue
			}
			dAbs := math.Abs(vals[j] - mode)
			rel := dAbs / mode
			if dAbs < 10 || rel < 0.28 {
				continue
			}
			ref := itemIDs[j]
			msg := fmt.Sprintf(
				"Linha com valor claramente fora da faixa típica do mesmo plano na fatura (plano: %s, referência predominante %.2f; cobrança atual %.2f).",
				partes[j].plano, mode, vals[j],
			)
			if err := repo.InsertRefaturamentos(ctx, faturaID, "tarifa_fora_padrao_massa", msg, &ref, vals[j], mode); err != nil {
				return err
			}
		}
	}
	return nil
}
