-- Migration script to add cv_path column to cv_details table
-- This script can be run on existing databases to add the new cv_path field

-- Connect to the cv_management database
\c cv_management;

-- Add cv_path column to cv_details table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cv_details' 
        AND column_name = 'cv_path'
    ) THEN
        ALTER TABLE cv_details ADD COLUMN cv_path TEXT;
        RAISE NOTICE 'Added cv_path column to cv_details table';
    ELSE
        RAISE NOTICE 'cv_path column already exists in cv_details table';
    END IF;
END $$;

-- Also add anh_chan_dung column if it doesn't exist (for completeness)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cv_details' 
        AND column_name = 'anh_chan_dung'
    ) THEN
        ALTER TABLE cv_details ADD COLUMN anh_chan_dung TEXT;
        RAISE NOTICE 'Added anh_chan_dung column to cv_details table';
    ELSE
        RAISE NOTICE 'anh_chan_dung column already exists in cv_details table';
    END IF;
END $$;

-- Update existing mock data to include cv_path if needed
UPDATE cv_details 
SET cv_path = 'https://example.com/cv-documents/sample-cv-' || id || '.pdf'
WHERE cv_path IS NULL OR cv_path = '';

RAISE NOTICE 'Migration completed successfully';
