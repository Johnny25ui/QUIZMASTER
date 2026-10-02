
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { initDatabase, pool } from "./db.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import { authRouter, ensureAdmin } from "./routes/auth.js";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en backend/.env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en backend/.env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit:"1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", async (_req,res) => {
  const r = await pool.query("SELECT NOW() now");
  res.json({ ok:true, database:true, time:r.rows[0].now });
});

app.use("/api/auth", authRouter);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error:"Error interno del servidor." });
});

await initDatabase();
await ensureAdmin();

app.listen(PORT, () => {
  console.log(`QuizMaster backend: http://localhost:${PORT}`);
});
