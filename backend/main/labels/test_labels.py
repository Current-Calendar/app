"""
Tests unitarios para el sistema de Labels - Versión Simplificada y Correcta
Cubre: Modelos, Serializers, Relaciones M2M, Filtrado, Recomendaciones
"""

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT, HTTP_400_BAD_REQUEST, HTTP_403_FORBIDDEN, HTTP_404_NOT_FOUND
from main.models import Category, EventTag, Calendar, Event, User


class CategoryModelTests(TestCase):
    """Tests para el modelo Category"""
    
    def setUp(self):
        self.category = Category.objects.create(name="Test Category")
    
    def test_create_category(self):
        """Test crear una categoría"""
        self.assertIsNotNone(self.category.id)
        self.assertEqual(self.category.name, "Test Category")
    
    def test_category_string_representation(self):
        """Test representación en string de categoría"""
        self.assertEqual(str(self.category), "Test Category")
    
    def test_category_unique_name(self):
        """Test que el nombre de categoría es único"""
        with self.assertRaises(Exception):
            Category.objects.create(name="Test Category")
    
    def test_category_creation_multiple(self):
        """Test crear múltiples categorías diferentes"""
        cat2 = Category.objects.create(name="Cat B")
        cat3 = Category.objects.create(name="Cat C")
        
        self.assertEqual(Category.objects.count(), 3)
        self.assertIn(self.category, Category.objects.all())
    
    def test_category_verbose_name_plural(self):
        """Test el nombre plural de categoría en Meta"""
        self.assertEqual(self.category._meta.verbose_name_plural, 'Categories')


class EventTagModelTests(TestCase):
    """Tests para el modelo EventTag"""
    
    def setUp(self):
        self.category = Category.objects.create(name="Trabajo")
        self.tag = EventTag.objects.create(name="Reunión", category=self.category)
    
    def test_create_event_tag(self):
        """Test crear un tag de evento"""
        self.assertIsNotNone(self.tag.id)
        self.assertEqual(self.tag.name, "Reunión")
        self.assertEqual(self.tag.category, self.category)
    
    def test_event_tag_string_representation(self):
        """Test representación en string del tag"""
        expected_str = "Reunión (Trabajo)"
        self.assertEqual(str(self.tag), expected_str)
    
    def test_event_tag_unique_per_category(self):
        """Test que el nombre de tag es único por categoría"""
        with self.assertRaises(Exception):
            EventTag.objects.create(name="Reunión", category=self.category)
    
    def test_event_tag_same_name_different_category(self):
        """Test que se puede usar el mismo nombre en categorías diferentes"""
        cat2 = Category.objects.create(name="Personal")
        tag2 = EventTag.objects.create(name="Reunión", category=cat2)
        
        self.assertNotEqual(self.tag.id, tag2.id)
        self.assertEqual(tag2.name, "Reunión")
    
    def test_event_tag_cascade_delete(self):
        """Test que los tags se eliminan cuando se elimina la categoría"""
        category_id = self.category.id
        tag_id = self.tag.id
        
        self.category.delete()
        
        # Verificar que la categoría se eliminó
        self.assertFalse(Category.objects.filter(id=category_id).exists())
        # Verificar que el tag también se eliminó (cascade)
        self.assertFalse(EventTag.objects.filter(id=tag_id).exists())


