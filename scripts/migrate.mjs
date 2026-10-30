import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(root);
const migrationDirectory = join(root, "migrations");
const dataPath = process.env.ACADEMIC_DATA_FILE || join(root, "data", "db.json");

if (!process.env.DATABASE_URL?.startsWith("mysql://")) {
  throw new Error(
    "DATABASE_URL is missing or invalid. Copy .env.example to .env.local, set DATABASE_URL to your MySQL connection URL, then run npm run db:migrate. See README.md for setup."
  );
}

const connectionUrl = new URL(process.env.DATABASE_URL);
const database = decodeURIComponent(connectionUrl.pathname.slice(1));
if (!connectionUrl.hostname || !connectionUrl.username || !database) {
  throw new Error("DATABASE_URL must include a MySQL host, username, and database name.");
}

const pool = mysql.createPool({
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port || 3306),
  user: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  connectionLimit: 4,
  connectTimeout: 5_000
});

async function loadSeed() {
  try {
    return {
      path: dataPath,
      data: JSON.parse(await readFile(dataPath, "utf8"))
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const fallbackPath = join(root, "db.json");
    return {
      path: fallbackPath,
      data: JSON.parse(await readFile(fallbackPath, "utf8"))
    };
  }
}

try {
  const migrationNames = (await readdir(migrationDirectory))
    .filter(name => /^\d+_.+\.sql$/.test(name))
    .sort();
  const seed = await loadSeed();
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version VARCHAR(100) NOT NULL PRIMARY KEY,
         applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
       ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    );
    let initialSchemaWasApplied = false;
    for (const name of migrationNames) {
      const version = name === "001_initial_schema.sql"
        ? "001_mysql_initial_schema"
        : `${name.slice(0, -4)}_mysql`;
      const [appliedRows] = await connection.execute(
        "SELECT version FROM schema_migrations WHERE version = ?",
        [version]
      );
      if (appliedRows.length > 0) continue;

      const migration = await readFile(join(migrationDirectory, name), "utf8");
      for (const statement of migration.split(";").map(value => value.trim()).filter(Boolean)) {
        await connection.query(statement);
      }
      await connection.execute(
        "INSERT INTO schema_migrations (version) VALUES (?)",
        [version]
      );
      if (name.startsWith("001_")) initialSchemaWasApplied = true;
    }

    if (initialSchemaWasApplied) {
      await connection.beginTransaction();
      try {
      for (const student of seed.data.students ?? []) {
        const [existing] = await connection.execute("SELECT id FROM students WHERE id = ?", [student.id]);
        if (existing.length === 0) {
          await connection.execute(
            "INSERT INTO students (id, name, year, course, gpa) VALUES (?, ?, ?, ?, ?)",
            [student.id, student.name, student.year, student.course, student.gpa]
          );
        }
      }
      for (const faculty of seed.data.faculty ?? []) {
        const [existing] = await connection.execute("SELECT id FROM faculty WHERE id = ?", [faculty.id]);
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO faculty (id, name, email, department, specialization, phone)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [faculty.id, faculty.name, faculty.email, faculty.department, faculty.specialization, faculty.phone ?? null]
          );
        }
      }
      for (const course of seed.data.courses ?? []) {
        const [existing] = await connection.execute("SELECT id FROM courses WHERE id = ?", [course.id]);
        if (existing.length === 0) {
          const [facultyRows] = await connection.execute(
            "SELECT id FROM faculty WHERE name = ? ORDER BY id LIMIT 1",
            [course.instructor ?? null]
          );
          await connection.execute(
            `INSERT INTO courses (id, code, name, credits, department, instructor, faculty_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [course.id, course.code, course.name, course.credits, course.department,
              course.instructor ?? null, facultyRows[0]?.id ?? null]
          );
        }
      }
      for (const enrollment of seed.data.enrollments ?? []) {
        const [existing] = await connection.execute("SELECT id FROM enrollments WHERE id = ?", [enrollment.id]);
        if (existing.length === 0) {
          const [studentRows] = await connection.execute(
            "SELECT course FROM students WHERE id = ?",
            [enrollment.studentId]
          );
          if (studentRows.length === 0) {
            throw new Error(`Cannot seed enrollment ${enrollment.id}: student ${enrollment.studentId} does not exist.`);
          }
          const branch = typeof studentRows[0].course === "string" ? studentRows[0].course.trim() : "";
          if (!branch) {
            throw new Error(`Cannot seed enrollment ${enrollment.id}: student ${enrollment.studentId} has no branch.`);
          }
          await connection.execute(
            `INSERT INTO enrollments (id, student_id, course_id, branch, study_year, grade, semester, year, status, enrolled_date)
             VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
            [enrollment.id, enrollment.studentId, enrollment.courseId, branch,
              enrollment.grade ?? null, enrollment.semester, enrollment.year, enrollment.status, enrollment.enrolledDate]
          );
        }
      }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    console.log(`MySQL migrations complete${initialSchemaWasApplied ? `. Seed records imported from ${seed.path} when absent.` : "."}`);
  } finally {
    connection.release();
  }
} finally {
  await pool.end();
}
