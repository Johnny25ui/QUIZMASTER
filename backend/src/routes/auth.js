
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const existing = await pool.query(
    "SELECT id FROM quizmaster.administrators WHERE username=$1",
    [username]
  );
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO quizmaster.administrators(username,password_hash) VALUES($1,$2)",
      [username, hash]
    );
    console.log(`Administrador inicial creado: ${username}`);
  }
}

router.post("/login", async (req, res) => {
  const parsed = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Datos incompletos." });

  const { username, password } = parsed.data;
  const result = await pool.query(
    "SELECT id, username, password_hash FROM quizmaster.administrators WHERE username=$1",
    [username]
  );

  if (!result.rowCount) return res.status(401).json({ error: "Credenciales incorrectas." });

  const admin = result.rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales incorrectas." });

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, username: admin.username });
});

router.get("/me", requireAdmin, async (req, res) => {
  res.json({ admin: req.admin });
});

export { router as authRouter, ensureAdmin };
