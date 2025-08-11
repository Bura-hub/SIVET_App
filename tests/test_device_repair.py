#!/usr/bin/env python3
"""
Script de prueba para verificar la funcionalidad de reparación de relaciones de dispositivos.
Este script simula el problema donde los dispositivos tienen category e institution como null
y luego prueba la funcionalidad de reparación automática.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution
from django.db import models

def test_device_repair():
    """Prueba la funcionalidad de reparación de dispositivos"""
    
    print("=" * 60)
    print("PRUEBA DE REPARACIÓN DE RELACIONES DE DISPOSITIVOS")
    print("=" * 60)
    
    # 1. Verificar el estado actual
    print("\n1. ESTADO ACTUAL DE LA BASE DE DATOS:")
    print("-" * 40)
    
    total_devices = Device.objects.count()
    devices_with_category = Device.objects.filter(category__isnull=False).count()
    devices_with_institution = Device.objects.filter(institution__isnull=False).count()
    devices_with_both = Device.objects.filter(
        models.Q(category__isnull=False) & models.Q(institution__isnull=False)
    ).count()
    
    print(f"Total de dispositivos: {total_devices}")
    print(f"Dispositivos con categoría: {devices_with_category}")
    print(f"Dispositivos con institución: {devices_with_institution}")
    print(f"Dispositivos con ambas relaciones: {devices_with_both}")
    
    # 2. Mostrar dispositivos con problemas
    print("\n2. DISPOSITIVOS CON RELACIONES FALTANTES:")
    print("-" * 40)
    
    devices_with_issues = Device.objects.filter(
        models.Q(category__isnull=True) | models.Q(institution__isnull=True)
    ).select_related('category', 'institution')
    
    if devices_with_issues.exists():
        for device in devices_with_issues:
            print(f"  - {device.name} (ID: {device.id}):")
            print(f"    Categoría: {device.category or 'NULL'}")
            print(f"    Institución: {device.institution or 'NULL'}")
    else:
        print("  No hay dispositivos con problemas.")
    
    # 3. Mostrar categorías disponibles
    print("\n3. CATEGORÍAS DISPONIBLES:")
    print("-" * 40)
    
    categories = DeviceCategory.objects.all()
    for cat in categories:
        print(f"  - {cat.name} (ID: {cat.id}, SCADA ID: {cat.scada_id})")
    
    # 4. Mostrar instituciones disponibles
    print("\n4. INSTITUCIONES DISPONIBLES:")
    print("-" * 40)
    
    institutions = Institution.objects.all()
    for inst in institutions:
        print(f"  - {inst.name} (ID: {inst.id}, SCADA ID: {inst.scada_id})")
    
    # 5. Simular reparación manual
    print("\n5. SIMULANDO REPARACIÓN MANUAL:")
    print("-" * 40)
    
    repaired_count = 0
    for device in devices_with_issues:
        try:
            repaired = False
            changes = []
            
            # Intentar encontrar categoría por nombre del dispositivo
            if not device.category:
                if 'medidor' in device.name.lower() or 'meter' in device.name.lower():
                    category = DeviceCategory.objects.filter(name__icontains='electricmeter').first()
                    if category:
                        device.category = category
                        repaired = True
                        changes.append(f"Categoría asignada: {category.name}")
                elif 'inversor' in device.name.lower() or 'inverter' in device.name.lower():
                    category = DeviceCategory.objects.filter(name__icontains='inverter').first()
                    if category:
                        device.category = category
                        repaired = True
                        changes.append(f"Categoría asignada: {category.name}")
                elif 'estación' in device.name.lower() or 'weather' in device.name.lower():
                    category = DeviceCategory.objects.filter(name__icontains='weatherstation').first()
                    if category:
                        device.category = category
                        repaired = True
                        changes.append(f"Categoría asignada: {category.name}")
            
            # Intentar encontrar institución por nombre del dispositivo
            if not device.institution:
                for institution in Institution.objects.all():
                    if institution.name.lower() in device.name.lower():
                        device.institution = institution
                        repaired = True
                        changes.append(f"Institución asignada: {institution.name}")
                        break
            
            if repaired:
                device.save()
                repaired_count += 1
                print(f"  ✓ {device.name} reparado: {', '.join(changes)}")
            else:
                print(f"  ✗ {device.name}: No se pudo determinar categoría o institución")
                
        except Exception as e:
            print(f"  ✗ {device.name}: Error - {e}")
    
    # 6. Verificar estado después de la reparación
    print("\n6. ESTADO DESPUÉS DE LA REPARACIÓN:")
    print("-" * 40)
    
    devices_with_issues_after = Device.objects.filter(
        models.Q(category__isnull=True) | models.Q(institution__isnull=True)
    ).count()
    
    devices_with_both_after = Device.objects.filter(
        models.Q(category__isnull=False) & models.Q(institution__isnull=False)
    ).count()
    
    print(f"Dispositivos con problemas restantes: {devices_with_issues_after}")
    print(f"Dispositivos con ambas relaciones: {devices_with_both_after}")
    print(f"Dispositivos reparados en esta sesión: {repaired_count}")
    
    # 7. Recomendaciones
    print("\n7. RECOMENDACIONES:")
    print("-" * 40)
    
    if devices_with_issues_after == 0:
        print("  ✓ Todos los dispositivos tienen sus relaciones completas.")
        print("  ✓ El sistema está funcionando correctamente.")
    else:
        print(f"  ⚠ Aún hay {devices_with_issues_after} dispositivos con problemas.")
        print("  ⚠ Considere ejecutar la sincronización completa o revisar manualmente.")
    
    print("\n" + "=" * 60)
    print("PRUEBA COMPLETADA")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_device_repair()
    except Exception as e:
        print(f"Error durante la prueba: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
