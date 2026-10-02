
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

export default function Quiz(){
  const {id}=useParams();
  const navigate=useNavigate();
  const [quiz,setQuiz]=useState(null);
  const [attempt,setAttempt]=useState(null);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [code,setCode]=useState("");
  const [answers,setAnswers]=useState({});
  const [index,setIndex]=useState(0);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ api(`/api/public/questionnaires/${id}`).then(setQuiz).catch(e=>setError(e.message)); },[id]);

  async function start(e){
    e.preventDefault(); setError(""); setBusy(true);
    try{
      const r=await api(`/api/public/questionnaires/${id}/start`,{
        method:"POST", body:JSON.stringify({full_name:name,email,student_code:code})
      });
      setAttempt(r.attempt_id);
    }catch(e){setError(e.message)} finally{setBusy(false)}
  }

  async function submit(){
    if(!confirm("¿Está seguro de entregar la evaluación? Después no podrá cambiar sus respuestas.")) return;
    setBusy(true); setError("");
    try{
      const responses=Object.entries(answers).map(([question_id,answer_id])=>({
        question_id:Number(question_id),answer_id:Number(answer_id)
      }));
      const r=await api(`/api/public/attempts/${attempt}/submit`,{
        method:"POST",body:JSON.stringify({responses})
      });
      navigate(`/result/${r.attempt_id}`);
    }catch(e){setError(e.message)} finally{setBusy(false)}
  }

  if(!quiz) return <main className="page"><div className="card">{error || "Cargando..."}</div></main>;

  if(!attempt) return <main className="page narrow">
    <section className="card">
      <span className="tag">ANTES DE COMENZAR</span>
      <h1>{quiz.title}</h1>
      <p>{quiz.description}</p>
      <div className="infoGrid">
        <div><b>{quiz.questions.length}</b><span>Preguntas</span></div>
        <div><b>{quiz.duration || "—"}</b><span>Minutos</span></div>
        <div><b>{quiz.max_score}</b><span>Puntaje máximo</span></div>
        <div><b>{quiz.passing_percentage}%</b><span>Mínimo aprobación</span></div>
      </div>
      <form onSubmit={start} className="form">
        <label>Nombres y apellidos<input value={name} onChange={e=>setName(e.target.value)} required minLength={3}/></label>
        <label>Correo electrónico (opcional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Código estudiantil (opcional)<input value={code} onChange={e=>setCode(e.target.value)}/></label>
        {error && <div className="alert">{error}</div>}
        <button className="primaryBtn" disabled={busy}>Iniciar evaluación</button>
      </form>
    </section>
  </main>;

  const q=quiz.questions[index];
  const answered=Object.keys(answers).length;
  const progress=Math.round((answered/quiz.questions.length)*100);

  return <main className="page narrow">
    <section className="card">
      <div className="quizTop">
        <div><span className="tag">PREGUNTA {index+1} DE {quiz.questions.length}</span><h2>{q.question_text}</h2></div>
        <div className="progressText">{progress}%</div>
      </div>
      <div className="progress"><div style={{width:`${progress}%`}}/></div>

      <div className="options">
        {q.answers.map((a,i)=><label className={`option ${answers[q.id]===a.id?"selected":""}`} key={a.id}>
          <input type="radio" name={`q_${q.id}`} checked={answers[q.id]===a.id}
            onChange={()=>setAnswers({...answers,[q.id]:a.id})}/>
          <span>{String.fromCharCode(65+i)}</span>{a.answer_text}
        </label>)}
      </div>

      {error && <div className="alert">{error}</div>}
      <div className="nav">
        <button className="ghostBtn" disabled={index===0} onClick={()=>setIndex(index-1)}>Anterior</button>
        {index < quiz.questions.length-1
          ? <button className="primaryBtn" onClick={()=>setIndex(index+1)}>Siguiente</button>
          : <button className="primaryBtn" disabled={busy} onClick={submit}>Entregar evaluación</button>}
      </div>
    </section>
  </main>
}
