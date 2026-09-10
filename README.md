# SportDash Premium

Plataforma privada de acceso deportivo con arquitectura Node.js + Express y cuentas de miembros con acceso por 30 días.

## Incluye

- Login seguro con bcrypt.
- Administrador principal protegido por variables de entorno.
- Creación de usuarios desde el panel.
- Cada usuario nuevo recibe 30 días.
- Renovación de +30 días desde el panel.
- Si el acceso vence, el usuario no puede entrar.
- Activar/desactivar cuentas.
- Contadores de activos, por vencer y vencidos.
- Sesiones con token aleatorio almacenado como hash.
- Límite real de dispositivos/pantallas simultáneos por usuario, configurable desde Administración.
- Heartbeat de sesión para liberar dispositivos inactivos.
- Reproductor Video.js con soporte HLS/VHS.
- Rate limit para login.
- Helmet + CSP + cookies HttpOnly.
- UI responsive y accesible.
- Arquitectura separada por rutas, middleware, servicios y repositorios.
- Persistencia local en `data/db.json`.

## Instalación

Requiere Node.js 20+ recomendado.

```bash
npm install
```

Copiá `.env.example` como `.env`.

Generá el hash del administrador:

```bash
node scripts/hash-password.js "TU_CONTRASEÑA"
```

Pegá el resultado en `SPORTDASH_ADMIN_PASSWORD_HASH`.

Generá un `SESSION_SECRET` aleatorio de 32+ caracteres.

Luego:

```bash
npm run dev
```

Abrí `http://localhost:3000`.

## Flujo de acceso

1. El administrador entra con las credenciales configuradas en `.env`.
2. Desde `Usuarios` crea un miembro.
3. El sistema genera automáticamente una vigencia de 30 días.
4. El miembro inicia sesión.
5. El backend comprueba estado + vencimiento en cada petición privada.
6. Cuando vence, se bloquea el acceso.
7. El administrador pulsa `+30 días` y la vigencia se extiende.
8. Si todavía estaba activo, los 30 días se suman a la fecha de vencimiento actual. Si ya venció, se suman desde el momento de la renovación.

## Producción

Para una instalación real con varios procesos/servidores, conviene migrar `data/db.json` a PostgreSQL y las sesiones a Redis o una store persistente. La capa `repositories` permite hacer esa migración sin rehacer toda la interfaz.

No publiques `.env` ni `data/db.json`.
