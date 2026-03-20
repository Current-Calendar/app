from datetime import date, time

from rest_framework import status
from rest_framework.test import APITestCase

from main.models import Calendar, Comment, Event, User

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
