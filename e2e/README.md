# E2E con Selenium

Estas pruebas E2E se pueden ejecutar en **Docker** (recomendado) o en local.

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

- Docker + Docker Compose.
- Archivo `.env` en raíz (igual que para levantar backend).

Configuración útil:

- `E2E_HEADLESS=true|false` (por defecto: `true`).
- `E2E_BASE_URL` para forzar URL frontend.
- `E2E_SELENIUM_REMOTE_URL` para usar Selenium remoto.

## Ejecución automática en Docker (recomendado para Selenium)

Desde la raíz del proyecto:

```bash
sh e2e/run_selenium_docker.sh
```

Este flujo levanta backend + db + redis + selenium + frontend para E2E, ejecuta los tests y limpia contenedores al terminar.

Ejecutar solo un archivo de tests:

```bash
sh e2e/run_selenium_docker.sh pytest -c e2e/pytest.ini e2e/tests/test_auth_flows.py
```

## Flujo híbrido (opcional, frontend local)

Si necesitas mantener el frontend en tu máquina para depurar:

```bash
EXPO_PUBLIC_API_URL=http://host.docker.internal:8000/api/v1 EXPO_PUBLIC_API_BASE=http://host.docker.internal:8000 npx expo start --web --port 8081
docker compose -f docker-compose.mac.yaml -f docker-compose.e2e.yaml run --rm -e E2E_BASE_URL=http://host.docker.internal:8081 e2e-runner
```

## Ejecución local (opcional)

```bash
source "/Users/prgpa/Documents/DOCS UNI/4º Sevilla/ISPP/app/.venv/bin/activate"
pip install -r backend/requirements.txt
E2E_HEADLESS=true pytest -c e2e/pytest.ini e2e/tests
```

## No CI/CD

No se integran en CI/CD intencionalmente para evitar inestabilidad de Selenium en el pipeline.
