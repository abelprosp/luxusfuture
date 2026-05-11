// Package telefonica interpreta arquivos texto de faturamento no leiaute posicional
// usado em exportações corporativas da Telefônica/Vivo (registros 060B + 110D).
package telefonica

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"regexp"
	"strconv"
	"strings"
)

var (
	reContaInicio   = regexp.MustCompile(`^(\d{10})`)
	reTotalFatura   = regexp.MustCompile(`059A\s+IS\s+(\d+\.\d{2})`)
	reDetalheLinha  = regexp.MustCompile(`(\d{2}-\d{5}-\d{4})\s+(.+?)\s+(\d+\.\d{2})\s*A\s*$`)
	reSeq060B       = regexp.MustCompile(`\s(\d{6})\s+060B`)
	reMarcaDetalhe  = regexp.MustCompile(`060B\s+110D`)
)

// Item representa uma cobrança recorrente por linha móvel extraída do arquivo.
type Item struct {
	Conta   string
	Seq     string
	Numero  string
	Plano   string
	Valor   float64
	RawMeta map[string]any
}

// Result agrega leitura do arquivo.
type Result struct {
	ContaCobranca string
	TotalFatura   *float64
	Itens         []Item
}

// Sniff retorna true se o trecho parece fatura Telefônica/Vivo (060B+110D).
func Sniff(sample []byte) bool {
	if len(sample) == 0 {
		return false
	}
	n := 0
	for _, line := range bytes.Split(sample, []byte{'\n'}) {
		if reMarcaDetalhe.Match(line) {
			n++
			if n >= 2 {
				return true
			}
		}
	}
	return false
}

// Parse lê o arquivo completo e extrai itens de detalhamento de linhas.
func Parse(r io.Reader) (*Result, error) {
	sc := bufio.NewScanner(r)
	buf := make([]byte, 0, 64*1024)
	sc.Buffer(buf, 4*1024*1024)

	res := &Result{}
	for sc.Scan() {
		line := strings.TrimRight(sc.Text(), "\r\t ")
		if res.ContaCobranca == "" {
			if m := reContaInicio.FindStringSubmatch(line); len(m) == 2 {
				res.ContaCobranca = m[1]
			}
		}
		if m := reTotalFatura.FindStringSubmatch(line); len(m) == 2 {
			if v, err := strconv.ParseFloat(m[1], 64); err == nil {
				res.TotalFatura = &v
			}
		}
		if !strings.Contains(line, "060B") || !strings.Contains(line, "110D") {
			continue
		}
		sub := reDetalheLinha.FindStringSubmatch(line)
		if len(sub) != 4 {
			continue
		}
		val, err := strconv.ParseFloat(sub[3], 64)
		if err != nil {
			continue
		}
		seq := ""
		if sm := reSeq060B.FindStringSubmatch(line); len(sm) == 2 {
			seq = sm[1]
		}
		plano := normEspacos(sub[2])
		meta := map[string]any{
			"formato": "telefonica_txt",
			"seq":     seq,
			"numero":  sub[1],
			"plano":   plano,
		}
		if res.ContaCobranca != "" {
			meta["conta"] = res.ContaCobranca
		}
		item := Item{
			Conta:   res.ContaCobranca,
			Seq:     seq,
			Numero:  sub[1],
			Plano:   plano,
			Valor:   val,
			RawMeta: meta,
		}
		res.Itens = append(res.Itens, item)
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return res, nil
}

// DescricaoItem monta o texto armazenado em itens_fatura.descricao.
func (it Item) DescricaoItem() string {
	return it.Numero + " | " + it.Plano
}

// MetadataJSON serializa metadados para a coluna JSONB.
func (it Item) MetadataJSON() (json.RawMessage, error) {
	b, err := json.Marshal(it.RawMeta)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func normEspacos(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
