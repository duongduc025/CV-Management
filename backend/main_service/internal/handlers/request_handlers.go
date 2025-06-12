package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/database"
	"github.com/vdt/cv-management/internal/models"
)

// GetCVRequests returns all CV update requests for a user
func GetCVRequests(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetCVRequests: Lấy CV requests cho user %v\n", userID)

	// Query để lấy tất cả CV update requests cho user với tên người yêu cầu
	rows, err := database.DB.Query(c,
		`SELECT cur.id, cur.cv_id, cur.requested_by, u.full_name, cur.requested_at, cur.status, cur.is_read, cur.content
		FROM cv_update_requests cur
		JOIN users u ON cur.requested_by = u.id
		JOIN cv ON cur.cv_id = cv.id
		WHERE cv.user_id = $1
		ORDER BY cur.requested_at DESC`, userID)

	if err != nil {
		fmt.Printf("GetCVRequests: Lỗi khi query CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching CV update requests",
		})
		return
	}
	defer rows.Close()

	// Xử lý kết quả query
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, requesterName, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requesterName, &requestedAt, &status, &isRead, &content)
		if err != nil {
			fmt.Printf("GetCVRequests: Lỗi khi scan row: %v\n", err)
			continue
		}

		// Tạo notification message dựa trên content
		var notificationMessage string
		if content != nil && *content != "" {
			notificationMessage = fmt.Sprintf("%s với lời nhắn: \"%s\"", requesterName, *content)
		} else {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV. Vui lòng cập nhật CV của bạn trong thời gian sớm nhất.", requesterName)
		}

		// Tạo request object với các trường bổ sung cho notifications
		request := map[string]any{
			"id":             id,
			"cv_id":          cvID,
			"requested_by":   requestedBy,
			"requester_name": requesterName,
			"requested_at":   requestedAt.Format(time.RFC3339),
			"status":         status,
			"is_read":        isRead,
			"content":        content,
			// Các trường bổ sung cho notification compatibility
			"type":      "cv_update_request",
			"title":     "Yêu cầu cập nhật CV",
			"message":   notificationMessage,
			"timestamp": requestedAt.Unix(),
			"read":      isRead, // Sử dụng trạng thái đọc thực tế từ database
		}

		requests = append(requests, request)
	}

	// Kiểm tra lỗi trong quá trình iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetCVRequests: Lỗi trong quá trình row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing CV update requests",
		})
		return
	}

	fmt.Printf("GetCVRequests: Lấy thành công %d CV requests cho user %v\n", len(requests), userID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// CreateCVRequest creates a new CV update request
func CreateCVRequest(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	requestedByID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	var request struct {
		CVID    string `json:"cv_id" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
		})
		return
	}

	fmt.Printf("CreateCVRequest: Tạo request cho CV %s bởi user %v\n", request.CVID, requestedByID)

	// Kiểm tra CV có tồn tại và lấy user_id và status
	var cvOwnerID, cvStatus string
	err := database.DB.QueryRow(c, "SELECT user_id, status FROM cv WHERE id = $1", request.CVID).Scan(&cvOwnerID, &cvStatus)
	if err != nil {
		fmt.Printf("CreateCVRequest: Lỗi khi tìm CV: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV not found",
		})
		return
	}

	// Ngăn users tạo CV update requests cho CV của chính họ
	if cvOwnerID == requestedByID.(string) {
		fmt.Printf("CreateCVRequest: User %v cố gắng tạo request cho CV của chính mình %s\n", requestedByID, request.CVID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "error",
			"message": "Bạn không thể tạo yêu cầu cập nhật cho CV của chính mình",
		})
		return
	}

	// Kiểm tra trạng thái CV trước khi tạo request
	if cvStatus == "Chưa cập nhật" {
		fmt.Printf("CreateCVRequest: CV %s đã ở trạng thái 'Chưa cập nhật', gửi status message\n", request.CVID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "CV đang trong trạng thái chờ cập nhật",
		})
		return
	}

	// Nếu CV ở trạng thái "Đã cập nhật" hoặc "Hủy yêu cầu", cập nhật thành "Chưa cập nhật"
	if cvStatus == "Đã cập nhật" || cvStatus == "Hủy yêu cầu" {
		fmt.Printf("CreateCVRequest: Cập nhật CV %s status từ '%s' thành 'Chưa cập nhật'\n", request.CVID, cvStatus)
		_, err = database.DB.Exec(c,
			"UPDATE cv SET status = 'Chưa cập nhật' WHERE id = $1",
			request.CVID)

		if err != nil {
			fmt.Printf("CreateCVRequest: Lỗi khi cập nhật CV status: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV status",
			})
			return
		}
		fmt.Printf("CreateCVRequest: Cập nhật thành công CV %s status thành 'Chưa cập nhật'\n", request.CVID)
	}

	// Kiểm tra có request đang hoạt động cho CV này không và hủy nó
	var existingRequestID string
	err = database.DB.QueryRow(c,
		"SELECT id FROM cv_update_requests WHERE cv_id = $1 AND status = 'Đang yêu cầu'",
		request.CVID).Scan(&existingRequestID)

	if err == nil {
		// Request đang hoạt động tồn tại, hủy nó bằng cách thay đổi status thành "Đã huỷ"
		fmt.Printf("CreateCVRequest: Tìm thấy request đang hoạt động %s, đang hủy nó\n", existingRequestID)
		_, err = database.DB.Exec(c,
			"UPDATE cv_update_requests SET status = 'Đã huỷ' WHERE id = $1",
			existingRequestID)

		if err != nil {
			fmt.Printf("CreateCVRequest: Lỗi khi hủy request hiện có: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error cancelling existing CV update request",
			})
			return
		}
		fmt.Printf("CreateCVRequest: Hủy thành công request hiện có %s\n", existingRequestID)
	}

	// Tạo CV update request mới
	var newRequestID string
	var contentPtr *string
	if request.Content != "" {
		contentPtr = &request.Content
	}

	err = database.DB.QueryRow(c,
		`INSERT INTO cv_update_requests (id, cv_id, requested_by, requested_at, status, content)
		VALUES (uuid_generate_v4(), $1, $2, NOW(), 'Đang yêu cầu', $3)
		RETURNING id`,
		request.CVID, requestedByID, contentPtr).Scan(&newRequestID)

	if err != nil {
		fmt.Printf("CreateCVRequest: Lỗi khi tạo request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error creating CV update request",
		})
		return
	}

	fmt.Printf("CreateCVRequest: Tạo thành công request %s\n", newRequestID)

	// Gửi SSE notification tới chủ CV
	go func() {
		// Lấy thông tin người yêu cầu cho notification
		var requesterName string
		err := database.DB.QueryRow(c, "SELECT full_name FROM users WHERE id = $1", requestedByID).Scan(&requesterName)
		if err != nil {
			fmt.Printf("CreateCVRequest: Lỗi khi lấy tên người yêu cầu: %v\n", err)
			requesterName = "Quản lý dự án"
		}

		// Tạo notification message
		var notificationMessage string
		if request.Content != "" {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV với lời nhắn: \"%s\"", requesterName, request.Content)
		} else {
			notificationMessage = fmt.Sprintf("%s đã yêu cầu bạn cập nhật CV. Vui lòng cập nhật CV của bạn trong thời gian sớm nhất.", requesterName)
		}

		notificationData := map[string]any{
			"type":           "cv_update_request",
			"title":          "Yêu cầu cập nhật CV",
			"message":        notificationMessage,
			"cv_id":          request.CVID,
			"request_id":     newRequestID,
			"requested_by":   requestedByID,
			"requester_name": requesterName,
			"content":        request.Content,
			"timestamp":      time.Now().Unix(),
		}

		SendSSENotificationToUser(cvOwnerID, "cv_update_request", notificationData)
		fmt.Printf("CreateCVRequest: SSE notification đã gửi tới chủ CV %s\n", cvOwnerID)
	}()

	// Tạo response
	response := models.CVUpdateRequest{
		ID:          newRequestID,
		CVID:        request.CVID,
		RequestedBy: requestedByID.(string),
		RequestedAt: time.Now(),
		Status:      "Đang yêu cầu",
	}

	// Xác định message dựa trên việc có hủy request hiện có không
	message := "Yêu cầu cập nhật CV đã được tạo thành công"
	if existingRequestID != "" {
		message = "Yêu cầu cập nhật CV đã được tạo thành công"
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"data":    response,
		"message": message,
	})
}

func GetSentCVRequests(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequests: Lấy CV requests đã gửi bởi user %v\n", userID)

	// Query để lấy tất cả CV update requests đã gửi bởi user với thông tin employee
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		ORDER BY cur.requested_at DESC`, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequests: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequests: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequests: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequests: Lấy thành công %d sent CV requests\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// GetSentCVRequestsPM returns CV update requests sent by the PM to users in their managed projects
func GetSentCVRequestsPM(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsPM: Lấy CV requests đã gửi bởi PM %v\n", userID)

	// Query để lấy CV update requests đã gửi bởi PM tới users trong các dự án họ quản lý
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			emp.employee_code,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		AND cv.user_id IN (
			SELECT DISTINCT pm.user_id
			FROM project_members pm
			JOIN project_members pm_requester ON pm.project_id = pm_requester.project_id
			WHERE pm_requester.user_id = $2 AND pm_requester.role_in_project = 'PM'
		)
		ORDER BY cur.requested_at DESC`, userID, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequestsPM: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, employeeCode, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &employeeCode, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequestsPM: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"employee_code": employeeCode,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequestsPM: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsPM: Lấy thành công %d sent CV requests cho PM\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

// GetSentCVRequestsBUL returns CV update requests sent by the BUL to users in their Business Unit
func GetSentCVRequestsBUL(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsBUL: Lấy CV requests đã gửi bởi BUL %v\n", userID)

	// Query để lấy CV update requests đã gửi bởi BUL tới users trong Business Unit của họ
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			emp.employee_code,
			COALESCE(dept.name, 'N/A') as department
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		WHERE cur.requested_by = $1
		AND emp.department_id = (
			SELECT department_id
			FROM users
			WHERE id = $2
		)
		ORDER BY cur.requested_at DESC`, userID, userID)

	if err != nil {
		fmt.Printf("GetSentCVRequestsBUL: Error querying sent CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching sent CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, employeeCode, department, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &employeeCode, &department)
		if err != nil {
			fmt.Printf("GetSentCVRequestsBUL: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":            id,
			"cv_id":         cvID,
			"requested_by":  requestedBy,
			"requested_at":  requestedAt.Format(time.RFC3339),
			"status":        status,
			"is_read":       isRead,
			"employee_name": employeeName,
			"employee_code": employeeCode,
			"department":    department,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetSentCVRequestsBUL: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing sent CV update requests",
		})
		return
	}

	fmt.Printf("GetSentCVRequestsBUL: Lấy thành công %d sent CV requests cho BUL\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

func MarkCVRequestAsRead(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Request ID is required",
		})
		return
	}

	fmt.Printf("MarkCVRequestAsRead: Đánh dấu request %s đã đọc cho user %v\n", requestID, userID)

	// Cập nhật trạng thái is_read cho request cụ thể, nhưng chỉ nếu user sở hữu CV
	result, err := database.DB.Exec(c,
		`UPDATE cv_update_requests
		SET is_read = true
		WHERE id = $1
		AND cv_id IN (SELECT id FROM cv WHERE user_id = $2)`,
		requestID, userID)

	if err != nil {
		fmt.Printf("MarkCVRequestAsRead: Lỗi khi cập nhật request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error marking request as read",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Request not found or you don't have permission to update it",
		})
		return
	}

	fmt.Printf("MarkCVRequestAsRead: Đánh dấu thành công request %s đã đọc\n", requestID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Request marked as read",
	})
}

