
import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {api} from "../api";

export default function Result(){
  const {attemptId}=useParams();
  const [r,setR]=useState(null);
  const [ranking,setRanking]=useState([]);
  const [error,setError]=useState("");

  useEffect(()=>{
    api(`/api/public/attempts/${attemptId}/result`)
      .then(async result=>{
        setR(result);
        const board=await api(`/api/public/questionnaires/${result.questionnaire_id}/ranking`);
        setRanking(board);
      })
      .catch(e=>setError(e.message));
  },[attemptId]);

  if(!r) return <main className="page narrow"><div className="card">{error||"Cargando resultado..."}</div></main>;

  const top10=ranking.slice(0,10);

  return <main className="page">
    <section className="card resultCard">
      <span className="tag">EVALUACIÓN FINALIZADA</span>
      <h1>{r.title}</h1>
      <p>{r.full_name}</p>
      <div className="bigScore">{r.score}/{r.max_score}</div>
      <div className="positionHero">Posición actual: <b>#{r.position}</b></div>

      <div className="infoGrid">
        <div><b>{Number(r.percentage).toFixed(1)}%</b><span>Rendimiento</span></div>
        <div><b>{r.correct_answers}</b><span>Aciertos</span></div>
        <div><b>{r.incorrect_answers}</b><span>Errores</span></div>
        <div><b>{Math.round((r.time_spent||0)/60)}</b><span>Minutos</span></div>
      </div>
    </section>

    <section className="card tableCard">
      <div className="sectionTitle">
        <div><span className="tag">CLASIFICACIÓN</span><h2>Top 10</h2></div>
        <span className="rankingHint">Puntaje ↓ · Tiempo ↑</span>
      </div>
      <table>
        <thead><tr><th>Pos.</th><th>Estudiante</th><th>Nota</th><th>Aciertos</th><th>Tiempo</th></tr></thead>
        <tbody>
          {top10.map(x=><tr key={`${x.position}-${x.full_name}`} className={x.position===r.position?"myRank":""}>
            <td><b>#{x.position}</b></td>
            <td>{x.full_name}</td>
            <td>{x.score}/{x.max_score}</td>
            <td>{x.correct_answers}</td>
            <td>{Math.round((x.time_spent||0)/60)} min</td>
          </tr>)}
        </tbody>
      </table>
    </section>

    {ranking.length>10 && <section className="card tableCard">
      <span className="tag">CLASIFICACIÓN GENERAL</span>
      <h2>Estudiantes siguientes</h2>
      <table>
        <thead><tr><th>Pos.</th><th>Estudiante</th><th>Nota</th><th>Aciertos</th><th>Tiempo</th></tr></thead>
        <tbody>
          {ranking.slice(10).map(x=><tr key={`${x.position}-${x.full_name}`} className={x.position===r.position?"myRank":""}>
            <td><b>#{x.position}</b></td>
            <td>{x.full_name}</td>
            <td>{x.score}/{x.max_score}</td>
            <td>{x.correct_answers}</td>
            <td>{Math.round((x.time_spent||0)/60)} min</td>
          </tr>)}
        </tbody>
      </table>
    </section>}

    <div className="centerAction"><Link className="primaryBtn" to="/">Volver al inicio</Link></div>
  </main>
}
