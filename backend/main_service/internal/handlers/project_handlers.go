package handlers

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetProjects returns a list of projects based on user role
func GetProjects(c *gin.Context) {
	// Lấy user ID từ context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Lấy user roles từ context
	roles, exists := c.Get("roles")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	// Chuyển đổi roles thành string slice
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

	// Kiểm soát truy cập dự án dựa trên vai trò:
	// - Admin: Có thể xem tất cả dự án
	// - PM: Có thể xem dự án mà họ là thành viên
	// - Employee: Có thể xem dự án mà họ là thành viên
	var projects []models.Project

	if slices.Contains(roleSlice, "Admin") {
		// Admin có thể xem tất cả dự án với số lượng thành viên
		fmt.Println("GetProjects: Quyền Admin - lấy tất cả dự án với số lượng thành viên")
		rows, err := database.DB.Query(c, `
			SELECT p.id, p.name, p.start_date, p.end_date,
				   COALESCE(member_count.count, 0) as member_count
			FROM projects p
			LEFT JOIN (
				SELECT project_id, COUNT(*) as count
				FROM project_members
				WHERE left_at IS NULL OR left_at > CURRENT_DATE
				GROUP BY project_id
			) member_count ON p.id = member_count.project_id
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
			var memberCount int
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate, &memberCount)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			project.MemberCount = memberCount
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
		// PM có thể xem dự án mà họ có vai trò PM với số lượng thành viên
		fmt.Printf("GetProjects: Quyền PM - lấy dự án mà user %s có vai trò PM với số lượng thành viên\n", userIDStr)
		rows, err := database.DB.Query(c, `
			SELECT DISTINCT p.id, p.name, p.start_date, p.end_date,
				   COALESCE(member_count.count, 0) as member_count
			FROM projects p
			INNER JOIN project_members pm ON p.id = pm.project_id
			LEFT JOIN (
				SELECT project_id, COUNT(*) as count
				FROM project_members
				WHERE left_at IS NULL OR left_at > CURRENT_DATE
				GROUP BY project_id
			) member_count ON p.id = member_count.project_id
			WHERE pm.user_id = $1
			  AND pm.role_in_project = 'PM'
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
			var memberCount int
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate, &memberCount)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			project.MemberCount = memberCount
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
		// Employee có thể xem dự án mà họ là thành viên với số lượng thành viên
		fmt.Printf("GetProjects: Quyền Employee - lấy dự án cho user %s với số lượng thành viên\n", userIDStr)
		rows, err := database.DB.Query(c, `
			SELECT DISTINCT p.id, p.name, p.start_date, p.end_date,
				   COALESCE(member_count.count, 0) as member_count
			FROM projects p
			INNER JOIN project_members pm ON p.id = pm.project_id
			LEFT JOIN (
				SELECT project_id, COUNT(*) as count
				FROM project_members
				WHERE left_at IS NULL OR left_at > CURRENT_DATE
				GROUP BY project_id
			) member_count ON p.id = member_count.project_id
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
			var memberCount int
			err := rows.Scan(&project.ID, &project.Name, &project.StartDate, &project.EndDate, &memberCount)
			if err != nil {
				fmt.Printf("GetProjects scan error: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"status":  "error",
					"message": "Error parsing project data",
				})
				return
			}
			project.MemberCount = memberCount
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

	fmt.Printf("GetProjects: Trả về %d dự án cho user %s\n", len(projects), userIDStr)
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
	// Lấy user ID từ context (người tạo dự án)
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

	fmt.Printf("CreateProject: Nhận dữ liệu: %+v từ user: %s\n", req, userIDStr)

	// Tạo struct project
	project := models.Project{
		Name: req.Name,
	}

	// Parse dates nếu được cung cấp
	if req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			project.StartDate = startDate
		} else {
			fmt.Printf("CreateProject: Định dạng start_date không hợp lệ: %v\n", err)
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
			fmt.Printf("CreateProject: Định dạng end_date không hợp lệ: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid end_date format. Use YYYY-MM-DD",
			})
			return
		}
	}

	// Bắt đầu database transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("CreateProject transaction error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting database transaction",
		})
		return
	}
	defer tx.Rollback(c) // Sẽ bị bỏ qua nếu transaction được commit

	// Lưu project vào database
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
	fmt.Printf("CreateProject: Tạo thành công project với ID: %s\n", projectID)

	// Thêm người tạo làm thành viên dự án với vai trò PM
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

	fmt.Printf("CreateProject: Thêm thành công user %s làm PM của project %s\n", userIDStr, projectID)

	// Commit transaction
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

// CreateProjectWithPM creates a new project and assigns a PM (Admin only)
func CreateProjectWithPM(c *gin.Context) {
	fmt.Println("CreateProjectWithPM: Bắt đầu tạo project với phân công PM")

	var projectData models.AdminProjectCreateRequest
	if err := c.ShouldBindJSON(&projectData); err != nil {
		fmt.Printf("CreateProjectWithPM bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid project data",
		})
		return
	}

	fmt.Printf("CreateProjectWithPM: Dữ liệu project: %+v\n", projectData)

	// Xác thực các trường bắt buộc
	if projectData.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Project name is required",
		})
		return
	}

	if projectData.PMUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "PM user ID is required",
		})
		return
	}

	// Xác minh rằng PM user tồn tại và có vai trò PM
	var pmExists bool
	var pmHasPMRole bool

	// Kiểm tra user có tồn tại không
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", projectData.PMUserID).Scan(&pmExists)
	if err != nil {
		fmt.Printf("CreateProjectWithPM user check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error validating PM user",
		})
		return
	}

	if !pmExists {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Selected PM user does not exist",
		})
		return
	}

	// Kiểm tra user có vai trò PM không
	err = database.DB.QueryRow(c, `
		SELECT EXISTS(
			SELECT 1 FROM user_roles ur
			JOIN roles r ON ur.role_id = r.id
			WHERE ur.user_id = $1 AND r.name = 'PM'
		)`, projectData.PMUserID).Scan(&pmHasPMRole)
	if err != nil {
		fmt.Printf("CreateProjectWithPM PM role check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error validating PM role",
		})
		return
	}

	if !pmHasPMRole {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Selected user does not have PM role",
		})
		return
	}

	// Bắt đầu transaction
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("CreateProjectWithPM transaction error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Parse dates nếu được cung cấp
	var startDate, endDate interface{}
	if projectData.StartDate != "" {
		parsedStartDate, err := time.Parse("2006-01-02", projectData.StartDate)
		if err != nil {
			fmt.Printf("CreateProjectWithPM start date parse error: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid start date format. Use YYYY-MM-DD",
			})
			return
		}
		startDate = parsedStartDate
	}

	if projectData.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", projectData.EndDate)
		if err != nil {
			fmt.Printf("CreateProjectWithPM end date parse error: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid end date format. Use YYYY-MM-DD",
			})
			return
		}
		endDate = parsedEndDate
	}

	// Tạo project
	var projectID string
	query := `INSERT INTO projects (id, name, start_date, end_date) VALUES (uuid_generate_v4(), $1, $2, $3) RETURNING id`
	err = tx.QueryRow(c, query, projectData.Name, startDate, endDate).Scan(&projectID)
	if err != nil {
		fmt.Printf("CreateProjectWithPM project insert error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error creating project",
		})
		return
	}

	fmt.Printf("CreateProjectWithPM: Tạo thành công project với ID: %s\n", projectID)

	// Thêm PM được chọn làm thành viên dự án với vai trò PM
	memberQuery := `INSERT INTO project_members (project_id, user_id, role_in_project, joined_at) VALUES ($1, $2, $3, CURRENT_DATE)`
	_, err = tx.Exec(c, memberQuery, projectID, projectData.PMUserID, "PM")
	if err != nil {
		fmt.Printf("CreateProjectWithPM member insert error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error adding PM to project",
		})
		return
	}

	fmt.Printf("CreateProjectWithPM: Thêm thành công PM %s vào project %s\n", projectData.PMUserID, projectID)

	// Commit transaction
	if err = tx.Commit(c); err != nil {
		fmt.Printf("CreateProjectWithPM commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing transaction",
		})
		return
	}

	// Tạo đối tượng response project
	project := models.Project{
		ID:   projectID,
		Name: projectData.Name,
	}

	if startDate != nil {
		if sd, ok := startDate.(time.Time); ok {
			project.StartDate = sd
		}
	}

	if endDate != nil {
		if ed, ok := endDate.(time.Time); ok {
			project.EndDate = ed
		}
	}

	fmt.Printf("CreateProjectWithPM: Tạo thành công project %s với PM %s\n", project.Name, projectData.PMUserID)

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   project,
	})
}

// UpdateProject updates an existing project
func UpdateProject(c *gin.Context) {
	id := c.Param("id")
	fmt.Printf("UpdateProject: Cập nhật project %s\n", id)

	// Sử dụng struct tùy chỉnh để xử lý date strings đúng cách
	var req struct {
		Name      string `json:"name"`
		StartDate string `json:"start_date,omitempty"`
		EndDate   string `json:"end_date,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("UpdateProject bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid project data",
		})
		return
	}

	fmt.Printf("UpdateProject: Nhận dữ liệu: %+v\n", req)

	// Xác thực các trường bắt buộc
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Project name is required",
		})
		return
	}

	// Kiểm tra project có tồn tại không
	var projectExists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1)", id).Scan(&projectExists)
	if err != nil {
		fmt.Printf("UpdateProject project check error: %v\n", err)
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

	// Parse dates nếu được cung cấp
	var startDate *time.Time
	var endDate *time.Time

	if req.StartDate != "" {
		if parsedStartDate, err := time.Parse("2006-01-02", req.StartDate); err == nil {
			startDate = &parsedStartDate
		} else {
			fmt.Printf("UpdateProject: Định dạng start_date không hợp lệ: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid start_date format. Use YYYY-MM-DD",
			})
			return
		}
	}

	if req.EndDate != "" {
		if parsedEndDate, err := time.Parse("2006-01-02", req.EndDate); err == nil {
			endDate = &parsedEndDate
		} else {
			fmt.Printf("UpdateProject: Định dạng end_date không hợp lệ: %v\n", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"status":  "error",
				"message": "Invalid end_date format. Use YYYY-MM-DD",
			})
			return
		}
	}

	// Xây dựng dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
	args = append(args, req.Name)
	argIndex++

	// Handle optional start_date
	if startDate != nil {
		setParts = append(setParts, fmt.Sprintf("start_date = $%d", argIndex))
		args = append(args, *startDate)
		argIndex++
	} else {
		setParts = append(setParts, fmt.Sprintf("start_date = $%d", argIndex))
		args = append(args, nil)
		argIndex++
	}

	// Handle optional end_date
	if endDate != nil {
		setParts = append(setParts, fmt.Sprintf("end_date = $%d", argIndex))
		args = append(args, *endDate)
		argIndex++
	} else {
		setParts = append(setParts, fmt.Sprintf("end_date = $%d", argIndex))
		args = append(args, nil)
		argIndex++
	}

	// Add project ID as the last parameter for WHERE clause
	args = append(args, id)

	query := fmt.Sprintf("UPDATE projects SET %s WHERE id = $%d", strings.Join(setParts, ", "), argIndex)

	fmt.Printf("UpdateProject query: %s\n", query)
	fmt.Printf("UpdateProject args: %v\n", args)

	result, err := database.DB.Exec(c, query, args...)
	if err != nil {
		fmt.Printf("UpdateProject update error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating project",
		})
		return
	}

	// Kiểm tra có rows nào bị ảnh hưởng không
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("UpdateProject: Không có rows bị ảnh hưởng cho project %s\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Project not found",
		})
		return
	}

	// Lấy project đã cập nhật để trả về
	var updatedProject models.Project
	err = database.DB.QueryRow(c,
		"SELECT id, name, start_date, end_date FROM projects WHERE id = $1",
		id).Scan(&updatedProject.ID, &updatedProject.Name, &updatedProject.StartDate, &updatedProject.EndDate)
	if err != nil {
		fmt.Printf("UpdateProject fetch error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching updated project",
		})
		return
	}

	fmt.Printf("UpdateProject: Cập nhật thành công project %s\n", id)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   updatedProject,
	})
}

