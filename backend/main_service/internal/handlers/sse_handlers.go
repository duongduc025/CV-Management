package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/utils"
)

// SSEClient represents a connected SSE client
type SSEClient struct {
	ID       string
	Channel  chan SSEMessage
	UserID   string
	Roles    []string
	LastPing time.Time
}

// SSEMessage represents a message sent via SSE
type SSEMessage struct {
	ID    string `json:"id"`
	Event string `json:"event"`
	Data  any    `json:"data"`
}

// SSEManager manages SSE connections
type SSEManager struct {
	clients    map[string]*SSEClient
	register   chan *SSEClient
	unregister chan *SSEClient
	broadcast  chan SSEMessage
}

// Global SSE manager instance
var sseManager *SSEManager

// InitSSEManager initializes the SSE manager
func InitSSEManager() {
	sseManager = &SSEManager{
		clients:    make(map[string]*SSEClient),
		register:   make(chan *SSEClient),
		unregister: make(chan *SSEClient),
		broadcast:  make(chan SSEMessage),
	}
	go sseManager.run()
}

// run handles SSE manager operations
func (manager *SSEManager) run() {
	ticker := time.NewTicker(30 * time.Second) // Ping mỗi 30 giây
	defer ticker.Stop()

	for {
		select {
		case client := <-manager.register:
			manager.clients[client.ID] = client
			log.Printf("SSE client connected: %s (User: %s)", client.ID, client.UserID)

		case client := <-manager.unregister:
			if _, ok := manager.clients[client.ID]; ok {
				delete(manager.clients, client.ID)
				close(client.Channel)
				log.Printf("SSE client disconnected: %s (User: %s)", client.ID, client.UserID)
			}

		case message := <-manager.broadcast:
			for _, client := range manager.clients {
				select {
				case client.Channel <- message:
				default:
					// Channel client đầy, xóa client
					delete(manager.clients, client.ID)
					close(client.Channel)
				}
			}

		case <-ticker.C:
			// Gửi ping tới tất cả clients để giữ kết nối
			pingMessage := SSEMessage{
				ID:    fmt.Sprintf("ping-%d", time.Now().Unix()),
				Event: "ping",
				Data:  map[string]any{"timestamp": time.Now().Unix()},
			}
			for _, client := range manager.clients {
				select {
				case client.Channel <- pingMessage:
					client.LastPing = time.Now()
				default:
					// Client không phản hồi, xóa nó
					delete(manager.clients, client.ID)
					close(client.Channel)
				}
			}
		}
	}
}

// validateSSEToken validates JWT token and returns user info
func validateSSEToken(tokenString string) (string, []string, error) {
	log.Printf("SSE Token validation - Token length: %d", len(tokenString))
	log.Printf("SSE Token validation - Token prefix: %s", tokenString[:min(50, len(tokenString))])

	// Sử dụng logic validation giống như auth middleware
	claims, err := utils.ValidateToken(tokenString)
	if err != nil {
		log.Printf("SSE Token validation failed: %v", err)
		return "", nil, fmt.Errorf("invalid token: %w", err)
	}

	log.Printf("SSE Token validation successful - UserID: %s, Roles: %v", claims.UserID, claims.Roles)
	return claims.UserID, claims.Roles, nil
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// SSEConnect handles SSE connection establishment
func SSEConnect(c *gin.Context) {
	log.Printf("SSE Connect request from: %s", c.ClientIP())

	// Kiểm tra token trong query parameter (vì EventSource không hỗ trợ custom headers)
	token := c.Query("token")
	log.Printf("SSE Token from query: %t", token != "")

	if token == "" {
		// Thử lấy từ Authorization header làm fallback
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
			log.Printf("SSE Token from header: %t", token != "")
		}
	}

	if token == "" {
		log.Printf("SSE Connect failed: No token provided")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Authentication token required",
		})
		return
	}

	// Xác thực token và lấy thông tin user
	userID, userRoles, err := validateSSEToken(token)
	if err != nil {
		log.Printf("SSE token validation failed: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  "error",
			"message": "Invalid authentication token",
		})
		return
	}

	// Đặt SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Headers", "Cache-Control")

	// Tạo client ID
	clientID := fmt.Sprintf("%s-%d", userID, time.Now().UnixNano())

	// Tạo SSE client
	client := &SSEClient{
		ID:       clientID,
		Channel:  make(chan SSEMessage, 10),
		UserID:   userID,
		Roles:    userRoles,
		LastPing: time.Now(),
	}

	// Đăng ký client
	sseManager.register <- client

	// Xử lý ngắt kết nối client
	defer func() {
		sseManager.unregister <- client
	}()

	// Gửi message kết nối ban đầu
	initialMessage := SSEMessage{
		ID:    fmt.Sprintf("connect-%d", time.Now().Unix()),
		Event: "connected",
		Data: map[string]any{
			"client_id": clientID,
			"user_id":   userID,
			"timestamp": time.Now().Unix(),
		},
	}

	writeSSEMessage(c.Writer, initialMessage)
	c.Writer.Flush()

	// Lắng nghe messages
	for {
		select {
		case message := <-client.Channel:
			writeSSEMessage(c.Writer, message)
			c.Writer.Flush()

		case <-c.Request.Context().Done():
			// Client đã ngắt kết nối
			return
		}
	}
}

// writeSSEMessage writes an SSE message to the response writer
func writeSSEMessage(w http.ResponseWriter, message SSEMessage) {
	data, err := json.Marshal(message.Data)
	if err != nil {
		log.Printf("Error marshaling SSE message data: %v", err)
		return
	}

	fmt.Fprintf(w, "id: %s\n", message.ID)
	fmt.Fprintf(w, "event: %s\n", message.Event)
	fmt.Fprintf(w, "data: %s\n\n", string(data))
}

// SendSSENotificationToUser sends an SSE notification to a specific user
func SendSSENotificationToUser(userID string, event string, data map[string]any) {
	if sseManager == nil {
		log.Printf("SSE Manager not initialized")
		return
	}

	message := SSEMessage{
		ID:    fmt.Sprintf("notification-%s-%d", userID, time.Now().UnixNano()),
		Event: event,
		Data:  data,
	}

	// Gửi tới clients của user cụ thể
	for _, client := range sseManager.clients {
		if client.UserID == userID {
			select {
			case client.Channel <- message:
				log.Printf("SSE notification sent to user %s: %s", userID, event)
			default:
				log.Printf("Failed to send SSE notification to user %s: channel full", userID)
			}
		}
	}
}

// SendSSENotificationToAll broadcasts an SSE notification to all connected clients
func SendSSENotificationToAll(event string, data map[string]any) {
	if sseManager == nil {
		log.Printf("SSE Manager not initialized")
		return
	}

	message := SSEMessage{
		ID:    fmt.Sprintf("broadcast-%d", time.Now().UnixNano()),
		Event: event,
		Data:  data,
	}

	sseManager.broadcast <- message
	log.Printf("SSE notification broadcasted to all clients: %s", event)
}
