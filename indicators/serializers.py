from rest_framework import serializers
from .models import MonthlyConsumptionKPI, DailyChartData, ElectricMeterConsumption, ElectricMeterChartData

class MonthlyConsumptionKPISerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyConsumptionKPI
        fields = '__all__'

class DailyChartDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyChartData
        fields = '__all__'

class ElectricMeterConsumptionSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    
    class Meta:
        model = ElectricMeterConsumption
        fields = '__all__'

class ElectricMeterChartDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    
    class Meta:
        model = ElectricMeterChartData
        fields = '__all__'

# Serializer para el endpoint de cálculo de medidores eléctricos
class ElectricMeterCalculationRequestSerializer(serializers.Serializer):
    time_range = serializers.ChoiceField(
        choices=[('daily', 'Diario'), ('monthly', 'Mensual')],
        default='daily',
        help_text="Rango de tiempo para el cálculo: 'daily' o 'monthly'"
    )
    start_date = serializers.DateField(
        help_text="Fecha de inicio en formato YYYY-MM-DD"
    )
    end_date = serializers.DateField(
        help_text="Fecha de fin en formato YYYY-MM-DD"
    )
    institution_id = serializers.IntegerField(
        help_text="ID de la institución"
    )
    device_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="ID específico del medidor (opcional)"
    )

class ElectricMeterCalculationResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField(help_text="Indica si el cálculo fue exitoso")
    message = serializers.CharField(help_text="Mensaje descriptivo del resultado")
    task_id = serializers.CharField(help_text="ID de la tarea de cálculo", required=False)
    processed_devices = serializers.IntegerField(help_text="Número de dispositivos procesados", required=False)
    total_consumption = serializers.FloatField(help_text="Consumo total calculado en kWh", required=False)
