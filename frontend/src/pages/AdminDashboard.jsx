
import {useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {api} from "../api";

export default function AdminDashboard(){
  const nav=useNavigate();
  const [stats,setStats]=useState(null);
  const [rows,setRows]=useState([]);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("");

  useEffect(()=>{
    Promise.all([api("/api/admin/dashboard"),api("/api/admin/results")])
      .then(([s,r])=>{setStats(s);setRows(r)})
      .catch(e=>{
        setError(e.message);
        if(e.message.toLowerCase().includes("autoriz"))nav("/admin");
      });
  },[]);

  const visible=useMemo(()=>{
    const f=filter.trim().toLowerCase();
    return !f?rows:rows.filter(r=>
      r.full_name.toLowerCase().includes(f) ||
      r.title.toLowerCase().includes(f)
    );
  },[rows,filter]);

  function logout(){localStorage.removeItem("qm_token");nav("/")}

  return <main className="page">
    <section className="sectionTitle">
      <div><span className="tag">PANEL PRIVADO</span><h1>Ranking y revisión de estudiantes</h1></div>
      <button className="ghostBtn" onClick={logout}>Cerrar sesión</button>
    </section>

    {error&&<div className="alert">{error}</div>}

    {stats&&<div className="stats">
      <div><b>{stats.questionnaires}</b><span>Cuestionarios</span></div>
      <div><b>{stats.students}</b><span>Estudiantes</span></div>
      <div><b>{stats.attempts}</b><span>Intentos</span></div>
      <div><b>{stats.average}%</b><span>Promedio</span></div>
    </div>}

    <section className="card">
      <label className="searchLabel">Buscar estudiante o cuestionario
        <input className="searchInput" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Ej.: María o Fundamentos"/>
      </label>
    </section>

    <section className="card tableCard">
      <div className="sectionTitle">
        <div><span className="tag">CLASIFICACIÓN</span><h2>Todos los estudiantes</h2></div>
        <span className="rankingHint">Orden: mayor nota y, en empate, menor tiempo</span>
      </div>
      <table>
        <thead><tr><th>Pos.</th><th>Estudiante</th><th>Cuestionario</th><th>Nota</th><th>%</th><th>Aciertos</th><th>Tiempo</th><th>Revisión</th></tr></thead>
        <tbody>
          {visible.map(r=><tr key={r.id} className={r.position<=10?"topTenRow":""}>
            <td><b>#{r.position}</b></td>
            <td>{r.full_name}</td>
            <td>{r.title}</td>
            <td>{r.score}/{r.max_score}</td>
            <td>{Number(r.percentage).toFixed(1)}%</td>
            <td>{r.correct_answers}</td>
            <td>{Math.round((r.time_spent||0)/60)} min</td>
            <td><button className="ghostBtn" onClick={()=>nav(`/admin/results/${r.id}`)}>Revisar respuestas</button></td>
          </tr>)}
        </tbody>
      </table>
      {!visible.length&&<p>No existen resultados para mostrar.</p>}
    </section>
  </main>
}
