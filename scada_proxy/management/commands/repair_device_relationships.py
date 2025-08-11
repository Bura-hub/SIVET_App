from django.core.management.base import BaseCommand
from django.db.models import Q
from scada_proxy.models import Device, DeviceCategory, Institution
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Repara las relaciones faltantes de categoría e institución en dispositivos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se haría sin realizar cambios',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la reparación incluso si hay errores',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Muestra información detallada del proceso',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        verbose = options['verbose']
        
        self.stdout.write(
            self.style.SUCCESS('🔧 INICIANDO REPARACIÓN DE RELACIONES DE DISPOSITIVOS')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('⚠️  MODO DRY-RUN: No se realizarán cambios')
            )
        
        # 1. Diagnóstico inicial
        self.stdout.write('\n📊 DIAGNÓSTICO INICIAL:')
        self._show_diagnosis()
        
        # 2. Buscar dispositivos con problemas
        devices_with_issues = Device.objects.filter(
            Q(category__isnull=True) | Q(institution__isnull=True)
        ).select_related('category', 'institution')
        
        if not devices_with_issues.exists():
            self.stdout.write(
                self.style.SUCCESS('✅ No se encontraron dispositivos con problemas')
            )
            return
        
        self.stdout.write(
            f'\n⚠️  Se encontraron {devices_with_issues.count()} dispositivos con problemas:'
        )
        
        # 3. Mostrar dispositivos problemáticos
        for device in devices_with_issues:
            category_status = f"✅ {device.category.name}" if device.category else "❌ NULL"
            institution_status = f"✅ {device.institution.name}" if device.institution else "❌ NULL"
            
            self.stdout.write(f'   - {device.name} (ID: {device.id})')
            self.stdout.write(f'     Categoría: {category_status}')
            self.stdout.write(f'     Institución: {institution_status}')
            
            if verbose:
                # Mostrar sugerencias de reparación
                suggestions = self._get_repair_suggestions(device)
                if suggestions:
                    self.stdout.write(f'     💡 Sugerencias: {", ".join(suggestions)}')
            self.stdout.write('')
        
        # 4. Ejecutar reparación
        if not dry_run:
            self.stdout.write('🔧 EJECUTANDO REPARACIÓN:')
            repaired_count, failed_count = self._execute_repair(devices_with_issues, force)
            
            # 5. Mostrar resultados
            self.stdout.write('\n📊 RESULTADOS DE LA REPARACIÓN:')
            self.stdout.write(f'   ✅ Reparados: {repaired_count}')
            self.stdout.write(f'   ❌ Fallidos: {failed_count}')
            
            if repaired_count > 0:
                self.stdout.write('\n🔍 VERIFICACIÓN POST-REPARACIÓN:')
                self._show_diagnosis()
        else:
            self.stdout.write(
                self.style.WARNING('⚠️  MODO DRY-RUN: No se realizaron cambios')
            )

    def _show_diagnosis(self):
        """Muestra un diagnóstico del estado de las relaciones"""
        total_devices = Device.objects.count()
        active_devices = Device.objects.filter(is_active=True).count()
        devices_with_issues = Device.objects.filter(
            Q(category__isnull=True) | Q(institution__isnull=True)
        ).count()
        
        self.stdout.write(f'   Total de dispositivos: {total_devices}')
        self.stdout.write(f'   Dispositivos activos: {active_devices}')
        self.stdout.write(f'   Con problemas: {devices_with_issues}')
        
        # Mostrar estadísticas por categoría
        categories = DeviceCategory.objects.all()
        self.stdout.write('\n   📊 Por categoría:')
        for cat in categories:
            device_count = Device.objects.filter(category=cat).count()
            self.stdout.write(f'     - {cat.name}: {device_count} dispositivos')
        
        # Mostrar estadísticas por institución
        institutions = Institution.objects.all()
        self.stdout.write('\n   📊 Por institución:')
        for inst in institutions:
            device_count = Device.objects.filter(institution=inst).count()
            self.stdout.write(f'     - {inst.name}: {device_count} dispositivos')

    def _get_repair_suggestions(self, device):
        """Obtiene sugerencias de reparación para un dispositivo"""
        suggestions = []
        name_lower = device.name.lower()
        
        if not device.category:
            if 'medidor' in name_lower or 'meter' in name_lower:
                suggestions.append("electricmeter")
            elif 'inversor' in name_lower or 'inverter' in name_lower:
                suggestions.append("inverter")
            elif 'estación' in name_lower or 'weather' in name_lower:
                suggestions.append("weatherstation")
        
        if not device.institution:
            for institution in Institution.objects.all():
                if institution.name.lower() in name_lower:
                    suggestions.append(f"institución: {institution.name}")
                    break
        
        return suggestions

    def _execute_repair(self, devices_with_issues, force):
        """Ejecuta la reparación de relaciones"""
        repaired_count = 0
        failed_count = 0
        
        for device in devices_with_issues:
            try:
                self.stdout.write(f'   Procesando: {device.name}')
                repaired = False
                
                # Intentar reparar categoría
                if not device.category:
                    if 'medidor' in device.name.lower() or 'meter' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='electricmeter').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(f'     ✅ Categoría asignada: {category.name}')
                    elif 'inversor' in device.name.lower() or 'inverter' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='inverter').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(f'     ✅ Categoría asignada: {category.name}')
                    elif 'estación' in device.name.lower() or 'weather' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='weatherstation').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(f'     ✅ Categoría asignada: {category.name}')
                
                # Intentar reparar institución
                if not device.institution:
                    for institution in Institution.objects.all():
                        if institution.name.lower() in device.name.lower():
                            device.institution = institution
                            repaired = True
                            self.stdout.write(f'     ✅ Institución asignada: {institution.name}')
                            break
                
                if repaired:
                    device.save()
                    repaired_count += 1
                    self.stdout.write(f'     💾 Dispositivo guardado')
                else:
                    failed_count += 1
                    self.stdout.write(f'     ❌ No se pudo reparar')
                    
            except Exception as e:
                failed_count += 1
                error_msg = f'Error al reparar dispositivo {device.name}: {e}'
                self.stdout.write(self.style.ERROR(f'     ❌ {error_msg}'))
                logger.error(error_msg)
                
                if not force:
                    self.stdout.write(
                        self.style.WARNING('     ⚠️  Continuando con el siguiente dispositivo...')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('     💥 Error fatal - deteniendo reparación')
                    )
                    raise
        
        return repaired_count, failed_count
