
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";

const router = Router();

router.get("/questionnaires", async (_req, res) => {
  const r = await pool.query(`
    SELECT q.id,q.title,q.description,q.duration,q.max_score,
           q.max_attempts,COUNT(qq.id)::int AS question_count
    FROM quizmaster.questionnaires q
    LEFT JOIN quizmaster.questions qq ON qq.questionnaire_id=q.id
    WHERE q.is_active=TRUE
      AND (q.start_date IS NULL OR q.start_date <= NOW())
      AND (q.end_date IS NULL OR q.end_date >= NOW())
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `);
  res.json(r.rows);
});

router.get("/questionnaires/:id", async (req, res) => {
  const id=Number(req.params.id);
  const q=await pool.query(`
    SELECT id,title,description,duration,max_score,max_attempts,
           allow_back_navigation,shuffle_questions,shuffle_answers
    FROM quizmaster.questionnaires
    WHERE id=$1 AND is_active=TRUE
  `,[id]);

  if(!q.rowCount) return res.status(404).json({error:"Cuestionario no encontrado."});

  const qr=await pool.query(`
    SELECT id,question_text,question_type,points,position
    FROM quizmaster.questions
    WHERE questionnaire_id=$1 ORDER BY position
  `,[id]);

  const ids=qr.rows.map(x=>x.id);
  let answers=[];
  if(ids.length){
    const ar=await pool.query(`
      SELECT id,question_id,answer_text,position
      FROM quizmaster.answers
      WHERE question_id=ANY($1::bigint[])
      ORDER BY question_id,position
    `,[ids]);
    answers=ar.rows;
  }

  const questions=qr.rows.map(question=>({
    ...question,
    answers:answers.filter(a=>String(a.question_id)===String(question.id))
  }));

  res.json({...q.rows[0],questions});
});

router.post("/questionnaires/:id/start", async (req,res) => {
  const questionnaireId=Number(req.params.id);
  const parsed=z.object({
    full_name:z.string().min(3).max(255),
    email:z.string().email().optional().or(z.literal("")),
    student_code:z.string().max(120).optional().or(z.literal(""))
  }).safeParse(req.body);

  if(!parsed.success) return res.status(400).json({error:"Ingrese nombres y apellidos válidos."});

  const qc=await pool.query(
    "SELECT id,max_attempts FROM quizmaster.questionnaires WHERE id=$1 AND is_active=TRUE",
    [questionnaireId]
  );
  if(!qc.rowCount) return res.status(404).json({error:"Cuestionario no disponible."});

  const {full_name,email,student_code}=parsed.data;
  const client=await pool.connect();

  try{
    await client.query("BEGIN");
    let student;

    if(email){
      const sr=await client.query("SELECT * FROM quizmaster.students WHERE email=$1 LIMIT 1",[email]);
      student=sr.rows[0];
    }else if(student_code){
      const sr=await client.query("SELECT * FROM quizmaster.students WHERE student_code=$1 LIMIT 1",[student_code]);
      student=sr.rows[0];
    }

    if(!student){
      const ins=await client.query(`
        INSERT INTO quizmaster.students(full_name,email,student_code)
        VALUES($1,NULLIF($2,''),NULLIF($3,''))
        RETURNING *
      `,[full_name,email||"",student_code||""]);
      student=ins.rows[0];
    }

    const prior=await client.query(`
      SELECT COUNT(*)::int AS count
      FROM quizmaster.attempts
      WHERE student_id=$1 AND questionnaire_id=$2 AND completed_at IS NOT NULL
    `,[student.id,questionnaireId]);

    if(prior.rows[0].count>=qc.rows[0].max_attempts){
      await client.query("ROLLBACK");
      return res.status(409).json({error:"Ya alcanzó el número máximo de intentos permitidos."});
    }

    const attempt=await client.query(`
      INSERT INTO quizmaster.attempts(student_id,questionnaire_id,max_score,status)
      SELECT $1,id,max_score,'Completado pendiente'
      FROM quizmaster.questionnaires WHERE id=$2
      RETURNING id,started_at
    `,[student.id,questionnaireId]);

    await client.query("COMMIT");
    res.json({attempt_id:attempt.rows[0].id,started_at:attempt.rows[0].started_at});
  }catch(e){
    await client.query("ROLLBACK"); throw e;
  }finally{client.release();}
});

