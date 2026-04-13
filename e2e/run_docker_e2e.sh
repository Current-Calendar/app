#!/bin/sh
set -eu

python - <<'PY'
import os
import time
import urllib.request

checks = [
    (os.getenv("E2E_BASE_URL", "http://frontend-e2e:8081"), "frontend"),
    (os.getenv("E2E_API_HEALTH_URL", "http://backend:8000/api/docs/"), "backend API"),
    (os.getenv("E2E_SELENIUM_STATUS_URL", "http://selenium:4444/wd/hub/status"), "selenium"),
]

timeout_seconds = int(os.getenv("E2E_STARTUP_TIMEOUT", "240"))
deadline = time.time() + timeout_seconds

for url, name in checks:
    while True:
        try:
            with urllib.request.urlopen(url, timeout=4) as response:
                status = getattr(response, "status", 200)
                if status < 500:
                    print(f"[e2e] {name} ready: {url} ({status})")
                    break
        except Exception:
            pass

        if time.time() > deadline:
            raise SystemExit(f"[e2e] Timeout esperando {name}: {url}")

        time.sleep(2)
PY

pytest -c e2e/pytest.ini e2e/tests "$@"