// DeleteProject deletes an existing project
func DeleteProject(c *gin.Context) {
	id := c.Param("id")
	fmt.Printf("DeleteProject: Xóa project %s\n", id)

	// Kiểm tra project có tồn tại không
	var projectExists bool
	var projectName string
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1), COALESCE((SELECT name FROM projects WHERE id = $1), '')", id).Scan(&projectExists, &projectName)
	if err != nil {
		fmt.Printf("DeleteProject project check error: %v\n", err)
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

	// Kiểm tra project có thành viên nào không (cảnh báo tùy chọn, nhưng chúng ta vẫn cho phép xóa)
	var memberCount int
	err = database.DB.QueryRow(c,
		"SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND (left_at IS NULL OR left_at > CURRENT_DATE)",
		id).Scan(&memberCount)
	if err != nil {
		fmt.Printf("DeleteProject member count error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking project members",
		})
		return
	}

	fmt.Printf("DeleteProject: Project %s có %d thành viên đang hoạt động\n", id, memberCount)

	// Bắt đầu database transaction để xóa an toàn
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("DeleteProject transaction error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting database transaction",
		})
		return
	}
	defer tx.Rollback(c) // Sẽ bị bỏ qua nếu transaction được commit

	// Đầu tiên, xóa tất cả thành viên dự án (hard delete để tránh ràng buộc foreign key)
	_, err = tx.Exec(c, "DELETE FROM project_members WHERE project_id = $1", id)
	if err != nil {
		fmt.Printf("DeleteProject member removal error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error removing project members",
		})
		return
	}

	// Xóa project
	result, err := tx.Exec(c, "DELETE FROM projects WHERE id = $1", id)
	if err != nil {
		fmt.Printf("DeleteProject delete error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting project",
		})
		return
	}

	// Kiểm tra có rows nào bị ảnh hưởng không
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("DeleteProject: Không có rows bị ảnh hưởng cho project %s\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Project not found",
		})
		return
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("DeleteProject commit error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing project deletion",
		})
		return
	}

	fmt.Printf("DeleteProject: Xóa thành công project %s (%s) với %d thành viên\n", id, projectName, memberCount)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Project '%s' deleted successfully", projectName),
		"data": gin.H{
			"id":           id,
			"name":         projectName,
			"member_count": memberCount,
		},
	})
}

