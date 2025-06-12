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
	AspectRatio4x5 AspectRatio = "4:5" // Tỷ lệ 4:5 (0.8)
	AspectRatio3x4 AspectRatio = "3:4" // Tỷ lệ 3:4 (0.75)
)

// ImageProcessingOptions holds options for image processing
type ImageProcessingOptions struct {
	AspectRatio AspectRatio
	MaxWidth    int
	MaxHeight   int
	Quality     int // Chất lượng JPEG (1-100)
}

// DefaultImageOptions returns default image processing options
func DefaultImageOptions() *ImageProcessingOptions {
	return &ImageProcessingOptions{
		AspectRatio: AspectRatio3x4, // Mặc định là 3:4
		MaxWidth:    800,
		MaxHeight:   1067, // Điều chỉnh cho tỷ lệ 3:4 (800 * 4/3)
		Quality:     85,
	}
}

// ProcessImage processes an uploaded image file with scaling and aspect ratio adjustment
func ProcessImage(fileHeader *multipart.FileHeader, options *ImageProcessingOptions) ([]byte, error) {
	// Mở file được upload
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer file.Close()

	// Giải mã ảnh
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Xử lý ảnh dựa trên tỷ lệ khung hình
	processedImg, err := scaleToAspectRatio(img, options.AspectRatio, options.MaxWidth, options.MaxHeight)
	if err != nil {
		return nil, fmt.Errorf("failed to scale image: %w", err)
	}

	// Mã hóa ảnh đã xử lý
	return encodeImage(processedImg, format, options.Quality)
}

// scaleToAspectRatio scales an image to the specified aspect ratio
func scaleToAspectRatio(img image.Image, aspectRatio AspectRatio, maxWidth, maxHeight int) (image.Image, error) {
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Tính toán tỷ lệ target
	var targetRatio float64
	switch aspectRatio {
	case AspectRatio4x5:
		targetRatio = 4.0 / 5.0 // 0.8
	case AspectRatio3x4:
		targetRatio = 3.0 / 4.0 // 0.75
	default:
		return nil, fmt.Errorf("unsupported aspect ratio: %s", aspectRatio)
	}

	// Tính toán tỷ lệ hiện tại
	currentRatio := float64(originalWidth) / float64(originalHeight)

	var newWidth, newHeight int

	if currentRatio > targetRatio {
		// Ảnh quá rộng, cắt chiều rộng
		newHeight = originalHeight
		newWidth = int(float64(newHeight) * targetRatio)
	} else {
		// Ảnh quá cao, cắt chiều cao
		newWidth = originalWidth
		newHeight = int(float64(newWidth) / targetRatio)
	}

	// Cắt ở giữa theo tỷ lệ target
	cropX := (originalWidth - newWidth) / 2
	cropY := (originalHeight - newHeight) / 2

	croppedImg := imaging.Crop(img, image.Rect(cropX, cropY, cropX+newWidth, cropY+newHeight))

	// Thu nhỏ nếu ảnh lớn hơn kích thước tối đa
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

	// Resize nếu cần
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
		// Mặc định JPEG cho format không được hỗ trợ
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

	// Chỉ đọc header ảnh để lấy kích thước
	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to decode image config: %w", err)
	}

	return config.Width, config.Height, nil
}

// ValidateImageFile validates if the uploaded file is a valid image
func ValidateImageFile(fileHeader *multipart.FileHeader) error {
	// Kiểm tra phần mở rộng file
	if !IsValidImageType(fileHeader.Filename) {
		return fmt.Errorf("invalid file type. Supported formats: JPG, JPEG, PNG, GIF, WebP")
	}

	// Kiểm tra kích thước file
	if err := ValidateFileSize(fileHeader.Size); err != nil {
		return err
	}

	// Thử giải mã ảnh để đảm bảo nó hợp lệ
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Đọc một phần nhỏ để xác thực đây thực sự là ảnh
	_, err = io.CopyN(io.Discard, file, 512) // Đọc 512 bytes đầu tiên
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Reset con trỏ file
	file.Seek(0, 0)

	// Thử giải mã ảnh
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
