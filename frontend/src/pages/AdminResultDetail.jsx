
import {useEffect,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {api} from "../api";

export default function AdminResultDetail(){
  const {id}=useParams();
  const nav=useNavigate();
  const [data,setData]=useState(null);
  const [error,setError]=useState("");

  useEffect(()=>{
    api(`/api/admin/results/${id}`)
      .then(setData)
      .catch(e=>{
        setError(e.message);
        if(e.message.toLowerCase().includes("autoriz"))nav("/admin");
      });
  },[id]);

  if(!data)return <main className="page narrow"><div className="card">{error||"Cargando respuestas..."}</div></main>;

  return <main className="page">
    <section className="sectionTitle">
      <div><span className="tag">REVISIÓN DEL ESTUDIANTE</span><h1>{data.full_name}</h1><p>{data.title}</p></div>
      <button className="ghostBtn" onClick={()=>nav("/admin/dashboard")}>Volver</button>
    </section>

    <div className="stats">
      <div><b>#{data.position}</b><span>Posición</span></div>
      <div><b>{data.score}/{data.max_score}</b><span>Calificación</span></div>
      <div><b>{data.correct_answers}</b><span>Aciertos</span></div>
      <div><b>{data.incorrect_answers}</b><span>Errores</span></div>
    </div>

    <section className="card">
      <h2>Información del intento</h2>
      <p><b>Nombre:</b> {data.full_name}</p>
      <p><b>Correo:</b> {data.email||"No registrado"}</p>
      <p><b>Código:</b> {data.student_code||"No registrado"}</p>
      <p><b>Rendimiento:</b> {Number(data.percentage).toFixed(1)}%</p>
      <p><b>Tiempo:</b> {Math.round((data.time_spent||0)/60)} minutos</p>
      <p><b>Fecha:</b> {new Date(data.completed_at).toLocaleString()}</p>
    </section>

    <section className="responsesList">
      {data.responses.map((r,idx)=><article className="card responseCard" key={idx}>
        <div className="responseHeader">
          <span className="tag">PREGUNTA {r.position}</span>
          <span className={`pill ${r.is_correct?"passPill":"failPill"}`}>
            {r.is_correct?"Correcta":"Incorrecta"}
          </span>
        </div>
        <h3>{r.question_text}</h3>
        <div className="answerBox">
          <span>Respuesta seleccionada</span>
          <b>{r.selected_answer||"Sin respuesta"}</b>
        </div>
        <div className="answerBox correctBox">
          <span>Respuesta correcta</span>
          <b>{r.correct_answer||"No configurada"}</b>
        </div>
        <p><b>Puntaje obtenido:</b> {r.awarded_points}</p>
      </article>)}
    </section>
  </main>
}
