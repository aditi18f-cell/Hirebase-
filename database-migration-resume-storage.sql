-- Existing Hirebase databases only. Fresh installs already define this column.
-- Run once before starting the Java backend after upgrading resume delivery.
ALTER TABLE resumes
    ADD COLUMN storage_file_name VARCHAR(255) NULL;