// MarkAllCVRequestsAsRead marks all CV update requests as read for the authenticated user
func MarkAllCVRequestsAsRead(c *gin.Context) {
	// Lấy user ID từ context (được set bởi auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Unauthorized - user ID not found",
		})
		return
	}

	fmt.Printf("MarkAllCVRequestsAsRead: Đánh dấu tất cả requests đã đọc cho user %v\n", userID)

	// Cập nhật tất cả requests chưa đọc cho CVs của user
	result, err := database.DB.Exec(c,
		`UPDATE cv_update_requests
		SET is_read = true
		WHERE is_read = false
		AND cv_id IN (SELECT id FROM cv WHERE user_id = $1)`,
		userID)

	if err != nil {
		fmt.Printf("MarkAllCVRequestsAsRead: Lỗi khi cập nhật requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error marking all requests as read",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	fmt.Printf("MarkAllCVRequestsAsRead: Đánh dấu thành công %d requests đã đọc\n", rowsAffected)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Marked %d requests as read", rowsAffected),
		"data": gin.H{
			"updated_count": rowsAffected,
		},
	})
}

// GetAllCVRequestsForAdmin returns all CV update requests across all users (admin only)
func GetAllCVRequestsForAdmin(c *gin.Context) {
	fmt.Println("GetAllCVRequestsForAdmin: Lấy tất cả CV requests cho admin")

	// Query để lấy tất cả CV update requests với thông tin employee và requester
	rows, err := database.DB.Query(c,
		`SELECT
			cur.id,
			cur.cv_id,
			cur.requested_by,
			cur.requested_at,
			cur.status,
			cur.is_read,
			cur.content,
			emp.full_name as employee_name,
			COALESCE(dept.name, 'N/A') as department,
			req.full_name as requester_name
		FROM cv_update_requests cur
		JOIN cv ON cur.cv_id = cv.id
		JOIN users emp ON cv.user_id = emp.id
		LEFT JOIN departments dept ON emp.department_id = dept.id
		JOIN users req ON cur.requested_by = req.id
		ORDER BY cur.requested_at DESC`)

	if err != nil {
		fmt.Printf("GetAllCVRequestsForAdmin: Error querying CV requests: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching CV update requests",
		})
		return
	}
	defer rows.Close()

	// Process the query results
	var requests []map[string]any
	for rows.Next() {
		var id, cvID, requestedBy, employeeName, department, requesterName, status string
		var requestedAt time.Time
		var isRead bool
		var content *string

		err := rows.Scan(&id, &cvID, &requestedBy, &requestedAt, &status, &isRead, &content,
			&employeeName, &department, &requesterName)
		if err != nil {
			fmt.Printf("GetAllCVRequestsForAdmin: Error scanning row: %v\n", err)
			continue
		}

		request := map[string]any{
			"id":             id,
			"cv_id":          cvID,
			"requested_by":   requestedBy,
			"requested_at":   requestedAt.Format(time.RFC3339),
			"status":         status,
			"is_read":        isRead,
			"employee_name":  employeeName,
			"department":     department,
			"requester_name": requesterName,
		}

		if content != nil {
			request["content"] = *content
		}

		requests = append(requests, request)
	}

	// Check for any errors during iteration
	if err = rows.Err(); err != nil {
		fmt.Printf("GetAllCVRequestsForAdmin: Error during row iteration: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error processing CV update requests",
		})
		return
	}

	fmt.Printf("GetAllCVRequestsForAdmin: Lấy thành công %d CV requests\n", len(requests))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   requests,
	})
}

