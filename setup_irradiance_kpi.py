#!/usr/bin/env python
"""
Script para configurar y calcular el KPI de irradiancia solar.
Este script:
1. Ejecuta las migraciones necesarias
2. Ejecuta la tarea de cálculo de KPIs mensuales
3. Verifica que los datos se hayan calculado correctamente
"""

import os
import sys
import django
from datetime import datetime, timedelta, timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import execute_from_command_line
from indicators.tasks import calculate_monthly_consumption_kpi
from indicators.models import MonthlyConsumptionKPI

def run_migrations():
    """Ejecuta las migraciones para agregar los campos de irradiancia"""
    print("=== EJECUTANDO MIGRACIONES ===")
    
    try:
        # Ejecutar la migración de DailyChartData
        print("1. Ejecutando migración para DailyChartData...")
        execute_from_command_line(['manage.py', 'migrate', 'indicators', '0022'])
        
        # Ejecutar la migración de MonthlyConsumptionKPI
        print("2. Ejecutando migración para MonthlyConsumptionKPI...")
        execute_from_command_line(['manage.py', 'migrate', 'indicators', '0023'])
        
        print("✅ Migraciones ejecutadas correctamente")
        return True
    except Exception as e:
        print(f"❌ Error al ejecutar migraciones: {e}")
        return False

def run_kpi_calculation():
    """Ejecuta la tarea de cálculo de KPIs mensuales"""
    print("\n=== EJECUTANDO CÁLCULO DE KPIs ===")
    
    try:
        print("Calculando KPIs mensuales (incluyendo irradiancia)...")
        
        # Ejecutar la tarea
        result = calculate_monthly_consumption_kpi()
        
        print(f"✅ Tarea completada: {result}")
        return True
        
    except Exception as e:
        print(f"❌ Error al calcular KPIs: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_data():
    """Verifica que los datos de irradiancia se hayan calculado correctamente"""
    print("\n=== VERIFICANDO DATOS ===")
    
    try:
        # Obtener el registro de KPIs
        kpi_record = MonthlyConsumptionKPI.objects.first()
        
        if not kpi_record:
            print("❌ No se encontró registro de KPIs")
            return False
        
        print(f"📊 Última actualización: {kpi_record.last_calculated}")
        print(f"📊 Consumo actual: {kpi_record.total_consumption_current_month:.2f} kWh")
        print(f"📊 Generación actual: {kpi_record.total_generation_current_month:.2f} kWh")
        print(f"📊 Temperatura actual: {kpi_record.avg_daily_temp_current_month:.2f} °C")
        print(f"📊 Humedad actual: {kpi_record.avg_relative_humidity_current_month:.2f} %")
        print(f"📊 Viento actual: {kpi_record.avg_wind_speed_current_month:.2f} km/h")
        print(f"📊 Irradiancia actual: {kpi_record.avg_irradiance_current_month:.2f} W/m²")
        print(f"📊 Irradiancia anterior: {kpi_record.avg_irradiance_previous_month:.2f} W/m²")
        
        # Verificar que los campos de irradiancia no sean 0 (a menos que sea real)
        if kpi_record.avg_irradiance_current_month == 0:
            print("⚠️  La irradiancia actual es 0. Esto puede ser normal si:")
            print("   - No hay datos de irradiancia en el SCADA")
            print("   - Los dispositivos no están enviando datos")
            print("   - El campo en SCADA se llama diferente")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al verificar datos: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 CONFIGURANDO KPI DE IRRADIANCIA SOLAR")
    print("Este script configurará el sistema para calcular irradiancia solar.")
    print()
    
    # Paso 1: Ejecutar migraciones
    if not run_migrations():
        print("❌ Fallaron las migraciones. Abortando...")
        sys.exit(1)
    
    # Paso 2: Ejecutar cálculo de KPIs
    if not run_kpi_calculation():
        print("❌ Falló el cálculo de KPIs. Abortando...")
        sys.exit(1)
    
    # Paso 3: Verificar datos
    if not verify_data():
        print("❌ Falló la verificación de datos. Abortando...")
        sys.exit(1)
    
    print("\n=== CONFIGURACIÓN COMPLETADA EXITOSAMENTE ===")
    print("✅ Migraciones ejecutadas")
    print("✅ KPIs calculados")
    print("✅ Datos verificados")
    
    print("\n📝 Próximos pasos:")
    print("   1. El dashboard ahora mostrará el KPI de irradiancia")
    print("   2. Los datos se actualizarán automáticamente cada vez que se ejecute la tarea")
    print("   3. Verifica que el campo 'irradiance' en SCADA se llame correctamente")
    
    print("\n🔍 Para monitorear:")
    print("   - Admin de Django: /admin/indicators/monthlyconsumptionkpi/")
    print("   - API de KPIs: /api/dashboard/summary/")
    print("   - Logs de Celery para ver el progreso de las tareas")

if __name__ == "__main__":
    main()
