package utils

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// JWT secret keys - loaded from environment variables
var jwtSecret []byte
var refreshSecret []byte

func init() {
	// Load JWT secrets from environment variables
	jwtSecretStr := os.Getenv("JWT_SECRET")
	if jwtSecretStr == "" {
		// Fallback to hardcoded values for backward compatibility
		jwtSecretStr = "vdt_cv_management_secret_key"
	}
	jwtSecret = []byte(jwtSecretStr)

	// For refresh token, append "_refresh" to make it different
	refreshSecret = []byte(jwtSecretStr + "_refresh")
}

// TokenExpiration defines how long a JWT token is valid
const TokenExpiration = time.Hour * 24 // 24 hours

// RefreshTokenExpiration defines how long a refresh token is valid
const RefreshTokenExpiration = time.Hour * 24 * 7 // 7 days

// Claims represents the JWT claims
type Claims struct {
	UserID string   `json:"user_id"`
	Roles  []string `json:"roles"`
	jwt.RegisteredClaims
}

// RefreshClaims represents the JWT claims for refresh tokens
type RefreshClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash compares a bcrypt hashed password with its possible plaintext equivalent
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken generates a new JWT access token for a user
func GenerateToken(userID string, roles []string) (string, error) {
	expirationTime := time.Now().Add(TokenExpiration)

	claims := &Claims{
		UserID: userID,
		Roles:  roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateToken validates a JWT access token
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate the algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// GenerateRefreshToken creates a stateless JWT refresh token
func GenerateRefreshToken(userID string) (string, error) {
	expirationTime := time.Now().Add(RefreshTokenExpiration)

	claims := &RefreshClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(refreshSecret)
}

// ValidateRefreshToken validates a JWT refresh token
func ValidateRefreshToken(tokenString string) (string, error) {
	claims := &RefreshClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate the algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return refreshSecret, nil
	})

	if err != nil {
		return "", err
	}

	if !token.Valid {
		return "", errors.New("invalid refresh token")
	}

	return claims.UserID, nil
}

// GetRefreshTokenExpiration returns the expiration time for refresh tokens
func GetRefreshTokenExpiration() time.Time {
	return time.Now().Add(RefreshTokenExpiration)
}
