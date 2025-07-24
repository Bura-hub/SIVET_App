import os
import sys
import django

# Agregar la ruta raíz (donde está manage.py)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configurar las settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Inicializar Django
django.setup()

# Ahora importa tu modelo
from indicators.models import MonthlyConsumptionKPI
from scada_proxy.models import Measurement
from datetime import datetime, timedelta, timezone
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Cast

# Reemplaza con el ID de un medidor eléctrico real de tu DB
meter_db_id = 1 

# Define un rango de fechas reciente (ej. últimos 30 días)
today = datetime.now(timezone.utc).date()
start_date_check = today - timedelta(days=30)

# Busca mediciones con los campos de balance no nulos para ese medidor
sample_measurements = Measurement.objects.filter(
    device__id=meter_db_id,
    date__date__gte=start_date_check,
    data__importedActivePowerLow__isnull=False,
    data__importedActivePowerHigh__isnull=False,
    data__exportedActivePowerLow__isnull=False,
    data__exportedActivePowerHigh__isnull=False
).order_by('-date')[:20] # Obtén las 20 mediciones más recientes

print(f"\nVerificando mediciones de balance para medidor ID {meter_db_id} desde {start_date_check}:")
if sample_measurements:
    for m in sample_measurements:
        imported_low = m.data.get('importedActivePowerLow')
        imported_high = m.data.get('importedActivePowerHigh')
        exported_low = m.data.get('exportedActivePowerLow')
        exported_high = m.data.get('exportedActivePowerHigh')

        print(f"  Fecha: {m.date.isoformat()}")
        print(f"    importedActivePowerLow: {imported_low}")
        print(f"    importedActivePowerHigh: {imported_high}")
        print(f"    exportedActivePowerLow: {exported_low}")
        print(f"    exportedActivePowerHigh: {exported_high}")

        if (imported_low is None or imported_low == 0) and \
           (imported_high is None or imported_high == 0) and \
           (exported_low is None or exported_low == 0) and \
           (exported_high is None or exported_high == 0):
            print("    ¡Advertencia! Todos los campos de importación/exportación son Nulos o Cero en esta medición.")
else:
    print(f"No se encontraron mediciones con los campos de balance para el medidor {meter_db_id} en el rango de fechas.")
    print("Esto indica que la tarea de recolección de mediciones no está funcionando o no está trayendo estos datos.")

# Ahora, simula la suma para el mes actual y el mes anterior para ese medidor específico
today = datetime.now(timezone.utc).date()
start_current_month = today.replace(day=1)
end_current_month = today
first_day_current_month = today.replace(day=1)
last_day_previous_month = first_day_current_month - timedelta(days=1)
start_previous_month = last_day_previous_month.replace(day=1)
end_previous_month = last_day_previous_month

# Suma de importaciones para el mes actual
current_imported_low_kwh_test = Measurement.objects.filter(
    device__id=meter_db_id,
    date__date__range=(start_current_month, end_current_month),
    data__importedActivePowerLow__isnull=False
).aggregate(
    total_sum=Sum(Cast(F('data__importedActivePowerLow'), FloatField()))
)['total_sum'] or 0.0

current_imported_high_mwh_test = Measurement.objects.filter(
    device__id=meter_db_id,
    date__date__range=(start_current_month, end_current_month),
    data__importedActivePowerHigh__isnull=False
).aggregate(
    total_sum=Sum(Cast(F('data__importedActivePowerHigh'), FloatField()))
)['total_sum'] or 0.0
total_imported_current_month_kwh_test = current_imported_low_kwh_test + (current_imported_high_mwh_test * 1000)

# Suma de exportaciones para el mes actual
current_exported_low_kwh_test = Measurement.objects.filter(
    device__id=meter_db_id,
    date__date__range=(start_current_month, end_current_month),
    data__exportedActivePowerLow__isnull=False
).aggregate(
    total_sum=Sum(Cast(F('data__exportedActivePowerLow'), FloatField()))
)['total_sum'] or 0.0

current_exported_high_mwh_test = Measurement.objects.filter(
    device__id=meter_db_id,
    date__date__range=(start_current_month, end_current_month),
    data__exportedActivePowerHigh__isnull=False
).aggregate(
    total_sum=Sum(Cast(F('data__exportedActivePowerHigh'), FloatField()))
)['total_sum'] or 0.0
total_exported_current_month_kwh_test = current_exported_low_kwh_test + (current_exported_high_mwh_test * 1000)

net_balance_current_month_test = total_imported_current_month_kwh_test - total_exported_current_month_kwh_test

print(f"\nBalance Energético para medidor {meter_db_id} (prueba):")
print(f"  Importado Mes Actual (test): {total_imported_current_month_kwh_test} kWh")
print(f"  Exportado Mes Actual (test): {total_exported_current_month_kwh_test} kWh")
print(f"  Balance Neto Mes Actual (test): {net_balance_current_month_test} kWh")