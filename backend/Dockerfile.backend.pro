FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gdal-bin \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

COPY .env.dev.example .env
RUN python manage.py collectstatic --noinput
RUN rm .env

CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py makemigrations && python manage.py migrate && daphne -b 0.0.0.0 -p 8000 current.asgi:application"]
