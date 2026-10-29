import { randomBytes, scryptSync } from "node:crypto";
import { emitKeypressEvents } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(root);
const email = process.argv[2]?.trim().toLowerCase();
const lockName = "academic_dashboard_super_admin_bootstrap";

if (!process.env.DATABASE_URL?.startsWith("mysql://")) {
  throw new Error(
    "DATABASE_URL is missing or invalid. Configure it in the project-root .env.local file, then run npm run db:create-super-admin -- admin@institution.edu. See README.md for setup."
  );
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Usage: node scripts/create-super-admin.mjs admin@institution.edu");
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  throw new Error("Run this command in an interactive terminal so the password can be entered without echo.");
}
emitKeypressEvents(process.stdin);

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt);
    let value = "";
    const onKeypress = (character, key) => {
      if (key.ctrl && key.name === "c") {
        process.stdin.off("keypress", onKeypress);
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        reject(new Error("Cancelled."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        process.stdin.off("keypress", onKeypress);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (!key.ctrl && !key.meta && character) value += character;
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("keypress", onKeypress);
  });
}

const password = await readHidden("New Super Admin password (12+ characters): ");
if (password.length < 12 || password.length > 256) {
  throw new Error("Password must contain between 12 and 256 characters.");
}
const confirmation = await readHidden("Confirm password: ");
if (password !== confirmation) throw new Error("Passwords do not match.");

const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
const connectionUrl = new URL(process.env.DATABASE_URL);
const pool = mysql.createPool({
  host: connectionUrl.hostname,
  port: Number(connectionUrl.port || 3306),
  user: decodeURIComponent(connectionUrl.username),
  password: decodeURIComponent(connectionUrl.password),
  database: decodeURIComponent(connectionUrl.pathname.slice(1)),
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  connectionLimit: 2,
  connectTimeout: 5_000
});
const connection = await pool.getConnection();
let lockAcquired = false;

try {
  const [lockRows] = await connection.execute(
    "SELECT GET_LOCK(?, 10) AS acquired",
    [lockName]
  );
  lockAcquired = Number(lockRows[0].acquired) === 1;
  if (!lockAcquired) throw new Error("Could not acquire the Super Admin bootstrap lock; try again.");

  await connection.beginTransaction();
  try {
    const [existingRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'SUPER_ADMIN'"
    );
    if (Number(existingRows[0].count) > 0) {
      throw new Error("A Super Admin already exists; bootstrap is disabled.");
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO users (email, password_hash, role, display_name)
       VALUES (?, ?, 'SUPER_ADMIN', ?)`,
      [email, passwordHash, email]
    );
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
       VALUES (?, 'user.super_admin_bootstrapped', 'user', ?, JSON_OBJECT())`,
      [insertResult.insertId, String(insertResult.insertId)]
    );
    await connection.commit();
    console.log("Super Admin account created.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
} finally {
  if (lockAcquired) {
    await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]);
  }
  connection.release();
  await pool.end();
}
