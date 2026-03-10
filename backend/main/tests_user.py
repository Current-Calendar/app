from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from .models import User


class UserTests(APITestCase):
    def setUp(self) -> None:
        super().setUp()

        self.user1 = User.objects.create_user(
            username="user1", email="user1@example.com", password="user1"
        )
        self.user2 = User.objects.create_user(
            username="user2", email="user2@example.com", password="user2"
        )

    def test_follow_user(self):
        self.client.force_authenticate(self.user1)

        request = self.client.post(f"/api/v1/users/{self.user2.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        following = list(self.user1.following.all())
        self.assertEqual(len(following), 1)
        self.assertEqual(following[0], self.user2)

    def test_unfollow_user(self):
        self.user2.following.add(self.user1)
        self.user2.save()

        self.assertEqual(self.user2.following.count(), 1)

        self.client.force_authenticate(self.user2)

        request = self.client.post(f"/api/v1/users/{self.user1.pk}/follow/")

        self.assertEqual(request.status_code, status.HTTP_200_OK)

        following = list(self.user2.following.all())
        self.assertEqual(len(following), 0)
