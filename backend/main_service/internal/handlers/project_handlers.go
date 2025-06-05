package handlers

import (
	"fmt"
	"net/http"
	"slices"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetProjects returns a list of projects based on user role
func GetProjects(c *gin.Context) {
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

	fmt.Printf("GetProjects: User ID: %v, Roles: %v\n", userIDStr, roleSlice)

	// Role-based project access:
	// - Admin: Can see all projects
	// - PM: Can see projects they are members of
	// - Employee: Can see projects they are members of
	var projects []models.Project

	if slices.Contains(roleSlice, "Admin") {
		// Admin can see all projects
		fmt.Println("GetProjects: Admin access - fetching all projects")
		rows, err := database.DB.Query(c, `
			SELECT p.id, p.name, p.start_date, p.end_date
			FROM projects p
			ORDER BY p.name`)
		if err != nil {
			fmt.Printf("GetProjects error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error fetching projects",
			})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var project models.Project
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			projects = append(projects, project)
		}

		if err = rows.Err(); err != nil {
			fmt.Printf("GetProjects iteration error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error reading project data",
			})
			return
		}
	} else if slices.Contains(roleSlice, "PM") {
		// PM can see projects they are members of
		fmt.Printf("GetProjects: PM access - fetching projects for PM %s\n", userIDStr)
		rows, err := database.DB.Query(c, `
			SELECT DISTINCT p.id, p.name, p.start_date, p.end_date
			FROM projects p
			INNER JOIN project_members pm ON p.id = pm.project_id
			WHERE pm.user_id = $1
			  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
			ORDER BY p.name`, userIDStr)
		if err != nil {
			fmt.Printf("GetProjects error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error fetching projects",
			})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var project models.Project
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			projects = append(projects, project)
		}

		if err = rows.Err(); err != nil {
			fmt.Printf("GetProjects iteration error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error reading project data",
			})
			return
		}
	} else {
		// Employee can see projects they are members of
		fmt.Printf("GetProjects: Employee access - fetching projects for user %s\n", userIDStr)
		rows, err := database.DB.Query(c, `
			SELECT DISTINCT p.id, p.name, p.start_date, p.end_date
			FROM projects p
			INNER JOIN project_members pm ON p.id = pm.project_id
			WHERE pm.user_id = $1
			  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
			ORDER BY p.name`, userIDStr)
		if err != nil {
			fmt.Printf("GetProjects error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error fetching projects",
			})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var project models.Project
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			projects = append(projects, project)
		}

		if err = rows.Err(); err != nil {
			fmt.Printf("GetProjects iteration error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error reading project data",
			})
			return
		}
	}

	fmt.Printf("GetProjects: Returning %d projects for user %s\n", len(projects), userIDStr)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   projects,
	})
}

// GetProjectByID returns a specific project by ID
func GetProjectByID(c *gin.Context) {

}

// CreateProject creates a new project
func CreateProject(c *gin.Context) {
	// Get user ID from context (creator of the project)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		fmt.Printf("CreateProject: Invalid userID format: %T = %v\n", userID, userID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid user ID format",
		})
		return
	}

	var req models.ProjectCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("CreateProject binding error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid project data: " + err.Error(),
		})
		return
	}

	fmt.Printf("CreateProject: Received data: %+v from user: %s\n", req, userIDStr)

	// Create project struct
	project := models.Project{
		Name: req.Name,
	}

	// Parse dates if provided
	if req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			project.StartDate = startDate
		} else {
			fmt.Printf("CreateProject: Invalid start_date format: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid start_date format. Use YYYY-MM-DD",
			})
			return
		}
	}

	if req.EndDate != "" {
		if endDate, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			project.EndDate = endDate
		} else {
			fmt.Printf("CreateProject: Invalid end_date format: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid end_date format. Use YYYY-MM-DD",
			})
			return
		}
	}

	// Start database transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("CreateProject transaction error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting database transaction",
		})
		return
	}
	defer tx.Rollback(c) // Will be ignored if transaction is committed

	// Save project to database
	var projectID string
	var query string
	var args []interface{}

	if req.StartDate != "" && req.EndDate != "" {
		// Both dates provided
		query = `INSERT INTO projects (name, start_date, end_date) VALUES ($1, $2, $3) RETURNING id`
		args = []interface{}{project.Name, project.StartDate, project.EndDate}
	} else if req.StartDate != "" {
		// Only start date provided
		query = `INSERT INTO projects (name, start_date) VALUES ($1, $2) RETURNING id`
		args = []interface{}{project.Name, project.StartDate}
	} else if req.EndDate != "" {
		// Only end date provided
		query = `INSERT INTO projects (name, end_date) VALUES ($1, $2) RETURNING id`
		args = []interface{}{project.Name, project.EndDate}
	} else {
		// No dates provided
		query = `INSERT INTO projects (name) VALUES ($1) RETURNING id`
		args = []interface{}{project.Name}
	}

	err = tx.QueryRow(c, query, args...).Scan(&projectID)
	if err != nil {
		fmt.Printf("CreateProject database error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error creating project in database",
		})
		return
	}

	project.ID = projectID
	fmt.Printf("CreateProject: Successfully created project with ID: %s\n", projectID)

	// Add the creator as a project member with PM role
	memberQuery := `INSERT INTO project_members (project_id, user_id, role_in_project, joined_at) VALUES ($1, $2, $3, CURRENT_DATE)`
	_, err = tx.Exec(c, memberQuery, projectID, userIDStr, "PM")
	if err != nil {
		fmt.Printf("CreateProject member insert error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error adding creator as project member",
		})
		return
	}

	fmt.Printf("CreateProject: Successfully added user %s as PM of project %s\n", userIDStr, projectID)

	// Commit the transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("CreateProject commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing project creation",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   project,
	})
}

