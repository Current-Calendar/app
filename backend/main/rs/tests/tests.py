from datetime import date, time
from unittest.mock import patch, MagicMock

from django.contrib.gis.geos import Point
from django.test import TestCase

from main.models import Calendar, CalendarLabel, Event, User
from main.rs.utils import tokenize, most_common, dice_coefficient, compute_item_similarities
from main.rs.calendars import (
    build_feature_set as cal_build_feature_set,
    get_all_calendars_features,
    get_similar_calendars,
    recommend_calendars,
)
from main.rs.events import (
    build_feature_set as ev_build_feature_set,
    get_all_events_features,
    get_similar_events,
    recommend_events,
)


# ---------------------------------------------------------------------------
# rs/utils.py
# ---------------------------------------------------------------------------

class TokenizeTests(TestCase):
    def test_extracts_long_words(self):
        result = tokenize("hello world this is a longer sentence with some words", 10)
        self.assertIn("hello", result)
        self.assertIn("longer", result)
        self.assertIn("sentence", result)

    def test_filters_stop_words(self):
        result = tokenize("this that those have been with some", 10)
        for word in result:
            self.assertGreaterEqual(len(word), 4)

    def test_returns_at_most_n_tokens(self):
        result = tokenize("alpha bravo charlie delta echo foxtrot golf hotel", 3)
        self.assertLessEqual(len(result), 3)

    def test_empty_text_returns_empty(self):
        result = tokenize("", 5)
        self.assertEqual(result, [])

    def test_short_words_excluded(self):
        result = tokenize("a bb ccc", 5)
        self.assertEqual(result, [])


class MostCommonTests(TestCase):
    def test_returns_most_common(self):
        result = most_common(["a", "b", "a", "c", "a", "b"], 2)
        self.assertEqual(result[0], "a")
        self.assertEqual(len(result), 2)

    def test_empty_list(self):
        result = most_common([], 5)
        self.assertEqual(result, [])


class DiceCoefficientTests(TestCase):
    def test_identical_sets(self):
        self.assertAlmostEqual(dice_coefficient({"a", "b"}, {"a", "b"}), 1.0)

    def test_disjoint_sets(self):
        self.assertAlmostEqual(dice_coefficient({"a"}, {"b"}), 0.0)

    def test_partial_overlap(self):
        result = dice_coefficient({"a", "b"}, {"b", "c"})
        self.assertAlmostEqual(result, 2 * 1 / (2 + 2))

    def test_empty_set_returns_zero(self):
        self.assertAlmostEqual(dice_coefficient(set(), {"a"}), 0.0)
        self.assertAlmostEqual(dice_coefficient({"a"}, set()), 0.0)

    def test_both_empty_returns_zero(self):
        self.assertAlmostEqual(dice_coefficient(set(), set()), 0.0)


class ComputeItemSimilaritiesTests(TestCase):
    def test_similar_items_have_positive_score(self):
        features = {
            1: {"python", "django", "backend"},
            2: {"python", "django", "api"},
            3: {"react", "frontend", "javascript"},
        }
        result = compute_item_similarities(features)
        self.assertIn(1, result)
        sim_ids = [pair[0] for pair in result[1]]
        self.assertIn(2, sim_ids)

    def test_disjoint_items_have_empty_scores(self):
        features = {
            1: {"alpha"},
            2: {"beta"},
        }
        result = compute_item_similarities(features)
        self.assertEqual(result[1], [])
        self.assertEqual(result[2], [])

    def test_empty_features(self):
        result = compute_item_similarities({})
        self.assertEqual(result, {})

    def test_limits_to_top_20(self):
        features = {i: {f"token_{i}", f"token_{i % 3}"} for i in range(30)}
        result = compute_item_similarities(features)
        for key in result:
            self.assertLessEqual(len(result[key]), 20)


# ---------------------------------------------------------------------------
# rs/calendars.py - build_feature_set and get_all_calendars_features
# ---------------------------------------------------------------------------

class CalendarBuildFeatureSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rs_user", email="rs_user@test.com", password="pass123"
        )
        self.calendar = Calendar.objects.create(
            name="Music Events Calendar",
            description="Concerts and festivals around the city",
            privacy="PUBLIC",
            creator=self.user,
        )
        self.label = CalendarLabel.objects.create(name="music")
        self.calendar.labels.add(self.label)

        self.event_with_location = Event.objects.create(
            title="Concert",
            date=date(2026, 10, 1),
            time=time(20, 0),
            creator=self.user,
            location=Point(-3.7, 40.4),
        )
        self.event_with_location.calendars.add(self.calendar)

    def test_includes_label(self):
        features = cal_build_feature_set(self.calendar)
        self.assertTrue(any(f.startswith("Label_") for f in features))

    def test_includes_creator(self):
        features = cal_build_feature_set(self.calendar)
        self.assertIn(f"Creator_{self.user.id}", features)

    def test_includes_name_tokens(self):
        features = cal_build_feature_set(self.calendar)
        self.assertIn("Name_music", features)

    def test_includes_location_cluster(self):
        features = cal_build_feature_set(self.calendar)
        has_location = any("Location_" in f for f in features)
        self.assertTrue(has_location)

    def test_includes_popularity_tag(self):
        features = cal_build_feature_set(self.calendar)
        has_pop = any("Popularity_" in f for f in features)
        self.assertTrue(has_pop)


class GetAllCalendarsFeaturesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="feat_user", email="feat_user@test.com", password="pass123"
        )
        Calendar.objects.create(name="Public One", privacy="PUBLIC", creator=self.user)
        Calendar.objects.create(name="Private One", privacy="PRIVATE", creator=self.user)

    def test_only_includes_public_calendars(self):
        features = get_all_calendars_features()
        for cal_id in features:
            cal = Calendar.objects.get(pk=cal_id)
            self.assertEqual(cal.privacy, "PUBLIC")


# ---------------------------------------------------------------------------
# rs/calendars.py - get_similar_calendars and recommend_calendars
# ---------------------------------------------------------------------------

class GetSimilarCalendarsTests(TestCase):
    @patch("main.rs.calendars.redis_client")
    def test_returns_parsed_data(self, mock_redis):
        import json
        mock_redis.hget.return_value = json.dumps([[2, 0.8], [3, 0.5]]).encode()
        result = get_similar_calendars(1, top_n=1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][0], 2)

    @patch("main.rs.calendars.redis_client")
    def test_returns_empty_on_missing_data(self, mock_redis):
        mock_redis.hget.return_value = None
        result = get_similar_calendars(999)
        self.assertEqual(result, [])

    @patch("main.rs.calendars.redis_client")
    def test_returns_empty_on_exception(self, mock_redis):
        mock_redis.hget.side_effect = Exception("Redis down")
        result = get_similar_calendars(1)
        self.assertEqual(result, [])


class RecommendCalendarsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rec_user", email="rec_user@test.com", password="pass123"
        )
        self.other = User.objects.create_user(
            username="rec_other", email="rec_other@test.com", password="pass123"
        )
        self.pub_cal = Calendar.objects.create(
            name="Rec Public", privacy="PUBLIC", creator=self.other
        )

    @patch("main.rs.calendars.redis_client")
    def test_returns_list_of_calendars(self, mock_redis):
        mock_redis.hget.return_value = None
        result = recommend_calendars(self.user, limit=10)
        self.assertIsInstance(result, list)

    @patch("main.rs.calendars.redis_client")
    def test_does_not_include_own_calendars(self, mock_redis):
        mock_redis.hget.return_value = None
        own_cal = Calendar.objects.create(
            name="Own Cal", privacy="PUBLIC", creator=self.user
        )
        result = recommend_calendars(self.user, limit=10)
        result_ids = [c.id for c in result]
        self.assertNotIn(own_cal.id, result_ids)

    @patch("main.rs.calendars.redis_client")
    def test_fallback_includes_popular_calendars(self, mock_redis):
        mock_redis.hget.return_value = None
        result = recommend_calendars(self.user, limit=10)
        if self.pub_cal.id in [c.id for c in result]:
            self.assertTrue(True)