class CalendarCategoriesRelationTests(TestCase):
    """Tests para la relación M2M Calendar <-> Category"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass123", email="testuser@test.com")
        self.calendar = Calendar.objects.create(name="Mi Calendario", creator=self.user)
        self.cat1 = Category.objects.create(name="Trabajo")
        self.cat2 = Category.objects.create(name="Personal")
    
    def test_add_category_to_calendar(self):
        """Test agregar categoría a calendario"""
        self.calendar.categories.add(self.cat1)
        
        self.assertEqual(self.calendar.categories.count(), 1)
        self.assertIn(self.cat1, self.calendar.categories.all())
    
    def test_add_multiple_categories(self):
        """Test agregar múltiples categorías"""
        self.calendar.categories.add(self.cat1, self.cat2)
        
        self.assertEqual(self.calendar.categories.count(), 2)
    
    def test_remove_category(self):
        """Test remover categoría de calendario"""
        self.calendar.categories.add(self.cat1, self.cat2)
        self.calendar.categories.remove(self.cat1)
        
        self.assertEqual(self.calendar.categories.count(), 1)
        self.assertNotIn(self.cat1, self.calendar.categories.all())
    
    def test_clear_categories(self):
        """Test limpiar todas las categorías"""
        self.calendar.categories.add(self.cat1, self.cat2)
        self.calendar.categories.clear()
        
        self.assertEqual(self.calendar.categories.count(), 0)


class EventTagsRelationTests(TestCase):
    """Tests para la relación M2M Event <-> EventTag"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="eventuser", password="eventpass123", email="eventuser@test.com")
        self.calendar = Calendar.objects.create(name="Mi Calendario", creator=self.user)
        self.event = Event.objects.create(
            title="Mi Evento",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        self.event.calendars.add(self.calendar)
        
        self.category = Category.objects.create(name="Trabajo")
        self.tag1 = EventTag.objects.create(name="Reunión", category=self.category)
        self.tag2 = EventTag.objects.create(name="Urgente", category=self.category)
    
    def test_add_tag_to_event(self):
        """Test agregar tag a evento"""
        self.event.tags.add(self.tag1)
        
        self.assertEqual(self.event.tags.count(), 1)
        self.assertIn(self.tag1, self.event.tags.all())
    
    def test_add_multiple_tags(self):
        """Test agregar múltiples tags"""
        self.event.tags.add(self.tag1, self.tag2)
        
        self.assertEqual(self.event.tags.count(), 2)
    
    def test_remove_tag(self):
        """Test remover tag de evento"""
        self.event.tags.add(self.tag1, self.tag2)
        self.event.tags.remove(self.tag1)
        
        self.assertEqual(self.event.tags.count(), 1)
        self.assertIn(self.tag2, self.event.tags.all())
    
    def test_clear_tags(self):
        """Test limpiar todos los tags de evento"""
        self.event.tags.add(self.tag1, self.tag2)
        self.event.tags.clear()
        
        self.assertEqual(self.event.tags.count(), 0)


class FilterCategoriesTests(APITestCase):
    """Tests para el filtrado de calendarios por categorías"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="filteruser", password="filterpass123", email="filteruser@test.com")
        self.client.force_authenticate(user=self.user)
        
        # Crear categorías
        self.cat1 = Category.objects.create(name="Trabajo")
        self.cat2 = Category.objects.create(name="Personal")
        self.cat3 = Category.objects.create(name="Viajes")
        
        # Crear calendarios con categorías
        self.cal1 = Calendar.objects.create(name="Cal1", creator=self.user, privacy="PUBLIC")
        self.cal1.categories.add(self.cat1)
        
        self.cal2 = Calendar.objects.create(name="Cal2", creator=self.user, privacy="PUBLIC")
        self.cal2.categories.add(self.cat2)
        
        self.cal3 = Calendar.objects.create(name="Cal3", creator=self.user, privacy="PUBLIC")
        self.cal3.categories.add(self.cat3)
    
    def test_get_calendars_with_categories(self):
        """Test obtener calendario con categorías"""
        calendar = Calendar.objects.get(name="Cal1")
        self.assertIn(self.cat1, calendar.categories.all())
    
    def test_calendar_has_correct_categories(self):
        """Test que cada calendario tiene sus categorías correctas"""
        cal1_cats = set(self.cal1.categories.values_list('name', flat=True))
        cal2_cats = set(self.cal2.categories.values_list('name', flat=True))
        
        self.assertEqual(cal1_cats, {"Trabajo"})
        self.assertEqual(cal2_cats, {"Personal"})
    
    def test_query_calendars_by_category(self):
        """Test que podemos obtener calendarios filtrando por categoría"""
        # Obtener calendarios con la categoría Trabajo
        calendars_with_trabajo = Calendar.objects.filter(categories=self.cat1)
        
        self.assertEqual(calendars_with_trabajo.count(), 1)
        self.assertIn(self.cal1, calendars_with_trabajo)
    
    def test_query_calendars_by_multiple_categories(self):
        """Test que podemos filtrar calendarios por múltiples categorías"""
        # Obtener calendarios que tengan cat1 O cat2
        calendars_with_cats = Calendar.objects.filter(categories__in=[self.cat1, self.cat2]).distinct()
        
        self.assertEqual(calendars_with_cats.count(), 2)
        self.assertIn(self.cal1, calendars_with_cats)
        self.assertIn(self.cal2, calendars_with_cats)


class FilterTagsTests(APITestCase):
    """Tests para el filtrado de eventos por tags"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="taguser", password="tagpass123", email="taguser@test.com")
        self.client.force_authenticate(user=self.user)
        
        # Crear categoría y tags
        self.category = Category.objects.create(name="Trabajo")
        self.tag1 = EventTag.objects.create(name="Reunión", category=self.category)
        self.tag2 = EventTag.objects.create(name="Urgente", category=self.category)
        
        # Crear calendario
        self.calendar = Calendar.objects.create(name="Cal", creator=self.user, privacy="PUBLIC")
        
        # Crear eventos con tags
        self.event1 = Event.objects.create(
            title="Event1",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        self.event1.calendars.add(self.calendar)
        self.event1.tags.add(self.tag1)
        
        self.event2 = Event.objects.create(
            title="Event2",
            date="2024-04-14",
            time="11:00:00",
            creator=self.user
        )
        self.event2.calendars.add(self.calendar)
        self.event2.tags.add(self.tag2)
    
    def test_get_events_with_tags(self):
        """Test obtener evento con tags"""
        event = Event.objects.get(title="Event1")
        self.assertIn(self.tag1, event.tags.all())
    
    def test_event_has_correct_tags(self):
        """Test que cada evento tiene sus tags correctos"""
        event1_tags = set(self.event1.tags.values_list('name', flat=True))
        event2_tags = set(self.event2.tags.values_list('name', flat=True))
        
        self.assertEqual(event1_tags, {"Reunión"})
        self.assertEqual(event2_tags, {"Urgente"})
    
    def test_query_events_by_tag(self):
        """Test que podemos obtener eventos filtrando por tag"""
        # Obtener eventos con el tag1
        events_with_tag1 = Event.objects.filter(tags=self.tag1)
        
        self.assertEqual(events_with_tag1.count(), 1)
        self.assertIn(self.event1, events_with_tag1)
    
    def test_query_events_by_multiple_tags(self):
        """Test que podemos filtrar eventos por múltiples tags"""
        # Obtener eventos que tengan tag1 O tag2
        events_with_tags = Event.objects.filter(tags__in=[self.tag1, self.tag2]).distinct()
        
        self.assertEqual(events_with_tags.count(), 2)
        self.assertIn(self.event1, events_with_tags)
        self.assertIn(self.event2, events_with_tags)


class RecommendationSystemTests(TestCase):
    """Tests para el sistema de recomendación actualizado"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="rsuser", password="rspass123", email="rsuser@test.com")
        
        # Crear categorías
        self.work_cat = Category.objects.create(name="Trabajo")
        self.personal_cat = Category.objects.create(name="Personal")
        
        # Crear tags
        self.meeting_tag = EventTag.objects.create(name="Reunión", category=self.work_cat)
        self.urgent_tag = EventTag.objects.create(name="Urgente", category=self.work_cat)
    
    def test_calendar_has_categories(self):
        """Test que calendario puede tener categorías"""
        calendar = Calendar.objects.create(name="Test Cal", creator=self.user, privacy="PUBLIC")
        calendar.categories.add(self.work_cat)
        
        self.assertEqual(calendar.categories.count(), 1)
        self.assertIn(self.work_cat, calendar.categories.all())
    
    def test_event_has_tags(self):
        """Test que evento puede tener tags"""
        calendar = Calendar.objects.create(name="Test Cal", creator=self.user, privacy="PUBLIC")
        event = Event.objects.create(
            title="Test Event",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        event.calendars.add(calendar)
        event.tags.add(self.meeting_tag)
        
        self.assertEqual(event.tags.count(), 1)
        self.assertIn(self.meeting_tag, event.tags.all())
    
    def test_calendar_with_multiple_categories(self):
        """Test calendario con múltiples categorías"""
        calendar = Calendar.objects.create(name="Multi Cal", creator=self.user, privacy="PUBLIC")
        calendar.categories.add(self.work_cat, self.personal_cat)
        
        self.assertEqual(calendar.categories.count(), 2)
    
    def test_event_with_multiple_tags(self):
        """Test evento con múltiples tags"""
        calendar = Calendar.objects.create(name="Test Cal", creator=self.user, privacy="PUBLIC")
        event = Event.objects.create(
            title="Test Event",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        event.calendars.add(calendar)
        event.tags.add(self.meeting_tag, self.urgent_tag)
        
        self.assertEqual(event.tags.count(), 2)
    
    def test_tags_from_same_category(self):
        """Test que múltiples tags pueden ser de la misma categoría"""
        calendar = Calendar.objects.create(name="Test Cal", creator=self.user, privacy="PUBLIC")
        event = Event.objects.create(
            title="Test Event",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        event.calendars.add(calendar)
        event.tags.add(self.meeting_tag, self.urgent_tag)
        
        categories_from_tags = set(event.tags.values_list('category__name', flat=True))
        self.assertEqual(categories_from_tags, {"Trabajo"})


class EdgeCaseTests(TestCase):
    """Tests para casos edge"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="edgeuser", password="edgepass123", email="edgeuser@test.com")
        self.category = Category.objects.create(name="Test")
    
    def test_event_without_tags(self):
        """Test evento sin tags"""
        calendar = Calendar.objects.create(name="Cal", creator=self.user)
        event = Event.objects.create(
            title="Event",
            date="2024-04-13",
            time="10:00:00",
            creator=self.user
        )
        event.calendars.add(calendar)
        
        self.assertEqual(event.tags.count(), 0)
    
    def test_calendar_without_categories(self):
        """Test calendario sin categorías"""
        calendar = Calendar.objects.create(name="Cal", creator=self.user)
        
        self.assertEqual(calendar.categories.count(), 0)
    
    def test_category_with_many_tags(self):
        """Test categoría con muchos tags"""
        tags = [
            EventTag.objects.create(name=f"Tag{i}", category=self.category)
            for i in range(10)
        ]
        
        self.assertEqual(self.category.tags.count(), 10)
    
    def test_event_dates_and_times(self):
        """Test evento con diferentes fechas y horas"""
        calendar = Calendar.objects.create(name="Cal", creator=self.user)
        
        for i in range(1, 5):
            hour = f"0{i}" if i < 10 else str(i)
            event = Event.objects.create(
                title=f"Event{i}",
                date="2024-04-13",
                time=f"{hour}:00:00",
                creator=self.user
            )
            event.calendars.add(calendar)
        
        self.assertEqual(Event.objects.filter(creator=self.user).count(), 4)
    
    def test_multiple_users_categories(self):
        """Test múltiples usuarios con sus calendarios"""
        user2 = User.objects.create_user(username="edgeuser2", password="edgepass123", email="edgeuser2@test.com")
        
        cal1 = Calendar.objects.create(name="Cal1", creator=self.user)
        cal2 = Calendar.objects.create(name="Cal2", creator=user2)
        
        self.assertEqual(Calendar.objects.filter(creator=self.user).count(), 1)
        self.assertEqual(Calendar.objects.filter(creator=user2).count(), 1)
    
    def test_category_and_tag_relationships(self):
        """Test que la relación entre categoría y tags es correcta"""
        tag1 = EventTag.objects.create(name="Tag1", category=self.category)
        tag2 = EventTag.objects.create(name="Tag2", category=self.category)
        
        # Obtener los tags de la categoría
        category_tags = self.category.tags.all()
        
        self.assertEqual(category_tags.count(), 2)
        self.assertIn(tag1, category_tags)
        self.assertIn(tag2, category_tags)


class CategoryDatabaseTests(TestCase):
    """Tests para verificar la persistencia en base de datos"""
    
    def test_category_persists_after_creation(self):
        """Test que una categoría creada se persiste en BD"""
        Category.objects.create(name="Persistent Cat")
        
        # Verificar que la categoría existe en BD
        self.assertTrue(Category.objects.filter(name="Persistent Cat").exists())
    
    def test_event_tag_persists_after_creation(self):
        """Test que un tag creado se persiste en BD"""
        cat = Category.objects.create(name="Test Cat")
        EventTag.objects.create(name="Test Tag", category=cat)
        
        # Verificar que el tag existe en BD
        self.assertTrue(EventTag.objects.filter(name="Test Tag").exists())
    
    def test_m2m_relation_persists(self):
        """Test que las relaciones M2M se persisten en BD"""
        user = User.objects.create_user(username="test", password="test", email="test@test.com")
        calendar = Calendar.objects.create(name="Test", creator=user)
        category = Category.objects.create(name="Test")
        
        calendar.categories.add(category)
        
        # Verificar que la relación existe en BD
        self.assertEqual(
            Calendar.objects.get(name="Test").categories.count(),
            1
        )


class CategoryViewSetTests(APITestCase):
    """Tests exhaustivos para CategoryViewSet"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username="admin", password="admin", email="admin@test.com")
        self.owner_user = User.objects.create_user(username="owner", password="owner", email="owner@test.com")
        self.other_user = User.objects.create_user(username="other", password="other", email="other@test.com")
        
        self.category1 = Category.objects.create(name="Trabajo")
        self.category2 = Category.objects.create(name="Personal")
        
        self.calendar = Calendar.objects.create(name="My Calendar", creator=self.owner_user)
    
    def test_list_categories_authenticated(self):
        """Test listar todas las categorías siendo autenticado"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get('/api/v1/categories/', follow=True)
        
        self.assertEqual(response.status_code, HTTP_200_OK)
        # Debería retornar lista de categorías
        self.assertIsInstance(response.data, list)
    
    def test_retrieve_category_detail(self):
        """Test obtener detalle de una categoría"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get(f'/api/v1/categories/{self.category1.id}/', follow=True)
        
        self.assertEqual(response.status_code, HTTP_200_OK)
        if isinstance(response.data, dict):
            self.assertIn('name', response.data)

    def test_create_category_admin(self):
        """Admin puede crear categoría"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/v1/categories/', {'name': 'Salud'}, format='json')
        self.assertEqual(response.status_code, HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(name='Salud').exists())

    def test_create_category_non_admin_forbidden(self):
        """No-admin no puede crear categoría"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post('/api/v1/categories/', {'name': 'Salud'}, format='json')
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)

    def test_update_category_admin(self):
        """Admin puede actualizar categoría"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f'/api/v1/categories/{self.category1.id}/',
            {'name': 'Trabajo Pro'},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.category1.refresh_from_db()
        self.assertEqual(self.category1.name, 'Trabajo Pro')

    def test_update_category_non_admin_forbidden(self):
        """No-admin no puede actualizar categoría"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.patch(
            f'/api/v1/categories/{self.category1.id}/',
            {'name': 'Trabajo Pro'},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)

    def test_delete_category_admin(self):
        """Admin puede eliminar categoría"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/categories/{self.category2.id}/')
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.category2.id).exists())

    def test_delete_category_non_admin_forbidden(self):
        """No-admin no puede eliminar categoría"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.delete(f'/api/v1/categories/{self.category2.id}/')
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)
    
    def test_assign_category_to_calendar_as_owner(self):
        """Test asignar categoría a calendario como owner"""
        self.client.force_authenticate(user=self.owner_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            data,
            follow=True
        )
        
        # Debería ser exitoso (200, 201, 204)
        self.assertIn(response.status_code, [200, 201, 204])
        
        # Verificar que la categoría fue asignada
        self.calendar.refresh_from_db()
        self.assertIn(self.category1, self.calendar.categories.all())
    
    def test_assign_category_to_calendar_as_non_owner(self):
        """Test que non-owner no puede asignar categoría"""
        self.client.force_authenticate(user=self.other_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            data,
            follow=True
        )
        
        # Debería rechazar (403)
        self.assertEqual(response.status_code, 403)
    
    def test_assign_category_missing_calendar_id(self):
        """Test asignar categoría sin proporcionar calendar_id"""
        self.client.force_authenticate(user=self.owner_user)
        data = {}  # Falta calendar_id
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            data,
            follow=True
        )
        
        # Debería retornar 400 Bad Request
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_assign_category_calendar_not_found(self):
        """Asignar categoría con calendar inexistente retorna 404"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            {'calendar_id': 999999},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)
    
    def test_assign_category_already_assigned(self):
        """Test asignar categoría que ya está asignada"""
        # Asignamos primero
        self.calendar.categories.add(self.category1)
        
        self.client.force_authenticate(user=self.owner_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            data,
            follow=True
        )
        
        # Debería retornar 200 con mensaje de ya asignada
        self.assertEqual(response.status_code, 200)
    
    def test_remove_category_from_calendar_as_owner(self):
        """Test remover categoría de calendario como owner"""
        # Primero asignamos
        self.calendar.categories.add(self.category1)
        
        self.client.force_authenticate(user=self.owner_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/remove_from_calendar/',
            data,
            follow=True
        )
        
        # Debería ser exitoso
        self.assertIn(response.status_code, [200, 201, 204])
        
        # Verificar que la categoría fue removida
        self.calendar.refresh_from_db()
        self.assertNotIn(self.category1, self.calendar.categories.all())
    
    def test_remove_category_from_calendar_as_non_owner(self):
        """Test que non-owner no puede remover categoría"""
        self.calendar.categories.add(self.category1)
        
        self.client.force_authenticate(user=self.other_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/remove_from_calendar/',
            data,
            follow=True
        )
        
        # Debería rechazar
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)
    
    def test_remove_category_not_assigned(self):
        """Test remover categoría que no está asignada"""
        self.client.force_authenticate(user=self.owner_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/remove_from_calendar/',
            data,
            follow=True
        )
        
        # Debería retornar 200 con mensaje de no asignada
        self.assertEqual(response.status_code, 200)

    def test_remove_category_missing_calendar_id(self):
        """Remover categoría sin calendar_id retorna 400"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/remove_from_calendar/',
            {},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_remove_category_calendar_not_found(self):
        """Remover categoría con calendar inexistente retorna 404"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/remove_from_calendar/',
            {'calendar_id': 999999},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)
    
    def test_assign_category_as_coowner(self):
        """Test asignar categoría siendo co-owner del calendario"""
        # Agregar como co-owner
        self.calendar.co_owners.add(self.other_user)
        
        self.client.force_authenticate(user=self.other_user)
        data = {'calendar_id': self.calendar.id}
        response = self.client.post(
            f'/api/v1/categories/{self.category1.id}/assign_to_calendar/',
            data,
            follow=True
        )
        
        # Debería permitir a co-owner
        self.assertIn(response.status_code, [200, 201, 204])


