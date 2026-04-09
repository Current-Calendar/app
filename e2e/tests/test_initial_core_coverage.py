from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec

from helpers import (
    click,
    create_calendar_via_ui,
    create_event_via_ui,
    login_user_via_ui,
    register_user_via_api,
    register_user_via_ui,
    wait,
)


def test_login_success_real(driver, open_path):
    creds = register_user_via_api()

    login_user_via_ui(driver, open_path, creds["username"], creds["password"])
    assert "/switch-events" in driver.current_url or "/calendars" in driver.current_url


def test_access_without_session_is_restricted(driver, open_path):
    open_path("/create")

    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-calendar-name-input"]'))
    ).send_keys("Should Fail Calendar")
    click(driver, '[data-testid="create-calendar-submit-button"]')

    unauthorized = wait(driver, timeout=10).until(
        ec.visibility_of_element_located((By.XPATH, "//*[contains(text(),'You must be logged in to create a calendar.')]"))
    )
    assert "You must be logged in to create a calendar." in unauthorized.text


def test_search_basic_finds_created_calendar(driver, open_path):
    register_user_via_ui(driver, open_path)
    calendar_name = create_calendar_via_ui(driver, open_path)

    open_path("/search")
    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="search-input"]'))
    ).send_keys(calendar_name)

    found = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{calendar_name}')]"))
    )
    assert calendar_name in found.text


def test_rsvp_basic_assisting(driver, open_path):
    register_user_via_ui(driver, open_path)
    create_calendar_via_ui(driver, open_path)
    event_title = create_event_via_ui(driver, open_path)

    open_path("/calendars")
    wait(driver, timeout=20).until(
        ec.element_to_be_clickable((By.XPATH, f"//*[contains(text(),'{event_title}')]"))
    ).click()

    click(driver, '[data-testid="event-attendance-button"]')
    click(driver, '[data-testid="event-attendance-assisting-option"]')

    wait(driver, timeout=20).until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="event-attendance-label"]').text == "I will attend"
    )
    attendance_label = driver.find_element(By.CSS_SELECTOR, '[data-testid="event-attendance-label"]')
    assert "I will attend" in attendance_label.text


def test_notifications_minimal_loaded(driver, open_path):
    register_user_via_ui(driver, open_path)

    open_path("/notifications")
    empty = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="notifications-empty-text"]'))
    )
    assert "No notifications" in empty.text
