import re
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from collections import Counter

def tokenize(text, n):
    tokens = re.findall(r'\b[a-z]{4,}\b', text.lower())
    words = [t for t in tokens if t not in ENGLISH_STOP_WORDS]
    return most_common(words, n)


def most_common(words, n):
    counter = Counter(words)
    return [word for word, _ in counter.most_common(n)]


def dice_coefficient(set1, set2):
    if not set1 or not set2:
        return 0.0
    return 2 * len(set1.intersection(set2)) / (len(set1) + len(set2))


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