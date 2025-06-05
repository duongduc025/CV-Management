package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// AdminDashboardStats represents the statistics for admin dashboard
type AdminDashboardStats struct {
	TotalUsers       int `json:"totalUsers"`
	TotalCVs         int `json:"totalCVs"`
	UpdatedCVs       int `json:"updatedCVs"`
	UpdateRequests   int `json:"updateRequests"`
	TotalProjects    int `json:"totalProjects"`
	TotalDepartments int `json:"totalDepartments"`
}

func GetGeneralInfoOfDepartment(c *gin.Context) {
	//Get the name of department and numbers of member in the department
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Get user roles from context
	roles, exists := c.Get("roles")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	// Convert roles to string slice
	roleSlice, ok := roles.([]string)
	if !ok {
		fmt.Printf("GetProjects: Invalid role format: %T = %v\n", roles, roles)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid role format",
		})
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		fmt.Printf("GetProjects: Invalid userID format: %T = %v\n", userID, userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid user ID format",
		})
		return
	}

	fmt.Printf("GetGeneralInfoOfDepartment: User ID: %v, Roles: %v\n", userIDStr, roleSlice)

	// First, get the user's department ID
	var userDepartmentID string
	err := database.DB.QueryRow(c, `
		SELECT department_id
		FROM users
		WHERE id = $1`, userIDStr).Scan(&userDepartmentID)

	if err != nil {
		fmt.Printf("GetGeneralInfoOfDepartment: Error getting user department: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving user department information",
		})
		return
	}

	if userDepartmentID == "" {
		fmt.Printf("GetGeneralInfoOfDepartment: User %s has no department assigned\n", userIDStr)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User has no department assigned",
		})
		return
	}

	// Get department information and member count
	var department models.Department
	var memberCount int

	err = database.DB.QueryRow(c, `
		SELECT d.id, d.name,
			(SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as member_count
		FROM departments d
		WHERE d.id = $1`, userDepartmentID).Scan(&department.ID, &department.Name, &memberCount)

	if err != nil {
		fmt.Printf("GetGeneralInfoOfDepartment: Error getting department info: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving department information",
		})
		return
	}

	// Prepare response data
	responseData := gin.H{
		"department": gin.H{
			"id":           department.ID,
			"name":         department.Name,
			"member_count": memberCount,
		},
	}

	fmt.Printf("GetGeneralInfoOfDepartment: Returning department %s with %d members\n", department.Name, memberCount)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   responseData,
	})
}

func GetGeneralInfoOfProjectManagement(c *gin.Context) {
	// Get the number of projects and total number of members in all projects for a user
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Get user roles from context
	roles, exists := c.Get("roles")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	// Convert roles to string slice
	roleSlice, ok := roles.([]string)
	if !ok {
		fmt.Printf("GetGeneralInfoOfProjectManagement: Invalid role format: %T = %v\n", roles, roles)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid role format",
		})
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		fmt.Printf("GetGeneralInfoOfProjectManagement: Invalid userID format: %T = %v\n", userID, userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid user ID format",
		})
		return
	}

	fmt.Printf("GetGeneralInfoOfProjectManagement: User ID: %v, Roles: %v\n", userIDStr, roleSlice)

	// Get project counts by status and total member count for the user
	var projectsNotStarted int
	var projectsInProgress int
	var projectsEnded int
	var totalMemberCount int

	// Query to get project counts by status
	err := database.DB.QueryRow(c, `
		SELECT
			COUNT(CASE WHEN p.start_date > CURRENT_DATE THEN 1 END) as not_started,
			COUNT(CASE WHEN p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 1 END) as in_progress,
			COUNT(CASE WHEN p.end_date < CURRENT_DATE THEN 1 END) as ended
		FROM project_members pm
		INNER JOIN projects p ON pm.project_id = p.id
		WHERE pm.user_id = $1
		  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)`, userIDStr).Scan(&projectsNotStarted, &projectsInProgress, &projectsEnded)

	if err != nil {
		fmt.Printf("GetGeneralInfoOfProjectManagement: Error getting project counts: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving project information",
		})
		return
	}

	// Query to get the total number of members across all projects the user is involved in
	err = database.DB.QueryRow(c, `
		SELECT COUNT(DISTINCT pm_all.user_id)
		FROM project_members pm_user
		INNER JOIN project_members pm_all ON pm_user.project_id = pm_all.project_id
		WHERE pm_user.user_id = $1
		  AND (pm_user.left_at IS NULL OR pm_user.left_at > CURRENT_DATE)
		  AND (pm_all.left_at IS NULL OR pm_all.left_at > CURRENT_DATE)`, userIDStr).Scan(&totalMemberCount)

	if err != nil {
		fmt.Printf("GetGeneralInfoOfProjectManagement: Error getting total member count: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving project member information",
		})
		return
	}

	// Calculate total project count
	totalProjectCount := projectsNotStarted + projectsInProgress + projectsEnded

	// Prepare response data
	responseData := gin.H{
		"project_management": gin.H{
			"total_project_count":  totalProjectCount,
			"projects_not_started": projectsNotStarted,
			"projects_in_progress": projectsInProgress,
			"projects_ended":       projectsEnded,
			"total_member_count":   totalMemberCount,
		},
	}

	fmt.Printf("GetGeneralInfoOfProjectManagement: User %s has %d total projects (Not Started: %d, In Progress: %d, Ended: %d) with total %d members\n",
		userIDStr, totalProjectCount, projectsNotStarted, projectsInProgress, projectsEnded, totalMemberCount)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   responseData,
	})
}

// GetAdminDashboardStats returns statistics for admin dashboard
func GetAdminDashboardStats(c *gin.Context) {
	fmt.Println("GetAdminDashboardStats: Fetching admin dashboard statistics")

	var stats AdminDashboardStats

	// Get total number of users
	err := database.DB.QueryRow(c, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting total users: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving user statistics",
		})
		return
	}

	// Get total number of CVs
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM cv").Scan(&stats.TotalCVs)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting total CVs: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving CV statistics",
		})
		return
	}

	// Get number of updated CVs
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM cv WHERE status = 'Đã cập nhật'").Scan(&stats.UpdatedCVs)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting updated CVs: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving updated CV statistics",
		})
		return
	}

	// Get number of CV update requests
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM cv_update_requests WHERE status = 'Đang yêu cầu'").Scan(&stats.UpdateRequests)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting update requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving update request statistics",
		})
		return
	}

	// Get total number of projects
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM projects").Scan(&stats.TotalProjects)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting total projects: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving project statistics",
		})
		return
	}

	// Get total number of departments
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM departments").Scan(&stats.TotalDepartments)
	if err != nil {
		fmt.Printf("GetAdminDashboardStats: Error getting total departments: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error retrieving department statistics",
		})
		return
	}

	fmt.Printf("GetAdminDashboardStats: Users: %d, CVs: %d, Updated CVs: %d, Update Requests: %d, Projects: %d, Departments: %d\n",
		stats.TotalUsers, stats.TotalCVs, stats.UpdatedCVs, stats.UpdateRequests, stats.TotalProjects, stats.TotalDepartments)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   stats,
	})
}