// UpdateProject updates an existing project
func UpdateProject(c *gin.Context) {
	id := c.Param("id")

	var projectData models.Project
	if err := c.ShouldBindJSON(&projectData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid project data",
		})
		return
	}

	// TODO: Update in database
	// Mock response for now
	projectData.ID = id

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   projectData,
	})
}

// AddProjectMember adds a member to a project
func AddProjectMember(c *gin.Context) {
	projectID := c.Param("id")
	fmt.Printf("AddProjectMember: Adding member to project %s\n", projectID)

	var memberData models.Member
	if err := c.ShouldBindJSON(&memberData); err != nil {
		fmt.Printf("AddProjectMember bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid member data",
		})
		return
	}

	// Validate required fields
	if memberData.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Check if project exists
	var projectExists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1)", projectID).Scan(&projectExists)
	if err != nil {
		fmt.Printf("AddProjectMember project check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking project existence",
		})
		return
	}

	if !projectExists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Project not found",
		})
		return
	}

	// Check if user exists
	var userExists bool
	err = database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", memberData.UserID).Scan(&userExists)
	if err != nil {
		fmt.Printf("AddProjectMember user check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking user existence",
		})
		return
	}

	if !userExists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Check if user is already a member of this project
	var memberExists bool
	err = database.DB.QueryRow(c,
		"SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND (left_at IS NULL OR left_at > CURRENT_DATE))",
		projectID, memberData.UserID).Scan(&memberExists)
	if err != nil {
		fmt.Printf("AddProjectMember member check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking member existence",
		})
		return
	}

	if memberExists {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "User is already a member of this project",
		})
		return
	}

	// Insert new project member
	memberData.ProjectID = projectID
	memberData.JoinedAt = time.Now()

	// Set default role if not provided
	if memberData.RoleInProject == "" {
		memberData.RoleInProject = "Developer"
	}

	query := `INSERT INTO project_members (project_id, user_id, role_in_project, joined_at) VALUES ($1, $2, $3, $4)`
	_, err = database.DB.Exec(c, query, memberData.ProjectID, memberData.UserID, memberData.RoleInProject, memberData.JoinedAt)
	if err != nil {
		fmt.Printf("AddProjectMember insert error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error adding member to project",
		})
		return
	}

	fmt.Printf("AddProjectMember: Successfully added user %s to project %s with role %s\n",
		memberData.UserID, projectID, memberData.RoleInProject)

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   memberData,
	})
}

