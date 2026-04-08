import os
import socket
from urllib.parse import urljoin
from urllib.parse import urlparse

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager


def _as_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _is_reachable_http_url(candidate: str, timeout: float = 1.5) -> bool:
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return False

    if parsed.port is not None:
        port = parsed.port
    else:
        port = 443 if parsed.scheme == "https" else 80

    try:
        with socket.create_connection((parsed.hostname, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(scope="session")
def base_url() -> str:
    configured = os.getenv("E2E_BASE_URL")
    if configured:
        return configured.rstrip("/") + "/"

    candidates = [
        "http://localhost:19006",
        "http://localhost:8081",
    ]

    for candidate in candidates:
        if _is_reachable_http_url(candidate, timeout=1.5):
            return candidate.rstrip("/") + "/"

    raise RuntimeError(
        "No se encontró frontend web activo. Lanza `npx expo start --web` o define E2E_BASE_URL."
    )


@pytest.fixture()
def driver() -> webdriver.Remote:
    headless = _as_bool(os.getenv("E2E_HEADLESS"), default=True)

    options = ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    service = ChromeService(ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)

    browser.implicitly_wait(float(os.getenv("E2E_IMPLICIT_WAIT", "1.0")))

    yield browser

    browser.quit()


@pytest.fixture()
def open_path(driver: webdriver.Remote, base_url: str):
    def _open(path: str):
        target = urljoin(base_url, path.lstrip("/"))
        driver.get(target)

    return _open


@pytest.fixture(autouse=True)
def reset_browser_state(driver: webdriver.Remote, base_url: str):
    driver.get(base_url)
    driver.delete_all_cookies()
    driver.execute_script("window.localStorage.clear();")
    driver.execute_script("window.sessionStorage.clear();")
