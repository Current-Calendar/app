from uuid import uuid4
import os

import requests

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


def wait(driver, timeout: int = 12):
    return WebDriverWait(driver, timeout)


def click(driver, css_selector: str):
    element = wait(driver).until(ec.presence_of_element_located((By.CSS_SELECTOR, css_selector)))
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
    driver.execute_script("arguments[0].click();", element)


def register_user_via_ui(driver, open_path):
    unique = uuid4().hex[:10]
    username = f"e2e_{unique}"
    email = f"{username}@example.com"
    password = "E2ePass!123"

    open_path("/register")

    try:
        username_input = wait(driver, timeout=8).until(
            ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="register-username-input"]'))
        )
    except Exception:
        try:
            open_path("/login")
            click(driver, '[data-testid="go-register-link"]')
            username_input = wait(driver, timeout=12).until(
                ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="register-username-input"]'))
            )
        except Exception as error:
            current_url = driver.current_url
            snippet = driver.page_source[:1200]
            raise RuntimeError(
                f"No se pudo abrir registro. URL={current_url}. HTML snippet={snippet}"
            ) from error

    username_input.send_keys(username)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-email-input"]').send_keys(email)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-password-input"]').send_keys(password)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-password2-input"]').send_keys(password)
    click(driver, '[data-testid="register-submit-button"]')

    wait(driver, timeout=20).until(ec.url_contains("/calendars"))
    return {"username": username, "email": email, "password": password}


def register_user_via_api(username: str | None = None):
    unique = uuid4().hex[:10]
    username = username or f"e2e_{unique}"
    email = f"{username}@example.com"
    password = "E2ePass!123"

    api_base = os.getenv("E2E_API_BASE", "http://localhost:8000/api/v1")
    url = f"{api_base.rstrip('/')}/auth/register/"

    response = requests.post(
        url,
        json={
            "username": username,
            "email": email,
            "password": password,
            "password2": password,
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json() if response.content else {}
    user_data = data.get("user") if isinstance(data, dict) else None
    user_id = user_data.get("id") if isinstance(user_data, dict) else None

    return {"username": username, "email": email, "password": password, "id": user_id}


def create_follower_notification_via_api(sender: dict, receiver: dict):
    api_base = os.getenv("E2E_API_BASE", "http://localhost:8000/api/v1").rstrip("/")

    token_response = requests.post(
        f"{api_base}/token/",
        json={"username": sender["username"], "password": sender["password"]},
        timeout=15,
    )
    token_response.raise_for_status()
    access = token_response.json()["access"]

    receiver_id = receiver.get("id")
    if receiver_id is None:
        search_response = requests.get(
            f"{api_base}/users/search/",
            params={"search": receiver["username"]},
            headers={"Authorization": f"Bearer {access}"},
            timeout=15,
        )
        search_response.raise_for_status()
        search_data = search_response.json()
        if isinstance(search_data, list) and search_data:
            receiver_id = search_data[0].get("id")
        elif isinstance(search_data, dict) and isinstance(search_data.get("results"), list) and search_data["results"]:
            receiver_id = search_data["results"][0].get("id")

    if receiver_id is None:
        raise RuntimeError("No se pudo resolver el id del usuario receptor para follow.")

    follow_response = requests.post(
        f"{api_base}/users/{receiver_id}/follow/",
        headers={"Authorization": f"Bearer {access}"},
        timeout=15,
    )
    follow_response.raise_for_status()


def reset_session(driver, open_path):
    open_path("/login")
    driver.delete_all_cookies()
    driver.execute_script("window.localStorage.clear();")
    driver.execute_script("window.sessionStorage.clear();")


def create_calendar_via_ui(driver, open_path, calendar_name: str | None = None):
    name = calendar_name or f"E2E Calendar {uuid4().hex[:8]}"
    open_path("/create")

    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-calendar-name-input"]'))
    ).send_keys(name)
    click(driver, '[data-testid="create-calendar-submit-button"]')

    wait(driver, timeout=20).until(ec.url_contains("/calendars"))
    wait(driver).until(ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{name}')]")))
    return name


def login_user_via_ui(driver, open_path, username: str, password: str):
    open_path("/login")
    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="login-username-input"]'))
    ).send_keys(username)
    driver.find_element(By.CSS_SELECTOR, '[data-testid="login-password-input"]').send_keys(password)
    click(driver, '[data-testid="login-submit-button"]')
    wait(driver, timeout=20).until(lambda d: "/switch-events" in d.current_url or "/calendars" in d.current_url)


def create_event_via_ui(driver, open_path, title: str | None = None):
    event_title = title or f"E2E Event {uuid4().hex[:8]}"
    open_path("/create_events")

    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-title-input"]'))
    ).send_keys(event_title)

    click(driver, '[data-testid="create-event-submit-button"]')

    wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-success-text"]'))
    )
    click(driver, '[data-testid="create-event-success-ok-button"]')
    wait(driver, timeout=20).until(ec.url_contains('/calendars'))

    return event_title
