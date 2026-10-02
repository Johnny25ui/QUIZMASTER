
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BookOpen, Clock, ListChecks, ShieldCheck } from "lucide-react";

export default function Home(){
  const [items,setItems]=useState([]);
  const [error,setError]=useState("");
  useEffect(()=>{ api("/api/public/questionnaires").then(setItems).catch(e=>setError(e.message)); },[]);
  return <main className="page">
    <section className="hero">
      <div>
        <span className="tag">QUIZMASTER</span>
        <h1>Evaluaciones académicas simples, rápidas y confiables.</h1>
        <p>Ingresa al cuestionario, responde tus preguntas y recibe tu resultado al finalizar.</p>
      </div>
      <ShieldCheck size={72}/>
    </section>

    <section className="section">
      <div className="sectionTitle">
        <div><span className="tag">DISPONIBLES</span><h2>Cuestionarios</h2></div>
        <Link className="ghostBtn" to="/admin">Administración</Link>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="cards">
        {items.map(q=><article className="card" key={q.id}>
          <BookOpen size={28}/>
          <h3>{q.title}</h3>
          <p>{q.description}</p>
          <div className="meta">
            <span><ListChecks size={16}/>{q.question_count} preguntas</span>
            <span><Clock size={16}/>{q.duration || "Sin límite"} min</span>
          </div>
          <Link className="primaryBtn" to={`/quiz/${q.id}`}>Comenzar evaluación</Link>
        </article>)}
      </div>
    </section>
  </main>
}
