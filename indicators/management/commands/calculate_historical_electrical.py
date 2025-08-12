from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from indicators.tasks import calculate_electrical_data

class Command(BaseCommand):
    help = 'Calcula indicadores históricos eléctricos para un rango de fechas específico'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Fecha de inicio en formato YYYY-MM-DD (ej: 2023-01-01)',
            required=True
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='Fecha de fin en formato YYYY-MM-DD (ej: 2023-12-31)',
            required=True
        )
        parser.add_argument(
            '--time-range',
            type=str,
            choices=['daily', 'monthly'],
            default='daily',
            help='Rango de tiempo para los cálculos (daily o monthly)'
        )
        parser.add_argument(
            '--institution-id',
            type=int,
            help='ID de la institución específica (opcional)'
        )
        parser.add_argument(
            '--device-id',
            type=str,
            help='SCADA ID del dispositivo específico (opcional)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=30,
            help='Número de días a procesar por lote (default: 30)'
        )

    def handle(self, *args, **options):
        # Configurar zona horaria de Colombia
        colombia_tz = pytz.timezone('America/Bogota')
        
        try:
            # Parsear fechas
            start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()
            time_range = options['time_range']
            institution_id = options.get('institution_id')
            device_id = options.get('device_id')
            batch_size = options['batch_size']

            self.stdout.write(
                self.style.SUCCESS(
                    f'🚀 Iniciando cálculo histórico eléctrico...\n'
                    f'📅 Período: {start_date} a {end_date}\n'
                    f'⏰ Rango: {time_range}\n'
                    f'🏢 Institución: {institution_id if institution_id else "Todas"}\n'
                    f'🔌 Dispositivo: {device_id if device_id else "Todos"}\n'
                    f'📦 Tamaño de lote: {batch_size} días'
                )
            )

            # Calcular en lotes para evitar sobrecarga
            current_date = start_date
            total_batches = 0
            total_days = (end_date - start_date).days + 1

            while current_date <= end_date:
                batch_end = min(current_date + timedelta(days=batch_size - 1), end_date)
                
                self.stdout.write(
                    f'📊 Procesando lote {total_batches + 1}: '
                    f'{current_date} a {batch_end}'
                )

                # Ejecutar tarea de cálculo para este lote
                task = calculate_electrical_data.delay(
                    time_range=time_range,
                    start_date_str=current_date.strftime('%Y-%m-%d'),
                    end_date_str=batch_end.strftime('%Y-%m-%d'),
                    institution_id=institution_id,
                    device_id=device_id
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Lote {total_batches + 1} enviado a Celery (Task ID: {task.id})'
                    )
                )

                total_batches += 1
                current_date = batch_end + timedelta(days=1)

            # Resumen final
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n🎉 ¡Cálculo histórico eléctrico completado!\n'
                    f'📊 Total de lotes enviados: {total_batches}\n'
                    f'📅 Total de días a procesar: {total_days}\n'
                    f'⏰ Rango de tiempo: {time_range}\n'
                    f'🔍 Monitorea el progreso en Celery'
                )
            )

            # Instrucciones para monitoreo
            self.stdout.write(
                self.style.WARNING(
                    f'\n📋 Para monitorear el progreso:\n'
                    f'1. Revisa los logs de Celery\n'
                    f'2. Verifica la base de datos para nuevos registros\n'
                    f'3. Usa el comando: python manage.py shell -c "from indicators.models import ElectricMeterIndicators; print(ElectricMeterIndicators.objects.count())"'
                )
            )

        except ValueError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error en formato de fecha: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error inesperado: {e}')
            )
