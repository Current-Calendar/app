from datetime import date, time
import tempfile
import shutil

from rest_framework import status
from rest_framework.test import APITestCase, APIRequestFactory
from django.contrib.auth.models import AnonymousUser
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from main.models import Calendar, Comment, Event, User
from main.comments import views as comment_views

COMMENTS_ENDPOINT = "/api/v1/comments/"


class CommentApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="pass1234",
        )
        self.alice = User.objects.create_user(
            username="alice",
            email="alice@test.com",
            password="pass1234",
        )
        self.bob = User.objects.create_user(
            username="bob",
            email="bob@test.com",
            password="pass1234",
        )

        self.public_calendar = Calendar.objects.create(
            name="Public Calendar",
            privacy="PUBLIC",
            creator=self.owner,
        )
        self.private_calendar = Calendar.objects.create(
            name="Private Calendar",
            privacy="PRIVATE",
            creator=self.owner,
        )

        self.public_event = Event.objects.create(
            title="Public Event",
            date=date(2026, 6, 1),
            time=time(18, 0),
            creator=self.owner,
        )
        self.public_event.calendars.add(self.public_calendar)

        self.private_event = Event.objects.create(
            title="Private Event",
            date=date(2026, 6, 2),
            time=time(18, 0),
            creator=self.owner,
        )
        self.private_event.calendars.add(self.private_calendar)

    def test_create_root_comment_on_event(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {
                "target_type": "EVENT",
                "target_id": self.public_event.id,
                "body": "Primer comentario",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        comment = Comment.objects.get(id=response.data["id"])
        self.assertIsNone(comment.parent_id)
        self.assertEqual(comment.root_id, comment.id)

    def test_create_reply_increments_root_replies_count(self):
        root = Comment.objects.create(
            author=self.alice,
            body="Root",
            event=self.public_event,
        )
        root.root = root
        root.save(update_fields=["root", "updated_at"])

        self.client.force_authenticate(self.bob)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {
                "target_type": "EVENT",
                "target_id": self.public_event.id,
                "parent_id": root.id,
                "body": "Respuesta",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        root.refresh_from_db()
        self.assertEqual(root.replies_count, 1)

    def test_list_comments_returns_only_roots(self):
        root = Comment.objects.create(author=self.alice, body="Root", event=self.public_event)
        root.root = root
        root.save(update_fields=["root", "updated_at"])
        Comment.objects.create(
            author=self.bob,
            body="Reply",
            event=self.public_event,
            parent=root,
            root=root,
        )

        response = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.public_event.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["results"][0]["parent"])

    def test_list_replies_returns_parent_preview(self):
        root = Comment.objects.create(author=self.alice, body="Root", event=self.public_event)
        root.root = root
        root.save(update_fields=["root", "updated_at"])
        reply = Comment.objects.create(
            author=self.bob,
            body="Reply",
            event=self.public_event,
            parent=root,
            root=root,
        )

        response = self.client.get(f"/api/v1/comments/{root.id}/replies/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], reply.id)
        self.assertEqual(response.data["results"][0]["parent_preview"]["id"], root.id)
        self.assertEqual(response.data["results"][0]["parent_preview"]["author_username"], self.alice.username)

    def test_post_requires_authentication(self):
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.public_event.id, "body": "Hola"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_comment_forbidden_if_target_not_visible(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {
                "target_type": "EVENT",
                "target_id": self.private_event.id,
                "body": "No debería poder",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_can_delete_comment(self):
        comment = Comment.objects.create(author=self.alice, body="To delete", event=self.public_event)
        comment.root = comment
        comment.save(update_fields=["root", "updated_at"])

        self.client.force_authenticate(self.alice)
        response = self.client.delete(f"/api/v1/comments/{comment.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Comment.objects.filter(id=comment.id).exists())

    def test_target_owner_can_delete_comment(self):
        comment = Comment.objects.create(author=self.alice, body="To delete", event=self.public_event)
        comment.root = comment
        comment.save(update_fields=["root", "updated_at"])

        self.client.force_authenticate(self.owner)
        response = self.client.delete(f"/api/v1/comments/{comment.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Comment.objects.filter(id=comment.id).exists())

    def test_calendar_owner_can_delete_comment(self):
        comment = Comment.objects.create(author=self.alice, body="To delete", calendar=self.public_calendar)
        comment.root = comment
        comment.save(update_fields=["root", "updated_at"])

        self.client.force_authenticate(self.owner)
        response = self.client.delete(f"/api/v1/comments/{comment.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Comment.objects.filter(id=comment.id).exists())

    def test_other_user_cannot_delete_comment(self):
        comment = Comment.objects.create(author=self.alice, body="To delete", event=self.public_event)
        comment.root = comment
        comment.save(update_fields=["root", "updated_at"])

        other = User.objects.create_user(username="other", email="other@test.com", password="pass1234")
        self.client.force_authenticate(other)
        response = self.client.delete(f"/api/v1/comments/{comment.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reply_survives_if_parent_is_deleted(self):
        root = Comment.objects.create(author=self.owner, body="Root", event=self.public_event)
        root.root = root
        root.save(update_fields=["root", "updated_at"])

        parent = Comment.objects.create(
            author=self.alice,
            body="Parent reply",
            event=self.public_event,
            parent=root,
            root=root,
        )
        child = Comment.objects.create(
            author=self.bob,
            body="Child reply",
            event=self.public_event,
            parent=parent,
            root=root,
        )
        Comment.objects.filter(id=root.id).update(replies_count=2)

        self.client.force_authenticate(self.alice)
        response = self.client.delete(f"/api/v1/comments/{parent.id}/delete/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        child.refresh_from_db()
        self.assertIsNone(child.parent_id)

        replies_response = self.client.get(f"/api/v1/comments/{root.id}/replies/")
        self.assertEqual(replies_response.status_code, status.HTTP_200_OK)
        child_data = next(item for item in replies_response.data["results"] if item["id"] == child.id)
        self.assertIsNone(child_data["parent_preview"])

    def test_get_comments_invalid_target_type(self):
        response = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "INVALID", "target_id": self.public_event.id},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_comments_invalid_target_id(self):
        response = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": "abc"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_comments_private_event_forbidden(self):
        response = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.private_event.id},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_replies_requires_root_comment(self):
        root = Comment.objects.create(author=self.alice, body="Root", event=self.public_event)
        root.root = root
        root.save(update_fields=["root", "updated_at"])
        reply = Comment.objects.create(
            author=self.bob,
            body="Reply",
            event=self.public_event,
            parent=root,
            root=root,
        )

        response = self.client.get(f"/api/v1/comments/{reply.id}/replies/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_comment_requires_body(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.public_event.id, "body": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_comment_parent_mismatch(self):
        root = Comment.objects.create(author=self.owner, body="Root", event=self.public_event)
        root.root = root
        root.save(update_fields=["root", "updated_at"])

        self.client.force_authenticate(self.owner)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {
                "target_type": "EVENT",
                "target_id": self.private_event.id,
                "parent_id": root.id,
                "body": "Respuesta fuera de objetivo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_comments_pagination_and_cursor(self):
        for idx in range(3):
            comment = Comment.objects.create(
                author=self.alice,
                body=f"Root {idx}",
                event=self.public_event,
            )
            comment.root = comment
            comment.save(update_fields=["root", "updated_at"])

        first_page = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.public_event.id, "limit": 2, "sort": "old"},
        )
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(first_page.data["results"]), 2)
        self.assertTrue(first_page.data["has_more"])
        cursor = first_page.data["next_cursor"]
        self.assertIsNotNone(cursor)

        second_page = self.client.get(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": self.public_event.id, "cursor": cursor, "sort": "old"},
        )
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page.data["results"]), 1)
        self.assertFalse(second_page.data["has_more"])


class CommentHelpersCoverageTests(APITestCase):
    def setUp(self):
        self._tmp_media = tempfile.mkdtemp()
        self._override = override_settings(MEDIA_ROOT=self._tmp_media)
        self._override.enable()
        self.addCleanup(lambda: (self._override.disable(), shutil.rmtree(self._tmp_media, ignore_errors=True)))
        self.factory = APIRequestFactory()
        self.owner = User.objects.create_user(
            username="owner2",
            email="owner2@test.com",
            password="pass1234",
        )
        self.friend = User.objects.create_user(
            username="friend",
            email="friend@test.com",
            password="pass1234",
        )
        self.stranger = User.objects.create_user(
            username="stranger",
            email="stranger@test.com",
            password="pass1234",
        )
        # Make owner and friend mutual followers
        self.owner.following.add(self.friend)
        self.friend.following.add(self.owner)

        self.public_calendar = Calendar.objects.create(
            name="Pub cal",
            privacy="PUBLIC",
            creator=self.owner,
        )
        self.private_calendar = Calendar.objects.create(
            name="Priv cal",
            privacy="PRIVATE",
            creator=self.owner,
        )
        self.friends_calendar = Calendar.objects.create(
            name="Restricted private cal",
            privacy="PRIVATE",
            creator=self.owner,
        )
        
        self.event_public = Event.objects.create(
            title="event public",
            date=date(2026, 10, 1),
            time=time(10, 0),
            creator=self.owner,
        )
        self.event_public.calendars.add(self.public_calendar)

        self.event_friend = Event.objects.create(
            title="event private restricted",
            date=date(2026, 10, 2),
            time=time(11, 0),
            creator=self.owner,
        )
        self.event_friend.calendars.add(self.friends_calendar)

    def test_normalize_target_type_none(self):
        self.assertIsNone(comment_views._normalize_target_type(None))

    def test_can_view_calendar_public_allows_anonymous(self):
        self.assertTrue(comment_views.can_view_calendar(self.public_calendar, AnonymousUser()))

    def test_can_view_calendar_private_requires_auth(self):
        self.assertFalse(comment_views.can_view_calendar(self.private_calendar, None))

    def test_can_view_event_public_allows_anonymous(self):
        self.assertTrue(comment_views.can_view_event(self.event_public, None))

    def test_can_view_private_event_denied_for_non_owner(self):
        self.assertFalse(comment_views.can_view_event(self.event_friend, self.friend))
        self.assertFalse(comment_views.can_view_event(self.event_friend, self.stranger))

    def test_decode_cursor_invalid(self):
        ts, _id = comment_views._decode_cursor("badcursor")
        self.assertIsNone(ts)
        self.assertIsNone(_id)

    def test_comment_serializer_author_avatar(self):
        photo = SimpleUploadedFile("avatar.jpg", b"data", content_type="image/jpeg")
        self.owner.photo.save("avatar.jpg", photo, save=True)
        comment = Comment.objects.create(
            author=self.owner,
            body="avatar comment",
            calendar=self.public_calendar,
        )
        request = self.factory.get("/api/v1/comments/")
        serializer = comment_views.CommentSerializer(comment, context={"request": request})
        self.assertIn("avatar", serializer.data["author_avatar"])

    def test_get_comments_forbidden_on_private_calendar(self):
        request = self.factory.get(
            "/api/v1/comments/",
            {"target_type": "CALENDAR", "target_id": self.private_calendar.id},
        )
        request.user = self.stranger
        response = comment_views.get_comments(request)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_comment_invalid_target_id(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {"target_type": "EVENT", "target_id": "abc", "body": "hola"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_comment_forbidden_on_private_calendar(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.post(
            COMMENTS_ENDPOINT,
            {"target_type": "CALENDAR", "target_id": self.private_calendar.id, "body": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_replies_sort_new_branch(self):
        root = Comment.objects.create(
            author=self.owner,
            body="root",
            calendar=self.public_calendar,
        )
        root.root = root
        root.save(update_fields=["root", "updated_at"])
        Comment.objects.create(
            author=self.owner,
            body="reply",
            calendar=self.public_calendar,
            parent=root,
            root=root,
        )
        request = self.factory.get("/api/v1/comments/1/replies/", {"sort": "new"})
        request.user = None
        response = comment_views.list_replies(request, root.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
