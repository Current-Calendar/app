from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0028_seed_default_categories_and_tags"),
    ]

    operations = [
        migrations.CreateModel(
            name="LegalAcceptance",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "document",
                    models.CharField(
                        choices=[
                            ("PRIVACY", "Privacy Policy"),
                            ("COOKIES", "Cookies Policy"),
                            ("TERMS", "Terms and Conditions"),
                        ],
                        max_length=20,
                    ),
                ),
                ("version", models.CharField(max_length=32)),
                ("accepted_at", models.DateTimeField(auto_now_add=True)),
                (
                    "ip_address",
                    models.GenericIPAddressField(blank=True, null=True),
                ),
                ("user_agent", models.CharField(blank=True, max_length=512)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="legal_acceptances",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-accepted_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="legalacceptance",
            constraint=models.UniqueConstraint(
                fields=("user", "document", "version"),
                name="unique_legal_acceptance_per_version",
            ),
        ),
    ]
