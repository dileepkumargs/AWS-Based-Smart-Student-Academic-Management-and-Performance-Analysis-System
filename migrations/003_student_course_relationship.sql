ALTER TABLE students
    ADD COLUMN course_id BIGINT UNSIGNED NULL,
    ADD KEY students_course_idx (course_id),
    ADD CONSTRAINT students_course_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
