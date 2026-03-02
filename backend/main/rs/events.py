from main.models import Evento, Usuario, Calendario
from collections import Counter
import shelve
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import re
from django.db.models import Count
from django.utils import timezone

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
    events = Evento.objects.prefetch_related(
        'calendarios',
        'calendarios__etiquetas',
        'calendarios__suscriptores',
    ).select_related('creador')

    for event in events:
        features[event.id] = build_feature_set(event)
    return features


def tokenize(text, n):
    tokens = re.findall(r'\b[a-z]{4,}\b', text.lower())
    words = [t for t in tokens if t not in ENGLISH_STOP_WORDS]
    return most_common(words, n)


def most_common(words, n):
    counter = Counter(words)
    return [word for word, _ in counter.most_common(n)]


def build_feature_set(event):
    s = set()

    if event.titulo:
        for token in tokenize(event.titulo, 5):
            s.add(f"Title_{token}")

    if event.descripcion:
        for token in tokenize(event.descripcion, 15):
            s.add(f"Desc_{token}")

    s.add(f"Creator_{event.creador_id}")

    if event.ubicacion:
        lat = round(event.ubicacion.y, 1)
        lon = round(event.ubicacion.x, 1)
        s.add(f"Location_{lat}_{lon}")

    if event.fecha:
        s.add(f"Month_{event.fecha.month}")

    for cal in event.calendarios.all():
        s.add(f"Calendar_{cal.id}")
        for etiqueta in cal.etiquetas.all():
            s.add(f"Label_{etiqueta.id}")

    return s


def compute_item_similarities(events_features):
    ret = {}
    ids = list(events_features.keys())

    for i in ids:
        scores = {}
        for j in ids:
            if i == j:
                continue
            sim = dice_coefficient(events_features[i], events_features[j])
            if sim > 0:
                scores[j] = sim
        ret[i] = Counter(scores).most_common(20)

    return ret


def dice_coefficient(set1, set2):
    if not set1 or not set2:
        return 0.0
    return 2 * len(set1.intersection(set2)) / (len(set1) + len(set2))


def recommend_events(user: Usuario, limit=30):
    """
    Recomienda eventos para un usuario basándose en:
    1. Eventos similares a los de los calendarios que sigue (content-based)
    2. Eventos de calendarios que siguen sus amigos (social)
    3. Eventos próximos populares como fallback
    """

    followed_calendars = user.calendarios_seguidos.prefetch_related('eventos')
    already_seen_event_ids = set(
        Evento.objects
            .filter(calendarios__in=followed_calendars)
            .values_list('id', flat=True)
    )

    recommended_ids = {}

    for event_id in already_seen_event_ids:
        similares = get_similar_events(event_id, top_n=5)
        for sim_id, score in similares:
            if sim_id not in already_seen_event_ids:
                recommended_ids[sim_id] = recommended_ids.get(sim_id, 0) + score


    friends_ids = user.seguidos.values_list('id', flat=True)
    friends_calendars = (
        Calendario.objects
        .filter(suscriptores__id__in=friends_ids)
        .exclude(estado='PRIVADO')
        .distinct()
    )
    friends_events = (
        Evento.objects
        .filter(calendarios__in=friends_calendars)
        .exclude(id__in=already_seen_event_ids)
        .distinct()
    )
    for event in friends_events:
        recommended_ids[event.id] = recommended_ids.get(event.id, 0) + 0.5

    sorted_ids = sorted(recommended_ids, key=recommended_ids.get, reverse=True)
    final_events = list(
        Evento.objects
        .filter(id__in=sorted_ids)
        .filter(fecha__gte=timezone.now().date())
        .prefetch_related('calendarios__etiquetas')
        .select_related('creador')
    )
    id_to_event = {e.id: e for e in final_events}
    final_events = [id_to_event[i] for i in sorted_ids if i in id_to_event]

    if len(final_events) < limit:
        ids_to_exclude = already_seen_event_ids | set(recommended_ids.keys())
        needed = limit - len(final_events)
        popular = (
            Evento.objects
            .exclude(id__in=ids_to_exclude)
            .filter(fecha__gte=timezone.now().date())
            .annotate(num_calendarios=Count('calendarios'))
            .order_by('fecha', '-num_calendarios')
        )[:needed]
        final_events.extend(list(popular))

    return final_events[:limit]