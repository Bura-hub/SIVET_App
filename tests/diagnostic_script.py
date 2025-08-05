# Script de diagnóstico para verificar el estado de la base de datos
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Institution

def diagnostic():
    print("=== DIAGNÓSTICO DE LA BASE DE DATOS ===\n")
    
    # Verificar categorías
    print("1. CATEGORÍAS DE DISPOSITIVOS:")
    categories = DeviceCategory.objects.all()
    print(f"   Total de categorías: {categories.count()}")
    for cat in categories:
        print(f"   - ID: {cat.id}, SCADA_ID: {cat.scada_id}, Nombre: {cat.name}")
    
    print("\n2. INSTITUCIONES:")
    institutions = Institution.objects.all()
    print(f"   Total de instituciones: {institutions.count()}")
    for inst in institutions:
        print(f"   - ID: {inst.id}, SCADA_ID: {inst.scada_id}, Nombre: {inst.name}")
    
    print("\n3. DISPOSITIVOS:")
    devices = Device.objects.all()
    print(f"   Total de dispositivos: {devices.count()}")
    for dev in devices:
        print(f"   - ID: {dev.id}, SCADA_ID: {dev.scada_id}, Nombre: {dev.name}")
        print(f"     Categoría: {dev.category.name if dev.category else 'NULL'}")
        print(f"     Institución: {dev.institution.name if dev.institution else 'NULL'}")
    
    print("\n4. DISPOSITIVOS SIN CATEGORÍA:")
    devices_without_category = Device.objects.filter(category__isnull=True)
    print(f"   Total: {devices_without_category.count()}")
    
    print("\n5. DISPOSITIVOS SIN INSTITUCIÓN:")
    devices_without_institution = Device.objects.filter(institution__isnull=True)
    print(f"   Total: {devices_without_institution.count()}")

if __name__ == "__main__":
    diagnostic() 