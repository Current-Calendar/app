FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gcc \
    gdal-bin \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

RUN cp .env.dev.example .env && \
    python manage.py collectstatic --noinput && \
    rm .env

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate && gunicorn current.asgi:application -k uvicorn.workers.UvicornWorker --timeout 300 --workers 1 --bind 0.0.0.0:8000"]
