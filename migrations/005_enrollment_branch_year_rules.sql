ALTER TABLE enrollments
    DROP CHECK enrollments_study_year_check,
    ADD CONSTRAINT enrollments_study_year_check
        CHECK (
            study_year IS NULL
            OR UPPER(branch) NOT IN ('MCA', 'MBA', 'CSE', 'AIML', 'IS', 'EC', 'MECH', 'CIVIL')
            OR (
                UPPER(branch) IN ('MCA', 'MBA')
                AND study_year BETWEEN 1 AND 2
            )
            OR (
                UPPER(branch) IN ('CSE', 'AIML', 'IS', 'EC', 'MECH', 'CIVIL')
                AND study_year BETWEEN 1 AND 4
            )
        );
