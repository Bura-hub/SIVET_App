#!/usr/bin/env python3
"""
Script de diagnóstico para verificar y reparar relaciones de dispositivos.
Ejecutar con: python manage.py shell < tests/diagnose_device_relationships.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution
from django.db.models import Q
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def diagnose_device_relationships():
    """Diagnostica el estado de las relaciones de dispositivos"""
    print("=" * 80)
    print("DIAGNÓSTICO DE RELACIONES DE DISPOSITIVOS")
    print("=" * 80)
    
    # 1. Contar dispositivos totales
    total_devices = Device.objects.count()
    active_devices = Device.objects.filter(is_active=True).count()
    
    print(f"\n📊 ESTADÍSTICAS GENERALES:")
    print(f"   Total de dispositivos: {total_devices}")
    print(f"   Dispositivos activos: {active_devices}")
    
    # 2. Verificar dispositivos con problemas
    devices_with_issues = Device.objects.filter(
        Q(category__isnull=True) | Q(institution__isnull=True)
    ).select_related('category', 'institution')
    
    print(f"\n⚠️  DISPOSITIVOS CON PROBLEMAS:")
    if devices_with_issues.exists():
        print(f"   Se encontraron {devices_with_issues.count()} dispositivos con relaciones faltantes:")
        for device in devices_with_issues:
            category_status = f"✅ {device.category.name}" if device.category else "❌ NULL"
            institution_status = f"✅ {device.institution.name}" if device.institution else "❌ NULL"
            print(f"   - {device.name} (ID: {device.id})")
            print(f"     Categoría: {category_status}")
            print(f"     Institución: {institution_status}")
            print()
    else:
        print("   ✅ No se encontraron dispositivos con problemas")
    
    # 3. Verificar categorías disponibles
    print(f"\n🏷️  CATEGORÍAS DISPONIBLES:")
    categories = DeviceCategory.objects.all()
    for cat in categories:
        device_count = Device.objects.filter(category=cat).count()
        print(f"   - {cat.name} (ID: {cat.id}): {device_count} dispositivos")
    
    # 4. Verificar instituciones disponibles
    print(f"\n🏛️  INSTITUCIONES DISPONIBLES:")
    institutions = Institution.objects.all()
    for inst in institutions:
        device_count = Device.objects.filter(institution=inst).count()
        print(f"   - {inst.name} (ID: {inst.id}): {device_count} dispositivos")
    
    # 5. Análisis de patrones de nombres
    print(f"\n🔍 ANÁLISIS DE PATRONES DE NOMBRES:")
    if devices_with_issues.exists():
        print("   Dispositivos que podrían ser reparados por patrones:")
        for device in devices_with_issues:
            name_lower = device.name.lower()
            suggestions = []
            
            if not device.category:
                if 'medidor' in name_lower or 'meter' in name_lower:
                    suggestions.append("electricmeter")
                elif 'inversor' in name_lower or 'inverter' in name_lower:
                    suggestions.append("inverter")
                elif 'estación' in name_lower or 'weather' in name_lower:
                    suggestions.append("weatherstation")
            
            if not device.institution:
                for inst in institutions:
                    if inst.name.lower() in name_lower:
                        suggestions.append(f"institución: {inst.name}")
                        break
            
            if suggestions:
                print(f"     - {device.name}: {', '.join(suggestions)}")
    
    return devices_with_issues

def test_repair_logic():
    """Prueba la lógica de reparación"""
    print(f"\n🔧 PRUEBA DE LÓGICA DE REPARACIÓN:")
    
    devices_with_issues = Device.objects.filter(
        Q(category__isnull=True) | Q(institution__isnull=True)
    ).select_related('category', 'institution')
    
    if not devices_with_issues.exists():
        print("   No hay dispositivos para reparar")
        return
    
    repaired_count = 0
    failed_count = 0
    
    for device in devices_with_issues:
        print(f"\n   Procesando: {device.name}")
        repaired = False
        
        # Intentar reparar categoría
        if not device.category:
            if 'medidor' in device.name.lower() or 'meter' in device.name.lower():
                category = DeviceCategory.objects.filter(name__icontains='electricmeter').first()
                if category:
                    device.category = category
                    repaired = True
                    print(f"     ✅ Categoría asignada: {category.name}")
            elif 'inversor' in device.name.lower() or 'inverter' in device.name.lower():
                category = DeviceCategory.objects.filter(name__icontains='inverter').first()
                if category:
                    device.category = category
                    repaired = True
                    print(f"     ✅ Categoría asignada: {category.name}")
            elif 'estación' in device.name.lower() or 'weather' in device.name.lower():
                category = DeviceCategory.objects.filter(name__icontains='weatherstation').first()
                if category:
                    device.category = category
                    repaired = True
                    print(f"     ✅ Categoría asignada: {category.name}")
        
        # Intentar reparar institución
        if not device.institution:
            for institution in Institution.objects.all():
                if institution.name.lower() in device.name.lower():
                    device.institution = institution
                    repaired = True
                    print(f"     ✅ Institución asignada: {institution.name}")
                    break
        
        if repaired:
            device.save()
            repaired_count += 1
            print(f"     💾 Dispositivo guardado")
        else:
            failed_count += 1
            print(f"     ❌ No se pudo reparar")
    
    print(f"\n   📊 RESULTADO DE LA REPARACIÓN:")
    print(f"      Reparados: {repaired_count}")
    print(f"      Fallidos: {failed_count}")

def main():
    """Función principal"""
    try:
        # Diagnóstico
        devices_with_issues = diagnose_device_relationships()
        
        # Preguntar si ejecutar reparación
        if devices_with_issues.exists():
            print(f"\n" + "=" * 80)
            response = input("¿Desea ejecutar la reparación automática? (s/n): ").lower().strip()
            
            if response in ['s', 'si', 'sí', 'y', 'yes']:
                test_repair_logic()
                
                # Verificar estado después de la reparación
                print(f"\n" + "=" * 80)
                print("VERIFICACIÓN POST-REPARACIÓN:")
                print("=" * 80)
                diagnose_device_relationships()
            else:
                print("Reparación cancelada por el usuario")
        else:
            print("\n✅ No se requiere reparación")
            
    except Exception as e:
        print(f"Error durante el diagnóstico: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
