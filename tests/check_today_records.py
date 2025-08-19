#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from indicators.models import ElectricMeterIndicators
from indicators.tasks import get_colombia_date

def check_today_records():
    """Verifica y muestra los registros del día de hoy"""
    
    # Obtener la fecha de hoy en Colombia
    today = get_colombia_date()
    
    print("🔍 VERIFICACIÓN DE REGISTROS DE HOY")
    print("=" * 50)
    print(f"📅 Fecha de hoy: {today}")
    print(f"🌍 Zona horaria: Colombia (America/Bogota)")
    print()
    
    # Buscar registros de hoy
    records = ElectricMeterIndicators.objects.filter(date=today)
    
    print(f"📊 Total de registros encontrados: {records.count()}")
    print()
    
    if records.count() == 0:
        print("❌ No hay registros para hoy")
        print("💡 Esto puede indicar que:")
        print("   - Los datos aún no se han calculado")
        print("   - No hay mediciones disponibles")
        print("   - Hay un problema en el cálculo")
        return
    
    print("✅ REGISTROS ENCONTRADOS:")
    print("-" * 50)
    
    # Mostrar cada registro
    for i, record in enumerate(records, 1):
        print(f"{i:2d}. 📍 {record.device.name}")
        print(f"    🏢 Institución: {record.institution.name}")
        print(f"    ⚡ Energía Importada: {record.imported_energy_kwh:.2f} kWh")
        print(f"    📤 Energía Exportada: {record.exported_energy_kwh:.2f} kWh")
        print(f"    🔋 Consumo Neto: {record.net_energy_consumption_kwh:.2f} kWh")
        print(f"    📈 Demanda Pico: {record.peak_demand_kw:.2f} kW")
        print(f"    📊 Factor de Carga: {record.load_factor_pct:.1f}%")
        print(f"    ⚙️  Factor de Potencia: {record.avg_power_factor:.2f}")
        print(f"    🕐 Calculado: {record.calculated_at}")
        print()
    
    # Resumen estadístico
    print("📈 RESUMEN ESTADÍSTICO:")
    print("-" * 30)
    
    total_imported = sum(r.imported_energy_kwh for r in records)
    total_exported = sum(r.exported_energy_kwh for r in records)
    total_net = sum(r.net_energy_consumption_kwh for r in records)
    avg_peak_demand = sum(r.peak_demand_kw for r in records) / records.count()
    
    print(f"⚡ Energía Total Importada: {total_imported:.2f} kWh")
    print(f"📤 Energía Total Exportada: {total_exported:.2f} kWh")
    print(f"🔋 Consumo Neto Total: {total_net:.2f} kWh")
    print(f"📈 Demanda Pico Promedio: {avg_peak_demand:.2f} kW")
    print()
    
    # Verificar si hay datos recientes
    latest_record = records.order_by('-calculated_at').first()
    if latest_record:
        print(f"🕐 Último registro calculado: {latest_record.calculated_at}")
        print(f"📍 Dispositivo: {latest_record.device.name}")
    
    print()
    print("✅ Verificación completada")

if __name__ == "__main__":
    try:
        check_today_records()
    except Exception as e:
        print(f"❌ Error durante la verificación: {e}")
        import traceback
        traceback.print_exc()
