# Script para diagnosticar los datos de los gráficos
# Ejecutar desde el shell de Django: python manage.py shell

from datetime import datetime, timedelta
from indicators.models import DailyChartData
from django.db.models import Max

def debug_chart_data():
    """Diagnosticar los datos de los gráficos"""
    print("=== DIAGNÓSTICO DE DATOS DE GRÁFICOS ===")
    
    # 1. Verificar datos disponibles
    chart_data = DailyChartData.objects.all().order_by('-date')[:10]
    print(f"\n1. Últimos 10 registros de DailyChartData:")
    for item in chart_data:
        print(f"   Fecha: {item.date}, Consumo: {item.daily_consumption} kWh, Generación: {item.daily_generation} kWh")
    
    # 2. Verificar valores máximos
    max_consumption = DailyChartData.objects.aggregate(Max('daily_consumption'))['daily_consumption__max']
    max_generation = DailyChartData.objects.aggregate(Max('daily_generation'))['daily_generation__max']
    
    print(f"\n2. Valores máximos:")
    print(f"   Consumo máximo: {max_consumption} kWh")
    print(f"   Generación máxima: {max_generation} kWh")
    
    # 3. Verificar lógica de conversión
    print(f"\n3. Lógica de conversión:")
    if max_consumption >= 1_000_000:
        print(f"   Consumo debería ser GWh (≥1,000,000 kWh)")
    elif max_consumption >= 1_000:
        print(f"   Consumo debería ser MWh (≥1,000 kWh)")
    else:
        print(f"   Consumo debería ser kWh (<1,000 kWh)")
    
    if max_generation >= 1_000_000:
        print(f"   Generación debería ser GWh (≥1,000,000 kWh)")
    elif max_generation >= 1_000:
        print(f"   Generación debería ser MWh (≥1,000 kWh)")
    else:
        print(f"   Generación debería ser kWh (<1,000 kWh)")
    
    # 4. Simular la respuesta del endpoint
    print(f"\n4. Simulación de respuesta del endpoint:")
    consumption_values = [item.daily_consumption for item in chart_data if item.daily_consumption is not None]
    generation_values = [item.daily_generation for item in chart_data if item.daily_generation is not None]
    
    max_consumption_sample = max(consumption_values) if consumption_values else 0
    max_generation_sample = max(generation_values) if generation_values else 0
    
    print(f"   Muestra - Consumo máximo: {max_consumption_sample} kWh")
    print(f"   Muestra - Generación máxima: {max_generation_sample} kWh")
    
    # Determinar unidades
    if max_consumption_sample >= 1_000_000:
        consumption_unit = "GWh"
        consumption_divider = 1_000_000
    elif max_consumption_sample >= 1_000:
        consumption_unit = "MWh"
        consumption_divider = 1_000
    else:
        consumption_unit = "kWh"
        consumption_divider = 1
    
    if max_generation_sample >= 1_000_000:
        generation_unit = "GWh"
        generation_divider = 1_000_000
    elif max_generation_sample >= 1_000:
        generation_unit = "MWh"
        generation_divider = 1_000
    else:
        generation_unit = "kWh"
        generation_divider = 1
    
    print(f"\n   Unidades determinadas:")
    print(f"   Consumo: {consumption_unit} (divisor: {consumption_divider})")
    print(f"   Generación: {generation_unit} (divisor: {generation_divider})")
    
    # 5. Ejemplo de conversión
    if chart_data:
        sample_item = chart_data[0]
        converted_consumption = sample_item.daily_consumption / consumption_divider if sample_item.daily_consumption else 0
        converted_generation = sample_item.daily_generation / generation_divider if sample_item.daily_generation else 0
        
        print(f"\n5. Ejemplo de conversión (fecha: {sample_item.date}):")
        print(f"   Consumo original: {sample_item.daily_consumption} kWh → {converted_consumption} {consumption_unit}")
        print(f"   Generación original: {sample_item.daily_generation} kWh → {converted_generation} {generation_unit}")

# Ejecutar la función
debug_chart_data()
