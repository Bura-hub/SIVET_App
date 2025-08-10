from django.db import models

class MonthlyConsumptionKPI(models.Model):
    """
    Modelo para almacenar los KPIs de consumo, generación y balance total mensual pre-calculados.
    Solo debe haber una instancia de este modelo.
    """
    total_consumption_current_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes actual en kWh.")
    total_consumption_previous_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes anterior en kWh.")
    
    total_generation_current_month = models.FloatField(default=0.0, help_text="Generación total acumulada del mes actual en kWh.")
    total_generation_previous_month = models.FloatField(default=0.0, help_text="Generación total acumulada del mes anterior en kWh.")

    avg_instantaneous_power_current_month = models.FloatField(default=0.0, help_text="Potencia instantánea promedio de inversores del mes actual en Watts.")
    avg_instantaneous_power_previous_month = models.FloatField(default=0.0, help_text="Potencia instantánea promedio de inversores del mes anterior en Watts.")

    avg_daily_temp_current_month = models.FloatField(default=0.0, help_text="Temperatura promedio diaria del mes actual en °C.")
    avg_daily_temp_previous_month = models.FloatField(default=0.0, help_text="Temperatura promedio diaria del mes anterior en °C.")

    avg_relative_humidity_current_month = models.FloatField(default=0.0, help_text="Humedad relativa promedio del mes actual en %RH.")
    avg_relative_humidity_previous_month = models.FloatField(default=0.0, help_text="Humedad relativa promedio del mes anterior en %RH.")

    # Nuevos campos para la velocidad del viento promedio (en km/h)
    avg_wind_speed_current_month = models.FloatField(default=0.0, help_text="Velocidad del viento promedio del mes actual en km/h.")
    avg_wind_speed_previous_month = models.FloatField(default=0.0, help_text="Velocidad del viento promedio del mes anterior en km/h.")

    last_calculated = models.DateTimeField(auto_now=True, help_text="Fecha y hora de la última vez que se calculó este KPI.")

    class Meta:
        verbose_name = "KPI de Consumo, Generación y Balance Mensual"
        verbose_name_plural = "KPIs de Consumo, Generación y Balance Mensual"

    def __str__(self):
        return f"KPI Mensual (Actualizado: {self.last_calculated.strftime('%Y-%m-%d %H:%M')})"


class DailyChartData(models.Model):
    """
    Nuevo modelo para almacenar datos agregados diariamente,
    ideales para mostrar en gráficos.
    """
    date = models.DateField(unique=True, help_text="Fecha del registro.")
    daily_consumption = models.FloatField(default=0.0, help_text="Consumo total diario en kWh.")
    daily_generation = models.FloatField(default=0.0, help_text="Generación total diaria en kWh.")  # Cambiar a kWh
    daily_balance = models.FloatField(default=0.0, help_text="Balance energético diario en kWh.")
    avg_daily_temp = models.FloatField(default=0.0, help_text="Temperatura promedio diaria en °C.")

    class Meta:
        verbose_name = "Datos Diarios de Gráfico"
        verbose_name_plural = "Datos Diarios de Gráfico"
    
    def __str__(self):
        return f"Datos para {self.date.isoformat()}"


