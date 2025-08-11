#!/usr/bin/env python3
"""
Script para verificar que los indicadores eléctricos ahora tienen valores reales.
"""

import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from indicators.models import ElectricMeterIndicators
from scada_proxy.models import Device

def verify_indicators():
    """Verifica que los indicadores tengan valores reales."""
    print("🔍 Verificando indicadores eléctricos...")
    
    # Obtener algunos indicadores de muestra
    sample_indicators = ElectricMeterIndicators.objects.all()[:5]
    
    print(f"\n📊 Muestra de indicadores (primeros 5):")
    print("=" * 80)
    
    for i, indicator in enumerate(sample_indicators, 1):
        print(f"\n{i}. {indicator.device.name} - {indicator.date} ({indicator.time_range})")
        print(f"   • Energía importada: {indicator.imported_energy_kwh} kWh")
        print(f"   • Energía exportada: {indicator.exported_energy_kwh} kWh")
        print(f"   • Energía neta: {indicator.net_energy_consumption_kwh} kWh")
        print(f"   • Demanda pico: {indicator.peak_demand_kw} kW")
        print(f"   • Demanda promedio: {indicator.avg_demand_kw} kW")
        print(f"   • Factor de carga: {indicator.load_factor_pct}%")
        print(f"   • Factor de potencia: {indicator.avg_power_factor}")
        print(f"   • Desbalance tensión: {indicator.max_voltage_unbalance_pct}%")
        print(f"   • Desbalance corriente: {indicator.max_current_unbalance_pct}%")
        print(f"   • THD tensión: {indicator.max_voltage_thd_pct}%")
        print(f"   • THD corriente: {indicator.max_current_thd_pct}%")
        print(f"   • TDD corriente: {indicator.max_current_tdd_pct}%")
    
    # Verificar que no hay valores 0
    zero_indicators = ElectricMeterIndicators.objects.filter(
        imported_energy_kwh=0.0,
        exported_energy_kwh=0.0,
        net_energy_consumption_kwh=0.0,
        peak_demand_kw=0.0,
        avg_demand_kw=0.0
    )
    
    print(f"\n📈 Estadísticas de verificación:")
    print(f"   • Total de indicadores: {ElectricMeterIndicators.objects.count()}")
    print(f"   • Indicadores con valores 0: {zero_indicators.count()}")
    print(f"   • Indicadores con valores reales: {ElectricMeterIndicators.objects.count() - zero_indicators.count()}")
    
    if zero_indicators.count() == 0:
        print("✅ ¡Todos los indicadores tienen valores reales!")
    else:
        print(f"⚠️  Aún hay {zero_indicators.count()} indicadores con valores 0")
    
    # Mostrar algunos indicadores mensuales
    monthly_indicators = ElectricMeterIndicators.objects.filter(time_range='monthly')[:3]
    
    print(f"\n📅 Indicadores mensuales (primeros 3):")
    print("=" * 80)
    
    for i, indicator in enumerate(monthly_indicators, 1):
        print(f"\n{i}. {indicator.device.name} - {indicator.date} (Mensual)")
        print(f"   • Energía neta mensual: {indicator.net_energy_consumption_kwh} kWh")
        print(f"   • Demanda pico mensual: {indicator.peak_demand_kw} kW")
        print(f"   • Factor de carga mensual: {indicator.load_factor_pct}%")

if __name__ == "__main__":
    verify_indicators()
