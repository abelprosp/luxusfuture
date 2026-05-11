package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL        string
	HTTPAddr           string
	OrganizacaoDemoID  string
	UploadDir          string
	CORSOrigins        []string
	JWTSecret          string
	JWTExpiryHours     int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	url := getenv("DATABASE_URL", "postgres://telefonia:telefonia@localhost:5432/telefonia?sslmode=disable")
	org := getenv("ORGANIZACAO_DEMO_ID", "00000000-0000-0000-0000-000000000001")
	uploadDir := getenv("UPLOAD_DIR", "./data/uploads")
	corsRaw := getenv("CORS_ORIGINS", "http://localhost:3000")

	origins := strings.Split(corsRaw, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	jwtSecret := getenv("JWT_SECRET", "luxus-dev-change-me-in-production-min-32-chars!!")
	jwtHours := 168
	if v := getenv("JWT_EXPIRY_HOURS", ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 8760 {
			jwtHours = n
		}
	}

	return &Config{
		DatabaseURL:       url,
		HTTPAddr:          getenv("HTTP_ADDR", ":8080"),
		OrganizacaoDemoID: org,
		UploadDir:         uploadDir,
		CORSOrigins:       origins,
		JWTSecret:         jwtSecret,
		JWTExpiryHours:    jwtHours,
	}, nil
}

func getenv(key, def string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	return v
}
