-- Drop database if exists and create a new one
DROP DATABASE IF EXISTS cv_management;
CREATE DATABASE cv_management;

-- Connect to the database
\c cv_management;

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
    full_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    birthday DATE,
    gender TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng cv_education
CREATE TABLE cv_education (
    id UUID PRIMARY KEY,
    cv_id UUID REFERENCES cv_details(id) ON DELETE CASCADE,
    organization TEXT NOT NULL,
    degree TEXT,
    major TEXT,
    graduation_year INT
);

-- Bảng cv_courses
CREATE TABLE cv_courses (
    id UUID PRIMARY KEY,
    cv_id UUID REFERENCES cv_details(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    organization TEXT,
    finish_date DATE
);

-- Bảng cv_skills
CREATE TABLE cv_skills (
    id UUID PRIMARY KEY,
    cv_id UUID REFERENCES cv_details(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    description TEXT
);

-- Bảng cv_update_requests
CREATE TABLE cv_update_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cv_id UUID REFERENCES cv(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Đang yêu cầu', 'Đã xử lý', 'Đã huỷ')),
    is_read BOOLEAN DEFAULT FALSE,
    content TEXT
);


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