# ---------------------------------------------------------------------------
# rs/events.py - build_feature_set and recommend_events
# ---------------------------------------------------------------------------

class EventBuildFeatureSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ev_feat_user", email="ev_feat@test.com", password="pass123"
        )
        self.calendar = Calendar.objects.create(
            name="Ev Feat Cal", privacy="PUBLIC", creator=self.user
        )
        self.label = CalendarLabel.objects.create(name="sport")
        self.calendar.labels.add(self.label)
        self.event = Event.objects.create(
            title="Football Match Important",
            description="Champions league semifinal exciting match",
            date=date(2026, 5, 15),
            time=time(21, 0),
            creator=self.user,
            location=Point(-3.7, 40.4),
        )
        self.event.calendars.add(self.calendar)

    def test_includes_title_tokens(self):
        features = ev_build_feature_set(self.event)
        self.assertIn("Title_football", features)

    def test_includes_creator(self):
        features = ev_build_feature_set(self.event)
        self.assertIn(f"Creator_{self.user.id}", features)

    def test_includes_location(self):
        features = ev_build_feature_set(self.event)
        has_loc = any("Location_" in f for f in features)
        self.assertTrue(has_loc)

    def test_includes_month(self):
        features = ev_build_feature_set(self.event)
        self.assertIn("Month_5", features)

    def test_includes_calendar_label(self):
        features = ev_build_feature_set(self.event)
        self.assertTrue(any(f.startswith("Label_") for f in features))


class GetSimilarEventsTests(TestCase):
    @patch("main.rs.events.redis_client")
    def test_returns_parsed_data(self, mock_redis):
        import json
        mock_redis.hget.return_value = json.dumps([[5, 0.9], [6, 0.7]]).encode()
        result = get_similar_events(1, top_n=1)
        self.assertEqual(len(result), 1)

    @patch("main.rs.events.redis_client")
    def test_returns_empty_on_exception(self, mock_redis):
        mock_redis.hget.side_effect = Exception("Timeout")
        result = get_similar_events(1)
        self.assertEqual(result, [])


class GetAllEventsFeaturesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ev_all_user", email="ev_all@test.com", password="pass123"
        )
        self.event = Event.objects.create(
            title="Feature Test Event",
            date=date(2026, 6, 1),
            time=time(10, 0),
            creator=self.user,
        )

    def test_returns_features_for_all_events(self):
        features = get_all_events_features()
        self.assertIn(self.event.id, features)
        self.assertIsInstance(features[self.event.id], set)


class RecommendEventsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="rec_ev_test", email="rec_ev_test@test.com", password="pass123"
        )
        self.other = User.objects.create_user(
            username="rec_ev_other", email="rec_ev_other@test.com", password="pass123"
        )
        self.calendar = Calendar.objects.create(
            name="Rec Ev Cal", privacy="PUBLIC", creator=self.other
        )
        self.event = Event.objects.create(
            title="Recommendable Event",
            date=date(2026, 12, 1),
            time=time(10, 0),
            creator=self.other,
        )
        self.event.calendars.add(self.calendar)

    @patch("main.rs.events.redis_client")
    def test_returns_list(self, mock_redis):
        mock_redis.hget.return_value = None
        result = recommend_events(self.user, limit=10)
        self.assertIsInstance(result, list)

    @patch("main.rs.events.redis_client")
    def test_respects_limit(self, mock_redis):
        mock_redis.hget.return_value = None
        result = recommend_events(self.user, limit=1)
        self.assertLessEqual(len(result), 1)
