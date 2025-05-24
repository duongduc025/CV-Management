package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdt/cv-management/internal/utils"
)

// UploadImageResponse represents the response structure for CV photo upload
type UploadImageResponse struct {
	URL          string `json:"url"`
	OriginalName string `json:"original_name"`
	Size         int64  `json:"size"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	AspectRatio  string `json:"aspect_ratio"`
}

// UploadCVPhoto handles CV profile photo upload with predefined settings
func UploadCVPhoto(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10MB max memory
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Failed to parse multipart form",
		})
		return
	}

	// Get the uploaded file
	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "No image file provided. Use 'image' field name.",
		})
		return
	}

	// Validate the image file
	if err := utils.ValidateImageFile(fileHeader); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Invalid image file: %v", err),
		})
		return
	}

	// Use predefined settings for CV photos
	options := &utils.ImageProcessingOptions{
		AspectRatio: utils.AspectRatio3x4, // CV photos use 3:4 ratio
		MaxWidth:    600,                  // Suitable for CV display
		MaxHeight:   800,                  // 600 * 4/3 = 800
		Quality:     90,                   // High quality for professional photos
	}

	// Get original image dimensions
	originalWidth, originalHeight, err := utils.GetImageDimensions(fileHeader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to get image dimensions",
		})
		return
	}

	// Process the image
	processedImageData, err := utils.ProcessImage(fileHeader, options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Failed to process image: %v", err),
		})
		return
	}

	// Create Digital Ocean Spaces client
	spacesClient, err := utils.NewSpacesClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Failed to initialize storage client",
		})
		return
	}

	// Upload processed image to Digital Ocean Spaces in cv-photos folder
	imageURL, err := spacesClient.UploadFile(fileHeader, processedImageData, "cv-photos")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": fmt.Sprintf("Failed to upload image: %v", err),
		})
		return
	}

	// Calculate final dimensions
	finalWidth, finalHeight := calculateFinalDimensions(originalWidth, originalHeight, options)

	// Return success response
	response := UploadImageResponse{
		URL:          imageURL,
		OriginalName: fileHeader.Filename,
		Size:         int64(len(processedImageData)),
		Width:        finalWidth,
		Height:       finalHeight,
		AspectRatio:  "3:4",
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"data":    response,
		"message": "CV photo uploaded successfully",
	})
}

// calculateFinalDimensions calculates the final dimensions after processing for 3:4 ratio
func calculateFinalDimensions(originalWidth, originalHeight int, options *utils.ImageProcessingOptions) (int, int) {
	// CV photos always use 3:4 ratio
	targetRatio := 3.0 / 4.0

	// Calculate current aspect ratio
	currentRatio := float64(originalWidth) / float64(originalHeight)

	var newWidth, newHeight int

	if currentRatio > targetRatio {
		// Image is too wide, crop width
		newHeight = originalHeight
		newWidth = int(float64(newHeight) * targetRatio)
	} else {
		// Image is too tall, crop height
		newWidth = originalWidth
		newHeight = int(float64(newWidth) / targetRatio)
	}

	// Apply max constraints (600x800 for CV photos)
	finalWidth := newWidth
	finalHeight := newHeight

	if newWidth > 600 {
		finalWidth = 600
		finalHeight = 800
	}

	if finalHeight > 800 {
		finalHeight = 800
		finalWidth = 600
	}

	return finalWidth, finalHeight
}
