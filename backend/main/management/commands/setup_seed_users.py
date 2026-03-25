import django
from django.core.management.base import BaseCommand
from django.db import transaction

from main.models import Calendar, User


class Command(BaseCommand):
    help = (
        "Crea usuarios semilla (idempotente) para entornos de staging/producción. "
        "Por defecto crea solo 'current'."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--current-username",
            default="current",
            help="Username del usuario dueño de calendarios importados.",
        )
        parser.add_argument(
            "--current-email",
            default="current@currentcalendar.es",
            help="Email del usuario current.",
        )
        parser.add_argument(
            "--current-password",
            default=None,
            help=(
                "Password para current. Si no se indica, se deja con password no usable "
                "(seguro para producción)."
            ),
        )
        parser.add_argument(
            "--include-demo-users",
            action="store_true",
            help="Si se indica, crea también 6 usuarios demo adicionales.",
        )
        parser.add_argument(
            "--demo-password",
            default=None,
            help=(
                "Password común para usuarios demo. Si no se indica, quedan con "
                "password no usable."
            ),
        )
        parser.add_argument(
            "--link-calendars",
            action="store_true",
            help=(
                "Relaciona el usuario current con sus calendarios creados "
                "(subscribed_calendars)."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        current_username = options["current_username"]
        current_email = options["current_email"]
        current_password = options["current_password"]
        include_demo_users = options["include_demo_users"]
        demo_password = options["demo_password"]
        link_calendars = options["link_calendars"]

        users_data = [
            {
                "username": current_username,
                "email": current_email,
                "bio": "Usuario base de la app para calendarios iniciales.",
                "pronouns": "They/Them",
                "password": current_password,
            }
        ]

        if include_demo_users:
            users_data.extend(
                [
                    {
                        "username": "ana_sevilla",
                        "email": "ana.sevilla@example.com",
                        "bio": "Agenda cultural y planes de finde.",
                        "pronouns": "She/Her",
                        "password": demo_password,
                    },
                    {
                        "username": "carlos_triana",
                        "email": "carlos.triana@example.com",
                        "bio": "Conciertos y eventos en Triana.",
                        "pronouns": "He/Him",
                        "password": demo_password,
                    },
                    {
                        "username": "lucia_femas",
                        "email": "lucia.femas@example.com",
                        "bio": "Música antigua y festivales.",
                        "pronouns": "She/Her",
                        "password": demo_password,
                    },
                    {
                        "username": "javi_deporte",
                        "email": "javi.deporte@example.com",
                        "bio": "Fútbol y eventos deportivos.",
                        "pronouns": "He/Him",
                        "password": demo_password,
                    },
                    {
                        "username": "maria_icas",
                        "email": "maria.icas@example.com",
                        "bio": "Eventos culturales de ICAS.",
                        "pronouns": "She/Her",
                        "password": demo_password,
                    },
                    {
                        "username": "pedro_norte",
                        "email": "pedro.norte@example.com",
                        "bio": "Planes por Sevilla norte.",
                        "pronouns": "He/Him",
                        "password": demo_password,
                    },
                ]
            )

        created_count = 0
        updated_count = 0

        for data in users_data:
            username = data["username"]
            email = data["email"]
            password = data.get("password")

            user = User.objects.filter(username=username).first()
            created = user is None

            if created:
                # Se crea sin password y luego se fija (o se marca unusable) explícitamente.
                user = User.objects.create_user(username=username, email=email)
                created_count += 1
            else:
                updated_count += 1

            user.email = email
            user.bio = data.get("bio", "") or ""
            user.pronouns = data.get("pronouns", "") or ""

            if django.contrib.auth.password_validation.validate_password(password, user=user):
                user.set_password(password)
                password_mode = "con password"
            else:
                user.set_unusable_password()
                password_mode = "sin password usable"

            user.save()

            action = "creado" if created else "actualizado"
            self.stdout.write(
                self.style.SUCCESS(f"Usuario {action}: {username} ({password_mode})")
            )

        if link_calendars:
            current_user = User.objects.get(username=current_username)
            calendars = Calendar.objects.filter(creator=current_user)
            current_user.subscribed_calendars.set(calendars)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Usuario '{current_username}' relacionado con {calendars.count()} calendarios."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "setup_seed_users completado -> "
                f"usuarios creados: {created_count}, actualizados: {updated_count}, "
                f"include_demo_users: {include_demo_users}"
            )
        )

