import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "current.settings")

app = Celery("current")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()