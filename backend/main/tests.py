import math
import socket
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import TestCase, RequestFactory

from main.models import Calendar, User
from main.entitlements import get_user_features, Planes, PLAN_FEATURES
from main.permissions import (
    CanCreateCalendar,
    CanChangePrivacy,
    CanAddFavoriteCalendar,
    CanAccessAnalytics,
    CanCustomizeCalendars,
)
from utils.security import get_safe_ip
from utils.storage import get_signed_url


# ---------------------------------------------------------------------------
# entitlements.py
# ---------------------------------------------------------------------------

class EntitlementsTests(TestCase):
    def test_free_plan_features(self):
        user = User.objects.create_user(
            username="ent_free", email="ent_free@test.com", password="pass123", plan="FREE"
        )
        features = get_user_features(user)
        self.assertEqual(features["max_public_calendars"], 2)
        self.assertEqual(features["max_private_calendars"], 2)
        self.assertFalse(features["can_access_analytics"])
        self.assertEqual(features["max_favorite_calendars"], 10)
        self.assertFalse(features["can_customize_calendars"])

    def test_standard_plan_features(self):
        user = User.objects.create_user(
            username="ent_std", email="ent_std@test.com", password="pass123", plan="STANDARD"
        )
        features = get_user_features(user)
        self.assertEqual(features["max_public_calendars"], math.inf)
        self.assertTrue(features["can_customize_calendars"])
        self.assertTrue(features["verified_badge"])

    def test_business_plan_features(self):
        user = User.objects.create_user(
            username="ent_biz", email="ent_biz@test.com", password="pass123", plan="BUSINESS"
        )
        features = get_user_features(user)
        self.assertTrue(features["can_access_analytics"])

    def test_unknown_plan_falls_back_to_free(self):
        user = User.objects.create_user(
            username="ent_unknown", email="ent_unknown@test.com", password="pass123"
        )
        user.plan = "NONEXISTENT"
        features = get_user_features(user)
        self.assertEqual(features, PLAN_FEATURES[Planes.FREE])


# ---------------------------------------------------------------------------
# permissions.py
# ---------------------------------------------------------------------------

class CanCreateCalendarTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanCreateCalendar()
        self.user = User.objects.create_user(
            username="perm_create", email="perm_create@test.com", password="pass123", plan="FREE"
        )

    def _make_request(self, data=None):
        request = self.factory.post("/api/v1/calendars/create/", data=data or {})
        request.user = self.user
        request.data = data or {}
        return request

    def test_allows_when_under_limit(self):
        request = self._make_request({"privacy": "PRIVATE"})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_denies_when_at_limit(self):
        Calendar.objects.create(name="C1", privacy="PRIVATE", creator=self.user)
        Calendar.objects.create(name="C2", privacy="PRIVATE", creator=self.user)
        request = self._make_request({"privacy": "PRIVATE"})
        self.assertFalse(self.permission.has_permission(request, None))

    def test_friends_privacy_always_allowed(self):
        for i in range(5):
            Calendar.objects.create(name=f"F{i}", privacy="FRIENDS", creator=self.user)
        request = self._make_request({"privacy": "FRIENDS"})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_standard_plan_has_infinite_limit(self):
        self.user.plan = "STANDARD"
        self.user.save()
        for i in range(10):
            Calendar.objects.create(name=f"S{i}", privacy="PRIVATE", creator=self.user)
        request = self._make_request({"privacy": "PRIVATE"})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/calendars/create/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {}
        self.assertFalse(self.permission.has_permission(request, None))


class CanChangePrivacyTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanChangePrivacy()
        self.user = User.objects.create_user(
            username="perm_change", email="perm_change@test.com", password="pass123", plan="FREE"
        )
        self.calendar = Calendar.objects.create(
            name="Changeable", privacy="FRIENDS", creator=self.user
        )

    def _make_view(self):
        view = MagicMock()
        view.kwargs = {"calendar_id": self.calendar.id}
        return view

    def test_allows_when_privacy_not_changed(self):
        request = self.factory.put(f"/api/v1/calendars/{self.calendar.id}/edit/")
        request.user = self.user
        request.data = {"name": "New Name"}
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_denies_when_at_limit_for_new_privacy(self):
        Calendar.objects.create(name="P1", privacy="PUBLIC", creator=self.user)
        Calendar.objects.create(name="P2", privacy="PUBLIC", creator=self.user)
        request = self.factory.put(f"/api/v1/calendars/{self.calendar.id}/edit/")
        request.user = self.user
        request.data = {"privacy": "PUBLIC"}
        self.assertFalse(self.permission.has_permission(request, self._make_view()))

    def test_get_method_always_allowed(self):
        request = self.factory.get(f"/api/v1/calendars/{self.calendar.id}/edit/")
        request.user = self.user
        request.data = {}
        self.assertTrue(self.permission.has_permission(request, self._make_view()))


class CanAddFavoriteCalendarTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanAddFavoriteCalendar()
        self.user = User.objects.create_user(
            username="perm_fav", email="perm_fav@test.com", password="pass123", plan="FREE"
        )
        self.other = User.objects.create_user(
            username="perm_fav_other", email="perm_fav_other@test.com", password="pass123"
        )

    def test_allows_when_under_limit(self):
        request = self.factory.post("/api/v1/calendars/1/subscribe/")
        request.user = self.user
        self.assertTrue(self.permission.has_permission(request, None))

    def test_denies_when_at_limit(self):
        for i in range(10):
            cal = Calendar.objects.create(name=f"Fav{i}", privacy="PUBLIC", creator=self.other)
            self.user.subscribed_calendars.add(cal)
        request = self.factory.post("/api/v1/calendars/99/subscribe/")
        request.user = self.user
        self.assertFalse(self.permission.has_permission(request, None))


class CanAccessAnalyticsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanAccessAnalytics()

    def test_free_user_denied(self):
        user = User.objects.create_user(
            username="analytics_free", email="analytics_free@test.com", password="pass123", plan="FREE"
        )
        request = self.factory.get("/")
        request.user = user
        self.assertFalse(self.permission.has_permission(request, None))

    def test_business_user_allowed(self):
        user = User.objects.create_user(
            username="analytics_biz", email="analytics_biz@test.com", password="pass123", plan="BUSINESS"
        )
        request = self.factory.get("/")
        request.user = user
        self.assertTrue(self.permission.has_permission(request, None))


class CanCustomizeCalendarsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanCustomizeCalendars()

    def test_free_user_denied(self):
        user = User.objects.create_user(
            username="custom_free", email="custom_free@test.com", password="pass123", plan="FREE"
        )
        request = self.factory.get("/")
        request.user = user
        self.assertFalse(self.permission.has_permission(request, None))

    def test_standard_user_allowed(self):
        user = User.objects.create_user(
            username="custom_std", email="custom_std@test.com", password="pass123", plan="STANDARD"
        )
        request = self.factory.get("/")
        request.user = user
        self.assertTrue(self.permission.has_permission(request, None))


# ---------------------------------------------------------------------------
# utils/security.py
# ---------------------------------------------------------------------------

class GetSafeIpTests(TestCase):
    def test_no_hostname_returns_none(self):
        self.assertIsNone(get_safe_ip("not-a-url"))

    @patch("utils.security.socket.gethostbyname", return_value="8.8.8.8")
    def test_public_ip_returns_ip(self, _mock):
        result = get_safe_ip("https://example.com/path")
        self.assertEqual(result, "8.8.8.8")

    @patch("utils.security.socket.gethostbyname", return_value="127.0.0.1")
    def test_loopback_returns_none(self, _mock):
        result = get_safe_ip("https://localhost/path")
        self.assertIsNone(result)

    @patch("utils.security.socket.gethostbyname", return_value="192.168.1.1")
    def test_private_ip_returns_none(self, _mock):
        result = get_safe_ip("https://internal.example.com/path")
        self.assertIsNone(result)

    @patch("utils.security.socket.gethostbyname", return_value="169.254.1.1")
    def test_link_local_returns_none(self, _mock):
        result = get_safe_ip("https://link-local.example.com/path")
        self.assertIsNone(result)

    @patch("utils.security.socket.gethostbyname", side_effect=socket.gaierror("DNS fail"))
    def test_dns_failure_returns_none(self, _mock):
        result = get_safe_ip("https://nonexistent.example.com/path")
        self.assertIsNone(result)


# ---------------------------------------------------------------------------
# utils/storage.py
# ---------------------------------------------------------------------------

class GetSignedUrlTests(TestCase):
    def test_none_file_returns_none(self):
        request = RequestFactory().get("/")
        self.assertIsNone(get_signed_url(request, None))

    def test_falsy_file_returns_none(self):
        request = RequestFactory().get("/")
        self.assertIsNone(get_signed_url(request, ""))

    def test_absolute_url_returned_as_is(self):
        request = RequestFactory().get("/")
        file_field = MagicMock()
        file_field.url = "https://cdn.example.com/media/photo.jpg"
        file_field.__bool__ = lambda self: True
        result = get_signed_url(request, file_field)
        self.assertEqual(result, "https://cdn.example.com/media/photo.jpg")

    def test_relative_url_gets_absolute_uri(self):
        request = RequestFactory().get("/")
        file_field = MagicMock()
        file_field.url = "/media/photo.jpg"
        file_field.__bool__ = lambda self: True
        result = get_signed_url(request, file_field)
        self.assertIn("/media/photo.jpg", result)
        self.assertTrue(result.startswith("http"))

    def test_exception_returns_none(self):
        request = RequestFactory().get("/")
        file_field = MagicMock()
        file_field.__bool__ = lambda self: True
        type(file_field).url = PropertyMock(side_effect=Exception("Storage error"))
        result = get_signed_url(request, file_field)
        self.assertIsNone(result)
