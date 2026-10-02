
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function AdminLogin(){
  const nav=useNavigate();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  async function login(e){
    e.preventDefault(); setError("");
    try{
      const r=await api("/api/auth/login",{method:"POST",body:JSON.stringify({username,password})});
      localStorage.setItem("qm_token",r.token);
      nav("/admin/dashboard");
    }catch(e){setError(e.message)}
  }
  return <main className="page narrow">
    <section className="card">
      <span className="tag">ADMINISTRACIÓN</span>
      <h1>Ingresar a QuizMaster</h1>
      <form className="form" onSubmit={login}>
        <label>Usuario<input value={username} onChange={e=>setUsername(e.target.value)} required/></label>
        <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        {error && <div className="alert">{error}</div>}
        <button className="primaryBtn">Ingresar</button>
      </form>
    </section>
  </main>
}
