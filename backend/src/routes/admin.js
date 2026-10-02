
import { Router } from "express";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router=Router();
router.use(requireAdmin);

router.get("/dashboard",async(_req,res)=>{
  const [q,a,s,avg]=await Promise.all([
    pool.query("SELECT COUNT(*)::int n FROM quizmaster.questionnaires"),
    pool.query("SELECT COUNT(*)::int n FROM quizmaster.attempts WHERE completed_at IS NOT NULL"),
    pool.query("SELECT COUNT(*)::int n FROM quizmaster.students"),
    pool.query("SELECT COALESCE(ROUND(AVG(percentage),2),0) avg FROM quizmaster.attempts WHERE completed_at IS NOT NULL")
  ]);
  res.json({
    questionnaires:q.rows[0].n,
    attempts:a.rows[0].n,
    students:s.rows[0].n,
    average:Number(avg.rows[0].avg)
  });
});

router.get("/results",async(_req,res)=>{
  const r=await pool.query(`
    SELECT
      a.id,
      a.questionnaire_id,
      a.student_id,
      s.full_name,
      s.email,
      s.student_code,
      q.title,
      a.score,
      a.max_score,
      a.percentage,
      a.correct_answers,
      a.incorrect_answers,
      a.time_spent,
      a.completed_at,
      ROW_NUMBER() OVER(
        PARTITION BY a.questionnaire_id
        ORDER BY a.score DESC,
                 a.time_spent ASC NULLS LAST,
                 a.completed_at ASC
      )::int AS position
    FROM quizmaster.attempts a
    JOIN quizmaster.students s ON s.id=a.student_id
    JOIN quizmaster.questionnaires q ON q.id=a.questionnaire_id
    WHERE a.completed_at IS NOT NULL
    ORDER BY q.title,position
    LIMIT 1000
  `);
  res.json(r.rows);
});

router.get("/results/:id",async(req,res)=>{
  const attemptId=Number(req.params.id);

  const summary=await pool.query(`
    SELECT a.id,a.questionnaire_id,a.student_id,s.full_name,s.email,s.student_code,q.title,
           a.score,a.max_score,a.percentage,a.correct_answers,a.incorrect_answers,
           a.time_spent,a.started_at,a.completed_at
    FROM quizmaster.attempts a
    JOIN quizmaster.students s ON s.id=a.student_id
    JOIN quizmaster.questionnaires q ON q.id=a.questionnaire_id
    WHERE a.id=$1
  `,[attemptId]);

  if(!summary.rowCount) return res.status(404).json({error:"Intento no encontrado."});

  const data=summary.rows[0];

  const rank=await pool.query(`
    WITH ranking AS (
      SELECT id,
        ROW_NUMBER() OVER(
          ORDER BY score DESC,time_spent ASC NULLS LAST,completed_at ASC
        )::int AS position
      FROM quizmaster.attempts
      WHERE questionnaire_id=$1 AND completed_at IS NOT NULL
    )
    SELECT position FROM ranking WHERE id=$2
  `,[data.questionnaire_id,attemptId]);

  const detail=await pool.query(`
    SELECT q.position,q.question_text,sr.is_correct,sr.awarded_points,
           selected.answer_text AS selected_answer,
           correct.answer_text AS correct_answer
    FROM quizmaster.student_responses sr
    JOIN quizmaster.questions q ON q.id=sr.question_id
    LEFT JOIN quizmaster.answers selected ON selected.id=sr.selected_answer_id
    LEFT JOIN quizmaster.answers correct
      ON correct.question_id=q.id AND correct.is_correct=TRUE
    WHERE sr.attempt_id=$1
    ORDER BY q.position
  `,[attemptId]);

  res.json({
    ...data,
    position:rank.rows[0]?.position||null,
    responses:detail.rows
  });
});

/* Elimina un intento y sus respuestas. Si el estudiante queda sin intentos,
   también elimina el registro del estudiante. */
router.delete("/results/:id", async (req,res)=>{
  const attemptId=Number(req.params.id);
  const client=await pool.connect();

  try{
    await client.query("BEGIN");

    const found=await client.query(
      "SELECT student_id FROM quizmaster.attempts WHERE id=$1 FOR UPDATE",
      [attemptId]
    );

    if(!found.rowCount){
      await client.query("ROLLBACK");
      return res.status(404).json({error:"Resultado no encontrado."});
    }

    const studentId=found.rows[0].student_id;

    await client.query(
      "DELETE FROM quizmaster.student_responses WHERE attempt_id=$1",
      [attemptId]
    );

    await client.query(
      "DELETE FROM quizmaster.attempts WHERE id=$1",
      [attemptId]
    );

    const remaining=await client.query(
      "SELECT COUNT(*)::int AS total FROM quizmaster.attempts WHERE student_id=$1",
      [studentId]
    );

    if(remaining.rows[0].total===0){
      await client.query(
        "DELETE FROM quizmaster.students WHERE id=$1",
        [studentId]
      );
    }

    await client.query("COMMIT");
    res.json({ok:true,message:"Resultado eliminado correctamente."});
  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }
});

/* Limpia todos los estudiantes, intentos y respuestas.
   NO toca cuestionarios, preguntas ni administrador. */
router.delete("/results", async (_req,res)=>{
  const client=await pool.connect();

  try{
    await client.query("BEGIN");
    await client.query("DELETE FROM quizmaster.student_responses");
    await client.query("DELETE FROM quizmaster.attempts");
    await client.query("DELETE FROM quizmaster.students");
    await client.query("COMMIT");

    res.json({ok:true,message:"Todos los resultados fueron eliminados."});
  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }
});

export default router;
