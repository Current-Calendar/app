import shelve
from django.db.models import Count
from django.utils import timezone
from main.models import User, Calendar, Event
from main.rs.utils import tokenize, compute_item_similarities

SHELF_NAME = 'dataRS_events.dat'

def load_events_similarities():
    shelf = shelve.open(SHELF_NAME)

    print("Extrayendo características de los eventos...")
    events_features = get_all_events_features()

    print("Calculando matriz de similitud...")
    shelf['similarities'] = compute_item_similarities(events_features)

    shelf.close()
    print("Similitudes calculadas y guardadas")


def get_similar_events(event_id, top_n=5):
    shelf = shelve.open(SHELF_NAME)
    if 'similarities' not in shelf or event_id not in shelf['similarities']:
        shelf.close()
        return []
    sim_ids_scores = shelf['similarities'][event_id]
    shelf.close()
    return sim_ids_scores[:top_n]


def get_all_events_features():
    features = {}
    events = Event.objects.prefetch_related(
        'calendars',
        'calendars__labels',
        'calendars__subscribers',
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
        for etiqueta in cal.labels.all():
            s.add(f"Label_{etiqueta.id}")

    return s


def recommend_events(user: User, limit=30):
    """
    Recomienda eventos para un usuario basándose en:
    1. Eventos similares a los de los calendarios que sigue (content-based)
    2. Eventos de calendarios que siguen sus amigos (social)
    3. Eventos próximos populares como fallback
    """

    followed_calendars = user.subscribed_calendars.prefetch_related('events')
    already_seen_event_ids = set(
        Event.objects
            .filter(calendars__in=followed_calendars)
            .values_list('id', flat=True)
    )

    recommended_ids = {}

    for event_id in already_seen_event_ids:
        similares = get_similar_events(event_id, top_n=5)
        for sim_id, score in similares:
            if sim_id not in already_seen_event_ids:
                recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score


    friends_ids = user.following.values_list('id', flat=True)
    friends_calendars = (
        Calendar.objects
        .filter(subscribers__id__in=friends_ids)
        .exclude(privacy='PRIVATE')
        .distinct()
    )
    friends_events = (
        Event.objects
        .filter(calendars__in=friends_calendars)
        .exclude(id__in=already_seen_event_ids)
        .distinct()
    )
    for event in friends_events:
        recommended_ids[event.id] = recommended_ids.get(event.id, 0) + 0.5

    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)
    final_events = list(
        Event.objects
        .filter(id__in=sorted_ids)
        .filter(date__gte=timezone.now().date())
        .prefetch_related('calendars__labels')
        .select_related('creator')
    )
    id_to_event = {e.id: e for e in final_events}
    final_events = [id_to_event[i] for i in sorted_ids if i in id_to_event]

    if len(final_events) < limit:
        ids_to_exclude = already_seen_event_ids | set(recommended_ids.keys())
        needed = limit - len(final_events)
        friends_ids = user.following.values_list('id', flat=True)
        popular = (
            Event.objects
            .exclude(id__in=ids_to_exclude)
            .filter(date__gte=timezone.now().date())
            .filter(
                Q(calendars__privacy='PUBLIC') |
                Q(calendars__privacy='FRIENDS', calendars__creator__in=friends_ids) |
                Q(calendars__creator=user)
            )
            .distinct()
            .annotate(num_calendars=Count('calendars'))
            .order_by('date', '-num_calendars')
        )[:needed]
        final_events.extend(list(popular))

    return final_events[:limit]