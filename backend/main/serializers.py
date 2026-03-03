from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from main.models import Evento

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

class PublicUserSerializer(serializers.ModelSerializer):
    """
    Serializer para mostrar información pública del usuario.
    No incluye email ni password por seguridad.
    """
    # 1. Definimos el campo que NO está en el modelo pero queremos calcular al vuelo
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            'id',
            'username',
            'pronombres',
            'biografia',
            'foto',
            'link',
            'total_seguidores',  
            'total_seguidos',
            'is_following'       # Esto lo calcula el método de abajo
        )
        read_only_fields = ('id',)

    def get_is_following(self, obj):
        # Sacamos la 'request' del contexto que envía la vista
        request = self.context.get('request')
        
        # Si el usuario está logueado, comprobamos si sigue a este perfil (obj)
        if request and request.user.is_authenticated:
            # Usamos 'seguidores_set' porque es el related_name que pusiste en tu modelo
            return obj.seguidores_set.filter(id=request.user.id).exists()
        
        # Si no está logueado o no lo sigue, devolvemos False
        return False

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


class EventoSerializer(serializers.ModelSerializer):
    foto = serializers.SerializerMethodField()
    distancia_km = serializers.SerializerMethodField()
    latitud = serializers.SerializerMethodField()
    longitud = serializers.SerializerMethodField()
    creador_username = serializers.CharField(source='creador.username', read_only=True)
    calendarios = serializers.SerializerMethodField()

    class Meta:
        model = Evento
        fields = [
            'id', 'titulo', 'descripcion', 'nombre_lugar',
            'fecha', 'hora', 'recurrencia', 'id_externo',
            'calendarios', 'fecha_creacion',
            'distancia_km', 'latitud', 'longitud',
            'foto', 'creador_username'
        ]

    def get_foto(self, obj):
        if not obj.foto:
            return None
        foto_str = str(obj.foto)
        if foto_str.startswith('http'):
            return foto_str
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.foto.url)
        return foto_str

    def get_distancia_km(self, obj):
        if hasattr(obj, 'distancia') and obj.distancia:
            return round(obj.distancia.km, 2)
        return None

    def get_latitud(self, obj):
        return obj.ubicacion.y if obj.ubicacion else None

    def get_longitud(self, obj):
        return obj.ubicacion.x if obj.ubicacion else None

    def get_calendarios(self, obj):
        return list(obj.calendarios.values_list('id', flat=True))