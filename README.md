<div align="center">
  <img src="https://github.com/user-attachments/assets/743da1a0-b2e7-4035-8d3d-4e7815bdfde2" width="200" alt="Logo del Proyecto">

  # Current Calendar
  ### *Go with the flow*
</div>

> A social calendar platform — create, share and discover events with the people and communities that matter to you.

[![CI](https://github.com/Current-Calendar/app/actions/workflows/CI_test.yml/badge.svg?branch=main)](https://github.com/Current-Calendar/app/actions/workflows/CI_test.yml)

> **Beta is live!** We are currently accepting testers before the official release. [Sign up here](https://docs.google.com/forms/d/e/1FAIpQLSenX3NNKmhceOx2zGaedfAbtTXYXrPtX6M1DgA_oFJnnxMwTQ/viewform?fbclid=PAb21jcARJnUZleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAafrM8BbH_4QplT0Vi6rX6RLC_rTyLAH5W5voRcRTZP72lLPaw7ptJbvUdXL2w_aem_sYfJG-2GJjemg5xVcuiZHw) or visit our [Landing page](https://currentcalendar.vercel.app/).

---

## Overview

**Current Calendar** is a full-stack social media application built around calendars and events. Beyond a personal organizer, it is a platform where users publish and follow public calendars, co-manage shared calendars with friends or teams and discover what is happening nearby through an interactive map.

The Current community is _Currently_ ;) formed by 22 Software Engineer students who aim to develop a great service. Built from Seville, this application was born as a faculty project.

---

## Documentation

Extended documentation (in Spanish) is available in the [`docs/`](docs/) directory, covering topics such as API contracts, Redis cache usage, GraphQL queries, subscription plan restrictions and a pilot-user guide.

---

## Core Features

### Calendars
- Create public or private calendars with cover images, descriptions and labels
- **Co-ownership** — invite collaborators to manage a calendar together
- **Viewer access** — grant read-only access to specific users for private calendars
- **Subscribe** to any public calendar to follow its events in your feed
- Like and share calendars via Open Graph-enriched links
- Import from **Google Calendar**, **Apple Calendar (ICS)**, or any webcal URL
- Export calendars to the ICS standard for use in any calendar client

### Events
- Rich event creation: title, description, photo, date, time, location (place name + GPS coordinates) and recurrence rules
- **RSVP** and **save** events to keep track of what you are attending
- Like and comment on events
- **In-event chat** — real-time messaging thread per event

### Social Graph
- Follow other users and be followed back
- Browse and subscribe to public calendars created by the people you follow
- Receive real-time **in-app notifications** for follows, invitations, likes and event activity

### Radar (Map Discovery)
- Location-aware map that shows upcoming public events within a configurable radius
- Filter by distance and date range
- Powered by **PostGIS** geospatial queries for accurate proximity search

### Multi-Calendar View
- Overlay events from multiple calendars in a single unified view
- Toggle individual calendars on and off to focus on what matters

### Recommender System
- Similarity-based calendar recommendations computed from calendar features and stored in Redis
- Surfaces relevant public calendars to new and existing users

### Subscription Plans

| Feature | Free | Standard | Business |
|---|:---:|:---:|:---:|
| Public calendars | 2 | Unlimited | Unlimited |
| Private calendars | 2 | Unlimited | Unlimited |
| Favorite calendars | 10 | Unlimited | Unlimited |
| Calendar customization | — | Yes | Yes |
| Co-owned calendars | — | Yes | Yes |
| Verified badge | — | Yes | Yes |
| Radar (upcoming days) | Today only | +1 day | +1 day |
| Analytics | — | — | Yes |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend framework** | Django 5.2 + Django REST Framework |
| **Real-time / WebSocket** | Django Channels + Daphne (ASGI) |
| **API styles** | REST (`/api/v1/`) · GraphQL (`/graphql/`) |
| **Database** | PostgreSQL 16 + PostGIS |
| **Cache / Pub-Sub** | Redis 8 |
| **Frontend** | React Native + Expo 54 (iOS · Android · Web) |
| **Routing** | Expo Router (file-based) |
| **Maps** | React Native Maps (mobile) · React Leaflet (web) |
| **Authentication** | JWT · Google OAuth 2.0 |
| **Email** | Resend |
| **Media storage** | AWS S3 (production) · local filesystem (development) |
| **CI/CD** | GitHub Actions · SonarCloud · Docker Hub |
| **Infrastructure** | Docker Compose |

---

## Architecture

```
app/
├── backend/
│   ├── current/          # Django project: settings, root URLs, ASGI/WSGI
│   └── main/
│       ├── auth/         # JWT login, Google OAuth, password reset
│       ├── users/        # User profiles, follow graph, search
│       ├── calendars/    # Calendar CRUD, subscriptions, invitations, ICS/Google import-export
│       ├── events/       # Event CRUD, RSVP, save, like
│       ├── comments/     # Threaded comments
│       ├── notifications/# In-app notification fan-out
│       ├── radar/        # Location-based event discovery (PostGIS)
│       ├── rs/           # Recommender system (similarity-based, Redis-backed)
│       └── reports/      # Abuse reports
│
└── frontend/
    ├── app/              # Screens and routing (Expo Router)
    ├── components/       # Reusable UI components
    ├── services/         # API client wrappers (per-domain modules)
    ├── context/          # React Context providers (global state)
    ├── hooks/            # Custom hooks
    ├── types/            # TypeScript type definitions
    └── constants/        # App-wide constants
```

All REST endpoints are versioned under `/api/v1/`. WebSocket consumers use Django Channels backed by the Redis channel layer. API calls in the frontend are abstracted in `services/` — components never call `fetch` or `axios` directly.

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for frontend development outside Docker)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional, for mobile builds)

