from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.gis.geos import Point

from main.serializers import UsuarioRegistroSerializer, UsuarioSerializer
from main.models import MockElement, Calendario, Evento, Usuario


class UserViewSet(viewsets.GenericViewSet):
    queryset = Usuario.objects.all()
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def follow(self, request: Request, pk: int) -> Response:
        user: Usuario = request.user
        user_to_follow: Usuario = self.get_object()

        if user.seguidos.filter(pk=user_to_follow.pk).exists():
            user.seguidos.remove(user_to_follow)
            followed = False
        else:
            user.seguidos.add(user_to_follow)
            followed = True

        user.save()

        return Response(
            {
                "user": user_to_follow.pk,
                "followed": followed,
            }
        )


@api_view(['GET'])
def hola_mundo(request):
    cache_key = "sevilla_point_data"
    cached_data = cache.get(cache_key)    
    if cached_data:
        return Response({
            "source": "Redis (Cache)",
            "data": cached_data
        }, headers={"Access-Control-Allow-Origin": "*"})

    pnt = Point(-5.9926, 37.3861)    
    obj, created = MockElement.objects.get_or_create(
        nombre="La Giralda Mock",
        defaults={'punto_geografico': pnt}
    )

    result = {
        "id": obj.id,
        "nombre": obj.nombre,
        "coordenadas": {
            "longitude": obj.punto_geografico.x,
            "latitude": obj.punto_geografico.y
        },
        "created_in_db": created,
        "timestamp": str(obj.created_at)
    }

    cache.set(cache_key, result, 60)

    return Response({
        "source": "PostgreSQL (Base de Datos)",
        "data": result
    }, headers={"Access-Control-Allow-Origin": "*"})
    

@api_view(['POST'])
@permission_classes([AllowAny])
def registro_usuario(request):
    """
    Endpoint para registrar un nuevo usuario.
    
    POST /api/v1/auth/registro/
    Body: {
        "username": "string",
        "email": "string",
        "password": "string",
        "password2": "string"
    }
    """
    serializer = UsuarioRegistroSerializer(data=request.data)
    
    if serializer.is_valid():
        usuario = serializer.save()
        
        # Devolver datos del usuario creado
        usuario_serializer = UsuarioSerializer(usuario)
        
        return Response({
            'message': 'Usuario registrado exitosamente',
            'usuario': usuario_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def crear_calendario(request):
    data = request.data

    creador_id = data.get('creador_id')
    nombre = data.get('nombre')

    if not creador_id:
        return Response(
            {"errors": ["El campo 'creador_id' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not nombre:
        return Response(
            {"errors": ["El campo 'nombre' es obligatorio."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        creador = Usuario.objects.get(pk=creador_id)
    except Usuario.DoesNotExist:
        return Response(
            {"errors": ["El usuario creador no existe."]},
            status=status.HTTP_404_NOT_FOUND,
        )

    calendario = Calendario(
        creador=creador,
        nombre=nombre,
        descripcion=data.get('descripcion', ''),
        estado=data.get('estado', 'PRIVADO'),
        origen=data.get('origen', 'CURRENT'),
        id_externo=data.get('id_externo'),
    )

    CONSTRAINT_PRIVADO = "unico_calendario_privado_por_usuario"

    try:
        calendario.full_clean()
        with transaction.atomic():
            calendario.save()
    except ValidationError as exc:
        # full_clean() / validate_constraints() puede lanzar ValidationError
        # cuando se viola el UniqueConstraint condicional (estado=PRIVADO).
        raw_messages = []
        if hasattr(exc, "message_dict"):
            for field_errors in exc.message_dict.values():
                raw_messages.extend(field_errors)
        if not raw_messages and getattr(exc, "messages", None):
            raw_messages.extend(exc.messages)

        if any(CONSTRAINT_PRIVADO in str(m) for m in raw_messages):
            return Response(
                {"errors": ["El usuario ya tiene un calendario privado."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"errors": raw_messages or ["Datos inválidos."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except IntegrityError:
        return Response(
            {"errors": ["El usuario ya tiene un calendario privado."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "id": calendario.id,
            "origen": calendario.origen,
            "id_externo": calendario.id_externo,
            "nombre": calendario.nombre,
            "descripcion": calendario.descripcion,
            "estado": calendario.estado,
            "creador_id": calendario.creador_id,
            "fecha_creacion": calendario.fecha_creacion,
        },
        status=status.HTTP_201_CREATED,
    )
@api_view(['POST'])
def asignar_evento_a_calendario(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        evento = Evento.objects.get(pk=evento_id)
    except Evento.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendario = Calendario.objects.get(pk=calendario_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if evento.calendarios.filter(pk=calendario.pk).exists():
        return Response(
            {"error": "El evento ya está asignado a este calendario"},
            status=status.HTTP_400_BAD_REQUEST
        )

    evento.calendarios.add(calendario)
    return Response(
        {"mensaje": f"Evento '{evento.titulo}' asignado al calendario '{calendario.nombre}'"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
def desasignar_evento_de_calendario(request):
    evento_id = request.data.get('evento_id')
    calendario_id = request.data.get('calendario_id')

    if not evento_id or not calendario_id:
        return Response(
            {"error": "Se requieren evento_id y calendario_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        evento = Evento.objects.get(pk=evento_id)
    except Evento.DoesNotExist:
        return Response({"error": "Evento no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    try:
        calendario = Calendario.objects.get(pk=calendario_id)
    except Calendario.DoesNotExist:
        return Response({"error": "Calendario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if not evento.calendarios.filter(pk=calendario.pk).exists():
        return Response(
            {"error": "El evento no está asignado a este calendario"},
            status=status.HTTP_400_BAD_REQUEST
        )

    evento.calendarios.remove(calendario)
    return Response(
        {"mensaje": f"Evento '{evento.titulo}' desasignado del calendario '{calendario.nombre}'"},
        status=status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)
    
    # Only the creator can delete the calendar
    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to delete this calendar.'}, status=status.HTTP_403_FORBIDDEN)
    
    calendario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def editar_calendario(request, calendario_id):
    calendario = get_object_or_404(Calendario, id=calendario_id)

    if calendario.creador != request.user:
        return Response({'error': 'You do not have permission to edit this calendar.'}, status=status.HTTP_403_FORBIDDEN)

    ESTADOS_VALIDOS = {'PRIVADO', 'AMIGOS', 'PUBLICO'}
    campos_editables = ['nombre', 'descripcion', 'estado']


    for campo in campos_editables:
        if campo in request.data:
            valor = request.data[campo]
            if isinstance(valor, str) and valor.strip() == '':
                return Response(
                    {'error': f"El campo '{campo}' no puede ser una cadena vacía."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if campo == 'estado' and valor not in ESTADOS_VALIDOS:
                return Response(
                    {'error': f"El estado '{valor}' no es válido. Los valores permitidos son: {', '.join(sorted(ESTADOS_VALIDOS))}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            setattr(calendario, campo, valor)

    calendario.save()
    return Response({
        'id': calendario.id,
        'nombre': calendario.nombre,
        'descripcion': calendario.descripcion,
        'estado': calendario.estado,
    }, status=status.HTTP_200_OK)