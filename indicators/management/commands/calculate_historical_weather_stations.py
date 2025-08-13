#!/usr/bin/env python
"""
Comando de Django para calcular indicadores históricos de estaciones meteorológicas
Similar al comando de inversores pero adaptado para weather stations
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from indicators.tasks import calculate_weather_station_indicators

class Command(BaseCommand):
    help = 'Calcula indicadores históricos de estaciones meteorológicas para un rango de fechas específico'

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
        parser.add_argument(
            '--force-recalculate',
            action='store_true',
            help='Forzar recálculo incluso si ya existen datos para esas fechas'
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
            force_recalculate = options.get('force_recalculate', False)

            self.stdout.write(
                self.style.SUCCESS(
                    f'🌤️ Iniciando cálculo histórico de estaciones meteorológicas...\n'
                    f'📅 Período: {start_date} a {end_date}\n'
                    f'⏰ Rango: {time_range}\n'
                    f'🏢 Institución: {institution_id if institution_id else "Todas"}\n'
                    f'🌡️ Dispositivo: {device_id if device_id else "Todos"}\n'
                    f'📦 Tamaño de lote: {batch_size} días\n'
                    f'🔄 Forzar recálculo: {"Sí" if force_recalculate else "No"}'
                )
            )

            # Validar fechas
            if start_date > end_date:
                self.stdout.write(
                    self.style.ERROR('❌ La fecha de inicio no puede ser posterior a la fecha de fin')
                )
                return

            if start_date > timezone.now().date():
                self.stdout.write(
                    self.style.WARNING('⚠️ La fecha de inicio es en el futuro. ¿Estás seguro?')
                )

            # Calcular en lotes para evitar sobrecarga
            current_date = start_date
            total_batches = 0
            total_days = (end_date - start_date).days + 1

            self.stdout.write(f'\n📊 Procesando {total_days} días en lotes de {batch_size}...\n')

            while current_date <= end_date:
                batch_end = min(current_date + timedelta(days=batch_size - 1), end_date)
                
                self.stdout.write(
                    f'📊 Procesando lote {total_batches + 1}: '
                    f'{current_date} a {batch_end} '
                    f'({(batch_end - current_date).days + 1} días)'
                )

                # Ejecutar tarea de cálculo para este lote
                task = calculate_weather_station_indicators.delay(
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
                    f'\n🎉 ¡Cálculo histórico de estaciones meteorológicas completado!\n'
                    f'📊 Total de lotes enviados: {total_batches}\n'
                    f'📅 Total de días a procesar: {total_days}\n'
                    f'⏰ Rango de tiempo: {time_range}\n'
                    f'🌤️ Indicadores a calcular:\n'
                    f'   • Irradiancia acumulada diaria (kWh/m²)\n'
                    f'   • Horas Solares Pico (HSP)\n'
                    f'   • Velocidad media del viento (km/h)\n'
                    f'   • Rosa de los vientos (dirección y velocidad)\n'
                    f'   • Precipitación acumulada (cm/día)\n'
                    f'   • Potencia fotovoltaica teórica (W)\n'
                    f'🔍 Monitorea el progreso en Celery'
                )
            )

            # Instrucciones para monitoreo
            self.stdout.write(
                self.style.WARNING(
                    f'\n📋 Para monitorear el progreso:\n'
                    f'1. Revisa los logs de Celery\n'
                    f'2. Verifica la base de datos para nuevos registros\n'
                    f'3. Usa el comando: python manage.py shell -c "from indicators.models import WeatherStationIndicators; print(WeatherStationIndicators.objects.count())"\n'
                    f'4. Verifica datos de gráficos: python manage.py shell -c "from indicators.models import WeatherStationChartData; print(WeatherStationChartData.objects.count())"'
                )
            )

            # Información adicional sobre los indicadores
            self.stdout.write(
                self.style.HTTP_INFO(
                    f'\n📚 Información sobre los indicadores calculados:\n'
                    f'• Irradiancia: Suma de lecturas cada 2 minutos convertidas a kWh/m²\n'
                    f'• HSP: Equivalente a la irradiancia acumulada diaria\n'
                    f'• Viento: Promedio de velocidad y distribución por dirección\n'
                    f'• Precipitación: Acumulado diario de lluvia\n'
                    f'• Potencia PV: Cálculo teórico basado en irradiancia'
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
            # Log detallado del error
            import traceback
            self.stdout.write(
                self.style.ERROR(f'📋 Traceback completo:\n{traceback.format_exc()}')
            )
