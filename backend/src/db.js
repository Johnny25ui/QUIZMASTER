
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
});

export async function initDatabase() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS quizmaster;

    CREATE TABLE IF NOT EXISTS quizmaster.administrators (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(120) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quizmaster.system_settings (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      platform_name VARCHAR(150) NOT NULL DEFAULT 'QuizMaster',
      require_email BOOLEAN NOT NULL DEFAULT FALSE,
      require_student_code BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT single_settings_row CHECK (id = 1)
    );

    INSERT INTO quizmaster.system_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);
}
