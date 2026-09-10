# 001 — Esquema inicial

La persistencia actual usa `data/db.json` detrás de una capa de repositorios.
Entidades: users, sessions y audit.

Para producción multi-instancia: migrar estas interfaces a PostgreSQL + Redis sin cambiar la API pública de las rutas.
