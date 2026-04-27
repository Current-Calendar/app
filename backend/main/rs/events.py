import os
import redis
import json
from django.db.models import Count, Q
from django.utils import timezone
from main.models import User, Event
from main.rs.utils import tokenize, compute_item_similarities

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', None),
    db=3,
    socket_timeout=2
)


def load_events_similarities():
    print("Extrayendo características de los eventos...")
    events_features = get_all_events_features()

    print("Calculando matriz de similitud de eventos...")
    similarities = compute_item_similarities(events_features)

    print("Guardando matriz de eventos en Redis...")
    try:
        pipe = redis_client.pipeline()
        pipe.delete('rs_events_similarities')  # ¡Clave única para eventos!
        for event_id, sim_list in similarities.items():
            pipe.hset('rs_events_similarities', str(event_id), json.dumps(sim_list))

        pipe.execute()
        print("Similitudes de EVENTOS calculadas y guardadas con éxito en Redis.")
    except Exception as e:
        print(f"Error guardando similitudes de eventos en Redis: {e}")


def get_similar_events(event_id, top_n=5):
    """Fallback por si se llama desde otra parte del código"""
    try:
        raw_data = redis_client.hget('rs_events_similarities', str(event_id))
        if raw_data:
            sim_ids_scores = json.loads(raw_data)
            return sim_ids_scores[:top_n]
    except Exception:
        pass
    return []


def get_all_events_features():
    features = {}
    events = Event.objects.prefetch_related(
        'calendars',
        'calendars__categories',
        'calendars__subscribers',
        'tags',
    ).select_related('creator')

    for event in events:
        features[event.id] = build_feature_set(event)
    return features


def build_feature_set(event):
    s = set()

    if event.title:
        for token in tokenize(event.title, 5):
            s.add(f"Title_{token}")

    if event.description:
        for token in tokenize(event.description, 15):
            s.add(f"Desc_{token}")

    s.add(f"Creator_{event.creator_id}")

    if event.location:
        lat = round(event.location.y, 1)
        lon = round(event.location.x, 1)
        s.add(f"Location_{lat}_{lon}")

    if event.date:
        s.add(f"Month_{event.date.month}")

    for cal in event.calendars.all():
        s.add(f"Calendar_{cal.id}")
        for category in cal.categories.all():
            s.add(f"Category_{category.id}")

    for tag in event.tags.all():
        s.add(f"Tag_{tag.id}")
        s.add(f"TagCategory_{tag.category_id}")

    return s


def recommend_events(user: User, limit=30):
    """
    Recomienda eventos para un usuario basandose en:
    1. Eventos similares a los de los calendarios que sigue (content-based)
    2. Eventos publicos proximos como fallback
    """

    followed_calendars = user.subscribed_calendars.prefetch_related('events')
    already_seen_event_ids = list(
        Event.objects
        .filter(calendars__in=followed_calendars)
        .values_list('id', flat=True)
    )

    recommended_ids = {}

    if already_seen_event_ids:
        try:
            keys = [str(eid) for eid in already_seen_event_ids]
            raw_data = redis_client.hmget('rs_events_similarities', keys)

            for item in raw_data:
                if item:
                    similares = json.loads(item)
                    for sim_id, score in similares[:5]:
                        if sim_id not in already_seen_event_ids:
                            recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score
        except Exception as e:
            print(f"Error leyendo de Redis RS Eventos: {e}")


    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)

    final_events = list(
        Event.objects
        .filter(id__in=sorted_ids)
        .filter(date__gte=timezone.now().date())
        .filter(calendars__privacy='PUBLIC')
        .exclude(creator=user)
        .distinct()
        .prefetch_related('calendars__categories')
        .select_related('creator')
    )

    id_to_event = {e.id: e for e in final_events}
    final_events = [id_to_event[i] for i in sorted_ids if i in id_to_event]

    if len(final_events) < limit:
        ids_to_exclude = set(already_seen_event_ids) | set(recommended_ids.keys())
        needed = limit - len(final_events)
        popular = (
            Event.objects
            .exclude(id__in=ids_to_exclude)
            .filter(date__gte=timezone.now().date())
            .filter(calendars__privacy='PUBLIC')
            .exclude(creator=user)
            .distinct()
            .annotate(num_calendars=Count('calendars'))
            .order_by('date', '-num_calendars')
        )[:needed]
        final_events.extend(list(popular))

    return final_events[:limit]