from rest_framework import serializers
from .models import MonthlyConsumptionKPI, DailyChartData, ElectricMeterConsumption, ElectricMeterChartData, ElectricMeterEnergyConsumption, ElectricMeterIndicators

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

# indicators/serializers.py
class ElectricMeterEnergySerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    
    class Meta:
        model = ElectricMeterEnergyConsumption
        fields = [
            'id', 'device', 'device_name', 'institution', 'institution_name',
            'date', 'time_range', 'imported_energy_low', 'imported_energy_high',
            'total_imported_energy', 'exported_energy_low', 'exported_energy_high',
            'total_exported_energy', 'net_energy_consumption', 'measurement_count',
            'last_measurement_date', 'created_at', 'updated_at'
        ]

# Serializer para la respuesta del cálculo de medidores eléctricos
class ElectricMeterCalculationResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField(
        help_text="Indica si el cálculo se ejecutó exitosamente"
    )
    message = serializers.CharField(
        help_text="Mensaje descriptivo del resultado del cálculo"
    )
    task_id = serializers.CharField(
        help_text="ID de la tarea asíncrona ejecutada"
    )
    time_range = serializers.CharField(
        help_text="Rango de tiempo del cálculo (daily/monthly)"
    )
    start_date = serializers.DateField(
        help_text="Fecha de inicio del período calculado"
    )
    end_date = serializers.DateField(
        help_text="Fecha de fin del período calculado"
    )
    institution_id = serializers.IntegerField(
        help_text="ID de la institución procesada"
    )
    device_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="ID del medidor específico (si se especificó)"
    )
    processed_records = serializers.IntegerField(
        help_text="Número de registros procesados"
    )
    estimated_completion_time = serializers.CharField(
        help_text="Tiempo estimado de finalización de la tarea"
    )

class ElectricMeterIndicatorsSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    time_range_display = serializers.CharField(source='get_time_range_display', read_only=True)
    
    class Meta:
        model = ElectricMeterIndicators
        fields = [
            'id', 'device', 'device_name', 'institution', 'institution_name',
            'date', 'time_range', 'time_range_display',
            'imported_energy_kwh', 'exported_energy_kwh', 'net_energy_consumption_kwh',
            'peak_demand_kw', 'avg_demand_kw', 'load_factor_pct', 'avg_power_factor',
            'max_voltage_unbalance_pct', 'max_current_unbalance_pct',
            'max_voltage_thd_pct', 'max_current_thd_pct', 'max_current_tdd_pct',
            'measurement_count', 'last_measurement_date', 'calculated_at'
        ]
        read_only_fields = ['calculated_at']