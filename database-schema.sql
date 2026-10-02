-- Hirebase Database Schema

-- Table for Job Seekers
CREATE TABLE job_seeker (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Employers
CREATE TABLE employer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    address TEXT,
    website VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Jobs
CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    job_description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2),
    experience_level VARCHAR(50),
    experience_required INT DEFAULT 0,
    job_type VARCHAR(50),
    required_skills TEXT,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employer_id) REFERENCES employer(id)
);

-- Table for Resumes (created before applications so the FK is available)
CREATE TABLE resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_seeker_id INT NOT NULL,
    resume_file_name VARCHAR(255) NOT NULL,
    storage_file_name VARCHAR(255),
    resume_text TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seeker(id)
);

-- Table for Applications
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_seeker_id INT NOT NULL,
    job_id INT NOT NULL,
    resume_id INT,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    cover_letter TEXT,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seeker(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
    UNIQUE KEY uq_application_seeker_job (job_seeker_id, job_id)
);

-- Table for Saved Jobs
CREATE TABLE saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_seeker_id INT NOT NULL,
    job_id INT NOT NULL,
    saved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seeker(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY uq_saved_jobs_seeker_job (job_seeker_id, job_id)
);

-- Table for Job Seeker Profiles
CREATE TABLE job_seeker_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_seeker_id INT NOT NULL,
    education TEXT,
    experience TEXT,
    skills TEXT, -- comma-separated skills
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seeker(id),
    UNIQUE KEY uq_job_seeker_profile (job_seeker_id)
);

-- Table for Employer Profiles
CREATE TABLE employer_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    company_description TEXT,
    company_size VARCHAR(50),
    founded_year INT,
    industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES employer(id),
    UNIQUE KEY uq_employer_profile (employer_id)
);
