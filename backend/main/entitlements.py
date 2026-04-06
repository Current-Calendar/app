import math

class Planes:
    FREE = 'FREE'
    STANDARD = 'STANDARD'
    BUSINESS = 'BUSINESS'

PLAN_FEATURES = {
    Planes.FREE: {
        'max_public_calendars': 2,
        'max_private_calendars': 2,
        'can_access_analytics': False,
        'max_favorite_calendars': 10,
        'max_days_difference_radar': 0,
        'can_customize_calendars': False,
        'verified_badge': False
    },
    Planes.STANDARD: {
        'max_public_calendars': math.inf,
        'max_private_calendars': math.inf,
        'can_access_analytics': False,
        'max_favorite_calendars': math.inf,
        'max_days_difference_radar': 1,
        'can_customize_calendars': True,
        'verified_badge': True
    },
    Planes.BUSINESS: {
        'max_public_calendars': math.inf,
        'max_private_calendars': math.inf,
        'can_access_analytics': True,
        'max_favorite_calendars': math.inf,
        'max_days_difference_radar': 1,
        'can_customize_calendars': True,
        'verified_badge': True
    }
}

def get_user_features(user):
    return PLAN_FEATURES.get(user.plan, PLAN_FEATURES[Planes.FREE])




