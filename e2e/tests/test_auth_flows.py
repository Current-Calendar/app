from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as ec
from selenium.webdriver.support.ui import WebDriverWait


def _wait(driver, timeout: int = 12):
    return WebDriverWait(driver, timeout)


def test_login_empty_credentials_shows_validation(driver, open_path):
    open_path("/login")

    submit = _wait(driver).until(
        ec.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="login-submit-button"]'))
    )
    submit.click()

    error = _wait(driver).until(
        ec.visibility_of_element_located((By.XPATH, "//*[contains(text(),'Rellena username y password.')]") )
    )
    assert "Rellena username y password." in error.text


def test_login_to_register_navigation(driver, open_path):
    open_path("/login")

    _wait(driver).until(
        ec.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="go-register-link"]'))
    ).click()

    _wait(driver).until(ec.url_contains("/register"))
    assert "/register" in driver.current_url


def test_register_password_mismatch_shows_error(driver, open_path):
    open_path("/register")

    _wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="register-username-input"]'))
    ).send_keys("selenium_user")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-email-input"]').send_keys("selenium@example.com")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-password-input"]').send_keys("Password123!")
    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-password2-input"]').send_keys("Different123!")

    driver.find_element(By.CSS_SELECTOR, '[data-testid="register-submit-button"]').click()

    error = _wait(driver).until(
        ec.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="register-error-text"]'))
    )
    assert "Passwords do not match." in error.text
