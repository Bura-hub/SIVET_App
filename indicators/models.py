from django.db import models

# Create your models here.
# python manage.py makemigrations
# python manage.py migrate
class Indicator(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre del Indicador")
    value = models.FloatField(verbose_name="Valor")
    unit = models.CharField(max_length=50, verbose_name="Unidad de Medida")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    source = models.CharField(max_length=100, verbose_name="Fuente de Datos") # Ej: 'electricidad', 'inversor', 'meteorológica'

    class Meta:
        ordering = ['-timestamp'] # Ordenar por fecha descendente
        verbose_name = "Indicador"
        verbose_name_plural = "Indicadores"

    def __str__(self):
        return f"{self.name} ({self.source}): {self.value} {self.unit} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"


