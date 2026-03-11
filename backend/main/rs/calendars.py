from main.models import Calendar, User
from main.rs.utils import tokenize, compute_item_similarities
from django.db.models import Count
import shelve

SHELF_NAME = 'dataRS_calendars.dat'
LOCATION_RADIUS_KM = 50

def load_similarities():
    shelf = shelve.open(SHELF_NAME)

    print("Extrayendo características de los calendarios...")
    calendars_features = get_all_calendars_features()

    print("Calculando matriz de similitud...")
    shelf['similarities'] = compute_item_similarities(calendars_features)

    shelf.close()
    print("Similitudes calculadas y guardadas")


def get_similar_calendars(calendar_id, top_n=5):
    shelf = shelve.open(SHELF_NAME)
    if 'similarities' not in shelf or calendar_id not in shelf['similarities']:
        shelf.close()
        return []
    sim_ids_scores = shelf['similarities'][calendar_id]
    shelf.close()
    return sim_ids_scores[:top_n]


def get_all_calendars_features():
    features = {}
    calendars = Calendar.objects.prefetch_related(
        'labels',
        'subscribers',
        'events',
    ).exclude(privacy='PRIVATE')

    for calendar in calendars:
        features[calendar.id] = build_feature_set(calendar)
    return features


def get_location_clusters(calendar):
    """
    Agrupa los eventos del calendario por zona geográfica.
    Devuelve una lista de strings tipo 'loc_<lat_round>_<lon_round>'
    redondeando a 1 decimal (~10km de precisión).
    """
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

    n = calendar.subscribers.count()
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
    """
    Recomienda calendarios para un usuario basándose en:
    1. Calendarios similares a los que ya sigue (content-based)
    2. Calendarios que siguen sus amigos (social)
    3. Calendarios populares como fallback
    
    Excluye calendarios privados y los que el usuario ya sigue.
    """
    already_following = set(user.subscribed_calendars.values_list('id', flat=True))
    recommended_ids = {}

    for cal_id in already_following:
        similares = get_similar_calendars(cal_id, top_n=5)
        for sim_id, score in similares:
            if sim_id not in already_following:
                recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score


    friends_ids = user.following.values_list('id', flat=True)
    friends_calendars = (
        Calendar.objects
        .filter(subscribers__id__in=friends_ids)
        .exclude(id__in=already_following)
        .exclude(privacy='PRIVATE')
        .distinct()
    )
    for cal in friends_calendars:
        friends_following = cal.subscribers.filter(id__in=friends_ids).count()
        recommended_ids[cal.id] = recommended_ids.get(cal.id, 0) + (0.5 * friends_following)

    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)
    final_calendars = list(
        Calendar.objects.filter(id__in=sorted_ids)
        .prefetch_related('labels', 'subscribers')
    )
    id_to_cal = {cal.id: cal for cal in final_calendars}
    final_calendars = [id_to_cal[i] for i in sorted_ids if i in id_to_cal]

    if len(final_calendars) < limit:
        ids_to_exclude = already_following | set(recommended_ids.keys())
        needed = limit - len(final_calendars)
        popular = (
            Calendar.objects
            .exclude(id__in=ids_to_exclude)
            .exclude(privacy='PRIVATE')
            .annotate(num_subs=Count('subscribers'))
            .order_by('-num_subs')
        )[:needed]
        final_calendars.extend(list(popular))

    return final_calendars[:limit]