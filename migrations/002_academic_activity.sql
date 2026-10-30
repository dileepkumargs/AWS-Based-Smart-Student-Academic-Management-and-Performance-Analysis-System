CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late') NOT NULL,
    marked_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY attendance_enrollment_date_unique (enrollment_id, attendance_date),
    KEY attendance_date_idx (attendance_date),
    CONSTRAINT attendance_enrollment_fk FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    CONSTRAINT attendance_marker_fk FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('general_notice', 'examination_schedule', 'assignment', 'important_notice') NOT NULL,
    publication_date DATE NOT NULL,
    expiry_date DATE NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY announcements_course_publish_idx (course_id, publication_date, expiry_date),
    KEY announcements_author_idx (created_by),
    CONSTRAINT announcements_course_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT announcements_author_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT announcements_expiry_check CHECK (expiry_date IS NULL OR expiry_date >= publication_date)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS timetable_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT UNSIGNED NOT NULL,
    faculty_id BIGINT UNSIGNED NOT NULL,
    semester VARCHAR(32) NOT NULL,
    year INT NOT NULL,
    schedule_type ENUM('class', 'examination') NOT NULL DEFAULT 'class',
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NULL,
    event_date DATE NULL,
    title VARCHAR(180) NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(120) NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY timetable_faculty_term_idx (faculty_id, year, semester, day_of_week),
    KEY timetable_course_term_idx (course_id, year, semester),
    KEY timetable_exam_date_idx (schedule_type, event_date),
    CONSTRAINT timetable_course_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT timetable_faculty_fk FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    CONSTRAINT timetable_author_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT timetable_valid_date_check CHECK (
        (schedule_type = 'class' AND day_of_week IS NOT NULL AND event_date IS NULL) OR
        (schedule_type = 'examination' AND day_of_week IS NULL AND event_date IS NOT NULL)
    ),
    CONSTRAINT timetable_valid_time_check CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
