package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetDepartments trả về tất cả phòng ban (endpoint public cho đăng ký)
func GetDepartments(c *gin.Context) {
	fmt.Println("GetDepartments: Fetching all departments")

	rows, err := database.DB.Query(c, "SELECT id, name FROM departments ORDER BY name")
	if err != nil {
		fmt.Printf("GetDepartments error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching departments",
		})
		return
	}
	defer rows.Close()

	var departments []models.Department
	for rows.Next() {
		var dept models.Department
		if err := rows.Scan(&dept.ID, &dept.Name); err != nil {
			fmt.Printf("GetDepartments scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing department data",
			})
			return
		}
		departments = append(departments, dept)
	}

	if err = rows.Err(); err != nil {
		fmt.Printf("GetDepartments iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading department data",
		})
		return
	}

	fmt.Printf("GetDepartments: Returning %d departments\n", len(departments))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   departments,
	})
}

// GetDepartmentsWithStats trả về tất cả phòng ban với số lượng thành viên và thông tin quản lý (chỉ Admin)
func GetDepartmentsWithStats(c *gin.Context) {
	fmt.Println("GetDepartmentsWithStats: Fetching departments with statistics")

	rows, err := database.DB.Query(c, `
		SELECT
			d.id,
			d.name,
			COALESCE(member_count.count, 0) as member_count
		FROM departments d
		LEFT JOIN (
			SELECT department_id, COUNT(*) as count
			FROM users
			WHERE department_id IS NOT NULL
			GROUP BY department_id
		) member_count ON d.id = member_count.department_id
		ORDER BY d.name`)
	if err != nil {
		fmt.Printf("GetDepartmentsWithStats error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching departments with statistics",
		})
		return
	}
	defer rows.Close()

	type DepartmentWithStats struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		MemberCount int    `json:"member_count"`
		ManagerName string `json:"manager_name"`
		ManagerID   string `json:"manager_id"`
	}

	var departments []DepartmentWithStats
	for rows.Next() {
		var dept DepartmentWithStats
		if err := rows.Scan(&dept.ID, &dept.Name, &dept.MemberCount); err != nil {
			fmt.Printf("GetDepartmentsWithStats scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error parsing department data",
			})
			return
		}

		var managerID, managerName string
		managerQuery := `
			SELECT u.id, u.full_name
			FROM users u
			JOIN user_roles ur ON u.id = ur.user_id
			JOIN roles r ON ur.role_id = r.id
			WHERE u.department_id = $1 AND r.name = 'BUL/Lead'
			LIMIT 1`

		err := database.DB.QueryRow(c, managerQuery, dept.ID).Scan(&managerID, &managerName)
		if err != nil {
			fmt.Printf("No BUL/Lead manager found for department %s (%s): %v\n", dept.Name, dept.ID, err)
			dept.ManagerName = "Chưa có"
			dept.ManagerID = ""
		} else {
			dept.ManagerName = managerName
			dept.ManagerID = managerID
			fmt.Printf("Found BUL/Lead manager for department %s: %s (%s)\n", dept.Name, managerName, managerID)
		}

		departments = append(departments, dept)
	}

	if err = rows.Err(); err != nil {
		fmt.Printf("GetDepartmentsWithStats iteration error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error reading department data",
		})
		return
	}

	fmt.Printf("GetDepartmentsWithStats: Returning %d departments with stats\n", len(departments))
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   departments,
	})
}

// CreateDepartment tạo phòng ban mới (chỉ Admin)
func CreateDepartment(c *gin.Context) {
	fmt.Println("CreateDepartment: Creating new department")

	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("CreateDepartment bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid department data",
		})
		return
	}

	fmt.Printf("CreateDepartment: Creating department with name: %s\n", req.Name)

	var exists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM departments WHERE name = $1)", req.Name).Scan(&exists)
	if err != nil {
		fmt.Printf("CreateDepartment existence check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking department existence",
		})
		return
	}

	if exists {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "Department name already exists",
		})
		return
	}

	var departmentID string
	err = database.DB.QueryRow(c, "INSERT INTO departments (name) VALUES ($1) RETURNING id", req.Name).Scan(&departmentID)
	if err != nil {
		fmt.Printf("CreateDepartment insert error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error creating department",
		})
		return
	}

	department := models.Department{
		ID:   departmentID,
		Name: req.Name,
	}

	fmt.Printf("CreateDepartment: Successfully created department %s with ID %s\n", req.Name, departmentID)

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data":   department,
	})
}

// UpdateDepartment cập nhật phòng ban hiện có (chỉ Admin)
func UpdateDepartment(c *gin.Context) {
	id := c.Param("id")
	fmt.Printf("UpdateDepartment: Updating department %s\n", id)

	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("UpdateDepartment bind error: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid department data",
		})
		return
	}

	fmt.Printf("UpdateDepartment: Updating department %s with name: %s\n", id, req.Name)

	var exists bool
	err := database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM departments WHERE id = $1)", id).Scan(&exists)
	if err != nil {
		fmt.Printf("UpdateDepartment existence check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking department existence",
		})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Department not found",
		})
		return
	}

	var nameExists bool
	err = database.DB.QueryRow(c, "SELECT EXISTS(SELECT 1 FROM departments WHERE name = $1 AND id != $2)", req.Name, id).Scan(&nameExists)
	if err != nil {
		fmt.Printf("UpdateDepartment name check error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking department name",
		})
		return
	}

	if nameExists {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": "Department name already exists",
		})
		return
	}

	result, err := database.DB.Exec(c, "UPDATE departments SET name = $1 WHERE id = $2", req.Name, id)
	if err != nil {
		fmt.Printf("UpdateDepartment update error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating department",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("UpdateDepartment: No rows affected for department %s\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Department not found",
		})
		return
	}

	department := models.Department{
		ID:   id,
		Name: req.Name,
	}

	fmt.Printf("UpdateDepartment: Successfully updated department %s\n", id)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   department,
	})
}

// DeleteDepartment xóa phòng ban hiện có (chỉ Admin)
func DeleteDepartment(c *gin.Context) {
	id := c.Param("id")
	fmt.Printf("DeleteDepartment: Deleting department %s\n", id)

	var departmentName string
	err := database.DB.QueryRow(c, "SELECT name FROM departments WHERE id = $1", id).Scan(&departmentName)
	if err != nil {
		fmt.Printf("DeleteDepartment existence check error: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Department not found",
		})
		return
	}

	var userCount int
	err = database.DB.QueryRow(c, "SELECT COUNT(*) FROM users WHERE department_id = $1", id).Scan(&userCount)
	if err != nil {
		fmt.Printf("DeleteDepartment user count error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error checking department users",
		})
		return
	}

	if userCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Cannot delete department. It has %d users assigned to it", userCount),
		})
		return
	}

	result, err := database.DB.Exec(c, "DELETE FROM departments WHERE id = $1", id)
	if err != nil {
		fmt.Printf("DeleteDepartment delete error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error deleting department",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("DeleteDepartment: No rows affected for department %s\n", id)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Department not found",
		})
		return
	}

	fmt.Printf("DeleteDepartment: Successfully deleted department %s (%s)\n", id, departmentName)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Department '%s' deleted successfully", departmentName),
		"data": gin.H{
			"id":   id,
			"name": departmentName,
		},
	})
}
