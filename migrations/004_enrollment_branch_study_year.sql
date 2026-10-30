ALTER TABLE enrollments
    ADD COLUMN branch VARCHAR(120) NULL,
    ADD COLUMN study_year TINYINT UNSIGNED NULL,
    ADD KEY enrollments_branch_study_year_idx (branch, study_year);

UPDATE enrollments e
JOIN students s ON s.id = e.student_id
SET e.branch = TRIM(s.course)
WHERE e.branch IS NULL;

ALTER TABLE enrollments
    MODIFY COLUMN branch VARCHAR(120) NOT NULL,
    ADD CONSTRAINT enrollments_study_year_check CHECK (study_year IS NULL OR study_year BETWEEN 1 AND 5);
