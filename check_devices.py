#!/usr/bin/env python3
"""
Script para verificar el estado de los dispositivos usando Django
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution
from indicators.models import ElectricMeterIndicators

def check_devices():
    """Verifica el estado de los dispositivos"""
    print("🔍 VERIFICACIÓN DE DISPOSITIVOS")
    print("=" * 50)
    
    # Verificar categorías
    print("\n📋 Categorías de dispositivos:")
    categories = DeviceCategory.objects.all()
    for cat in categories:
        device_count = Device.objects.filter(category=cat).count()
        print(f"  - ID {cat.id}: {cat.name} ({device_count} dispositivos)")
    
    # Verificar dispositivos eléctricos específicamente
    print("\n⚡ Medidores eléctricos:")
    try:
        electric_meters = Device.objects.filter(category__name='electricMeter')
        print(f"  Total encontrados: {electric_meters.count()}")
        
        if electric_meters.exists():
            for device in electric_meters:
                institution_name = device.institution.name if device.institution else "Sin institución"
                status = "✅ Activo" if device.is_active else "❌ Inactivo"
                print(f"    - ID {device.id}: {device.name} ({status}) - {institution_name}")
        else:
            print("  ❌ No se encontraron medidores eléctricos")
            
            # Verificar si hay dispositivos con categoría similar
            similar_categories = DeviceCategory.objects.filter(name__icontains='electric')
            if similar_categories.exists():
                print("  💡 Categorías similares encontradas:")
                for cat in similar_categories:
                    device_count = Device.objects.filter(category=cat).count()
                    print(f"    - {cat.name}: {device_count} dispositivos")
            
            # Verificar todos los dispositivos
            all_devices = Device.objects.all()[:10]
            if all_devices.exists():
                print("  📊 Primeros 10 dispositivos en la base de datos:")
                for device in all_devices:
                    cat_name = device.category.name if device.category else "Sin categoría"
                    inst_name = device.institution.name if device.institution else "Sin institución"
                    print(f"    - ID {device.id}: {device.name} (Categoría: {cat_name}) - {inst_name}")
    
    except Exception as e:
        print(f"  ❌ Error verificando medidores eléctricos: {e}")
    
    # Verificar instituciones
    print("\n🏛️ Instituciones:")
    institutions = Institution.objects.all()
    for inst in institutions:
        device_count = Device.objects.filter(institution=inst).count()
        print(f"  - ID {inst.id}: {inst.name} ({device_count} dispositivos)")
    
    # Verificar indicadores existentes
    print("\n📊 Indicadores eléctricos existentes:")
    try:
        indicators_count = ElectricMeterIndicators.objects.count()
        print(f"  Total de indicadores: {indicators_count}")
        
        if indicators_count > 0:
            latest_indicator = ElectricMeterIndicators.objects.order_by('-date').first()
            print(f"  Indicador más reciente: {latest_indicator.date} para {latest_indicator.device.name}")
        else:
            print("  ❌ No hay indicadores calculados aún")
    
    except Exception as e:
        print(f"  ❌ Error verificando indicadores: {e}")

def suggest_solutions():
    """Sugiere soluciones basadas en los problemas encontrados"""
    print("\n💡 SOLUCIONES SUGERIDAS")
    print("=" * 50)
    
    electric_meters = Device.objects.filter(category__name='electricMeter')
    
    if electric_meters.count() == 0:
        print("❌ PROBLEMA: No hay medidores eléctricos en la base de datos")
        print("\n🔧 SOLUCIONES:")
        print("1. Verifica que exista la categoría 'electricMeter' en DeviceCategory")
        print("2. Asegúrate de que los dispositivos estén asociados a esta categoría")
        print("3. Verifica que los dispositivos estén marcados como activos (is_active=True)")
        print("4. Ejecuta las migraciones: python manage.py migrate")
        
        # Verificar si la categoría existe
        try:
            category = DeviceCategory.objects.filter(name='electricMeter').first()
            if category:
                print(f"✅ La categoría 'electricMeter' existe (ID: {category.id})")
            else:
                print("❌ La categoría 'electricMeter' NO existe")
                print("   Crea la categoría o verifica el nombre exacto")
        except Exception as e:
            print(f"❌ Error verificando categoría: {e}")
    
    else:
        print("✅ Hay medidores eléctricos disponibles")
        print(f"   Total: {electric_meters.count()}")
        
        # Verificar si están activos
        active_meters = electric_meters.filter(is_active=True)
        if active_meters.count() < electric_meters.count():
            print("⚠️  Algunos medidores están inactivos")
            print("   Asegúrate de que is_active=True para los medidores que quieras procesar")

if __name__ == "__main__":
    try:
        check_devices()
        suggest_solutions()
    except Exception as e:
        print(f"\n❌ ERROR GENERAL: {e}")
        print("💡 Asegúrate de que:")
        print("   - Django esté configurado correctamente")
        print("   - La base de datos esté accesible")
        print("   - Las migraciones se hayan ejecutado")
