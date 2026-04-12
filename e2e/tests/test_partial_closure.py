from uuid import uuid4

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec

from helpers import (
    click,
    create_follower_notification_via_api,
    create_calendar_via_ui,
    create_event_via_ui,
    login_user_via_ui,
    register_user_via_api,
    register_user_via_ui,
    wait,
)


def test_rsvp_can_change_between_assisting_and_not_assisting(driver, open_path):
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

    click(driver, '[data-testid="event-attendance-button"]')
    click(driver, '[data-testid="event-attendance-not-assisting-option"]')
    wait(driver, timeout=20).until(
        lambda d: d.find_element(By.CSS_SELECTOR, '[data-testid="event-attendance-label"]').text == "I will not attend"
    )


def test_notifications_show_real_new_follower(driver, open_path):
    suffix = uuid4().hex[:6]
    user_a = register_user_via_api(username=f"e2e_sender_{suffix}")
    user_b = register_user_via_api(username=f"e2e_receiver_{suffix}")

    create_follower_notification_via_api(user_a, user_b)
    login_user_via_ui(driver, open_path, user_b["username"], user_b["password"])

    open_path("/notifications")
    wait(driver, timeout=25).until(
        ec.visibility_of_element_located((By.XPATH, "//*[contains(text(),'has started following you.')]"))
    )


def test_search_discovers_user_calendar_and_event_with_tabs(driver, open_path):
    suffix = uuid4().hex[:6]
    target_user = register_user_via_api(username=f"e2e_lookup_{suffix}")

    register_user_via_ui(driver, open_path)
    calendar_name = f"E2E Discover Calendar {suffix}"
    event_title = f"E2E Discover Event {suffix}"
    create_calendar_via_ui(driver, open_path, calendar_name)
    create_event_via_ui(driver, open_path, event_title)

    open_path("/search")
    search_input = wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="search-input"]'))
    )

    search_input.send_keys(target_user["username"])
    click(driver, '[data-testid="search-tab-users"]')
    wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{target_user['username']}')]"))
    )

    search_input.clear()
    search_input.send_keys(calendar_name)
    click(driver, '[data-testid="search-tab-calendars"]')
    wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{calendar_name}')]"))
    )

    search_input.clear()
    search_input.send_keys(event_title)
    click(driver, '[data-testid="search-tab-events"]')
    wait(driver, timeout=20).until(
        ec.visibility_of_element_located((By.XPATH, f"//*[contains(text(),'{event_title}')]"))
    )
