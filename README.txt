
QUIZMASTER - PRIMERA VERSIÓN FUNCIONAL
======================================

INCLUYE
-------
- React + Vite
- Node.js + Express
- PostgreSQL existente del Panel Académico
- Esquema independiente quizmaster
- Listado de cuestionarios
- Inicio de intento
- Resolución pregunta por pregunta
- Calificación automática en backend
- Persistencia de estudiantes, intentos y respuestas
- Resultado final
- Login administrativo
- Dashboard con resultados y estadísticas básicas

PASO 1 - COPIAR LA CONEXIÓN
----------------------------
Abra:
backend\.env.example

Cree una copia llamada:
backend\.env

Pegue la MISMA DATABASE_URL que ya utilizó para QUIZMASTER_DB_SETUP.

Ejemplo de estructura:

DATABASE_URL=postgresql://...
DB_SSL=true
PORT=4000
JWT_SECRET=escriba_una_clave_larga_y_dificil
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SuClaveSegura
FRONTEND_URL=http://localhost:5173

PASO 2 - INSTALAR
-----------------
Abra PowerShell en la carpeta QUIZMASTER_APP y ejecute:

npm install
npm run install:all

PASO 3 - EJECUTAR
-----------------
npm run dev

Abra:
http://localhost:5173

ADMIN
-----
Entre en:
http://localhost:5173/admin

Use los valores definidos en:
ADMIN_USERNAME
ADMIN_PASSWORD

IMPORTANTE
----------
La contraseña inicial solo se crea la primera vez que ese usuario no existe.
Si cambia ADMIN_PASSWORD después de haber creado el usuario, la contraseña almacenada
en PostgreSQL no cambia automáticamente.

PRÓXIMA ETAPA
-------------
- Gestión completa de cuestionarios desde el panel.
- Importación Word.
- Edición de preguntas.
- Filtros de resultados.
- Exportación Excel/CSV.
- Configuración de tiempos/intentos.
- Despliegue en Render.
