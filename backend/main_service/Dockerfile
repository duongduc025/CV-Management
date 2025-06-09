# Backend Main Service Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go

# Final stage
FROM alpine:latest

# Install ca-certificates
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

CMD ["./main"]