class ElectricMeterConsumption(models.Model):
    """
    Modelo para almacenar el consumo acumulado de energía por medidor eléctrico
    en diferentes rangos de tiempo (diario/mensual).
    """
    device = models.ForeignKey('scada_proxy.Device', on_delete=models.CASCADE, related_name='electric_consumption')
    institution = models.ForeignKey('scada_proxy.Institution', on_delete=models.CASCADE, related_name='electric_consumption')
    
    # Rangos de tiempo
    date = models.DateField(help_text="Fecha del registro (para datos diarios) o primer día del mes (para datos mensuales).")
    time_range = models.CharField(max_length=20, choices=[
        ('daily', 'Diario'),
        ('monthly', 'Mensual')
    ], help_text="Tipo de rango de tiempo del registro.")
    
    # Datos de consumo
    cumulative_active_power = models.FloatField(default=0.0, help_text="Energía activa acumulada en kWh.")
    total_active_power = models.FloatField(default=0.0, help_text="Total de energía activa consumida en kWh.")
    peak_demand = models.FloatField(default=0.0, help_text="Demanda pico en kW.")
    avg_demand = models.FloatField(default=0.0, help_text="Demanda promedio en kW.")
    
    # Metadatos
    measurement_count = models.IntegerField(default=0, help_text="Número de mediciones procesadas.")
    last_measurement_date = models.DateTimeField(null=True, blank=True, help_text="Fecha de la última medición procesada.")
    calculated_at = models.DateTimeField(auto_now=True, help_text="Fecha y hora del cálculo.")
    
    class Meta:
        verbose_name = "Consumo de Medidor Eléctrico"
        verbose_name_plural = "Consumos de Medidores Eléctricos"
        unique_together = ['device', 'date', 'time_range']
        indexes = [
            models.Index(fields=['device', 'date', 'time_range']),
            models.Index(fields=['institution', 'date', 'time_range']),
            models.Index(fields=['date', 'time_range']),
        ]
    
    def __str__(self):
        return f"{self.device.name} - {self.date} ({self.get_time_range_display()})"


class ElectricMeterChartData(models.Model):
    """
    Modelo para almacenar datos de gráficos específicos por medidor eléctrico,
    optimizado para consultas de rangos de fechas.
    """
    device = models.ForeignKey('scada_proxy.Device', on_delete=models.CASCADE, related_name='chart_data')
    institution = models.ForeignKey('scada_proxy.Institution', on_delete=models.CASCADE, related_name='chart_data')
    date = models.DateField(help_text="Fecha del registro.")
    
    # Datos para gráficos
    hourly_consumption = models.JSONField(default=list, help_text="Consumo por hora del día en kWh.")
    daily_consumption = models.FloatField(default=0.0, help_text="Consumo total del día en kWh.")
    peak_hour = models.IntegerField(default=0, help_text="Hora del pico de consumo (0-23).")
    peak_value = models.FloatField(default=0.0, help_text="Valor del pico de consumo en kW.")
    
    # Metadatos
    calculated_at = models.DateTimeField(auto_now=True, help_text="Fecha y hora del cálculo.")
    
    class Meta:
        verbose_name = "Datos de Gráfico de Medidor Eléctrico"
        verbose_name_plural = "Datos de Gráficos de Medidores Eléctricos"
        unique_together = ['device', 'date']
        indexes = [
            models.Index(fields=['device', 'date']),
            models.Index(fields=['institution', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.device.name} - {self.date}"

# indicators/models.py    
class ElectricMeterEnergyConsumption(models.Model):
    device = models.ForeignKey('scada_proxy.Device', on_delete=models.CASCADE)
    institution = models.ForeignKey('scada_proxy.Institution', on_delete=models.CASCADE)
    date = models.DateField()
    time_range = models.CharField(max_length=20, choices=[
        ('daily', 'Diario'),
        ('monthly', 'Mensual')
    ])
    
    # Energía importada (kWh)
    imported_energy_low = models.FloatField(default=0.0)  # kWh
    imported_energy_high = models.FloatField(default=0.0)  # MWh convertido a kWh
    total_imported_energy = models.FloatField(default=0.0)  # Total en kWh
    
    # Energía exportada (kWh)
    exported_energy_low = models.FloatField(default=0.0)  # kWh
    exported_energy_high = models.FloatField(default=0.0)  # MWh convertido a kWh
    total_exported_energy = models.FloatField(default=0.0)  # Total en kWh
    
    # Balance neto
    net_energy_consumption = models.FloatField(default=0.0)  # kWh
    
    # Metadatos
    measurement_count = models.IntegerField(default=0)
    last_measurement_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['device', 'institution', 'date', 'time_range']
        indexes = [
            models.Index(fields=['device', 'date', 'time_range']),
            models.Index(fields=['institution', 'date', 'time_range'])
        ]