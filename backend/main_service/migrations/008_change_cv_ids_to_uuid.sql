-- Migration to change ID columns from integer to UUID for CV related tables
-- This migration changes cv_education, cv_courses, and cv_skills tables

-- First, drop existing foreign key constraints and indexes if any
-- Note: These tables don't have foreign keys to other tables via their ID columns

-- 1. Update cv_education table
-- Drop the existing primary key constraint
ALTER TABLE cv_education DROP CONSTRAINT IF EXISTS cv_education_pkey;

-- Add a new UUID column
ALTER TABLE cv_education ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();

-- Update the new column with UUIDs for existing records
UPDATE cv_education SET id_new = uuid_generate_v4();

-- Drop the old integer ID column
ALTER TABLE cv_education DROP COLUMN id;

-- Rename the new column to id
ALTER TABLE cv_education RENAME COLUMN id_new TO id;

-- Add the primary key constraint back
ALTER TABLE cv_education ADD PRIMARY KEY (id);

-- 2. Update cv_courses table
-- Drop the existing primary key constraint
ALTER TABLE cv_courses DROP CONSTRAINT IF EXISTS cv_courses_pkey;

-- Add a new UUID column
ALTER TABLE cv_courses ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();

-- Update the new column with UUIDs for existing records
UPDATE cv_courses SET id_new = uuid_generate_v4();

-- Drop the old integer ID column
ALTER TABLE cv_courses DROP COLUMN id;

-- Rename the new column to id
ALTER TABLE cv_courses RENAME COLUMN id_new TO id;

-- Add the primary key constraint back
ALTER TABLE cv_courses ADD PRIMARY KEY (id);

-- 3. Update cv_skills table
-- Drop the existing primary key constraint
ALTER TABLE cv_skills DROP CONSTRAINT IF EXISTS cv_skills_pkey;

-- Add a new UUID column
ALTER TABLE cv_skills ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();

-- Update the new column with UUIDs for existing records
UPDATE cv_skills SET id_new = uuid_generate_v4();

-- Drop the old integer ID column
ALTER TABLE cv_skills DROP COLUMN id;

-- Rename the new column to id
ALTER TABLE cv_skills RENAME COLUMN id_new TO id;

-- Add the primary key constraint back
ALTER TABLE cv_skills ADD PRIMARY KEY (id);
