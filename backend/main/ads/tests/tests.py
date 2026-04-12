from rest_framework import status
from rest_framework.test import APITestCase
from main.models import User


ENDPOINT_ADS_CONFIG = "/api/v1/ads/config/"


class AdsConfigTests(APITestCase):
    def setUp(self):
        self.free_user = User.objects.create_user(
            username="free_user",
            email="free_user@example.com",
            password="free_user",
            plan="FREE",
        )
        self.standard_user = User.objects.create_user(
            username="standard_user",
            email="standard_user@example.com",
            password="standard_user",
            plan="STANDARD",
        )
        self.business_user = User.objects.create_user(
            username="business_user",
            email="business_user@example.com",
            password="business_user",
            plan="BUSINESS",
        )

    # --- autenticación ---

    def test_config_requires_authentication(self):
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- show ads según plan ---

    def test_free_user_sees_ads(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["show_ads"])

    def test_standard_user_does_not_see_ads(self):
        self.client.force_authenticate(self.standard_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["show_ads"])

    def test_business_user_does_not_see_ads(self):
        self.client.force_authenticate(self.business_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["show_ads"])

    # --- estructura de la respuesta ---

    def test_response_contains_required_fields(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("show_ads", response.data)
        self.assertIn("frequency", response.data)
        self.assertIn("placements", response.data)

    def test_frequency_is_positive_integer(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data["frequency"], int)
        self.assertGreater(response.data["frequency"], 0)

    def test_placements_contains_expected_values(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.get(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("feed", response.data["placements"])
        self.assertIn("search", response.data["placements"])
        self.assertIn("events", response.data["placements"])

    # --- método HTTP ---

    def test_post_not_allowed(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.post(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_not_allowed(self):
        self.client.force_authenticate(self.free_user)
        response = self.client.put(ENDPOINT_ADS_CONFIG)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
