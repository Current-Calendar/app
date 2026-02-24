from rest_framework import serializers
from main.models import Usuario
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model=Usuario
        fields=['foto','email','username','password']