### 1. Clone the repository

```bash
git clone https://github.com/Current-Calendar/app.git
cd app
```

### 2. Configure environment variables

```bash
cp backend/.env.dev.example .env
```

Open `.env` and fill in the required values. The table below covers the most important ones:

| Variable | Development value | Notes |
|---|---|---|
| `POSTGRES_HOST` | `db` | Use `127.0.0.1` if running outside Docker |
| `REDIS_HOST` | `redis` | Use `127.0.0.1` if running outside Docker |
| `FRONTEND_URL` | `http://localhost:8081` | |
| `GOOGLE_REDIRECT_URIS` | `http://localhost:8000/oauth2callback/` | Required for Google Calendar import |
| `AWS_ACCESS_KEY_ID` | *(leave empty)* | S3 is disabled in development |

### 3. Start all services

```bash
docker compose up -d --build
```

> **macOS users:** use `docker compose -f docker-compose.mac.yaml up -d --build` instead.

Once the containers are healthy, the following endpoints are available:

| Service | URL |
|---|---|
| Backend API | `http://localhost:8000` |
| Swagger / API Docs | `http://localhost:8000/api/docs/` |
| GraphQL Playground | `http://localhost:8000/graphql/` |
| Django Admin | `http://localhost:8000/admin/` |
| SonarQube | `http://localhost:9000` |

### 4. Seed development data

```bash
docker exec -it backend_container python manage.py seed_db
docker exec -it backend_container python manage.py load_similarities
```

---

## Development

### Backend

```bash
# Apply migrations
python manage.py migrate

# Create a superuser for the admin panel
python manage.py createsuperuser

# Run the full test suite with coverage
coverage run manage.py test
coverage report

# Run a single test module
python manage.py test main.calendars.tests

# HTML coverage report
coverage html   # output in htmlcov/

# Static analysis and security scanning
bandit -ll backend/
semgrep --config=p/python --config=p/security-audit --config=p/secrets backend/
pre-commit run --all-files
```

### Frontend

```bash
cd frontend
npm install

npm start        # Expo dev server — choose platform interactively
npm run web      # Web only
npm run android  # Android emulator
npm run ios      # iOS simulator

npm run lint     # ESLint
```

### End-to-end tests (automatic Docker)

```bash
sh e2e/run_selenium_docker.sh
```

Run a single test file:

```bash
sh e2e/run_selenium_docker.sh pytest -c e2e/pytest.ini e2e/tests/test_auth_flows.py
```

Optional hybrid mode (frontend local):

```bash
EXPO_PUBLIC_API_URL=http://host.docker.internal:8000/api/v1 EXPO_PUBLIC_API_BASE=http://host.docker.internal:8000 npx expo start --web --port 8081
docker compose -f docker-compose.mac.yaml -f docker-compose.e2e.yaml run --rm -e E2E_BASE_URL=http://host.docker.internal:8081 e2e-runner
```

Optional local fallback:

```bash
E2E_HEADLESS=true pytest -c e2e/pytest.ini e2e/tests
```

### Docker management

```bash
# View backend logs
docker logs -f backend_container

# Stop containers (keep data volumes)
docker compose down

# Stop containers and wipe all data
docker compose down -v
```

---

## Key Integrations

| Integration | Purpose |
|---|---|
| **Google Calendar** | OAuth 2.0 import of external calendars |
| **iCalendar (ICS)** | Standards-based import and export |
| **Webcal** | Subscribe to remote calendar feeds |
| **Resend** | Transactional email (password reset, invitations) |
| **AWS S3** | Media file storage in production |
| **Open Graph** | Rich link previews when sharing calendars |
| **PostGIS** | Geospatial indexing and proximity queries for Radar |
| **Redis** | Channel layer for WebSockets · recommender cache · application cache |

---

## CI/CD Pipeline

GitHub Actions runs on every push:

1. Python 3.11 environment with GeoDjango system dependencies
2. Full Django test suite with coverage reporting
3. On `main`: HTML coverage artifact upload + SonarCloud quality scan

Docker images are built and pushed to Docker Hub automatically via `dockerhub.yml`.

---

