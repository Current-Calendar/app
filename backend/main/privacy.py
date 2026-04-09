SUPPORTED_CALENDAR_PRIVACY_VALUES = {
    "PRIVATE",
    "PUBLIC",
}

ACCEPTED_CALENDAR_PRIVACY_VALUES = SUPPORTED_CALENDAR_PRIVACY_VALUES


def normalize_calendar_privacy(value, default="PRIVATE"):
    if value is None:
        return default

    if not isinstance(value, str):
        return value

    return value.strip().upper()
