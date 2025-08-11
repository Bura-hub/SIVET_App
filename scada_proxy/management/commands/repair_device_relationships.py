from django.core.management.base import BaseCommand
from django.db import models
from scada_proxy.models import Device, DeviceCategory, Institution
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Repara las relaciones faltantes de categoría e institución en dispositivos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué se haría sin hacer cambios reales',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la reparación incluso si hay inconsistencias',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(
            self.style.SUCCESS('Iniciando reparación de relaciones de dispositivos...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO DRY-RUN: No se harán cambios reales')
            )
        
        # Buscar dispositivos con relaciones faltantes
        devices_with_issues = Device.objects.filter(
            models.Q(category__isnull=True) | models.Q(institution__isnull=True)
        ).select_related('category', 'institution')
        
        if not devices_with_issues.exists():
            self.stdout.write(
                self.style.SUCCESS('No se encontraron dispositivos con relaciones faltantes.')
            )
            return
        
        self.stdout.write(
            f'Se encontraron {devices_with_issues.count()} dispositivos con relaciones faltantes:'
        )
        
        # Mostrar dispositivos con problemas
        for device in devices_with_issues:
            self.stdout.write(
                f'  - {device.name} (ID: {device.id}): '
                f'Categoría: {device.category or "NULL"}, '
                f'Institución: {device.institution or "NULL"}'
            )
        
        if not dry_run:
            # Confirmar antes de proceder
            if not force:
                confirm = input('\n¿Desea continuar con la reparación? (y/N): ')
                if confirm.lower() != 'y':
                    self.stdout.write(
                        self.style.WARNING('Operación cancelada por el usuario.')
                    )
                    return
        
        # Proceder con la reparación
        repaired_count = 0
        failed_count = 0
        
        for device in devices_with_issues:
            try:
                repaired = False
                
                # Intentar encontrar categoría por nombre del dispositivo
                if not device.category:
                    if 'medidor' in device.name.lower() or 'meter' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='electricmeter').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(
                                f'  ✓ Categoría asignada a {device.name}: {category.name}'
                            )
                    elif 'inversor' in device.name.lower() or 'inverter' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='inverter').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(
                                f'  ✓ Categoría asignada a {device.name}: {category.name}'
                            )
                    elif 'estación' in device.name.lower() or 'weather' in device.name.lower():
                        category = DeviceCategory.objects.filter(name__icontains='weatherstation').first()
                        if category:
                            device.category = category
                            repaired = True
                            self.stdout.write(
                                f'  ✓ Categoría asignada a {device.name}: {category.name}'
                            )
                    else:
                        self.stdout.write(
                            f'  ⚠ No se pudo determinar categoría para {device.name}'
                        )
                
                # Intentar encontrar institución por nombre del dispositivo
                if not device.institution:
                    institution_found = False
                    for institution in Institution.objects.all():
                        if institution.name.lower() in device.name.lower():
                            device.institution = institution
                            repaired = True
                            institution_found = True
                            self.stdout.write(
                                f'  ✓ Institución asignada a {device.name}: {institution.name}'
                            )
                            break
                    
                    if not institution_found:
                        self.stdout.write(
                            f'  ⚠ No se pudo determinar institución para {device.name}'
                        )
                
                if repaired:
                    if not dry_run:
                        device.save()
                    repaired_count += 1
                    self.stdout.write(
                        f'  ✓ Dispositivo {device.name} reparado exitosamente'
                    )
                else:
                    failed_count += 1
                    self.stdout.write(
                        f'  ✗ No se pudo reparar {device.name}'
                    )
                
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error al reparar {device.name}: {e}')
                )
        
        # Resumen final
        self.stdout.write('\n' + '='*50)
        self.stdout.write('RESUMEN DE LA REPARACIÓN:')
        self.stdout.write(f'  Dispositivos reparados: {repaired_count}')
        self.stdout.write(f'  Dispositivos fallidos: {failed_count}')
        self.stdout.write(f'  Total procesados: {devices_with_issues.count()}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\nMODO DRY-RUN: No se realizaron cambios reales')
            )
        elif repaired_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\n¡Reparación completada! {repaired_count} dispositivos fueron reparados.')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nNo se pudo reparar ningún dispositivo.')
            )
