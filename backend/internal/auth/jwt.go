package auth

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenClaims struct {
	UserID          uuid.UUID
	OrganizacaoID   uuid.UUID
	Email           string
}

func SignAccessToken(secret string, expiryHours int, userID, orgID uuid.UUID, email string) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("JWT_SECRET não configurado")
	}
	if expiryHours <= 0 {
		expiryHours = 168
	}
	now := time.Now()
	claims := jwt.MapClaims{
		"uid":   userID.String(),
		"org":   orgID.String(),
		"email": strings.ToLower(strings.TrimSpace(email)),
		"iat":   now.Unix(),
		"exp":   now.Add(time.Duration(expiryHours) * time.Hour).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func ParseAccessToken(secret, tokenStr string) (*TokenClaims, error) {
	tokenStr = strings.TrimSpace(tokenStr)
	if tokenStr == "" {
		return nil, errors.New("token vazio")
	}
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de assinatura inesperado: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !tok.Valid {
		return nil, errors.New("token inválido ou expirado")
	}
	mc, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("claims inválidos")
	}
	uidStr, _ := mc["uid"].(string)
	orgStr, _ := mc["org"].(string)
	em, _ := mc["email"].(string)
	uid, err := uuid.Parse(uidStr)
	if err != nil {
		return nil, err
	}
	org, err := uuid.Parse(orgStr)
	if err != nil {
		return nil, err
	}
	return &TokenClaims{UserID: uid, OrganizacaoID: org, Email: em}, nil
}
