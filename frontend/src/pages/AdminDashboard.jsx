
import {useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {api} from "../api";

export default function AdminDashboard(){
  const nav=useNavigate();
  const [stats,setStats]=useState(null);
  const [rows,setRows]=useState([]);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    try{
      const [s,r]=await Promise.all([
        api("/api/admin/dashboard"),
        api("/api/admin/results")
      ]);
      setStats(s);
      setRows(r);
    }catch(e){
      setError(e.message);
      if(e.message.toLowerCase().includes("autoriz"))nav("/admin");
    }
  }

  useEffect(()=>{load()},[]);

  const visible=useMemo(()=>{
    const f=filter.trim().toLowerCase();
    return !f?rows:rows.filter(r=>
      r.full_name.toLowerCase().includes(f) ||
      r.title.toLowerCase().includes(f)
    );
  },[rows,filter]);

  function logout(){
    localStorage.removeItem("qm_token");
    nav("/");
  }

  async function removeOne(row){
    const ok=confirm(
      `¿Eliminar a "${row.full_name}" del ranking?\n\n`+
      `Se eliminarán este intento y todas sus respuestas.`
    );
    if(!ok)return;

    setBusy(true);
    setError("");
    setMessage("");

    try{
      await api(`/api/admin/results/${row.id}`,{method:"DELETE"});
      setMessage(`Se eliminó correctamente a ${row.full_name}.`);
      await load();
    }catch(e){
      setError(e.message);
    }finally{
      setBusy(false);
    }
  }

  async function removeAll(){
    const first=confirm(
      "¿Deseas eliminar TODOS los estudiantes y resultados?\n\n"+
      "El cuestionario y sus preguntas NO se eliminarán."
    );
    if(!first)return;

    const second=confirm(
      "CONFIRMACIÓN FINAL\n\n"+
      "El ranking quedará completamente vacío. ¿Continuar?"
    );
    if(!second)return;

    setBusy(true);
    setError("");
    setMessage("");

    try{
      await api("/api/admin/results",{method:"DELETE"});
      setMessage("Se eliminaron todos los resultados. El cuestionario se conserva.");
      await load();
    }catch(e){
      setError(e.message);
    }finally{
      setBusy(false);
    }
  }

  return <main className="page">
    <section className="sectionTitle">
      <div>
        <span className="tag">PANEL PRIVADO</span>
        <h1>Ranking y revisión de estudiantes</h1>
      </div>
      <div className="adminActions">
        <button className="dangerBtn" disabled={busy || !rows.length} onClick={removeAll}>
          Limpiar todos
        </button>
        <button className="ghostBtn" onClick={logout}>Cerrar sesión</button>
      </div>
    </section>

    {error&&<div className="alert">{error}</div>}
    {message&&<div className="successAlert">{message}</div>}

    {stats&&<div className="stats">
      <div><b>{stats.questionnaires}</b><span>Cuestionarios</span></div>
      <div><b>{stats.students}</b><span>Estudiantes</span></div>
      <div><b>{stats.attempts}</b><span>Intentos</span></div>
      <div><b>{stats.average}%</b><span>Promedio</span></div>
    </div>}

    <section className="card">
      <label className="searchLabel">
        Buscar estudiante o cuestionario
        <input
          className="searchInput"
          value={filter}
          onChange={e=>setFilter(e.target.value)}
          placeholder="Ej.: María o Fundamentos"
        />
      </label>
    </section>

    <section className="card tableCard">
      <div className="sectionTitle">
        <div>
          <span className="tag">CLASIFICACIÓN</span>
          <h2>Todos los estudiantes</h2>
        </div>
        <span className="rankingHint">
          Orden: mayor nota y, en empate, menor tiempo
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Estudiante</th>
            <th>Cuestionario</th>
            <th>Nota</th>
            <th>%</th>
            <th>Aciertos</th>
            <th>Tiempo</th>
            <th>Revisión</th>
            <th>Eliminar</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(r=><tr key={r.id} className={r.position<=10?"topTenRow":""}>
            <td><b>#{r.position}</b></td>
            <td>{r.full_name}</td>
            <td>{r.title}</td>
            <td>{r.score}/{r.max_score}</td>
            <td>{Number(r.percentage).toFixed(1)}%</td>
            <td>{r.correct_answers}</td>
            <td>{Math.round((r.time_spent||0)/60)} min</td>
            <td>
              <button
                className="ghostBtn"
                onClick={()=>nav(`/admin/results/${r.id}`)}
              >
                Revisar respuestas
              </button>
            </td>
            <td>
              <button
                className="dangerSmallBtn"
                disabled={busy}
                onClick={()=>removeOne(r)}
              >
                Eliminar
              </button>
            </td>
          </tr>)}
        </tbody>
      </table>

      {!visible.length&&<p>No existen resultados para mostrar.</p>}
    </section>
  </main>
}