// RemoveProjectMember removes a member from a project
func RemoveProjectMember(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.Param("userId")

	fmt.Printf("RemoveProjectMember: Removing user %s from project %s\n", userID, projectID)

	// Validate required parameters
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Project ID is required",
		})
		return
	}

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Check if project exists
	var projectExists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1)", projectID).Scan(&projectExists)
	if err != nil {
		fmt.Printf("RemoveProjectMember project check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking project existence",
		})
		return
	}

	if !projectExists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Project not found",
		})
		return
	}

	// Check if user exists
	var userExists bool
	err = database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&userExists)
	if err != nil {
		fmt.Printf("RemoveProjectMember user check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking user existence",
		})
		return
	}

	if !userExists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User not found",
		})
		return
	}

	// Check if user is currently a member of this project (not already left)
	var memberExists bool
	err = database.DB.QueryRow(c,
		"SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 AND (left_at IS NULL OR left_at > CURRENT_DATE))",
		projectID, userID).Scan(&memberExists)
	if err != nil {
		fmt.Printf("RemoveProjectMember member check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking member existence",
		})
		return
	}

	if !memberExists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User is not currently a member of this project",
		})
		return
	}

	// Update the project member record to set left_at to current date (soft delete)
	query := `UPDATE project_members SET left_at = CURRENT_DATE WHERE project_id = $1 AND user_id = $2`
	result, err := database.DB.Exec(c, query, projectID, userID)
	if err != nil {
		fmt.Printf("RemoveProjectMember update error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error removing member from project",
		})
		return
	}

	// Check if any rows were affected
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("RemoveProjectMember: No rows affected for project %s, user %s\n", projectID, userID)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Member not found in project",
		})
		return
	}

	fmt.Printf("RemoveProjectMember: Successfully removed user %s from project %s\n", userID, projectID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Member removed from project",
		"data": gin.H{
			"project_id": projectID,
			"user_id":    userID,
		},
	})
}

func GetAllMembersOfAllProjects(c *gin.Context) {
	// Get user ID from context for authorization
	requestUserID, exists := c.Get("userID")
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
		fmt.Printf("GetAllMembersOfAllProjects: Invalid role format: %T = %v\n", roles, roles)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid role format",
		})
		return
	}

	requestUserIDStr, ok := requestUserID.(string)
	if !ok {
		fmt.Printf("GetAllMembersOfAllProjects: Invalid userID format: %T = %v\n", requestUserID, requestUserID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Server error - invalid user ID format",
		})
		return
	}

	fmt.Printf("GetAllMembersOfAllProjects: Request from PM user %s, Roles: %v\n", requestUserIDStr, roleSlice)

	// Only PM can access this function
	if !slices.Contains(roleSlice, "PM") {
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Access denied - only PM can access project members",
		})
		return
	}

	// PM can see all members of projects they are involved in
	fmt.Printf("GetAllMembersOfAllProjects: PM access - fetching project members for PM %s\n", requestUserIDStr)

	query := `
		SELECT DISTINCT
			pm.project_id,
			pm.user_id,
			pm.role_in_project,
			pm.joined_at,
			pm.left_at,
			p.name as project_name,
			u.id,
			u.employee_code,
			u.full_name,
			u.email,
			d.id,
			d.name
		FROM project_members pm
		INNER JOIN projects p ON pm.project_id = p.id
		INNER JOIN users u ON pm.user_id = u.id
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN project_members pm_check ON p.id = pm_check.project_id
		WHERE pm_check.user_id = $1
		  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		  AND (pm_check.left_at IS NULL OR pm_check.left_at > CURRENT_DATE)
		ORDER BY p.name, pm.joined_at`
	args := []interface{}{requestUserIDStr}

	// Execute query
	rows, err := database.DB.Query(c, query, args...)
	if err != nil {
		fmt.Printf("GetAllMembersOfAllProjects error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching project members",
		})
		return
	}
	defer rows.Close()

	// Structure to hold member with project info
	type MemberWithProject struct {
		models.Member
		ProjectName string `json:"project_name"`
	}

	var members []MemberWithProject
	for rows.Next() {
		var member MemberWithProject
		var user models.User
		var department models.Department
		var leftAt *time.Time
		var departmentID *string
		var departmentName *string

		err := rows.Scan(
			&member.ProjectID,
			&member.UserID,
			&member.RoleInProject,
			&member.JoinedAt,
			&leftAt,
			&member.ProjectName,
			&user.ID,
			&user.EmployeeCode,
			&user.FullName,
			&user.Email,
			&departmentID,
			&departmentName,
		)
		if err != nil {
			fmt.Printf("GetAllMembersOfAllProjects scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing member data",
			})
			return
		}

		// Set optional fields
		if leftAt != nil {
			member.LeftAt = *leftAt
		}

		if departmentID != nil && departmentName != nil {
			department.ID = *departmentID
			department.Name = *departmentName
			user.Department = department
		}

		member.User = user
		members = append(members, member)
	}

	// Check for errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetAllMembersOfAllProjects iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading member data",
		})
		return
	}

	fmt.Printf("GetAllMembersOfAllProjects: Returning %d members for request from user %s\n", len(members), requestUserIDStr)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   members,
	})
}
