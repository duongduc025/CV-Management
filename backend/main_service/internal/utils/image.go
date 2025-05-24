package utils

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"strings"

	"github.com/disintegration/imaging"
)

// AspectRatio represents the target aspect ratio for image scaling
type AspectRatio string

const (
	AspectRatio4x5 AspectRatio = "4:5" // 4:5 aspect ratio (0.8)
	AspectRatio3x4 AspectRatio = "3:4" // 3:4 aspect ratio (0.75)
)

// ImageProcessingOptions holds options for image processing
type ImageProcessingOptions struct {
	AspectRatio AspectRatio
	MaxWidth    int
	MaxHeight   int
	Quality     int // JPEG quality (1-100)
}

// DefaultImageOptions returns default image processing options
func DefaultImageOptions() *ImageProcessingOptions {
	return &ImageProcessingOptions{
		AspectRatio: AspectRatio3x4, // Default to 3:4
		MaxWidth:    800,
		MaxHeight:   1067, // Adjusted for 3:4 ratio (800 * 4/3)
		Quality:     85,
	}
}

// ProcessImage processes an uploaded image file with scaling and aspect ratio adjustment
func ProcessImage(fileHeader *multipart.FileHeader, options *ImageProcessingOptions) ([]byte, error) {
	// Open the uploaded file
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer file.Close()

	// Decode the image
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Process the image based on aspect ratio
	processedImg, err := scaleToAspectRatio(img, options.AspectRatio, options.MaxWidth, options.MaxHeight)
	if err != nil {
		return nil, fmt.Errorf("failed to scale image: %w", err)
	}

	// Encode the processed image
	return encodeImage(processedImg, format, options.Quality)
}

// scaleToAspectRatio scales an image to the specified aspect ratio
func scaleToAspectRatio(img image.Image, aspectRatio AspectRatio, maxWidth, maxHeight int) (image.Image, error) {
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Calculate target aspect ratio
	var targetRatio float64
	switch aspectRatio {
	case AspectRatio4x5:
		targetRatio = 4.0 / 5.0 // 0.8
	case AspectRatio3x4:
		targetRatio = 3.0 / 4.0 // 0.75
	default:
		return nil, fmt.Errorf("unsupported aspect ratio: %s", aspectRatio)
	}

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

	// Center crop to the target aspect ratio
	cropX := (originalWidth - newWidth) / 2
	cropY := (originalHeight - newHeight) / 2

	croppedImg := imaging.Crop(img, image.Rect(cropX, cropY, cropX+newWidth, cropY+newHeight))

	// Scale down if the image is larger than max dimensions
	finalWidth := newWidth
	finalHeight := newHeight

	if newWidth > maxWidth {
		finalWidth = maxWidth
		finalHeight = int(float64(finalWidth) / targetRatio)
	}

	if finalHeight > maxHeight {
		finalHeight = maxHeight
		finalWidth = int(float64(finalHeight) * targetRatio)
	}

	// Resize if needed
	if finalWidth != newWidth || finalHeight != newHeight {
		return imaging.Resize(croppedImg, finalWidth, finalHeight, imaging.Lanczos), nil
	}

	return croppedImg, nil
}

// encodeImage encodes an image to bytes in the specified format
func encodeImage(img image.Image, format string, quality int) ([]byte, error) {
	var buf bytes.Buffer

	switch strings.ToLower(format) {
	case "jpeg", "jpg":
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality})
		if err != nil {
			return nil, fmt.Errorf("failed to encode JPEG: %w", err)
		}
	case "png":
		err := png.Encode(&buf, img)
		if err != nil {
			return nil, fmt.Errorf("failed to encode PNG: %w", err)
		}
	case "gif":
		err := gif.Encode(&buf, img, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to encode GIF: %w", err)
		}
	default:
		// Default to JPEG for unsupported formats
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality})
		if err != nil {
			return nil, fmt.Errorf("failed to encode as JPEG: %w", err)
		}
	}

	return buf.Bytes(), nil
}

// GetImageDimensions returns the dimensions of an uploaded image
func GetImageDimensions(fileHeader *multipart.FileHeader) (int, int, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return 0, 0, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read only the image header to get dimensions
	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to decode image config: %w", err)
	}

	return config.Width, config.Height, nil
}

// ValidateImageFile validates if the uploaded file is a valid image
func ValidateImageFile(fileHeader *multipart.FileHeader) error {
	// Check file extension
	if !IsValidImageType(fileHeader.Filename) {
		return fmt.Errorf("invalid file type. Supported formats: JPG, JPEG, PNG, GIF, WebP")
	}

	// Check file size
	if err := ValidateFileSize(fileHeader.Size); err != nil {
		return err
	}

	// Try to decode the image to ensure it's valid
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read a small portion to validate it's actually an image
	_, err = io.CopyN(io.Discard, file, 512) // Read first 512 bytes
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Reset file pointer
	file.Seek(0, 0)

	// Try to decode the image
	_, _, err = image.DecodeConfig(file)
	if err != nil {
		return fmt.Errorf("invalid image file: %w", err)
	}

	return nil
}

// GetAspectRatioFromString converts string to AspectRatio type
func GetAspectRatioFromString(ratio string) (AspectRatio, error) {
	switch strings.ToLower(ratio) {
	case "3:4", "3x4":
		return AspectRatio3x4, nil
	case "4:5", "4x5":
		return AspectRatio4x5, nil
	default:
		return AspectRatio3x4, fmt.Errorf("unsupported aspect ratio: %s. Supported ratios: 3:4, 4:5", ratio)
	}
}
