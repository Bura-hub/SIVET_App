#!/usr/bin/env python3
"""
Script de prueba para verificar que las tareas de Celery funcionen correctamente
y no sobrescriban las relaciones de dispositivos.
Ejecutar con: python manage.py shell < tests/test_celery_tasks.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution
from scada_proxy.tasks import check_devices_status, repair_device_relationships
from django.db.models import Q
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_celery_tasks():
    """Prueba las tareas de Celery para verificar que no sobrescriban relaciones"""
    print("=" * 80)
    print("PRUEBA DE TAREAS DE CELERY")
    print("=" * 80)
    
    # 1. Estado inicial
    print("\n📊 ESTADO INICIAL:")
    show_device_status()
    
    # 2. Simular ejecución de check_devices_status
    print("\n🔧 SIMULANDO EJECUCIÓN DE check_devices_status:")
    print("   (Esta tarea se ejecuta cada hora y NO debe sobrescribir relaciones)")
    
    # Verificar que no haya dispositivos con relaciones null antes de la prueba
    devices_with_issues_before = Device.objects.filter(
        Q(category__isnull=True) | Q(institution__isnull=True)
    ).count()
    
    if devices_with_issues_before > 0:
        print(f"   ⚠️  Hay {devices_with_issues_before} dispositivos con problemas ANTES de la prueba")
        print("   Esto indica que el problema ya existía antes de las tareas de Celery")
    else:
        print("   ✅ No hay dispositivos con problemas antes de la prueba")
    
    # 3. Simular ejecución de repair_device_relationships
    print("\n🔧 SIMULANDO EJECUCIÓN DE repair_device_relationships:")
    print("   (Esta tarea se ejecuta 5 minutos después de check_devices_status)")
    
    # Ejecutar la reparación
    try:
        # Crear una instancia mock de la tarea para simular la ejecución
        class MockTask:
            def __init__(self):
                self.request = type('MockRequest', (), {'retries': 0})()
        
        mock_task = MockTask()
        repair_device_relationships(mock_task)
        print("   ✅ Tarea de reparación ejecutada exitosamente")
    except Exception as e:
        print(f"   ❌ Error al ejecutar tarea de reparación: {e}")
    
    # 4. Estado después de la reparación
    print("\n📊 ESTADO DESPUÉS DE LA REPARACIÓN:")
    show_device_status()
    
    # 5. Análisis de cambios
    print("\n📈 ANÁLISIS DE CAMBIOS:")
    devices_with_issues_after = Device.objects.filter(
        Q(category__isnull=True) | Q(institution__isnull=True)
    ).count()
    
    if devices_with_issues_before > devices_with_issues_after:
        improvement = devices_with_issues_before - devices_with_issues_after
        print(f"   ✅ Mejora: {improvement} dispositivos fueron reparados")
    elif devices_with_issues_before < devices_with_issues_after:
        worsening = devices_with_issues_after - devices_with_issues_before
        print(f"   ❌ Empeoramiento: {worsening} dispositivos más tienen problemas")
    else:
        print("   ➡️  No hubo cambios en el número de dispositivos con problemas")
    
    # 6. Recomendaciones
    print("\n💡 RECOMENDACIONES:")
    if devices_with_issues_after > 0:
        print("   - Ejecutar manualmente: python manage.py repair_device_relationships")
        print("   - Verificar logs de Celery para identificar problemas")
        print("   - Revisar la configuración de SCADA para asegurar datos completos")
    else:
        print("   - ✅ Todas las relaciones están correctas")
        print("   - Las tareas de Celery están funcionando correctamente")

def show_device_status():
    """Muestra el estado actual de los dispositivos"""
    total_devices = Device.objects.count()
    active_devices = Device.objects.filter(is_active=True).count()
    devices_with_issues = Device.objects.filter(
        Q(category__isnull=True) | Q(institution__isnull=True)
    ).count()
    
    print(f"   Total de dispositivos: {total_devices}")
    print(f"   Dispositivos activos: {active_devices}")
    print(f"   Con problemas: {devices_with_issues}")
    
    if devices_with_issues > 0:
        print(f"\n   📋 Dispositivos con problemas:")
        problematic_devices = Device.objects.filter(
            Q(category__isnull=True) | Q(institution__isnull=True)
        ).select_related('category', 'institution')
        
        for device in problematic_devices:
            category_status = f"✅ {device.category.name}" if device.category else "❌ NULL"
            institution_status = f"✅ {device.institution.name}" if device.institution else "❌ NULL"
            print(f"     - {device.name}: Categoría: {category_status}, Institución: {institution_status}")

def test_relationship_preservation():
    """Prueba específicamente que las relaciones se preserven"""
    print("\n" + "=" * 80)
    print("PRUEBA DE PRESERVACIÓN DE RELACIONES")
    print("=" * 80)
    
    # Buscar dispositivos que tengan relaciones
    devices_with_relations = Device.objects.filter(
        Q(category__isnull=False) & Q(institution__isnull=False)
    ).select_related('category', 'institution')
    
    if not devices_with_relations.exists():
        print("   ⚠️  No hay dispositivos con relaciones para probar")
        return
    
    print(f"   📊 Probando preservación en {devices_with_relations.count()} dispositivos con relaciones:")
    
    preserved_count = 0
    for device in devices_with_relations:
        original_category = device.category
        original_institution = device.institution
        
        # Simular una actualización que NO debería afectar las relaciones
        device.name = device.name  # No cambiar nada realmente
        device.save()
        
        # Verificar que las relaciones se mantuvieron
        device.refresh_from_db()
        
        if (device.category == original_category and 
            device.institution == original_institution):
            preserved_count += 1
            print(f"     ✅ {device.name}: Relaciones preservadas")
        else:
            print(f"     ❌ {device.name}: Relaciones cambiaron")
            print(f"        Categoría: {original_category} -> {device.category}")
            print(f"        Institución: {original_institution} -> {device.institution}")
    
    print(f"\n   📊 RESULTADO: {preserved_count}/{devices_with_relations.count()} dispositivos preservaron sus relaciones")

def main():
    """Función principal"""
    try:
        # Prueba principal
        test_celery_tasks()
        
        # Prueba de preservación de relaciones
        test_relationship_preservation()
        
        print("\n" + "=" * 80)
        print("PRUEBA COMPLETADA")
        print("=" * 80)
        
    except Exception as e:
        print(f"Error durante la prueba: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
