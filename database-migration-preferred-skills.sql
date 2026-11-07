-- Run once on an existing Hirebase database to store optional preferred skills.
ALTER TABLE jobs
    ADD COLUMN preferred_skills TEXT NULL AFTER required_skills;
