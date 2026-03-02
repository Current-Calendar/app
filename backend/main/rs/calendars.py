from main.models import Calendario, Usuario
from collections import Counter
import shelve
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import re
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import AsGeoJSON
from django.db.models import Count

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
    calendars = Calendario.objects.prefetch_related(
        'etiquetas',
        'suscriptores',
        'eventos',
    ).exclude(estado='PRIVADO')

    for calendar in calendars:
        features[calendar.id] = build_feature_set(calendar)
    return features


def tokenize(text, n):
    tokens = re.findall(r'\b[a-z]{4,}\b', text.lower())
    words = [t for t in tokens if t not in ENGLISH_STOP_WORDS]
    return most_common(words, n)


def most_common(words, n):
    counter = Counter(words)
    return [word for word, _ in counter.most_common(n)]


def get_location_clusters(calendar):
    """
    Agrupa los eventos del calendario por zona geográfica.
    Devuelve una lista de strings tipo 'loc_<lat_round>_<lon_round>'
    redondeando a 1 decimal (~10km de precisión).
    """
    clusters = set()
    for evento in calendar.eventos.all():
        if evento.ubicacion:
            lat = round(evento.ubicacion.y, 1)
            lon = round(evento.ubicacion.x, 1)
            clusters.add(f"Location_{lat}_{lon}")
    return clusters


def build_feature_set(calendar):
    s = set()

    for etiqueta in calendar.etiquetas.all():
        s.add(f"Label_{etiqueta.id}")

    if calendar.nombre:
        for token in tokenize(calendar.nombre, 5):
            s.add(f"Name_{token}")

    if calendar.descripcion:
        for token in tokenize(calendar.descripcion, 15):
            s.add(f"Desc_{token}")

    s.add(f"Creator_{calendar.creador_id}")

    n = calendar.suscriptores.count()
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


def compute_item_similarities(calendars_features):
    ret = {}
    ids = list(calendars_features.keys())

    for i in ids:
        scores = {}
        for j in ids:
            if i == j:
                continue
            sim = dice_coefficient(calendars_features[i], calendars_features[j])
            if sim > 0:
                scores[j] = sim
        ret[i] = Counter(scores).most_common(20)

    return ret


def dice_coefficient(set1, set2):
    if not set1 or not set2:
        return 0.0
    return 2 * len(set1.intersection(set2)) / (len(set1) + len(set2))


def recommend_calendars(user: Usuario, limit=30):
    """
    Recomienda calendarios para un usuario basándose en:
    1. Calendarios similares a los que ya sigue (content-based)
    2. Calendarios que siguen sus amigos (social)
    3. Calendarios populares como fallback
    
    Excluye calendarios privados y los que el usuario ya sigue.
    """
    already_following = set(user.calendarios_seguidos.values_list('id', flat=True))
    recommended_ids = {}

    for cal_id in already_following:
        similares = get_similar_calendars(cal_id, top_n=5)
        for sim_id, score in similares:
            if sim_id not in already_following:
                recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score


    friends_ids = user.seguidos.values_list('id', flat=True)
    friends_calendars = (
        Calendario.objects
        .filter(suscriptores__id__in=friends_ids)
        .exclude(id__in=already_following)
        .exclude(estado='PRIVADO')
        .distinct()
    )
    for cal in friends_calendars:
        friends_following = cal.suscriptores.filter(id__in=friends_ids).count()
        recommended_ids[cal.id] = recommended_ids.get(cal.id, 0) + (0.5 * friends_following)

    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)
    final_calendars = list(
        Calendario.objects.filter(id__in=sorted_ids)
        .prefetch_related('etiquetas', 'suscriptores')
    )
    id_to_cal = {cal.id: cal for cal in final_calendars}
    final_calendars = [id_to_cal[i] for i in sorted_ids if i in id_to_cal]

    if len(final_calendars) < limit:
        ids_to_exclude = already_following | set(recommended_ids.keys())
        needed = limit - len(final_calendars)
        popular = (
            Calendario.objects
            .exclude(id__in=ids_to_exclude)
            .exclude(estado='PRIVADO')
            .annotate(num_subs=Count('suscriptores'))
            .order_by('-num_subs')
        )[:needed]
        final_calendars.extend(list(popular))

    return final_calendars[:limit]