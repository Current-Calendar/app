# Loader JSON para calendarios y eventos de Sevilla

Este loader permite poblar la base de datos **sin tocar los modelos** actuales.


# LA GUIA ESTA AL FINAL

## Comando

```bash
cd backend
python manage.py load_calendar_data ..\docs\examples\sevilla-events.sample.json --creator admin 
```

También acepta `--creator` como `id`, `username` o `email`.



## Generar JSON desde un ICS

Hay un script independiente que convierte un `.ics` o una URL `webcal/https` a este formato JSON:

```bash
cd backend
..\venv\Scripts\python.exe scripts\ics_to_json.py ^
  --url "https://ejemplo.com/calendario.ics" ^
  --output ..\docs\examples\salida.json ^
  --calendar-name "Ayuntamiento de Sevilla 2026" ^
  --calendar-key ayuntamiento-sevilla-2026 ^
  --calendar-external-id source:ayuntamiento-sevilla-2026 ^
  --calendar-description "Agenda oficial del Ayuntamiento de Sevilla" ^
  --year 2026
```

Después puedes cargar ese JSON con `load_calendar_data`.

## Generar JSON con scraping (OnSevilla, ICAS, Yuzin)

Script:

```bash
cd backend
..\venv\Scripts\python.exe scripts\scrape_sevilla_to_json.py ^
  --year 2026 ^
  --sources onsevilla,icas,yuzin ^
  --output ..\docs\examples\sevilla-scraped-2026.json
```

Luego cargar:

```bash
python manage.py load_calendar_data ..\docs\examples\sevilla-scraped-2026.json --creator current
```

> Nota: es scraping heurístico por texto y puede requerir revisión manual del JSON antes de cargar.

## Enriquecer ubicaciones (lat/lng) para mapa

Si necesitas que los eventos scrapeados salgan en mapa, puedes geocodificar `place_name`:

```bash
cd backend
..\venv\Scripts\python.exe scripts\enrich_event_locations.py ^
  --input ..\docs\examples\sevilla-scraped-2026.json ^
  --output ..\docs\examples\sevilla-scraped-2026.geo.json ^
  --city "Sevilla, España"
```

Luego fusiona usando el fichero enriquecido (`*.geo.json`) y carga normalmente.

## Backfill a 100% de location (preciso + aproximado)

Para asegurar que todos los eventos tengan `location` (importante para mapa):

```bash
docker compose exec backend python manage.py backfill_event_locations --sleep-ms 900
```

Qué hace:
- intenta coordenada precisa por diccionario de venues
- intenta geocodificación por `place_name`
- si no encuentra, aplica fallback aproximado (zona/centro Sevilla) y añade nota:
  `📍 Ubicación aproximada (pendiente de venue exacto).`

## Fusionar tus 3 ICS + scraping en un único JSON

Si generas un JSON por cada ICS y además el JSON de scraping:

```bash
cd backend
..\venv\Scripts\python.exe scripts\merge_calendar_json.py ^
  --inputs ^
  ..\docs\examples\ics-ayuntamiento-2026.json ^
  ..\docs\examples\ics-sevilla-fc-2026.json ^
  ..\docs\examples\ics-betis-2026.json ^
  ..\docs\examples\sevilla-scraped-2026.json ^
  --output ..\docs\examples\sevilla-all-2026.json
```

Y cargar:

```bash
python manage.py load_calendar_data ..\docs\examples\sevilla-all-2026.json --creator admin
```

## Crear usuarios de prueba para relaciones

Para levantar 6-7 usuarios y un usuario base `current`:

```bash
cd backend
python manage.py setup_test_users --current-username current
```

Por defecto **solo crea usuarios** (sin relaciones following).

Si quieres que además `current` quede relacionado con sus calendarios creados:

```bash
python manage.py setup_test_users --current-username current --link-calendars
```

## Formato JSON esperado

```json
{
  "calendars": [
    {
      "key": "ayto-2026",
      "name": "Ayuntamiento de Sevilla 2026",
      "description": "Agenda oficial del Ayuntamiento de Sevilla",
      "privacy": "PUBLIC",
      "origin": "CURRENT",
      "external_id": "source:ayuntamiento-sevilla-2026"
    }
  ],
  "events": [
    {
      "calendar_key": "ayto-2026",
      "title": "Presentación del libro: Mielgos",
      "description": "Evento importado desde fuente oficial",
      "place_name": "CC Casa de Las Columnas",
      "date": "2026-02-06",
      "time": "19:00:00",
      "external_id": "ayto:mielgos:2026-02-06T19:00:00"
    }
  ]
}
```

## Campos soportados

### Calendars

- `key`: identificador interno del JSON para enlazar eventos
- `name`: obligatorio
- `description`: opcional
- `privacy`: opcional (`PRIVATE`, `FRIENDS`, `PUBLIC`)
- `origin`: opcional (`CURRENT`, `GOOGLE`, `APPLE`)
- `external_id`: opcional pero recomendado para deduplicación

### Events

- `calendar_key`, `calendar_keys`
- `calendar_external_id`, `calendar_external_ids`
- `calendar_name`, `calendar_names`
- `title`: obligatorio
- `description`: opcional
- `place_name`: opcional
- `date` + `time` o `start`
- `external_id`: recomendado para deduplicación
- `recurrence`: opcional
- `lat`, `lng`: opcionales

## Reglas del loader

- Si un calendario ya existe por `creator + external_id`, lo actualiza.
- Si no hay `external_id`, intenta encontrarlo por `creator + name`.
- Si un evento ya existe por `creator + external_id`, lo actualiza.
- Si no hay `external_id`, intenta encontrarlo por `creator + title + date + time`.
- `--dry-run` valida el JSON y muestra el resumen sin persistir cambios.

---

## Guía final para aplicar todo (checklist)

### 1) Levantar servicios

```bash
docker compose up -d db redis backend
```

### 2) Migraciones

```bash
docker compose exec backend python manage.py migrate
```

### 3) Crear usuario seed `current` (y opcionalmente demos)

Solo `current`:

```bash
docker compose exec backend python manage.py setup_seed_users --current-username current --current-email current@currentcalendar.es --current-password "PASSWORD_SEGURO" --link-calendars
```
(el mail no es el real)

Con usuarios demo:

```bash
docker compose exec backend python manage.py setup_seed_users --current-password "PASSWORD_SEGURO" --include-demo-users --demo-password "PASSWORD_DEMO_SEGURO" --link-calendars
```

### 4) Copiar JSON definitivo al contenedor

```bash
docker cp .\backend\data\seeds\sevilla-definitivo-2026.with-location.json backend_container:/tmp/sevilla-definitivo-2026.with-location.json
```


### 5) Recargar dataset definitivo

```bash
docker compose exec backend python manage.py load_calendar_data /tmp/sevilla-definitivo-2026.with-location.json --creator current
```

### 6) Verificación rápida

```bash
docker compose exec backend python manage.py shell -c "from main.models import Calendar, Event; print('Calendars:', Calendar.objects.count()); print('Events:', Event.objects.count())"
```

### 7) Verificar admin / app

- Admin Django: `http://localhost:8000/admin/`
- Front web/app: `http://localhost:8081/`

### 8) Nota importante de UI (`/switch-calendar`)

La pantalla `switch-calendar` actualmente muestra calendarios **públicos de otros usuarios**  
(no muestra los creados por el usuario logueado si eres `current`).
