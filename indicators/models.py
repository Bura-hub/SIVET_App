from django.db import models

class MonthlyConsumptionKPI(models.Model):
    """
    Modelo para almacenar el KPI de consumo total mensual pre-calculado.
    Solo debe haber una instancia de este modelo.
    """
    total_consumption_current_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes actual en kWh.")
    total_consumption_previous_month = models.FloatField(default=0.0, help_text="Consumo total acumulado del mes anterior en kWh.")
    last_calculated = models.DateTimeField(auto_now=True, help_text="Fecha y hora de la última vez que se calculó este KPI.")

    class Meta:
        verbose_name = "KPI de Consumo Mensual"
        verbose_name_plural = "KPIs de Consumo Mensual"

    def __str__(self):
        return f"Consumo Mensual KPI (Actualizado: {self.last_calculated.strftime('%Y-%m-%d %H:%M')})"