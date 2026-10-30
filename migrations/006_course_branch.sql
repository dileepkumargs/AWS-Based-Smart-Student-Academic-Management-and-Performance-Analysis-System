ALTER TABLE courses
    ADD COLUMN branch VARCHAR(16) NULL,
    ADD CONSTRAINT courses_branch_check
        CHECK (
            branch IS NULL
            OR UPPER(branch) IN ('MCA', 'MBA', 'CSE', 'AIML', 'IS', 'EC', 'MECH', 'CIVIL')
        );
