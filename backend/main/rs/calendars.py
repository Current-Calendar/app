import os
import redis
import json
from django.db.models import Count, Q
from main.models import Calendar, User
from main.rs.utils import tokenize, compute_item_similarities

LOCATION_RADIUS_KM = 50

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', None),
    db=3
)


def load_similarities():
    print("Extrayendo características de los calendarios...")
    calendars_features = get_all_calendars_features()

    print("Calculando matriz de similitud...")
    similarities = compute_item_similarities(calendars_features)

    print("Guardando matriz en Redis...")
    try:
        pipe = redis_client.pipeline()
        pipe.delete('rs_similarities')
        for cal_id, sim_list in similarities.items():
            pipe.hset('rs_similarities', str(cal_id), json.dumps(sim_list))

        pipe.execute()
        print("Similitudes calculadas y guardadas con éxito en Redis.")
    except Exception as e:
        print(f"Error guardando similitudes en Redis: {e}")


def get_similar_calendars(calendar_id, top_n=5):
    """Fallback por si se llama desde otra parte del código"""
    try:
        raw_data = redis_client.hget('rs_similarities', str(calendar_id))
        if raw_data:
            sim_ids_scores = json.loads(raw_data)
            return sim_ids_scores[:top_n]
    except Exception:
        pass
    return []


def get_all_calendars_features():
    features = {}
    calendars = Calendar.objects.prefetch_related(
        'labels',
        'subscribers',
        'events',
    ).filter(privacy='PUBLIC')

    for calendar in calendars:
        features[calendar.id] = build_feature_set(calendar)
    return features


def get_location_clusters(calendar):
    clusters = set()
    for event in calendar.events.all():
        if event.location:
            lat = round(event.location.y, 1)
            lon = round(event.location.x, 1)
            clusters.add(f"Location_{lat}_{lon}")
    return clusters


def build_feature_set(calendar):
    s = set()

    for label in calendar.labels.all():
        s.add(f"Label_{label.id}")

    if calendar.name:
        for token in tokenize(calendar.name, 5):
            s.add(f"Name_{token}")

    if calendar.description:
        for token in tokenize(calendar.description, 15):
            s.add(f"Desc_{token}")

    s.add(f"Creator_{calendar.creator_id}")

    n = len(calendar.subscribers.all())

    if n == 0:
        s.add("Popularity_none")
    elif n < 10:
        s.add("Popularity_low")
    elif n < 100:
        s.add("Popularity_medium")
    else:
        s.add("Popularity_high")

    location_clusters = get_location_clusters(calendar)
    s.update(location_clusters)

    return s


def recommend_calendars(user: User, limit=30):
    already_following = list(user.subscribed_calendars.values_list('id', flat=True))
    recommended_ids = {}

    if already_following:
        try:
            keys = [str(cid) for cid in already_following]
            raw_data = redis_client.hmget('rs_similarities', keys)

            for item in raw_data:
                if item:
                    similares = json.loads(item)
                    for sim_id, score in similares[:5]:
                        if sim_id not in already_following:
                            recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score
        except Exception as e:
            print(f"Error leyendo de Redis RS: {e}")

    friends_ids = list(user.following.values_list('id', flat=True))

    if friends_ids:
        friends_calendars = (
            Calendar.objects
            .filter(subscribers__id__in=friends_ids)
            .exclude(id__in=already_following)
            .filter(privacy='PUBLIC')
            .annotate(friends_following_count=Count('subscribers', filter=Q(subscribers__id__in=friends_ids)))
            .distinct()
        )
        for cal in friends_calendars:
            recommended_ids[cal.id] = recommended_ids.get(cal.id, 0) + (0.5 * cal.friends_following_count)

    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)

    final_calendars = list(
        Calendar.objects.filter(id__in=sorted_ids)
        .prefetch_related('labels', 'subscribers')
    )

    id_to_cal = {cal.id: cal for cal in final_calendars}
    final_calendars = [id_to_cal[i] for i in sorted_ids if i in id_to_cal]
    final_calendars = [cal for cal in final_calendars if cal.creator_id != user.id]

    if len(final_calendars) < limit:
        ids_to_exclude = set(already_following) | set(recommended_ids.keys())
        needed = limit - len(final_calendars)
        popular = (
            Calendar.objects
            .exclude(id__in=ids_to_exclude)
            .exclude(creator_id=user.id)
            .filter(privacy='PUBLIC')
            .annotate(num_subs=Count('subscribers'))
            .order_by('-num_subs')
        )[:needed]
        final_calendars.extend(list(popular))

    return final_calendars[:limit]