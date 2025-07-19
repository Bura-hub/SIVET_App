from django.db import models
from django.contrib.postgres.fields import JSONField # Si usas Django < 3.1, para 3.1+ es models.JSONField
from django.utils import timezone
import uuid

# =========================
# Instituciones
# =========================
class Institution(models.Model):
    scada_id = models.CharField(max_length=255, unique=True, db_index=True)  # ID en la API SCADA
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Institutions"


# =========================
# Categorías de Dispositivos
# =========================
class DeviceCategory(models.Model):
    scada_id = models.CharField(max_length=255, unique=True, db_index=True)  # ID en la API SCADA
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Device Categories"


# =========================
# Dispositivos
# =========================
class Device(models.Model):
    # ID local
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ID remoto en SCADA
    scada_id = models.CharField(max_length=255, unique=True, db_index=True)

    # Información básica
    name = models.CharField(max_length=255)

    # Relaciones
    category = models.ForeignKey(DeviceCategory, on_delete=models.SET_NULL, null=True, related_name='devices')
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, related_name='devices')

    # Estado del dispositivo
    status = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.scada_id})"


# =========================
# Mediciones históricas
# =========================
class Measurement(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='measurements')
    date = models.DateTimeField(db_index=True)  # Fecha/hora exacta de la medición (compatible con la API)
    data = models.JSONField()  # Datos completos en formato JSON

    class Meta:
        unique_together = ('device', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.device.name} - {self.date}"
    
class TaskProgress(models.Model):
    task_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50, default='PENDING')  # PENDING, IN_PROGRESS, SUCCESS, FAILURE, CANCELLED
    processed_devices = models.IntegerField(default=0)
    total_devices = models.IntegerField(default=0)
    message = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(blank=True, null=True)
    is_cancelled = models.BooleanField(default=False)  # NUEVO CAMPO

    def progress_percent(self):
        return (self.processed_devices / self.total_devices * 100) if self.total_devices > 0 else 0

    def __str__(self):
        return f"Task {self.task_id} - {self.status}"
