from rest_framework import status
from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth.hashers import check_password
from main.models import User

class RegistroUsuarioTests(APITestCase):
    """
    Tests completos para el sistema de registro de users.
    """
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.url = reverse('register')
        self.datos_validos = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPassword123!',
            'password2': 'TestPassword123!',
            'pronouns': 'él/he',
            'bio': 'Esta es mi biografía de prueba'
        }

    def test_registro_exitoso(self):
        """Test: Registro exitoso con datos válidos."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        # Verificar respuesta
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['message'], 'User registered succesfully')
        
        # Verificar datos del user en la respuesta
        self.assertEqual(response.data['user']['username'], 'testuser')
        self.assertEqual(response.data['user']['email'], 'test@example.com')
        self.assertNotIn('password', response.data['user'])  # No debe devolver password
        
        # Verificar que el user existe en la base de datos
        self.assertTrue(User.objects.filter(username='testuser').exists())
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.pronouns, 'él/he')
        self.assertEqual(user.bio, 'Esta es mi biografía de prueba')

    def test_password_hasheada_correctamente(self):
        """Test: La contraseña debe estar hasheada con Argon2."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar que la contraseña está hasheada
        user = User.objects.get(username='testuser')
        self.assertNotEqual(user.password, 'TestPassword123!')  # No debe estar en texto plano
        self.assertTrue(user.password.startswith('argon2'))  # Debe usar Argon2
        
        # Verificar que la contraseña hasheada es válida
        self.assertTrue(check_password('TestPassword123!', user.password))

    def test_registro_sin_campos_opcionales(self):
        """Test: Registro exitoso sin campos opcionales (pronouns, bio, link)."""
        datos_minimos = {
            'username': 'userminimo',
            'email': 'minimo@example.com',
            'password': 'Password123!',
            'password2': 'Password123!'
        }
        
        response = self.client.post(self.url, datos_minimos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='userminimo')
        self.assertEqual(user.pronouns, '')
        self.assertEqual(user.bio, '')
        self.assertEqual(user.link, '')

    def test_passwords_no_coinciden(self):
        """Test: Error cuando las contraseñas no coinciden."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password2'] = 'DiferentePassword123!'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_email_duplicado(self):
        """Test: Error cuando el email ya está registrado."""
        # Crear primer user
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar user con mismo email
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['username'] = 'otrouser'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_username_duplicado(self):
        """Test: Error cuando el username ya está registrado."""
        # Crear primer user
        self.client.post(self.url, self.datos_validos, format='json')
        
        # Intentar registrar user con mismo username
        datos_duplicados = self.datos_validos.copy()
        datos_duplicados['email'] = 'otro@example.com'
        response = self.client.post(self.url, datos_duplicados, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_username_muy_corto(self):
        """Test: Error cuando el username tiene menos de 3 caracteres."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['username'] = 'ab'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_username_con_caracteres_invalidos(self):
        """Test: Error cuando el username contiene caracteres no permitidos."""
        usernames_invalidos = ['user@name', 'user name', 'user.name', 'user#name']
        
        for username_invalido in usernames_invalidos:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = username_invalido
            datos_invalidos['email'] = f'{username_invalido}@example.com'
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('username', response.data)

    def test_password_muy_corta(self):
        """Test: Error cuando la contraseña tiene menos de 8 caracteres."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password'] = 'Pass1!'
        datos_invalidos['password2'] = 'Pass1!'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_password_muy_comun(self):
        """Test: Error cuando la contraseña es muy común."""
        passwords_comunes = ['password123', 'password', '12345678']
        
        for password_comun in passwords_comunes:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = f'user_{password_comun}'
            datos_invalidos['email'] = f'{password_comun}@example.com'
            datos_invalidos['password'] = password_comun
            datos_invalidos['password2'] = password_comun
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('password', response.data)

    def test_password_solo_numerica(self):
        """Test: Error cuando la contraseña es solo numérica."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['password'] = '12345678901'
        datos_invalidos['password2'] = '12345678901'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_password_similar_a_username(self):
        """Test: Error cuando la contraseña es muy similar al username."""
        datos_invalidos = self.datos_validos.copy()
        datos_invalidos['username'] = 'testuser123'
        datos_invalidos['password'] = 'testuser123'
        datos_invalidos['password2'] = 'testuser123'
        
        response = self.client.post(self.url, datos_invalidos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_email_invalido(self):
        """Test: Error cuando el formato del email es inválido."""
        emails_invalidos = ['notanemail', 'invalid@', '@example.com', 'invalid @example.com']
        
        for email_invalido in emails_invalidos:
            datos_invalidos = self.datos_validos.copy()
            datos_invalidos['username'] = f'user_{email_invalido.replace("@", "").replace(".", "")}'
            datos_invalidos['email'] = email_invalido
            
            response = self.client.post(self.url, datos_invalidos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('email', response.data)

    def test_campos_requeridos_faltantes(self):
        """Test: Error cuando faltan campos requeridos."""
        campos_requeridos = ['username', 'email', 'password', 'password2']
        
        for campo in campos_requeridos:
            datos_incompletos = self.datos_validos.copy()
            del datos_incompletos[campo]
            
            response = self.client.post(self.url, datos_incompletos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(campo, response.data)

    def test_email_case_insensitive(self):
        """Test: El email se almacena en minúsculas sin importar cómo se envíe."""
        datos_mayusculas = self.datos_validos.copy()
        datos_mayusculas['email'] = 'TEST@EXAMPLE.COM'
        
        response = self.client.post(self.url, datos_mayusculas, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='testuser')
        self.assertEqual(user.email, 'test@example.com')

    def test_registro_no_devuelve_password(self):
        """Test: La respuesta no debe incluir la contraseña."""
        response = self.client.post(self.url, self.datos_validos, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn('password', response.data['user'])
        self.assertNotIn('password2', response.data['user'])

    def test_username_valido_con_guiones(self):
        """Test: Username válido con guiones y guiones bajos."""
        usernames_validos = ['user_name', 'user-name', 'user_123', 'user-test_123']
        
        for i, username_valido in enumerate(usernames_validos):
            datos_validos = self.datos_validos.copy()
            datos_validos['username'] = username_valido
            datos_validos['email'] = f'test{i}@example.com'
            
            response = self.client.post(self.url, datos_validos, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertTrue(User.objects.filter(username=username_valido).exists())