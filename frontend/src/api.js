
export async function api(path, options={}) {
  const token = localStorage.getItem("qm_token");
  const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error.");
  return data;
}
