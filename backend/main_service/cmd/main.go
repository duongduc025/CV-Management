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
	// Tải các biến môi trường
	if err := godotenv.Load(); err != nil {
		log.Printf("Cảnh báo: Không tìm thấy file .env: %v", err)
	}

	// Khởi tạo kết nối database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Lỗi kết nối database: %v", err)
	}
	defer database.CloseDB()

	// Khởi tạo SSE manager
	handlers.InitSSEManager()

	if os.Getenv("ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Khởi tạo router
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

		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "API đang hoạt động",
			})
		})

		// Auth routes (công khai)
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/refresh", handlers.RefreshToken)
			auth.POST("/logout", handlers.Logout)
		}

		// Department routes - GET cơ bản cần công khai cho đăng ký
		api.GET("/departments", handlers.GetDepartments)

		// Roles routes - cần công khai cho đăng ký
		api.GET("/roles", handlers.GetRoles)

		// SSE connection endpoint
		api.GET("/sse/connect", handlers.SSEConnect)

		// Routes được bảo vệ
		// Áp dụng authentication middleware
		api.Use(middleware.AuthMiddleware())

		// Profile route - truy cập được cho bất kỳ user đã xác thực
		api.GET("/profile", handlers.GetUserProfile)

		// User routes với kiểm soát truy cập theo vai trò
		users := api.Group("/users")
		{
			users.GET("", middleware.RoleMiddleware("Admin", "PM"), handlers.GetUsers)
			users.GET("/paginated", middleware.AdminOnly(), handlers.GetUsersPaginated)
			users.GET("/:id", middleware.AdminOrPMOrBUL(), handlers.GetUserByID)
			users.GET("/department/:department_id", middleware.RoleMiddleware("Admin", "BUL/Lead"), handlers.GetUsersInDepartment) // Admin luôn có quyền truy cập
			users.GET("/project/:project_id", middleware.RoleMiddleware("Admin", "PM"), handlers.GetUsersInProject)
			users.GET("/role/:role", middleware.AdminOnly(), handlers.GetUsersByRole)
			users.GET("/pm", middleware.AdminOnly(), handlers.GetPMUsers)

			users.POST("", middleware.AdminOnly(), handlers.CreateUser)
			users.PUT("/:id", middleware.AdminOnly(), handlers.UpdateUser)
			users.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteUser)

		}

		// Department management routes với kiểm soát truy cập theo vai trò
		departments := api.Group("/admin/departments")
		{
			departments.GET("", middleware.AdminOnly(), handlers.GetDepartmentsWithStats)
			departments.POST("", middleware.AdminOnly(), handlers.CreateDepartment)
			departments.PUT("/:id", middleware.AdminOnly(), handlers.UpdateDepartment)
			departments.DELETE("/:id", middleware.AdminOnly(), handlers.DeleteDepartment)
		}

		// CV routes với kiểm soát truy cập theo vai trò
		cvs := api.Group("/cv")
		{
			// Tất cả user đã xác thực có thể xem CV của mình
			cvs.GET("/me", handlers.GetUserCV)

			cvs.POST("/parse-cv", handlers.ParseCVFromFile)

			// Tất cả user đã xác thực có thể tạo hoặc cập nhật CV của mình
			cvs.POST("", handlers.CreateOrUpdateCV)

			// Admin có thể xóa CV của bất kỳ user nào theo user ID
			cvs.DELETE("/user/:user_id", middleware.AdminOnly(), handlers.DeleteCV)

			// Admin có thể cập nhật CV của bất kỳ user nào theo user ID
			cvs.PUT("/user/:user_id", middleware.AdminOnly(), handlers.AdminUpdateCV)

			// BUL và PM có thể xem bất kỳ CV nào theo user ID
			cvs.GET("/user/:user_id", middleware.AdminOrPMOrBUL(), handlers.GetCVByUserID)
		}

		// CV Request routes với kiểm soát truy cập theo vai trò
		requests := api.Group("/requests")
		{
			// Tất cả user đã xác thực có thể xem và tạo yêu cầu cập nhật CV
			requests.GET("", handlers.GetCVRequests)
			requests.GET("/sent", middleware.RoleMiddleware("BUL/Lead", "PM"), handlers.GetSentCVRequests)
			requests.GET("/sent/pm", middleware.PMOnly(), handlers.GetSentCVRequestsPM)
			requests.GET("/sent/bul", middleware.BULOnly(), handlers.GetSentCVRequestsBUL)
			requests.POST("", handlers.CreateCVRequest)
			requests.PUT("/:id/status", middleware.AdminOrPMOrBUL(), handlers.UpdateCVRequestStatus)
			// Đánh dấu các yêu cầu đã đọc
			requests.PUT("/:id/read", handlers.MarkCVRequestAsRead)
			requests.PUT("/mark-all-read", handlers.MarkAllCVRequestsAsRead)
			// Route chỉ dành cho Admin để lấy tất cả CV requests của tất cả users
			requests.GET("/admin/all", middleware.AdminOnly(), handlers.GetAllCVRequestsForAdmin)
		}

		// Project routes với kiểm soát truy cập theo vai trò
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

			// Project routes đặc biệt cho Admin
			adminProjects := projects.Group("/admin")
			{
				adminProjects.POST("", middleware.AdminOnly(), handlers.CreateProjectWithPM)
			}
		}

		// Upload routes - truy cập được cho tất cả user đã xác thực
		upload := api.Group("/upload")
		{
			// Upload ảnh profile CV (tối ưu cho ảnh CV, tỉ lệ 3:4, thư mục cv-photos)
			upload.POST("/cv-photo", handlers.UploadCVPhoto)
			// Upload file PDF cho tài liệu CV
			upload.POST("/pdf", handlers.UploadPDF)
		}

		// AI service routes - truy cập được cho tất cả user đã xác thực
		ai := api.Group("/ai")
		{
			// Parse CV từ đường dẫn file
			ai.POST("/parse-cv", handlers.ParseCVFromFile)
		}

		// Employee routes - truy cập được cho tất cả user đã xác thực
		employee := api.Group("/employee")
		{
			employee.GET("/notifications", handlers.GetCVRequests)
		}

		// General info routes - truy cập được cho tất cả user đã xác thực
		generalInfo := api.Group("/general-info")
		{
			// Lấy thông tin chung của phòng ban
			generalInfo.GET("/department", handlers.GetGeneralInfoOfDepartment)
			// Lấy thông tin chung về quản lý dự án
			generalInfo.GET("/project-management", handlers.GetGeneralInfoOfProjectManagement)
			// Lấy thống kê dashboard admin (chỉ Admin)
			generalInfo.GET("/admin-dashboard-stats", middleware.AdminOnly(), handlers.GetAdminDashboardStats)
		}
	}

	// Lấy port từ môi trường hoặc sử dụng mặc định
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	// Khởi động server
	serverAddr := fmt.Sprintf(":%s", port)
	log.Printf("Server đang khởi động trên port %s", port)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Lỗi khởi động server: %v", err)
	}
}
