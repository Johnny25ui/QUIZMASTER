
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: Falta DATABASE_URL en backend/.env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
});

try {
  console.log("");
  console.log("QUIZMASTER - LIMPIEZA DE PRUEBAS");
  console.log("--------------------------------");

  const before = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM quizmaster.student_responses)::int AS respuestas,
      (SELECT COUNT(*) FROM quizmaster.attempts)::int AS intentos,
      (SELECT COUNT(*) FROM quizmaster.students)::int AS estudiantes
  `);

  console.log("Antes de limpiar:");
  console.table(before.rows);

  await pool.query("BEGIN");

  await pool.query("DELETE FROM quizmaster.student_responses");
  await pool.query("DELETE FROM quizmaster.attempts");
  await pool.query("DELETE FROM quizmaster.students");

  await pool.query("COMMIT");

  const after = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM quizmaster.student_responses)::int AS respuestas,
      (SELECT COUNT(*) FROM quizmaster.attempts)::int AS intentos,
      (SELECT COUNT(*) FROM quizmaster.students)::int AS estudiantes
  `);

  console.log("");
  console.log("Después de limpiar:");
  console.table(after.rows);

  console.log("");
  console.log("LISTO: se eliminaron únicamente las pruebas de estudiantes.");
  console.log("El cuestionario, las preguntas y el administrador NO fueron eliminados.");
  console.log("");
} catch (e) {
  await pool.query("ROLLBACK").catch(()=>{});
  console.error("ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(()=>{});
}