router.post("/attempts/:id/submit", async (req,res) => {
  const attemptId=Number(req.params.id);
  const parsed=z.object({
    responses:z.array(z.object({
      question_id:z.number(),
      answer_id:z.number()
    }))
  }).safeParse(req.body);

  if(!parsed.success) return res.status(400).json({error:"Respuestas inválidas."});

  const client=await pool.connect();
  try{
    await client.query("BEGIN");

    const ar=await client.query(`
      SELECT a.*,q.max_score,q.id AS questionnaire_id
      FROM quizmaster.attempts a
      JOIN quizmaster.questionnaires q ON q.id=a.questionnaire_id
      WHERE a.id=$1 FOR UPDATE
    `,[attemptId]);

    if(!ar.rowCount){
      await client.query("ROLLBACK");
      return res.status(404).json({error:"Intento no encontrado."});
    }

    const attempt=ar.rows[0];
    if(attempt.completed_at){
      await client.query("ROLLBACK");
      return res.status(409).json({error:"Este intento ya fue entregado."});
    }

    const questions=await client.query(`
      SELECT id,points FROM quizmaster.questions
      WHERE questionnaire_id=$1 ORDER BY position
    `,[attempt.questionnaire_id]);

    const validQuestionIds=new Set(questions.rows.map(q=>Number(q.id)));
    let score=0,correct=0,incorrect=0;

    for(const response of parsed.data.responses){
      if(!validQuestionIds.has(Number(response.question_id))) continue;

      const rr=await client.query(`
        SELECT a.id,a.is_correct,q.points
        FROM quizmaster.answers a
        JOIN quizmaster.questions q ON q.id=a.question_id
        WHERE a.id=$1 AND a.question_id=$2 AND q.questionnaire_id=$3
      `,[response.answer_id,response.question_id,attempt.questionnaire_id]);

      if(!rr.rowCount) continue;
      const row=rr.rows[0];
      const awarded=row.is_correct?Number(row.points):0;

      if(row.is_correct){correct++;score+=awarded;}else incorrect++;

      await client.query(`
        INSERT INTO quizmaster.student_responses
          (attempt_id,question_id,selected_answer_id,is_correct,awarded_points)
        VALUES($1,$2,$3,$4,$5)
      `,[attemptId,response.question_id,response.answer_id,row.is_correct,awarded]);
    }

    const answered=parsed.data.responses.filter(r=>validQuestionIds.has(Number(r.question_id))).length;
    incorrect+=Math.max(0,questions.rowCount-answered);

    const maxScore=Number(attempt.max_score);
    const percentage=maxScore>0?(score/maxScore)*100:0;

    await client.query(`
      UPDATE quizmaster.attempts
      SET completed_at=NOW(),
          score=$2,
          percentage=$3,
          correct_answers=$4,
          incorrect_answers=$5,
          status='Completado',
          time_spent=EXTRACT(EPOCH FROM (NOW()-started_at))::int
      WHERE id=$1
    `,[attemptId,score,percentage,correct,incorrect]);

    await client.query("COMMIT");

    res.json({
      attempt_id:attemptId,
      score,
      max_score:maxScore,
      percentage:Number(percentage.toFixed(2)),
      correct_answers:correct,
      incorrect_answers:incorrect
    });
  }catch(e){
    await client.query("ROLLBACK"); throw e;
  }finally{client.release();}
});

router.get("/attempts/:id/result", async (req,res) => {
  const attemptId=Number(req.params.id);
  const r=await pool.query(`
    SELECT a.id,a.questionnaire_id,a.score,a.max_score,a.percentage,
           a.correct_answers,a.incorrect_answers,a.started_at,
           a.completed_at,a.time_spent,s.full_name,q.title
    FROM quizmaster.attempts a
    JOIN quizmaster.students s ON s.id=a.student_id
    JOIN quizmaster.questionnaires q ON q.id=a.questionnaire_id
    WHERE a.id=$1
  `,[attemptId]);

  if(!r.rowCount) return res.status(404).json({error:"Resultado no encontrado."});

  const row=r.rows[0];

  const rank=await pool.query(`
    WITH ranking AS (
      SELECT
        a.id,
        ROW_NUMBER() OVER(
          ORDER BY a.score DESC,
                   a.time_spent ASC NULLS LAST,
                   a.completed_at ASC
        )::int AS position
      FROM quizmaster.attempts a
      WHERE a.questionnaire_id=$1
        AND a.completed_at IS NOT NULL
    )
    SELECT position FROM ranking WHERE id=$2
  `,[row.questionnaire_id,attemptId]);

  res.json({
    ...row,
    position:rank.rows[0]?.position||null
  });
});

router.get("/questionnaires/:id/ranking", async (req,res) => {
  const questionnaireId=Number(req.params.id);

  const r=await pool.query(`
    SELECT
      ROW_NUMBER() OVER(
        ORDER BY a.score DESC,
                 a.time_spent ASC NULLS LAST,
                 a.completed_at ASC
      )::int AS position,
      s.full_name,
      a.score,
      a.max_score,
      a.percentage,
      a.correct_answers,
      a.time_spent,
      a.completed_at
    FROM quizmaster.attempts a
    JOIN quizmaster.students s ON s.id=a.student_id
    WHERE a.questionnaire_id=$1
      AND a.completed_at IS NOT NULL
    ORDER BY position
  `,[questionnaireId]);

  res.json(r.rows);
});

export default router;
