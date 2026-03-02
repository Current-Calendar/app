from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Calendario, Evento

Usuario = get_user_model()


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    """
    Serializer para el registro de nuevos usuarios.
    Incluye validación de contraseñas y creación segura con hashing.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Contraseña del usuario (mínimo 8 caracteres)"
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirmación de la contraseña"
    )
    email = serializers.EmailField(
        required=True,
        help_text='Email único del usuario'
    )

    class Meta:
        model = Usuario
        fields = ('id', 'username', 'email', 'password', 'password2', 'pronombres', 'biografia')
        extra_kwargs = {
            'pronombres': {'required': False},
            'biografia': {'required': False}
        }

    def validate_email(self, value):
        """Verifica que el email no esté registrado."""
        if Usuario.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value.lower()
    
    def validate_username(self, value):
        """Verifica que el username no esté registrado y sea válido."""
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya existe.")
        
        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números, guiones y guiones bajos."
            )
        
        if len(value) < 3:
            raise serializers.ValidationError("El nombre de usuario debe tener al menos 3 caracteres.")
        
        if len(value) > 150:
            raise serializers.ValidationError("El nombre de usuario no puede tener más de 150 caracteres.")
        
        return value

    def validate(self, attrs):
        """
        Validación a nivel de objeto: 
        - Verifica que las contraseñas coincidan
        - Valida la contraseña con contexto del usuario (username, email)
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Las contraseñas no coinciden."
            })
        
        # Crear un objeto usuario temporal para validar la contraseña con contexto
        # Esto permite que UserAttributeSimilarityValidator funcione correctamente
        usuario_temp = Usuario(
            username=attrs.get('username'),
            email=attrs.get('email')
        )
        
        # Validar la contraseña con los validadores de Django (incluyendo similaridad)
        try:
            validate_password(attrs['password'], user=usuario_temp)
        except ValidationError as e:
            raise serializers.ValidationError({
                "password": list(e.messages)
            })
        
        return attrs

    def create(self, validated_data):
        """
        Crea un nuevo usuario usando create_user() para hashear la contraseña con Argon2.
        """
        # Eliminar password2 ya que no se almacena
        validated_data.pop('password2')
        
        # Usar create_user para hashear automáticamente
        usuario = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            pronombres=validated_data.get('pronombres', ''),
            biografia=validated_data.get('biografia', '')
        )
        
        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer para mostrar información del usuario (sin contraseña).
    """

    class Meta:
        model = Usuario
        fields = (
            'id',
            'username',
            'email',
            'pronombres',
            'biografia',
        )
        read_only_fields = ('id', 'date_joined')
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model=Usuario
        fields=['foto','email','username','password','pronombres','link','biografia']

class CalendarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendario
        fields = ['id', 'nombre', 'descripcion', 'portada', 'estado', 'creador', 'fecha_creacion']

class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = ['id', 'titulo', 'descripcion', 'nombre_lugar', 'ubicacion', 'fecha', 'hora', 'foto', 'calendarios', 'creador']