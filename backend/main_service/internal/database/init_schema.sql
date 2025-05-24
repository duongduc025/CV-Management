-- Extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL
);

-- Bảng users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng cv
CREATE TABLE cv (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id),
    last_updated_by UUID REFERENCES users(id),
    last_updated_at TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Đã cập nhật', 'Chưa cập nhật', 'Hủy yêu cầu'))
);

-- Bảng cv_details
CREATE TABLE cv_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_id UUID REFERENCES cv(id) ON DELETE CASCADE,
    ho_ten TEXT NOT NULL,
    chuc_danh TEXT NOT NULL,
    tom_tat TEXT NOT NULL,
    thong_tin_ca_nhan TEXT NOT NULL,
    thong_tin_dao_tao TEXT NOT NULL,
    thong_tin_khoa_hoc TEXT,
    thong_tin_ki_nang TEXT NOT NULL
);

-- Bảng cv_update_requests
CREATE TABLE cv_update_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_id UUID REFERENCES cv(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Đang yêu cầu', 'Đã xử lý', 'Đã huỷ'))
);

-- Chỉ cho phép một bản ghi 'Đang yêu cầu' trên mỗi CV
CREATE UNIQUE INDEX only_one_active_request_per_cv
ON cv_update_requests(cv_id)
WHERE status = 'Đang yêu cầu';

-- Bảng roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Bảng user_roles
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Bảng projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE
);

-- Bảng project_members
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id),
    role_in_project VARCHAR(255),
    joined_at DATE,
    left_at DATE,
    PRIMARY KEY (project_id, user_id)
);

-- Bảng refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data - Including the three department types: P.KTCN, BU units, and P.Quản lý chất lượng
INSERT INTO departments (id, name) VALUES
    (uuid_generate_v4(), 'P.KTCN'),
    (uuid_generate_v4(), 'P.Quản lý chất lượng'),
    (uuid_generate_v4(), 'P.Nhân sự'),
    (uuid_generate_v4(), 'BU.Fintech'),
    (uuid_generate_v4(), 'BU.Banking'),
    (uuid_generate_v4(), 'BU.E-commerce'),
    (uuid_generate_v4(), 'BU.Government');

-- Insert roles with the four actor types
INSERT INTO roles (id, name) VALUES
    (uuid_generate_v4(), 'Admin'),
    (uuid_generate_v4(), 'PM'),
    (uuid_generate_v4(), 'BUL/Lead'),
    (uuid_generate_v4(), 'Employee');