class EventTagViewSetTests(APITestCase):
    """Tests exhaustivos para EventTagViewSet"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username="admin2", password="admin", email="admin2@test.com")
        self.owner_user = User.objects.create_user(username="owner2", password="owner", email="owner2@test.com")
        self.other_user = User.objects.create_user(username="other2", password="other", email="other2@test.com")
        
        self.category = Category.objects.create(name="Work")
        self.tag1 = EventTag.objects.create(name="Meeting", category=self.category)
        self.tag2 = EventTag.objects.create(name="Urgent", category=self.category)
        
        self.calendar = Calendar.objects.create(name="Cal", creator=self.owner_user)
        self.calendar.categories.add(self.category)
        
        self.event = Event.objects.create(
            title="Event",
            date="2024-04-13",
            time="10:00:00",
            creator=self.owner_user
        )
        self.event.calendars.add(self.calendar)
    
    def test_list_tags_authenticated(self):
        """Test listar todos los tags siendo autenticado"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get('/api/v1/event-tags/', follow=True)
        
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertIsInstance(response.data, list)
    
    def test_retrieve_tag_detail(self):
        """Test obtener detalle de un tag"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.get(f'/api/v1/event-tags/{self.tag1.id}/', follow=True)
        
        self.assertEqual(response.status_code, HTTP_200_OK)
        if isinstance(response.data, dict):
            self.assertIn('name', response.data)

    def test_create_tag_admin(self):
        """Admin puede crear tag"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            '/api/v1/event-tags/',
            {'name': 'Planning', 'category': self.category.id},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)
        self.assertTrue(EventTag.objects.filter(name='Planning', category=self.category).exists())

    def test_create_tag_non_admin_forbidden(self):
        """No-admin no puede crear tag"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            '/api/v1/event-tags/',
            {'name': 'Planning', 'category': self.category.id},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)

    def test_update_tag_admin(self):
        """Admin puede actualizar tag"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f'/api/v1/event-tags/{self.tag1.id}/',
            {'name': 'Meeting Pro'},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        self.tag1.refresh_from_db()
        self.assertEqual(self.tag1.name, 'Meeting Pro')

    def test_update_tag_non_admin_forbidden(self):
        """No-admin no puede actualizar tag"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.patch(
            f'/api/v1/event-tags/{self.tag1.id}/',
            {'name': 'Meeting Pro'},
            format='json'
        )
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)

    def test_delete_tag_admin(self):
        """Admin puede eliminar tag"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/v1/event-tags/{self.tag2.id}/')
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)
        self.assertFalse(EventTag.objects.filter(id=self.tag2.id).exists())

    def test_delete_tag_non_admin_forbidden(self):
        """No-admin no puede eliminar tag"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.delete(f'/api/v1/event-tags/{self.tag2.id}/')
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)
    
    def test_add_tag_to_event_as_calendar_owner(self):
        """Test agregar tag a evento como owner del calendario"""
        self.client.force_authenticate(user=self.owner_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería ser exitoso
        self.assertIn(response.status_code, [200, 201, 204])
        
        # Verificar que el tag fue asignado
        self.event.refresh_from_db()
        self.assertIn(self.tag1, self.event.tags.all())
    
    def test_add_tag_to_event_as_non_owner(self):
        """Test que non-owner no puede agregar tag"""
        self.client.force_authenticate(user=self.other_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería rechazar
        self.assertEqual(response.status_code, 403)
    
    def test_add_tag_missing_event_id(self):
        """Test agregar tag sin proporcionar event_id"""
        self.client.force_authenticate(user=self.owner_user)
        data = {}  # Falta event_id
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería retornar 400 Bad Request
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_add_tag_event_not_found(self):
        """Agregar tag con event inexistente retorna 404"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            {'event_id': 999999},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)
    
    def test_add_tag_already_assigned(self):
        """Test agregar tag que ya está asignado"""
        self.event.tags.add(self.tag1)
        
        self.client.force_authenticate(user=self.owner_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería retornar 200 con mensaje de ya asignado
        self.assertEqual(response.status_code, 200)
    
    def test_add_tag_from_uncategorized_category(self):
        """Test agregar tag que no pertenece a categoría del calendario"""
        # Crear categoría sin asignar al calendario
        other_category = Category.objects.create(name="Personal")
        other_tag = EventTag.objects.create(name="PersonalTag", category=other_category)
        
        self.client.force_authenticate(user=self.owner_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{other_tag.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería rechazar porque la categoría no está asignada
        self.assertEqual(response.status_code, 400)
    
    def test_remove_tag_from_event_as_owner(self):
        """Test remover tag de evento como owner"""
        self.event.tags.add(self.tag1)
        
        self.client.force_authenticate(user=self.owner_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/remove_from_event/',
            data,
            follow=True
        )
        
        # Debería ser exitoso
        self.assertIn(response.status_code, [200, 201, 204])
        
        # Verificar que el tag fue removido
        self.event.refresh_from_db()
        self.assertNotIn(self.tag1, self.event.tags.all())
    
    def test_remove_tag_from_event_as_non_owner(self):
        """Test que non-owner no puede remover tag"""
        self.event.tags.add(self.tag1)
        
        self.client.force_authenticate(user=self.other_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/remove_from_event/',
            data,
            follow=True
        )
        
        # Debería rechazar
        self.assertEqual(response.status_code, HTTP_403_FORBIDDEN)
    
    def test_remove_tag_not_assigned(self):
        """Test remover tag que no está asignado"""
        self.client.force_authenticate(user=self.owner_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/remove_from_event/',
            data,
            follow=True
        )
        
        # Debería retornar 200 con mensaje de no asignado
        self.assertEqual(response.status_code, 200)

    def test_remove_tag_missing_event_id(self):
        """Remover tag sin event_id retorna 400"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/remove_from_event/',
            {},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_remove_tag_event_not_found(self):
        """Remover tag con event inexistente retorna 404"""
        self.client.force_authenticate(user=self.owner_user)
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/remove_from_event/',
            {'event_id': 999999},
            follow=True
        )
        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)
    
    def test_add_tag_as_calendar_coowner(self):
        """Test agregar tag siendo co-owner del calendario"""
        self.calendar.co_owners.add(self.other_user)
        
        self.client.force_authenticate(user=self.other_user)
        data = {'event_id': self.event.id}
        response = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data,
            follow=True
        )
        
        # Debería permitir a co-owner
        self.assertIn(response.status_code, [200, 201, 204])
    
    def test_add_multiple_tags_to_event(self):
        """Test agregar múltiples tags a un evento"""
        self.client.force_authenticate(user=self.owner_user)
        
        # Agregar primer tag
        data1 = {'event_id': self.event.id}
        response1 = self.client.post(
            f'/api/v1/event-tags/{self.tag1.id}/add_to_event/',
            data1,
            follow=True
        )
        self.assertIn(response1.status_code, [200, 201, 204])
        
        # Agregar segundo tag
        data2 = {'event_id': self.event.id}
        response2 = self.client.post(
            f'/api/v1/event-tags/{self.tag2.id}/add_to_event/',
            data2,
            follow=True
        )
        self.assertIn(response2.status_code, [200, 201, 204])
        
        # Verificar que ambos tags están asignados
        self.event.refresh_from_db()
        self.assertEqual(self.event.tags.count(), 2)
        self.assertIn(self.tag1, self.event.tags.all())
        self.assertIn(self.tag2, self.event.tags.all())


class LabelViewsetHelpersTests(TestCase):
    """Tests para utilidades de `main.labels.viewsets`"""

    def setUp(self):
        self.owner = User.objects.create_user(username="helper_owner", password="pass", email="helper_owner@test.com")
        self.coowner = User.objects.create_user(username="helper_coowner", password="pass", email="helper_coowner@test.com")
        self.other = User.objects.create_user(username="helper_other", password="pass", email="helper_other@test.com")

        self.cat_work = Category.objects.create(name="Helper Work")
        self.cat_personal = Category.objects.create(name="Helper Personal")

        self.tag_meeting = EventTag.objects.create(name="Helper Meeting", category=self.cat_work)
        self.tag_family = EventTag.objects.create(name="Helper Family", category=self.cat_personal)

        self.calendar_owner = Calendar.objects.create(name="Cal Owner", creator=self.owner)
        self.calendar_owner.categories.add(self.cat_work)

        self.calendar_co = Calendar.objects.create(name="Cal Co", creator=self.other)
        self.calendar_co.co_owners.add(self.coowner)
        self.calendar_co.categories.add(self.cat_personal)

        self.event_owner = Event.objects.create(
            title="Evt Owner",
            date="2024-05-01",
            time="10:00:00",
            creator=self.owner,
        )
        self.event_owner.calendars.add(self.calendar_owner)
        self.event_owner.tags.add(self.tag_meeting)

        self.event_co = Event.objects.create(
            title="Evt Co",
            date="2024-05-02",
            time="11:00:00",
            creator=self.other,
        )
        self.event_co.calendars.add(self.calendar_co)
        self.event_co.tags.add(self.tag_family)

    def test_get_user_calendar_categories_owner(self):
        from main.labels.viewsets import get_user_calendar_categories

        categories = get_user_calendar_categories(self.owner)
        self.assertEqual(set(categories.values_list('id', flat=True)), {self.cat_work.id})

    def test_get_user_calendar_categories_coowner(self):
        from main.labels.viewsets import get_user_calendar_categories

        categories = get_user_calendar_categories(self.coowner)
        self.assertEqual(set(categories.values_list('id', flat=True)), {self.cat_personal.id})

    def test_get_user_event_tags_owner(self):
        from main.labels.viewsets import get_user_event_tags

        tags = get_user_event_tags(self.owner)
        self.assertEqual(set(tags.values_list('id', flat=True)), {self.tag_meeting.id})

    def test_get_user_event_tags_coowner(self):
        from main.labels.viewsets import get_user_event_tags

        tags = get_user_event_tags(self.coowner)
        self.assertEqual(set(tags.values_list('id', flat=True)), {self.tag_family.id})

    def test_get_calendar_categories_for_user(self):
        from main.labels.viewsets import get_calendar_categories_for_user

        result = get_calendar_categories_for_user(self.owner)
        self.assertIn(self.calendar_owner.id, result)
        self.assertTrue(any(item['id'] == self.cat_work.id for item in result[self.calendar_owner.id]))

    def test_get_event_tags_for_user(self):
        from main.labels.viewsets import get_event_tags_for_user

        result = get_event_tags_for_user(self.owner)
        self.assertIn(self.cat_work.id, result)
        self.assertTrue(any(item['id'] == self.tag_meeting.id for item in result[self.cat_work.id]))
