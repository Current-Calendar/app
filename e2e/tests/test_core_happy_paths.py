from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec

from helpers import click, create_calendar_via_ui, register_user_via_ui, wait


def test_register_success_redirects_to_calendars(driver, open_path):
    register_user_via_ui(driver, open_path)
    assert "/calendars" in driver.current_url


def test_create_calendar_success_visible_in_calendars(driver, open_path):
    register_user_via_ui(driver, open_path)
    calendar_name = create_calendar_via_ui(driver, open_path)

    calendar_text = wait(driver).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{calendar_name}')]"))
    )
    assert calendar_name in calendar_text.text


def test_create_event_success(driver, open_path):
    register_user_via_ui(driver, open_path)
    create_calendar_via_ui(driver, open_path)

    open_path("/create_events")

    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-title-input"]'))
    ).send_keys("Evento E2E happy path")
    wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-description-input"]'))
    ).send_keys("Descripción del evento E2E")

    click(driver, '[data-testid="create-event-submit-button"]')

    success = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-success-text"]'))
    )
    assert "Event created successfully" in success.text
