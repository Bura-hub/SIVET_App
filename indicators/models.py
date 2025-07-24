from django.db import models

class MonthlyConsumptionKPI(models.Model):
    """
    Modelo para almacenar los KPIs de consumo, generación y balance total mensual pre-calculados.
    Solo debe haber una instancia de este modelo.
    """
    total_consumption_current_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes actual en kWh.")
    total_consumption_previous_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes anterior en kWh.")
    
    total_generation_current_month = models.FloatField(default=0.0, help_text="Generación total acumulada del mes actual en Wh.")
    total_generation_previous_month = models.FloatField(default=0.0, help_text="Generación total acumulada del mes anterior en Wh.")

    # Nuevos campos para el balance energético (en kWh para consistencia)
    total_imported_current_month = models.FloatField(default=0.0, help_text="Energía total importada del mes actual en kWh.")
    total_imported_previous_month = models.FloatField(default=0.0, help_text="Energía total importada del mes anterior en kWh.")
    total_exported_current_month = models.FloatField(default=0.0, help_text="Energía total exportada del mes actual en kWh.")
    total_exported_previous_month = models.FloatField(default=0.0, help_text="Energía total exportada del mes anterior en kWh.")

    last_calculated = models.DateTimeField(auto_now=True, help_text="Fecha y hora de la última vez que se calculó este KPI.")

    class Meta:
        verbose_name = "KPI de Consumo, Generación y Balance Mensual"
        verbose_name_plural = "KPIs de Consumo, Generación y Balance Mensual"

    def __str__(self):
        return f"KPI Mensual (Actualizado: {self.last_calculated.strftime('%Y-%m-%d %H:%M')})"