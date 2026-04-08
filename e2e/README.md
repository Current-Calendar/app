# E2E con Selenium (local)

Estas pruebas E2E están pensadas para ejecución **manual/local**.

## Qué cubren ahora

- Validación de login con campos vacíos.
- Navegación login -> registro.
- Registro exitoso con redirección a calendarios.
- Login exitoso real con credenciales válidas.
- Validación de registro con contraseñas distintas.
- Creación exitosa de calendario.
- Validación de creación de calendario sin nombre.
- Creación exitosa de evento.
- Validación de creación de evento sin título.
- Carga de calendarios (GET) en vistas principales (`/calendars` y `/create_events`).
- Restricción de acción protegida sin sesión (crear calendario).
- Búsqueda básica de calendario por nombre.
- Búsqueda completa por tabs (usuarios, calendarios y eventos).
- RSVP completo (selección y cambio entre "I will attend" / "I will not attend").
- Notificaciones: estado vacío y notificación real de nuevo seguidor.

## Requisitos

- Chrome instalado.
- Frontend en web levantado (`expo`).
- Dependencias Python del módulo E2E.

Configuración de ejecución:

- `E2E_HEADLESS=true|false` (por defecto: `true`).

## Instalación

```bash
source "/Users/prgpa/Documents/DOCS UNI/4º Sevilla/ISPP/app/venv/bin/activate"
pip install -r backend/requirements.txt
```

## Ejecución

```bash
cd "/Users/prgpa/Documents/DOCS UNI/4º Sevilla/ISPP/app"
E2E_HEADLESS=true pytest -c e2e/pytest.ini e2e/tests
```

Ejemplo con navegador visible:

```bash
E2E_HEADLESS=false pytest -c e2e/pytest.ini e2e/tests -q
```

Opcionalmente puedes fijar URL: `E2E_BASE_URL="http://localhost:8081"`.

## No CI/CD

No se integran en CI/CD intencionalmente para evitar inestabilidad de Selenium en el pipeline.
