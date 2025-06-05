package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/utils"
)

// AuthMiddleware validates JWT tokens and adds user info to context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if header has the Bearer prefix
		headerParts := strings.Split(authHeader, " ")
		if len(headerParts) != 2 || headerParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Authorization header format must be Bearer {token}",
			})
			c.Abort()
			return
		}

		// Get the token
		tokenString := headerParts[1]

		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Set claims to context
		c.Set("userID", claims.UserID)
		c.Set("roles", claims.Roles)

		c.Next()
	}
}

// RoleMiddleware checks if the user has the required role
func RoleMiddleware(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get roles from context (set by AuthMiddleware)
		rolesInterface, exists := c.Get("roles")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"status":  "error",
				"message": "Unauthorized - user roles not found",
			})
			c.Abort()
			return
		}

		roles, ok := rolesInterface.([]string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Server error - invalid role format",
			})
			c.Abort()
			return
		}

		// Check if user has any of the required roles
		hasRole := false
		for _, role := range roles {
			for _, requiredRole := range requiredRoles {
				if role == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  "error",
				"message": "Forbidden - insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminOnly is a shortcut middleware for Admin role
func AdminOnly() gin.HandlerFunc {
	return RoleMiddleware("Admin")
}

// PMOnly is a shortcut middleware for PM role
func PMOnly() gin.HandlerFunc {
	return RoleMiddleware("PM")
}

// BULOnly is a shortcut middleware for BUL role
func BULOnly() gin.HandlerFunc {
	return RoleMiddleware("BUL/Lead")
}

// AdminOrPMOrBUL is a shortcut middleware for Admin, PM, or BUL roles
func AdminOrPMOrBUL() gin.HandlerFunc {
	return RoleMiddleware("Admin", "PM", "BUL/Lead")
}
