import math
import socket
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import TestCase, RequestFactory

from main.models import Calendar, Event, User, Notification, CalendarInvitation
from main.entitlements import get_user_features, Planes, PLAN_FEATURES
from main.permissions import (
    CanCreateCalendar,
    CanChangePrivacy,
    CanAddFavoriteCalendar,
    CanAccessAnalytics,
    CanCustomizeCalendars,
    CanCoOwnCalendars,
    CanAcceptCalendarInvites,
    CanReceiveCalendarViewInvites,
    IsOwnerOrCoOwnerOfCalendar,
    CanAssignCategoryToCalendar,
    CanManageEventTagsForEvent,
    CanManageCategoriesAndTags,
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


# ---------------------------------------------------------------------------
# permissions.py  (additional permission classes)
# ---------------------------------------------------------------------------

class CanCoOwnCalendarsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanCoOwnCalendars()
        self.sender = User.objects.create_user(
            username="coown_sender", email="coown_sender@test.com",
            password="pass123", plan="STANDARD",
        )
        self.invitee = User.objects.create_user(
            username="coown_invitee", email="coown_invitee@test.com",
            password="pass123", plan="STANDARD",
        )

    def _make_request(self, user, data=None):
        request = self.factory.post("/api/v1/calendars/invite/", data=data or {})
        request.user = user
        request.data = data or {}
        return request

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/calendars/invite/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {"user": self.invitee.id}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_both_standard_allowed(self):
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_sender_free_denied(self):
        self.sender.plan = "FREE"
        self.sender.save()
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertFalse(self.permission.has_permission(request, None))
        self.assertIn("Your current plan", self.permission.message)

    def test_invitee_free_denied(self):
        self.invitee.plan = "FREE"
        self.invitee.save()
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertFalse(self.permission.has_permission(request, None))
        self.assertIn("user you are trying to invite", self.permission.message)

    def test_both_free_denied_sender_message(self):
        self.sender.plan = "FREE"
        self.sender.save()
        self.invitee.plan = "FREE"
        self.invitee.save()
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertFalse(self.permission.has_permission(request, None))
        # Sender is checked first
        self.assertIn("Your current plan", self.permission.message)

    def test_both_business_allowed(self):
        self.sender.plan = "BUSINESS"
        self.sender.save()
        self.invitee.plan = "BUSINESS"
        self.invitee.save()
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertTrue(self.permission.has_permission(request, None))


class CanAcceptCalendarInvitesTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanAcceptCalendarInvites()
        self.sender = User.objects.create_user(
            username="accept_sender", email="accept_sender@test.com",
            password="pass123", plan="STANDARD",
        )
        self.recipient = User.objects.create_user(
            username="accept_recip", email="accept_recip@test.com",
            password="pass123", plan="STANDARD",
        )
        self.calendar = Calendar.objects.create(
            name="InviteCal", privacy="PUBLIC", creator=self.sender,
        )
        self.notification = Notification.objects.create(
            recipient=self.recipient,
            sender=self.sender,
            type="CALENDAR_INVITE",
            related_calendar=self.calendar,
            message="You have been invited",
        )

    def _make_request(self, user, data=None):
        request = self.factory.post(f"/api/v1/notifications/{self.notification.id}/respond/")
        request.user = user
        request.data = data or {}
        return request

    def _make_view(self, notification_id=None):
        view = MagicMock()
        view.kwargs = {"id": notification_id or self.notification.id}
        return view

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/notifications/1/respond/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {}
        self.assertFalse(self.permission.has_permission(request, self._make_view()))

    def test_non_calendar_invite_allowed(self):
        notif = Notification.objects.create(
            recipient=self.recipient, sender=self.sender,
            type="NEW_FOLLOWER", message="Someone followed you",
        )
        view = self._make_view(notif.id)
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertTrue(self.permission.has_permission(request, view))

    def test_decline_always_allowed(self):
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="EDIT",
        )
        request = self._make_request(self.recipient, {"status": "DECLINE"})
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_no_invitation_found_passes_through(self):
        # No CalendarInvitation exists for this user/calendar
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_accept_edit_invitation_standard_allowed(self):
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="EDIT",
        )
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_accept_edit_invitation_free_denied(self):
        self.recipient.plan = "FREE"
        self.recipient.save()
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="EDIT",
        )
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertFalse(self.permission.has_permission(request, self._make_view()))
        self.assertIn("edit invitations", self.permission.message)

    def test_accept_view_invitation_under_limit_allowed(self):
        self.recipient.plan = "FREE"
        self.recipient.save()
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="VIEW",
        )
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_accept_view_invitation_at_limit_denied(self):
        self.recipient.plan = "FREE"
        self.recipient.save()
        other = User.objects.create_user(
            username="accept_other", email="accept_other@test.com", password="pass123",
        )
        for i in range(10):
            cal = Calendar.objects.create(
                name=f"FavAccept{i}", privacy="PUBLIC", creator=other,
            )
            self.recipient.subscribed_calendars.add(cal)
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="VIEW",
        )
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertFalse(self.permission.has_permission(request, self._make_view()))
        self.assertIn("maximum number of favorite calendars", self.permission.message)

    def test_accept_view_invitation_standard_infinite_allowed(self):
        # STANDARD plan has infinite favorite calendars
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="VIEW",
        )
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        self.assertTrue(self.permission.has_permission(request, self._make_view()))

    def test_already_accepted_invitation_ignored(self):
        # Create an already-accepted invitation, then a pending one
        CalendarInvitation.objects.create(
            calendar=self.calendar, sender=self.sender,
            invitee=self.recipient, permission="EDIT", accepted=True,
        )
        # The query filters accepted=None, so accepted=True is ignored
        request = self._make_request(self.recipient, {"status": "ACCEPT"})
        # No pending invitation found -> passes through
        self.assertTrue(self.permission.has_permission(request, self._make_view()))


class CanReceiveCalendarViewInvitesTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanReceiveCalendarViewInvites()
        self.sender = User.objects.create_user(
            username="recv_sender", email="recv_sender@test.com",
            password="pass123", plan="STANDARD",
        )
        self.invitee = User.objects.create_user(
            username="recv_invitee", email="recv_invitee@test.com",
            password="pass123", plan="FREE",
        )

    def _make_request(self, user, data=None):
        request = self.factory.post("/api/v1/calendars/1/invite/")
        request.user = user
        request.data = data or {}
        return request

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/calendars/1/invite/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {"user": self.invitee.id}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_missing_user_id_denied(self):
        request = self._make_request(self.sender, {})
        self.assertFalse(self.permission.has_permission(request, None))
        self.assertIn("Invitee user is required", self.permission.message)

    def test_invitee_under_limit_allowed(self):
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_invitee_at_limit_denied(self):
        other = User.objects.create_user(
            username="recv_other", email="recv_other@test.com", password="pass123",
        )
        for i in range(10):
            cal = Calendar.objects.create(
                name=f"RecvFav{i}", privacy="PUBLIC", creator=other,
            )
            self.invitee.subscribed_calendars.add(cal)
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertFalse(self.permission.has_permission(request, None))

    def test_invitee_standard_infinite_allowed(self):
        self.invitee.plan = "STANDARD"
        self.invitee.save()
        request = self._make_request(self.sender, {"user": self.invitee.id})
        self.assertTrue(self.permission.has_permission(request, None))


class IsOwnerOrCoOwnerOfCalendarTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = IsOwnerOrCoOwnerOfCalendar()
        self.owner = User.objects.create_user(
            username="isowner_owner", email="isowner_owner@test.com", password="pass123",
        )
        self.co_owner = User.objects.create_user(
            username="isowner_coowner", email="isowner_coowner@test.com", password="pass123",
        )
        self.stranger = User.objects.create_user(
            username="isowner_stranger", email="isowner_stranger@test.com", password="pass123",
        )
        self.calendar = Calendar.objects.create(
            name="OwnerCal", privacy="PUBLIC", creator=self.owner,
        )
        self.calendar.co_owners.add(self.co_owner)

    def _make_request(self, user):
        request = self.factory.get("/")
        request.user = user
        return request

    def test_owner_allowed(self):
        request = self._make_request(self.owner)
        self.assertTrue(self.permission.has_object_permission(request, None, self.calendar))

    def test_co_owner_allowed(self):
        request = self._make_request(self.co_owner)
        self.assertTrue(self.permission.has_object_permission(request, None, self.calendar))

    def test_stranger_denied(self):
        request = self._make_request(self.stranger)
        self.assertFalse(self.permission.has_object_permission(request, None, self.calendar))


class CanAssignCategoryToCalendarTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanAssignCategoryToCalendar()
        self.owner = User.objects.create_user(
            username="assign_owner", email="assign_owner@test.com", password="pass123",
        )
        self.co_owner = User.objects.create_user(
            username="assign_coowner", email="assign_coowner@test.com", password="pass123",
        )
        self.stranger = User.objects.create_user(
            username="assign_stranger", email="assign_stranger@test.com", password="pass123",
        )
        self.staff = User.objects.create_user(
            username="assign_staff", email="assign_staff@test.com",
            password="pass123", is_staff=True,
        )
        self.calendar = Calendar.objects.create(
            name="AssignCal", privacy="PUBLIC", creator=self.owner,
        )
        self.calendar.co_owners.add(self.co_owner)

    def _make_request(self, user, data=None):
        request = self.factory.post("/api/v1/categories/assign/")
        request.user = user
        request.data = data or {}
        return request

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/categories/assign/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {"calendar_id": self.calendar.id}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_staff_always_allowed(self):
        request = self._make_request(self.staff, {"calendar_id": self.calendar.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_owner_allowed(self):
        request = self._make_request(self.owner, {"calendar_id": self.calendar.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_co_owner_allowed(self):
        request = self._make_request(self.co_owner, {"calendar_id": self.calendar.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_stranger_denied(self):
        request = self._make_request(self.stranger, {"calendar_id": self.calendar.id})
        self.assertFalse(self.permission.has_permission(request, None))

    def test_missing_calendar_id_passes_through(self):
        request = self._make_request(self.owner, {})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_nonexistent_calendar_passes_through(self):
        request = self._make_request(self.owner, {"calendar_id": 99999})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_has_object_permission_always_true(self):
        request = self._make_request(self.stranger)
        self.assertTrue(self.permission.has_object_permission(request, None, MagicMock()))


class CanManageEventTagsForEventTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanManageEventTagsForEvent()
        self.owner = User.objects.create_user(
            username="evttag_owner", email="evttag_owner@test.com", password="pass123",
        )
        self.co_owner = User.objects.create_user(
            username="evttag_coowner", email="evttag_coowner@test.com", password="pass123",
        )
        self.stranger = User.objects.create_user(
            username="evttag_stranger", email="evttag_stranger@test.com", password="pass123",
        )
        self.staff = User.objects.create_user(
            username="evttag_staff", email="evttag_staff@test.com",
            password="pass123", is_staff=True,
        )
        self.calendar = Calendar.objects.create(
            name="EventTagCal", privacy="PUBLIC", creator=self.owner,
        )
        self.calendar.co_owners.add(self.co_owner)
        self.event = Event.objects.create(
            title="TagEvent", date="2026-05-01", time="12:00:00", creator=self.owner,
        )
        self.event.calendars.add(self.calendar)

    def _make_request(self, user, data=None):
        request = self.factory.post("/api/v1/event-tags/assign/")
        request.user = user
        request.data = data or {}
        return request

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/event-tags/assign/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {"event_id": self.event.id}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_staff_always_allowed(self):
        request = self._make_request(self.staff, {"event_id": self.event.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_owner_of_calendar_containing_event_allowed(self):
        request = self._make_request(self.owner, {"event_id": self.event.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_co_owner_of_calendar_containing_event_allowed(self):
        request = self._make_request(self.co_owner, {"event_id": self.event.id})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_stranger_denied(self):
        request = self._make_request(self.stranger, {"event_id": self.event.id})
        self.assertFalse(self.permission.has_permission(request, None))

    def test_missing_event_id_passes_through(self):
        request = self._make_request(self.owner, {})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_nonexistent_event_passes_through(self):
        request = self._make_request(self.owner, {"event_id": 99999})
        self.assertTrue(self.permission.has_permission(request, None))

    def test_has_object_permission_always_true(self):
        request = self._make_request(self.stranger)
        self.assertTrue(self.permission.has_object_permission(request, None, MagicMock()))


class CanManageCategoriesAndTagsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.permission = CanManageCategoriesAndTags()
        self.owner = User.objects.create_user(
            username="mgcat_owner", email="mgcat_owner@test.com", password="pass123",
        )
        self.co_owner = User.objects.create_user(
            username="mgcat_coowner", email="mgcat_coowner@test.com", password="pass123",
        )
        self.stranger = User.objects.create_user(
            username="mgcat_stranger", email="mgcat_stranger@test.com", password="pass123",
        )
        self.staff = User.objects.create_user(
            username="mgcat_staff", email="mgcat_staff@test.com",
            password="pass123", is_staff=True,
        )
        self.calendar = Calendar.objects.create(
            name="MgCatCal", privacy="PUBLIC", creator=self.owner,
        )
        self.calendar.co_owners.add(self.co_owner)

    def _make_request(self, user, method="post", data=None):
        if method == "get":
            request = self.factory.get("/api/v1/categories/")
        else:
            request = self.factory.post("/api/v1/categories/")
        request.user = user
        request.data = data or {}
        return request

    def _make_view(self, kwargs=None):
        view = MagicMock()
        view.kwargs = kwargs or {}
        return view

    # --- has_permission tests ---

    def test_unauthenticated_denied(self):
        request = self.factory.post("/api/v1/categories/")
        request.user = MagicMock(is_authenticated=False)
        request.data = {}
        request.parser_context = {"kwargs": {}}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_staff_always_allowed(self):
        request = self._make_request(self.staff)
        request.parser_context = {"kwargs": {}}
        self.assertTrue(self.permission.has_permission(request, None))

    def test_owner_with_calendar_id_in_kwargs_allowed(self):
        request = self._make_request(self.owner)
        request.parser_context = {"kwargs": {"calendar_id": self.calendar.id}}
        self.assertTrue(self.permission.has_permission(request, None))

    def test_co_owner_with_calendar_id_in_kwargs_allowed(self):
        request = self._make_request(self.co_owner)
        request.parser_context = {"kwargs": {"calendar_id": self.calendar.id}}
        self.assertTrue(self.permission.has_permission(request, None))

    def test_stranger_with_calendar_id_in_kwargs_denied(self):
        request = self._make_request(self.stranger)
        request.parser_context = {"kwargs": {"calendar_id": self.calendar.id}}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_calendar_id_in_data_fallback(self):
        request = self._make_request(self.owner, data={"calendar_id": self.calendar.id})
        request.parser_context = {"kwargs": {}}
        self.assertTrue(self.permission.has_permission(request, None))

    def test_stranger_with_calendar_id_in_data_denied(self):
        request = self._make_request(self.stranger, data={"calendar_id": self.calendar.id})
        request.parser_context = {"kwargs": {}}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_nonexistent_calendar_denied(self):
        request = self._make_request(self.owner, data={"calendar_id": 99999})
        request.parser_context = {"kwargs": {}}
        self.assertFalse(self.permission.has_permission(request, None))

    def test_no_calendar_id_passes_through(self):
        request = self._make_request(self.owner)
        request.parser_context = {"kwargs": {}}
        self.assertTrue(self.permission.has_permission(request, None))

    # --- has_object_permission tests ---

    def test_get_request_allowed_for_anyone(self):
        request = self._make_request(self.stranger, method="get")
        self.assertTrue(self.permission.has_object_permission(request, None, MagicMock()))

    def test_write_request_denied_for_non_staff(self):
        request = self._make_request(self.owner)
        request.method = "POST"
        self.assertFalse(self.permission.has_object_permission(request, None, MagicMock()))

    def test_write_request_allowed_for_staff(self):
        request = self._make_request(self.staff)
        request.method = "PUT"
        self.assertTrue(self.permission.has_object_permission(request, None, MagicMock()))

    def test_delete_request_denied_for_non_staff(self):
        request = self._make_request(self.owner)
        request.method = "DELETE"
        self.assertFalse(self.permission.has_object_permission(request, None, MagicMock()))
