import pytest
from selenium.common.exceptions import NoAlertPresentException
from selenium.common.exceptions import StaleElementReferenceException
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait

from helpers import create_calendar_via_ui, register_user_via_ui


def _wait(driver, timeout: int = 12):
    return WebDriverWait(driver, timeout)


def _click_with_retry(driver, locator, attempts: int = 3):
    last_error = None
    for _ in range(attempts):
        try:
            button = _wait(driver).until(ec.presence_of_element_located(locator))
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
            driver.execute_script("arguments[0].click();", button)
            return
        except (StaleElementReferenceException, TimeoutException) as error:
            last_error = error
    if last_error:
        raise last_error


def test_create_calendar_requires_name(driver, open_path):
    open_path("/create")

    _click_with_retry(driver, (By.CSS_SELECTOR, '[data-testid="create-calendar-submit-button"]'))

    inline_error = _wait(driver).until(
        ec.visibility_of_element_located((By.XPATH, "//*[contains(text(),'Calendar name is required.')]") )
    )
    assert "Calendar name is required." in inline_error.text

    try:
        alert = _wait(driver, timeout=4).until(ec.alert_is_present())
        assert "Calendar name is required." in alert.text
        alert.accept()
    except (NoAlertPresentException, TimeoutException):
        pass


def test_create_event_requires_title(driver, open_path):
    register_user_via_ui(driver, open_path)
    create_calendar_via_ui(driver, open_path)
    open_path("/create_events")

    try:
        _click_with_retry(driver, (By.CSS_SELECTOR, '[data-testid="create-event-submit-button"]'))
    except TimeoutException:
        _click_with_retry(driver, (By.XPATH, "//*[contains(text(),'Publish')]") )

    error = _wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="create-event-error-text"]'))
    )
    assert "El título es obligatorio." in error.text
