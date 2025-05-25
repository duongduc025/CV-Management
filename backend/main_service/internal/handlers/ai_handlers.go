package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/models"
)

// ParseCVFromFile handles CV parsing requests by calling the AI service
func ParseCVFromFile(c *gin.Context) {
	var request models.ParseCVRequest

	// Bind JSON request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Validate file path is not empty
	if request.FilePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "File path is required",
		})
		return
	}

	// Validate file is a PDF
	if !strings.HasSuffix(strings.ToLower(request.FilePath), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "File must be a PDF",
		})
		return
	}

	var localFilePath string
	var tempFile bool

	// Check if it's a remote URL or local file
	if isRemoteURL(request.FilePath) {
		// Download remote file to temporary location
		tempPath, err := downloadFileToTemp(request.FilePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("Failed to download file: %v", err),
			})
			return
		}
		localFilePath = tempPath
		tempFile = true

		// Clean up temp file after processing
		defer func() {
			if tempFile {
				os.Remove(localFilePath)
			}
		}()
	} else {
		// Local file path
		localFilePath = request.FilePath

		// Check if local file exists
		if _, err := os.Stat(localFilePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"status":  "error",
				"message": fmt.Sprintf("File not found: %s", localFilePath),
			})
			return
		}
	}

	// Call AI service with local file path
	aiResponse, err := callAIService(localFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to parse CV",
			"details": err.Error(),
		})
		return
	}

	// Return successful response
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   aiResponse,
	})
}

// callAIService makes an HTTP request to the AI service
func callAIService(filePath string) (*models.AIServiceResponse, error) {
	// Get AI service URL from environment or use default
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8000"
	}

	// Prepare request payload
	requestPayload := models.AIServiceRequest{
		FilePath: filePath,
	}

	// Marshal request to JSON
	jsonData, err := json.Marshal(requestPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", aiServiceURL+"/parse-cv", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to AI service: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check if request was successful
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// Parse response
	var aiResponse models.AIServiceResponse
	if err := json.Unmarshal(body, &aiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %w", err)
	}

	return &aiResponse, nil
}

// isRemoteURL checks if the given path is a remote URL
func isRemoteURL(path string) bool {
	return strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://")
}

// downloadFileToTemp downloads a remote file to a temporary local path
func downloadFileToTemp(url string) (string, error) {
	// Create a temporary file
	tempFile, err := os.CreateTemp("", "cv_*.pdf")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	// Download the file
	resp, err := http.Get(url)
	if err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to download file: HTTP %d", resp.StatusCode)
	}

	// Copy the content to temp file
	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		os.Remove(tempFile.Name())
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}

	return tempFile.Name(), nil
}
