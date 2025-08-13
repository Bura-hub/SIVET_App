#!/usr/bin/env python
"""
Script de diagnóstico para estaciones meteorológicas
Verifica por qué no se encuentran estaciones meteorológicas en el sistema
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution
from django.db.models import Q

def debug_weather_stations():
    print("=== DIAGNÓSTICO DE ESTACIONES METEOROLÓGICAS ===\n")
    
    # 1. Verificar categorías de dispositivos
    print("1. CATEGORÍAS DE DISPOSITIVOS:")
    categories = DeviceCategory.objects.all()
    if categories:
        for cat in categories:
            print(f"   - ID: {cat.id}, Nombre: {cat.name}, SCADA ID: {cat.scada_id}")
    else:
        print("   ❌ No hay categorías de dispositivos")
    
    # 2. Verificar si existe la categoría 3
    print(f"\n2. CATEGORÍA ID=3:")
    try:
        cat_3 = DeviceCategory.objects.get(id=3)
        print(f"   ✅ Encontrada: {cat_3.name} (SCADA ID: {cat_3.scada_id})")
    except DeviceCategory.DoesNotExist:
        print("   ❌ No existe categoría con ID=3")
        # Buscar categorías que puedan ser estaciones meteorológicas
        weather_cats = DeviceCategory.objects.filter(
            Q(name__icontains='weather') | 
            Q(name__icontains='meteorol') | 
            Q(name__icontains='estacion') |
            Q(name__icontains='clima')
        )
        if weather_cats:
            print("   🔍 Categorías que podrían ser estaciones meteorológicas:")
            for cat in weather_cats:
                print(f"      - ID: {cat.id}, Nombre: {cat.name}")
    
    # 3. Verificar instituciones
    print(f"\n3. INSTITUCIONES:")
    institutions = Institution.objects.all()
    if institutions:
        for inst in institutions:
            print(f"   - ID: {inst.id}, Nombre: {inst.name}, SCADA ID: {inst.scada_id}")
    else:
        print("   ❌ No hay instituciones")
    
    # 4. Verificar dispositivos por categoría
    print(f"\n4. DISPOSITIVOS POR CATEGORÍA:")
    for cat in categories:
        devices = Device.objects.filter(category=cat)
        print(f"   Categoría {cat.id} ({cat.name}): {devices.count()} dispositivos")
        if devices.count() > 0:
            for dev in devices[:3]:  # Mostrar solo los primeros 3
                print(f"      - {dev.name} (Institución: {dev.institution.name if dev.institution else 'N/A'})")
            if devices.count() > 3:
                print(f"      ... y {devices.count() - 3} más")
    
    # 5. Verificar dispositivos activos
    print(f"\n5. DISPOSITIVOS ACTIVOS:")
    active_devices = Device.objects.filter(is_active=True)
    print(f"   Total dispositivos activos: {active_devices.count()}")
    
    # 6. Verificar dispositivos sin categoría
    print(f"\n6. DISPOSITIVOS SIN CATEGORÍA:")
    no_category = Device.objects.filter(category__isnull=True)
    print(f"   Dispositivos sin categoría: {no_category.count()}")
    if no_category.count() > 0:
        for dev in no_category[:5]:
            print(f"      - {dev.name} (Institución: {dev.institution.name if dev.institution else 'N/A'})")
    
    # 7. Verificar dispositivos con categoría 3 específicamente
    print(f"\n7. DISPOSITIVOS CATEGORÍA 3 (ESTACIONES METEOROLÓGICAS):")
    try:
        weather_devices = Device.objects.filter(category_id=3, is_active=True)
        print(f"   Dispositivos categoría 3 activos: {weather_devices.count()}")
        if weather_devices.count() > 0:
            for dev in weather_devices:
                print(f"      - {dev.name} (Institución: {dev.institution.name if dev.institution else 'N/A'})")
        else:
            print("   ❌ No hay dispositivos activos en categoría 3")
    except Exception as e:
        print(f"   ❌ Error al buscar dispositivos categoría 3: {e}")
    
    # 8. Verificar dispositivos por nombre que podrían ser estaciones
    print(f"\n8. DISPOSITIVOS QUE PODRÍAN SER ESTACIONES METEOROLÓGICAS:")
    weather_like = Device.objects.filter(
        Q(name__icontains='weather') | 
        Q(name__icontains='meteorol') | 
        Q(name__icontains='estacion') |
        Q(name__icontains='clima') |
        Q(name__icontains='temp') |
        Q(name__icontains='hum') |
        Q(name__icontains='viento') |
        Q(name__icontains='wind')
    )
    print(f"   Dispositivos con nombres relacionados al clima: {weather_like.count()}")
    if weather_like.count() > 0:
        for dev in weather_like:
            print(f"      - {dev.name} (Categoría: {dev.category.name if dev.category else 'N/A'}, Institución: {dev.institution.name if dev.institution else 'N/A'})")
    
    print(f"\n=== FIN DEL DIAGNÓSTICO ===")

if __name__ == "__main__":
    debug_weather_stations()
