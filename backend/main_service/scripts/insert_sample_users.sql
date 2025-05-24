-- First, check if uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert sample departments if they don't exist
INSERT INTO departments (id, name) VALUES 
    (uuid_generate_v4(), 'P.KTCN'),
    (uuid_generate_v4(), 'P.Quản lý chất lượng'),
    (uuid_generate_v4(), 'P.Nhân sự'),
    (uuid_generate_v4(), 'BU.Fintech'),
    (uuid_generate_v4(), 'BU.Banking')
ON CONFLICT (name) DO NOTHING;

-- Insert roles if they don't exist
INSERT INTO roles (id, name) VALUES 
    (uuid_generate_v4(), 'Admin'),
    (uuid_generate_v4(), 'PM'),
    (uuid_generate_v4(), 'BUL'),
    (uuid_generate_v4(), 'Employee')
ON CONFLICT (name) DO NOTHING;

-- Insert test users with different roles
DO $$
DECLARE
    tech_dept_id UUID;
    quality_dept_id UUID;
    hr_dept_id UUID;
    fintech_dept_id UUID;
    banking_dept_id UUID;
    employee_role_id UUID;
    admin_role_id UUID;
    pm_role_id UUID;
    bul_role_id UUID;
    new_user_id UUID;
BEGIN
    -- Get department IDs (use the first one of each type)
    SELECT id INTO tech_dept_id FROM departments WHERE name = 'P.KTCN' LIMIT 1;
    SELECT id INTO quality_dept_id FROM departments WHERE name = 'P.Quản lý chất lượng' LIMIT 1;
    SELECT id INTO hr_dept_id FROM departments WHERE name = 'P.Nhân sự' LIMIT 1;
    SELECT id INTO fintech_dept_id FROM departments WHERE name = 'BU.Fintech' LIMIT 1;
    SELECT id INTO banking_dept_id FROM departments WHERE name = 'BU.Banking' LIMIT 1;
    
    -- Get role IDs
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin' LIMIT 1;
    SELECT id INTO pm_role_id FROM roles WHERE name = 'PM' LIMIT 1;
    SELECT id INTO bul_role_id FROM roles WHERE name = 'BUL' LIMIT 1;
    SELECT id INTO employee_role_id FROM roles WHERE name = 'Employee' LIMIT 1;
    
    -- Test User 1: Admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test_admin@example.com') THEN
        INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at) 
        VALUES (
            uuid_generate_v4(), 
            'TEST001', 
            'Test Admin', 
            'test_admin@example.com',
            -- Using bcrypt hash of 'password123'
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            tech_dept_id, 
            NOW()
        ) RETURNING id INTO new_user_id;
        
        INSERT INTO user_roles (user_id, role_id) VALUES (new_user_id, admin_role_id);
        
        -- Create CV entry
        INSERT INTO cv (id, user_id, status)
        VALUES (uuid_generate_v4(), new_user_id, 'Chưa cập nhật');
    END IF;
    
    -- Test User 2: Employee
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test_employee@example.com') THEN
        INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at) 
        VALUES (
            uuid_generate_v4(), 
            'TEST002', 
            'Test Employee', 
            'test_employee@example.com',
            -- Using bcrypt hash of 'password123'
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            quality_dept_id, 
            NOW()
        ) RETURNING id INTO new_user_id;
        
        INSERT INTO user_roles (user_id, role_id) VALUES (new_user_id, employee_role_id);
        
        -- Create CV entry
        INSERT INTO cv (id, user_id, status)
        VALUES (uuid_generate_v4(), new_user_id, 'Chưa cập nhật');
    END IF;
    
    -- Test User 3: Project Manager
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test_pm@example.com') THEN
        INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at) 
        VALUES (
            uuid_generate_v4(), 
            'TEST003', 
            'Test Project Manager', 
            'test_pm@example.com',
            -- Using bcrypt hash of 'password123'
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            fintech_dept_id, 
            NOW()
        ) RETURNING id INTO new_user_id;
        
        INSERT INTO user_roles (user_id, role_id) VALUES (new_user_id, pm_role_id);
        
        -- Create CV entry
        INSERT INTO cv (id, user_id, status)
        VALUES (uuid_generate_v4(), new_user_id, 'Chưa cập nhật');
    END IF;
    
    -- Test User 4: Business Unit Leader
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test_bul@example.com') THEN
        INSERT INTO users (id, employee_code, full_name, email, password, department_id, created_at) 
        VALUES (
            uuid_generate_v4(), 
            'TEST004', 
            'Test Business Unit Leader', 
            'test_bul@example.com',
            -- Using bcrypt hash of 'password123'
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            banking_dept_id, 
            NOW()
        ) RETURNING id INTO new_user_id;
        
        INSERT INTO user_roles (user_id, role_id) VALUES (new_user_id, bul_role_id);
        
        -- Create CV entry
        INSERT INTO cv (id, user_id, status)
        VALUES (uuid_generate_v4(), new_user_id, 'Chưa cập nhật');
    END IF;
END $$; 