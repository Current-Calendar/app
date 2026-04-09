from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec

from helpers import create_calendar_via_ui, register_user_via_ui, wait


def test_get_calendars_loaded_in_create_event_view(driver, open_path):
    register_user_via_ui(driver, open_path)
    calendar_name = create_calendar_via_ui(driver, open_path)

    open_path("/create_events")

    selected_name = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-selected-calendar-name"]'))
    )
    assert calendar_name in selected_name.text


def test_get_calendars_page_renders_created_calendar(driver, open_path):
    register_user_via_ui(driver, open_path)
    calendar_name = create_calendar_via_ui(driver, open_path)

    open_path("/calendars")
    wait(driver, timeout=20).until(
        ec.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="calendar-selector-trigger"]'))
    ).click()

    option = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{calendar_name}')]"))
    )
    assert calendar_name in option.text
