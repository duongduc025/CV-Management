package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/handlers"
	"github.com/vdt/cv-management/internal/middleware"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize database connection
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.CloseDB()

	// Initialize SSE manager
	handlers.InitSSEManager()

	// Set Gin mode based on environment
	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API routes
	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "API is running",
			})
		})

		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshToken)
			auth.POST("/logout", handlers.Logout)
		}

		// Department routes - basic GET needs to be public for registration
		api.GET("/departments", handlers.GetDepartments)

		// Roles routes - needs to be public for registration
		api.GET("/roles", handlers.GetRoles)

		// SSE connection endpoint
		api.GET("/sse/connect", handlers.SSEConnect)

		// Protected routes
		// Apply authentication middleware
		api.Use(middleware.AuthMiddleware())

		// Profile route - accessible to any authenticated user
		api.GET("/profile", handlers.GetUserProfile)

		// User routes with role-based access
		users := api.Group("/users")
		{
			users.GET("", middleware.AdminOnly(), handlers.GetUsers)
			users.GET("/:id", middleware.AdminOrPMOrBUL(), handlers.GetUserByID)
			users.GET("/department/:department_id", middleware.BULOnly(), handlers.GetUsersInDepartment)
			users.GET("/project/:project_id", middleware.RoleMiddleware("Admin", "PM"), handlers.GetUsersInProject)

			users.POST("", middleware.AdminOnly(), handlers.CreateUser)
			users.PUT("/:id", middleware.AdminOnly(), handlers.UpdateUser)
			users.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteUser)

		}

		// Department management routes with role-based access
		departments := api.Group("/admin/departments")
		{
			departments.GET("", middleware.AdminOnly(), handlers.GetDepartmentsWithStats)
			departments.POST("", middleware.AdminOnly(), handlers.CreateDepartment)
			departments.PUT("/:id", middleware.AdminOnly(), handlers.UpdateDepartment)
			departments.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteDepartment)
		}

		// CV routes with role-based access
		cvs := api.Group("/cv")
		{
			// All authenticated users can view their own CV
			cvs.GET("/me", handlers.GetUserCV)

			cvs.POST("/parse-cv", handlers.ParseCVFromFile)

			// All authenticated users can create or update their own CV
			cvs.POST("", handlers.CreateOrUpdateCV)

			// BUL and PM can view any CV by user ID
			cvs.GET("/user/:user_id", middleware.AdminOrPMOrBUL(), handlers.GetCVByUserID)
		}

		// CV Request routes with role-based access
		requests := api.Group("/requests")
		{
			// All authenticated users can view and create CV update requests
			requests.GET("", handlers.GetCVRequests)
			requests.GET("/sent", middleware.RoleMiddleware("BUL/Lead", "PM"), handlers.GetSentCVRequests)
			requests.GET("/sent/pm", middleware.PMOnly(), handlers.GetSentCVRequestsPM)
			requests.GET("/sent/bul", middleware.BULOnly(), handlers.GetSentCVRequestsBUL)
			requests.POST("", handlers.CreateCVRequest)
			requests.PUT("/:id/status", middleware.AdminOrPMOrBUL(), handlers.UpdateCVRequestStatus)
			// Mark requests as read
			requests.PUT("/:id/read", handlers.MarkCVRequestAsRead)
			requests.PUT("/mark-all-read", handlers.MarkAllCVRequestsAsRead)
			// Admin-only route to get all CV requests across all users
			requests.GET("/admin/all", middleware.AdminOnly(), handlers.GetAllCVRequestsForAdmin)
		}

		// Project routes with role-based access
		projects := api.Group("/projects")
		{
			projects.GET("", middleware.RoleMiddleware("Admin", "PM"), handlers.GetProjects)
			projects.GET("/:id", middleware.AdminOrPMOrBUL(), handlers.GetProjectByID)
			projects.GET("/members", middleware.PMOnly(), handlers.GetAllMembersOfAllProjects)

			projects.POST("", middleware.RoleMiddleware("Admin", "PM"), handlers.CreateProject)
			projects.PUT("/:id", middleware.RoleMiddleware("Admin", "PM"), handlers.UpdateProject)
			projects.DELETE("/:id", middleware.RoleMiddleware("Admin", "PM"), handlers.DeleteProject)

			projects.POST("/:id/members", middleware.RoleMiddleware("Admin", "PM"), handlers.AddProjectMember)
			projects.DELETE("/:id/members/:userId", middleware.RoleMiddleware("Admin", "PM"), handlers.RemoveProjectMember)
		}

		// Upload routes - accessible to all authenticated users
		upload := api.Group("/upload")
		{
			// CV profile photo upload (optimized for CV photos, 3:4 ratio, cv-photos folder)
			upload.POST("/cv-photo", handlers.UploadCVPhoto)
			// PDF file upload for CV documents
			upload.POST("/pdf", handlers.UploadPDF)
		}

		// AI service routes - accessible to all authenticated users
		ai := api.Group("/ai")
		{
			// Parse CV from file path
			ai.POST("/parse-cv", handlers.ParseCVFromFile)
		}

		// Employee routes - accessible to all authenticated users
		employee := api.Group("/employee")
		{
			employee.GET("/notifications", handlers.GetCVRequests)
		}

		// General info routes - accessible to all authenticated users
		generalInfo := api.Group("/general-info")
		{
			// Get department general information
			generalInfo.GET("/department", handlers.GetGeneralInfoOfDepartment)
			// Get project management general information
			generalInfo.GET("/project-management", handlers.GetGeneralInfoOfProjectManagement)
			// Get admin dashboard statistics (Admin only)
			generalInfo.GET("/admin-dashboard-stats", middleware.AdminOnly(), handlers.GetAdminDashboardStats)
		}
	}

	// Get port from environment or use default
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	serverAddr := fmt.Sprintf(":%s", port)
	log.Printf("Server starting on port %s", port)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
