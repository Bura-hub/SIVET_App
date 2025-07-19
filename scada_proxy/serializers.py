from rest_framework import serializers
from .models import DeviceCategory, Device, Measurement, Institution, TaskProgress

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

class TaskProgressSerializer(serializers.ModelSerializer):
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = TaskProgress
        fields = [
            'task_id',
            'status',
            'processed_devices',
            'total_devices',
            'progress_percent',
            'message',
            'started_at',
            'finished_at'
        ]

    def get_progress_percent(self, obj):
        return obj.progress_percent()