func UpdateCVRequestStatus(c *gin.Context) {
	id := c.Param("id")

	var request struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
		})
		return
	}

	// Xác thực status
	if request.Status != "Đã xử lý" && request.Status != "Đã huỷ" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid status value",
		})
		return
	}

	fmt.Printf("UpdateCVRequestStatus: Cập nhật request %s thành status %s\n", id, request.Status)

	// Bắt đầu transaction để cập nhật cả bảng cv_update_requests và cv
	tx, err := database.DB.Begin(c)
	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Lỗi khi bắt đầu transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error starting database transaction",
		})
		return
	}
	defer tx.Rollback(c)

	// Đầu tiên, lấy CV ID và status hiện tại từ request để xác thực và cập nhật
	var cvID, currentStatus string
	err = tx.QueryRow(c,
		`SELECT cv_id, status FROM cv_update_requests WHERE id = $1`,
		id).Scan(&cvID, &currentStatus)

	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Lỗi khi lấy CV ID và status: %v\n", err)
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV update request not found",
		})
		return
	}

	// Kiểm tra request đã ở trạng thái cuối chưa
	if currentStatus == "Đã xử lý" || currentStatus == "Đã huỷ" {
		fmt.Printf("UpdateCVRequestStatus: Request %s đã ở trạng thái cuối '%s', không thể cập nhật\n", id, currentStatus)
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Cannot update request that is already processed or cancelled",
		})
		return
	}

	// Cập nhật status request trong database
	result, err := tx.Exec(c,
		`UPDATE cv_update_requests SET status = $1 WHERE id = $2`,
		request.Status, id)

	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Lỗi khi cập nhật request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error updating CV update request status",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "CV update request not found",
		})
		return
	}

	// Nếu request status được set thành "Đã huỷ", cập nhật CV status thành "Hủy yêu cầu"
	if request.Status == "Đã huỷ" {
		fmt.Printf("UpdateCVRequestStatus: Cập nhật CV %s status thành 'Hủy yêu cầu'\n", cvID)
		_, err = tx.Exec(c,
			`UPDATE cv SET status = 'Hủy yêu cầu' WHERE id = $1`,
			cvID)

		if err != nil {
			fmt.Printf("UpdateCVRequestStatus: Lỗi khi cập nhật CV status: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": "Error updating CV status",
			})
			return
		}
		fmt.Printf("UpdateCVRequestStatus: Cập nhật thành công CV %s status thành 'Hủy yêu cầu'\n", cvID)
	}

	// Commit transaction
	err = tx.Commit(c)
	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Lỗi khi commit transaction: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error committing database transaction",
		})
		return
	}

	// Lấy chi tiết request đã cập nhật
	var updatedRequest models.CVUpdateRequest
	err = database.DB.QueryRow(c,
		`SELECT id, cv_id, requested_by, requested_at, status, is_read, content
		FROM cv_update_requests WHERE id = $1`,
		id).Scan(&updatedRequest.ID, &updatedRequest.CVID, &updatedRequest.RequestedBy,
		&updatedRequest.RequestedAt, &updatedRequest.Status, &updatedRequest.IsRead, &updatedRequest.Content)

	if err != nil {
		fmt.Printf("UpdateCVRequestStatus: Lỗi khi lấy updated request: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Error fetching updated request details",
		})
		return
	}

	fmt.Printf("UpdateCVRequestStatus: Cập nhật thành công request %s thành status %s\n", id, request.Status)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "CV update request status updated successfully",
		"data":    updatedRequest,
	})
}