// AddProjectMember adds a member to a project
func AddProjectMember(c *gin.Context) {
	projectID := c.Param("id")
	fmt.Printf("AddProjectMember: Thêm thành viên vào project %s\n", projectID)

	var memberData models.Member
	if err := c.ShouldBindJSON(&memberData); err != nil {
		fmt.Printf("AddProjectMember bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid member data",
		})
		return
	}

	// Xác thực các trường bắt buộc
	if memberData.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "User ID is required",
		})
		return
	}

	// Kiểm tra project có tồn tại không
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

	// Kiểm tra user có tồn tại không
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

	// Kiểm tra user đã là thành viên của project này chưa
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

	// Chèn thành viên dự án mới
	memberData.ProjectID = projectID
	memberData.JoinedAt = time.Now()

	// Đặt vai trò mặc định nếu không được cung cấp
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

	fmt.Printf("AddProjectMember: Thêm thành công user %s vào project %s với vai trò %s\n",
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

	fmt.Printf("RemoveProjectMember: Xóa user %s khỏi project %s\n", userID, projectID)

	// Xác thực các tham số bắt buộc
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

	// Kiểm tra project có tồn tại không
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

	// Kiểm tra user có tồn tại không
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

	// Kiểm tra user hiện tại có phải là thành viên của project này không (chưa rời đi)
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

	// Cập nhật bản ghi thành viên dự án để đặt left_at thành ngày hiện tại (soft delete)
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

	// Kiểm tra có rows nào bị ảnh hưởng không
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("RemoveProjectMember: Không có rows bị ảnh hưởng cho project %s, user %s\n", projectID, userID)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Member not found in project",
		})
		return
	}

	fmt.Printf("RemoveProjectMember: Xóa thành công user %s khỏi project %s\n", userID, projectID)

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
	// Lấy user ID từ context để xác thực
	requestUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	// Lấy user roles từ context
	roles, exists := c.Get("roles")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user roles not found",
		})
		return
	}

	// Chuyển đổi roles thành string slice
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

	fmt.Printf("GetAllMembersOfAllProjects: Yêu cầu từ PM user %s, Roles: %v\n", requestUserIDStr, roleSlice)

	// Chỉ PM mới có thể truy cập function này
	if !slices.Contains(roleSlice, "PM") {
		c.JSON(http.StatusForbidden, gin.H{
			"status":  "error",
			"message": "Access denied - only PM can access project members",
		})
		return
	}

	// PM có thể xem tất cả thành viên của dự án mà họ có vai trò PM, được nhóm theo user
	fmt.Printf("GetAllMembersOfAllProjects: Quyền PM - lấy thành viên dự án được nhóm cho các dự án mà user %s có vai trò PM\n", requestUserIDStr)

	query := `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department_id,
		       COALESCE(d.name, '') as department_name,
		       COALESCE(string_agg(p.name, ', ' ORDER BY p.name), '') as project_names
		FROM users u
		LEFT JOIN departments d ON u.department_id = d.id
		INNER JOIN project_members pm ON u.id = pm.user_id
		INNER JOIN projects p ON pm.project_id = p.id
		INNER JOIN project_members pm_check ON p.id = pm_check.project_id
		WHERE pm_check.user_id = $1
		  AND pm_check.role_in_project = 'PM'
		  AND (pm.left_at IS NULL OR pm.left_at > CURRENT_DATE)
		  AND (pm_check.left_at IS NULL OR pm_check.left_at > CURRENT_DATE)
		GROUP BY u.id, u.employee_code, u.full_name, u.email, u.department_id, d.name
		ORDER BY u.full_name`

	// Thực thi query
	rows, err := database.DB.Query(c, query, requestUserIDStr)
	if err != nil {
		fmt.Printf("GetAllMembersOfAllProjects error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching grouped project members",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var deptName string
		var projectNames string

		err := rows.Scan(&user.ID, &user.EmployeeCode, &user.FullName,
			&user.Email, &user.DepartmentID, &deptName, &projectNames)
		if err != nil {
			fmt.Printf("GetAllMembersOfAllProjects scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing user data",
			})
			return
		}

		// Đặt department nếu có
		if user.DepartmentID != "" && deptName != "" {
			user.Department = models.Department{
				ID:   user.DepartmentID,
				Name: deptName,
			}
		}

		// Chuyển đổi chuỗi tên dự án thành slice
		if projectNames != "" {
			user.Projects = strings.Split(projectNames, ", ")
		} else {
			user.Projects = []string{}
		}

		// Lấy user roles
		userRoles, err := getUserRoles(c, user.ID)
		if err != nil {
			fmt.Printf("Cảnh báo: Không thể lấy roles cho user %s: %v\n", user.ID, err)
		} else {
			user.Roles = userRoles
		}

		users = append(users, user)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetAllMembersOfAllProjects iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading user data",
		})
		return
	}

	fmt.Printf("GetAllMembersOfAllProjects: Trả về %d users cho yêu cầu từ user %s\n", len(users), requestUserIDStr)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   users,
	})
}
