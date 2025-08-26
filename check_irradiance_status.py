#!/usr/bin/env python
"""
Script simple para verificar el estado de las migraciones y datos de irradiancia
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

try:
    django.setup()
    print("✅ Django configurado correctamente")
except Exception as e:
    print(f"❌ Error configurando Django: {e}")
    sys.exit(1)

try:
    from django.db import connection
    from django.core.management import execute_from_command_line
    
    print("\n=== VERIFICANDO MIGRACIONES ===")
    
    # Verificar migraciones
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT app, name, applied 
            FROM django_migrations 
            WHERE app = 'indicators' 
            ORDER BY id DESC 
            LIMIT 10
        """)
        
        migrations = cursor.fetchall()
        print("Últimas migraciones de indicators:")
        for app, name, applied in migrations:
            status = "✅" if applied else "❌"
            print(f"  {status} {name}")
    
    # Verificar si existen los campos de irradiancia
    print("\n=== VERIFICANDO CAMPOS DE IRRADIANCIA ===")
    
    # Verificar DailyChartData
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'indicators_dailychartdata' 
        AND column_name LIKE '%irradiance%'
    """)
    
    irradiance_fields = cursor.fetchall()
    if irradiance_fields:
        print("✅ Campos de irradiancia en DailyChartData:")
        for field, data_type in irradiance_fields:
            print(f"  - {field}: {data_type}")
    else:
        print("❌ No se encontraron campos de irradiancia en DailyChartData")
    
    # Verificar MonthlyConsumptionKPI
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'indicators_monthlyconsumptionkpi' 
        AND column_name LIKE '%irradiance%'
    """)
    
    irradiance_kpi_fields = cursor.fetchall()
    if irradiance_kpi_fields:
        print("✅ Campos de irradiancia en MonthlyConsumptionKPI:")
        for field, data_type in irradiance_kpi_fields:
            print(f"  - {field}: {data_type}")
    else:
        print("❌ No se encontraron campos de irradiancia en MonthlyConsumptionKPI")
    
    # Verificar datos existentes
    print("\n=== VERIFICANDO DATOS EXISTENTES ===")
    
    # Verificar DailyChartData
    cursor.execute("""
        SELECT COUNT(*) as total_records,
               COUNT(avg_irradiance) as records_with_irradiance,
               AVG(avg_irradiance) as avg_irradiance_value
        FROM indicators_dailychartdata
    """)
    
    daily_data = cursor.fetchone()
    if daily_data:
        total, with_irradiance, avg_value = daily_data
        print(f"📊 DailyChartData:")
        print(f"  - Total de registros: {total}")
        print(f"  - Registros con irradiancia: {with_irradiance}")
        print(f"  - Valor promedio de irradiancia: {avg_value or 'N/A'}")
    
    # Verificar MonthlyConsumptionKPI
    cursor.execute("""
        SELECT COUNT(*) as total_records,
               COUNT(avg_irradiance_current_month) as records_with_current,
               COUNT(avg_irradiance_previous_month) as records_with_previous,
               AVG(avg_irradiance_current_month) as avg_current,
               AVG(avg_irradiance_previous_month) as avg_previous
        FROM indicators_monthlyconsumptionkpi
    """)
    
    monthly_data = cursor.fetchone()
    if monthly_data:
        total, with_current, with_previous, avg_current, avg_previous = monthly_data
        print(f"📊 MonthlyConsumptionKPI:")
        print(f"  - Total de registros: {total}")
        print(f"  - Registros con irradiancia actual: {with_current}")
        print(f"  - Registros con irradiancia anterior: {with_previous}")
        print(f"  - Promedio actual: {avg_current or 'N/A'}")
        print(f"  - Promedio anterior: {avg_previous or 'N/A'}")
    
    print("\n=== RESUMEN ===")
    if irradiance_fields and irradiance_kpi_fields:
        print("✅ Los campos de irradiancia están presentes en la base de datos")
        if daily_data and monthly_data:
            if daily_data[1] > 0 or monthly_data[1] > 0:
                print("✅ Hay datos de irradiancia en la base de datos")
            else:
                print("⚠️  Los campos existen pero no hay datos de irradiancia")
                print("   Esto puede indicar que:")
                print("   - No se han ejecutado las tareas de cálculo")
                print("   - No hay datos de irradiancia en SCADA")
                print("   - El campo en SCADA se llama diferente")
        else:
            print("❌ No se pudieron verificar los datos")
    else:
        print("❌ Faltan campos de irradiancia en la base de datos")
        print("   Necesitas ejecutar las migraciones:")
        print("   1. python manage.py migrate indicators 0022")
        print("   2. python manage.py migrate indicators 0023")
    
except Exception as e:
    print(f"❌ Error durante la verificación: {e}")
    import traceback
    traceback.print_exc()
