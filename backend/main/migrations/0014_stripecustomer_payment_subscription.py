from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0013_chatmessage'),
    ]

    operations = [
        migrations.CreateModel(
            name='StripeCustomer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_customer_id', models.CharField(max_length=255, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='stripe_customer',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_payment_intent_id', models.CharField(max_length=255, unique=True)),
                ('amount', models.PositiveIntegerField()),
                ('currency', models.CharField(default='eur', max_length=3)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('succeeded', 'Succeeded'),
                        ('failed', 'Failed'),
                        ('refunded', 'Refunded'),
                        ('canceled', 'Canceled'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('description', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='payments',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_subscription_id', models.CharField(max_length=255, unique=True)),
                ('stripe_price_id', models.CharField(max_length=255)),
                ('status', models.CharField(
                    choices=[
                        ('active', 'Active'),
                        ('canceled', 'Canceled'),
                        ('past_due', 'Past Due'),
                        ('trialing', 'Trialing'),
                        ('incomplete', 'Incomplete'),
                        ('incomplete_expired', 'Incomplete Expired'),
                        ('unpaid', 'Unpaid'),
                    ],
                    max_length=30,
                )),
                ('current_period_end', models.DateTimeField(blank=True, null=True)),
                ('cancel_at_period_end', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='subscription',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
