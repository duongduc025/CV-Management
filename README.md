# Hệ thống Quản lý CV

Hệ thống quản lý CV là một ứng dụng full-stack cho phép người dùng quản lý CV cá nhân, yêu cầu cập nhật và theo dõi dự án. Được xây dựng bằng Next.js, TailwindCSS, shadcn/ui cho phần giao diện người dùng và Go cho backend API, kết nối với cơ sở dữ liệu PostgreSQL.

## Cấu trúc Dự án

- `/frontend` - Ứng dụng Next.js với TailwindCSS và shadcn/ui
- `/backend` - Go backend API với Gin framework
  - `/cmd` - Điểm khởi đầu của ứng dụng
  - `/internal` - Các package nội bộ
  - `/pkg` - Các package có thể tái sử dụng

## Yêu cầu hệ thống

- Node.js (v18+)
- Go (v1.20+)
- Docker
- PostgreSQL

## Bắt đầu

### Thiết lập Cơ sở dữ liệu

```bash
# Khởi động container PostgreSQL
docker run --name postgres17 -p 5432:5432 \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=secret \
  -d postgres:17-alpine

# Khởi tạo schema cơ sở dữ liệu
cd backend
PGPASSWORD=secret psql -h localhost -p 5432 -U root -c "DROP DATABASE IF EXISTS cv_management;"
PGPASSWORD=secret psql -h localhost -p 5432 -U root -c "CREATE DATABASE cv_management;"
PGPASSWORD=secret psql -h localhost -p 5432 -U root -d cv_management -f ./internal/database/init_schema.sql
```

### Thiết lập Backend

```bash
cd backend
go mod tidy
go run cmd/main.go
```

Backend API sẽ chạy tại http://localhost:8080

### Thiết lập Frontend

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng frontend sẽ chạy tại http://localhost:3000

## Tính năng

- Quản lý thông tin CV cá nhân
- Yêu cầu cập nhật CV
- Quản lý người dùng, phòng ban và vai trò
- Quản lý dự án và thành viên dự án
- Giao diện người dùng hiện đại với shadcn/ui
- RESTful API với Go và Gin
- Cơ sở dữ liệu PostgreSQL

## API Endpoints

### User API
- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/users/:id` - Lấy thông tin người dùng theo ID
- `POST /api/users` - Tạo người dùng mới
- `PUT /api/users/:id` - Cập nhật thông tin người dùng

### Department API
- `GET /api/departments` - Lấy danh sách phòng ban

### CV API
- `GET /api/cv/me` - Lấy thông tin CV của người dùng hiện tại
- `GET /api/cv/:id` - Lấy thông tin CV theo ID

### CV Request API
- `GET /api/requests` - Lấy danh sách yêu cầu cập nhật CV
- `POST /api/requests` - Tạo yêu cầu cập nhật CV mới
- `PUT /api/requests/:id/status` - Cập nhật trạng thái yêu cầu

### Project API
- `GET /api/projects` - Lấy danh sách dự án
- `GET /api/projects/:id` - Lấy thông tin dự án theo ID
- `POST /api/projects` - Tạo dự án mới
- `PUT /api/projects/:id` - Cập nhật thông tin dự án
- `POST /api/projects/:id/members` - Thêm thành viên vào dự án
- `DELETE /api/projects/:id/members/:userId` - Xóa thành viên khỏi dự án

## Cấu trúc Cơ sở dữ liệu

Hệ thống sử dụng các bảng chính sau:
- `departments` - Thông tin phòng ban
- `users` - Thông tin người dùng
- `cv` - Thông tin CV cơ bản
- `cv_details` - Chi tiết thông tin CV
- `cv_update_requests` - Yêu cầu cập nhật CV
- `roles` - Vai trò trong hệ thống
- `user_roles` - Phân quyền người dùng
- `projects` - Thông tin dự án
- `project_members` - Thành viên tham gia dự án

## License

MIT 