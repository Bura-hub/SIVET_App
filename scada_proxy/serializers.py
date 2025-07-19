from rest_framework import serializers
from .models import DeviceCategory, Device, Measurement, Institution

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = '__all__'

class DeviceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceCategory
        fields = '__all__'

class DeviceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)

    class Meta:
        model = Device
        fields = '__all__'

class MeasurementSerializer(serializers.ModelSerializer):
    # Puedes añadir el nombre del dispositivo si lo necesitas en la respuesta
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = Measurement
        fields = '__all__'