# Comando de Cálculo Histórico de Estaciones Meteorológicas

Este comando permite calcular indicadores históricos de estaciones meteorológicas para un rango de fechas específico, similar al comando de inversores pero adaptado para weather stations.

## 📋 Descripción

El comando `calculate_historical_weather_stations` procesa datos históricos de estaciones meteorológicas y calcula los siguientes indicadores:

- **Irradiancia Acumulada Diaria**: Suma de lecturas de irradiancia cada 2 minutos, convertidas a kWh/m²
- **Horas Solares Pico (HSP)**: Equivalente a la irradiancia acumulada diaria
- **Velocidad Media del Viento**: Promedio de velocidad del viento en km/h
- **Rosa de los Vientos**: Distribución de direcciones y velocidades del viento
- **Precipitación Acumulada**: Acumulado diario de lluvia en cm/día
- **Potencia Fotovoltaica Teórica**: Cálculo teórico basado en irradiancia en W

## 🚀 Uso Básico

### Comando Mínimo
```bash
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31
```

### Con Todos los Parámetros
```bash
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31 \
    --time-range daily \
    --institution-id 1 \
    --device-id WS001 \
    --batch-size 30 \
    --force-recalculate
```

## 📊 Parámetros Disponibles

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `--start-date` | string | ✅ | Fecha de inicio en formato YYYY-MM-DD |
| `--end-date` | string | ✅ | Fecha de fin en formato YYYY-MM-DD |
| `--time-range` | choice | ❌ | Rango de tiempo: `daily` o `monthly` (default: `daily`) |
| `--institution-id` | integer | ❌ | ID de la institución específica |
| `--device-id` | string | ❌ | SCADA ID del dispositivo específico |
| `--batch-size` | integer | ❌ | Días por lote (default: 30) |
| `--force-recalculate` | flag | ❌ | Forzar recálculo incluso si existen datos |

## 🎯 Ejemplos de Uso

### 1. Cálculo para el Mes Actual
```bash
# Obtener fechas del mes actual
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31 \
    --time-range daily
```

### 2. Cálculo para una Institución Específica
```bash
# Solo para Udenar (ID: 1)
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31 \
    --institution-id 1
```

### 3. Cálculo para un Dispositivo Específico
```bash
# Solo para la estación WS001
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31 \
    --device-id WS001
```

### 4. Cálculo Mensual para Todo el Año
```bash
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-12-31 \
    --time-range monthly \
    --batch-size 15
```

### 5. Cálculo con Lotes Pequeños (para Datos Intensivos)
```bash
python manage.py calculate_historical_weather_stations \
    --start-date 2024-01-01 \
    --end-date 2024-01-31 \
    --batch-size 7
```

## 📈 Monitoreo del Progreso

### 1. Verificar Registros en Tiempo Real
```bash
# Contar indicadores
python manage.py shell -c "from indicators.models import WeatherStationIndicators; print(WeatherStationIndicators.objects.count())"

# Contar datos de gráficos
python manage.py shell -c "from indicators.models import WeatherStationChartData; print(WeatherStationChartData.objects.count())"
```

### 2. Verificar Datos por Fecha
```bash
python manage.py shell -c "
from indicators.models import WeatherStationIndicators
from datetime import date
indicators = WeatherStationIndicators.objects.filter(date=date(2024, 1, 15))
print(f'Indicadores para 2024-01-15: {indicators.count()}')
"
```

### 3. Verificar Datos por Institución
```bash
python manage.py shell -c "
from indicators.models import WeatherStationIndicators
indicators = WeatherStationIndicators.objects.filter(institution_id=1)
print(f'Indicadores para institución 1: {indicators.count()}')
"
```

## 🔧 Configuración y Optimización

### Tamaño de Lote Recomendado
- **Datos ligeros**: 30-60 días por lote
- **Datos intensivos**: 7-15 días por lote
- **Primera ejecución**: 15-30 días por lote

### Consideraciones de Rendimiento
- El comando procesa datos en lotes para evitar sobrecarga
- Cada lote se envía como una tarea Celery independiente
- Monitorea el uso de memoria y CPU durante la ejecución
- Ajusta el `batch-size` según la capacidad del servidor

## 🚨 Solución de Problemas

### Error: "No se encontraron estaciones meteorológicas"
```bash
# Verificar que existen estaciones activas
python manage.py shell -c "
from scada_proxy.models import Device, DeviceCategory
weather_cat = DeviceCategory.objects.filter(name='weatherStation').first()
if weather_cat:
    stations = Device.objects.filter(category=weather_cat, is_active=True)
    print(f'Estaciones activas: {stations.count()}')
    for s in stations:
        print(f'- {s.name} (Institución: {s.institution.name if s.institution else "N/A"})')
"
```

### Error: "No hay datos SCADA disponibles"
- Verifica que existan mediciones en la tabla `Measurement`
- Confirma que las fechas especificadas tengan datos
- Revisa la conectividad con SCADA

### Error: "Task Celery falló"
- Verifica que Celery esté ejecutándose
- Revisa los logs de Celery
- Confirma que las tareas estén configuradas correctamente

## 📊 Estructura de Datos Generados

### WeatherStationIndicators
- `date`: Fecha del indicador
- `device`: Dispositivo asociado
- `institution`: Institución asociada
- `daily_irradiance_kwh_m2`: Irradiancia acumulada diaria
- `daily_hsp_hours`: Horas solares pico
- `avg_wind_speed_kmh`: Velocidad media del viento
- `daily_precipitation_cm`: Precipitación acumulada
- `theoretical_pv_power_w`: Potencia fotovoltaica teórica

### WeatherStationChartData
- `date`: Fecha de los datos
- `device`: Dispositivo asociado
- `hourly_irradiance`: Datos horarios de irradiancia
- `hourly_temperature`: Datos horarios de temperatura
- `hourly_humidity`: Datos horarios de humedad
- `hourly_wind_speed`: Datos horarios de velocidad del viento

## 🔄 Programación Automática

### Cron Job (Linux/Mac)
```bash
# Ejecutar diariamente a las 2:00 AM
0 2 * * * cd /path/to/project && python manage.py calculate_historical_weather_stations --start-date $(date -d 'yesterday' +\%Y-\%m-\%d) --end-date $(date -d 'yesterday' +\%Y-\%m-\%d)
```

### Task Scheduler (Windows)
```batch
# Crear un archivo .bat
cd /d C:\path\to\project
python manage.py calculate_historical_weather_stations --start-date %date:~-4%-%date:~3,2%-%date:~0,2% --end-date %date:~-4%-%date:~3,2%-%date:~0,2%
```

## 📚 Referencias

- [Documentación de Django Management Commands](https://docs.djangoproject.com/en/stable/howto/custom-management-commands/)
- [Celery Task Documentation](https://docs.celeryproject.org/en/stable/)
- [Indicadores Meteorológicos](indicators.md)
- [Variables SCADA](variables.json)

## 🤝 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa los logs de Django y Celery
2. Verifica la configuración de la base de datos
3. Confirma que las estaciones meteorológicas estén activas
4. Revisa que existan datos SCADA para las fechas especificadas
