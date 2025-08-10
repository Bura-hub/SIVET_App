# Indicadores Eléctricos - Documentación

## Descripción General

Este módulo implementa el cálculo y almacenamiento de indicadores eléctricos para medidores eléctricos en el sistema MTE Lumen. Los indicadores se calculan tanto en rangos diarios como mensuales y se almacenan en la base de datos para su posterior consulta y visualización.

## Modelo de Datos

### ElectricMeterIndicators

El modelo principal almacena los siguientes indicadores:

#### Energía
- `imported_energy_kwh`: Energía importada en kWh
- `exported_energy_kwh`: Energía exportada en kWh  
- `net_energy_consumption_kwh`: Consumo neto de energía en kWh

#### Demanda
- `peak_demand_kw`: Demanda pico en kW
- `avg_demand_kw`: Demanda promedio en kW
- `load_factor_pct`: Factor de carga en porcentaje

#### Calidad Eléctrica
- `avg_power_factor`: Factor de potencia promedio
- `max_voltage_unbalance_pct`: Máximo desequilibrio de voltaje en %
- `max_current_unbalance_pct`: Máximo desequilibrio de corriente en %
- `max_voltage_thd_pct`: Máximo THD de voltaje en %
- `max_current_thd_pct`: Máximo THD de corriente en %
- `max_current_tdd_pct`: Máximo TDD de corriente en %

#### Metadatos
- `device`: Referencia al medidor eléctrico
- `institution`: Referencia a la institución
- `date`: Fecha del registro
- `time_range`: Rango de tiempo (daily/monthly)

## Cálculos Implementados

### 1. Energía Consumida Acumulada

**Metodología:**
- La energía se calcula como la diferencia entre lecturas acumuladas
- Se convierten MWh a kWh multiplicando por 1000
- Se suman las lecturas de baja y alta precisión

**Fórmula:**
```
Energía Diaria = (importedActivePowerHigh_fin × 1000 + importedActivePowerLow_fin) - 
                 (importedActivePowerHigh_inicio × 1000 + importedActivePowerLow_inicio)
```

### 2. Factor de Carga

**Fórmula:**
```
Factor de Carga (%) = (Demanda Promedio / Demanda Pico) × 100
```

### 3. Indicadores de Calidad

- **THD (Total Harmonic Distortion)**: Distorsión armónica total
- **TDD (Total Demand Distortion)**: Distorsión total de demanda
- **Desequilibrio**: Asimetría entre fases

## API Endpoints

### GET /api/electric-meter-indicators/

**Parámetros de consulta:**
- `institution_id`: ID de la institución
- `device_id`: ID del medidor específico
- `time_range`: Rango de tiempo (daily/monthly)
- `start_date`: Fecha de inicio (YYYY-MM-DD)
- `end_date`: Fecha de fin (YYYY-MM-DD)

**Respuesta:**
```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "device": 1,
      "device_name": "Medidor Principal",
      "institution": 1,
      "institution_name": "Udenar",
      "date": "2024-01-15",
      "time_range": "daily",
      "time_range_display": "Diario",
      "imported_energy_kwh": 150.5,
      "exported_energy_kwh": 25.3,
      "net_energy_consumption_kwh": 125.2,
      "peak_demand_kw": 200.0,
      "avg_demand_kw": 100.0,
      "load_factor_pct": 50.0,
      "avg_power_factor": 0.95,
      "max_voltage_unbalance_pct": 2.1,
      "max_current_unbalance_pct": 1.8,
      "max_voltage_thd_pct": 3.2,
      "max_current_thd_pct": 2.9,
      "max_current_tdd_pct": 2.5
    }
  ]
}
```

## Tareas de Cálculo

### calculate_electric_meter_indicators

**Parámetros:**
- `device_id`: ID del dispositivo
- `date_str`: Fecha en formato YYYY-MM-DD
- `time_range`: Rango de tiempo (daily/monthly)

**Funcionalidad:**
- Obtiene mediciones del dispositivo para la fecha especificada
- Calcula todos los indicadores eléctricos
- Almacena los resultados en la base de datos
- Actualiza registros existentes si ya existen

## Comandos de Gestión

### calculate_electric_indicators

**Uso:**
```bash
python manage.py calculate_electric_indicators [opciones]
```

**Opciones:**
- `--start-date YYYY-MM-DD`: Fecha de inicio
- `--end-date YYYY-MM-DD`: Fecha de fin
- `--time-range daily|monthly`: Rango de tiempo
- `--institution-id ID`: ID de institución específica
- `--device-id ID`: ID de dispositivo específico

**Ejemplos:**
```bash
# Calcular indicadores del último mes
python manage.py calculate_electric_indicators

# Calcular indicadores para un rango específico
python manage.py calculate_electric_indicators --start-date 2024-01-01 --end-date 2024-01-31

# Calcular indicadores mensuales para una institución
python manage.py calculate_electric_indicators --time-range monthly --institution-id 1
```

## Frontend

### Componente ElectricalDetails

La pestaña "Medidores Eléctricos" incluye:

1. **Filtros:**
   - Rango de tiempo (Diario/Mensual)
   - Selección de institución
   - Selección de medidor
   - Fechas de inicio y fin

2. **Indicadores KPI:**
   - Energía Consumida (kWh)
   - Demanda Pico (kW)
   - Factor de Carga (%)
   - Factor de Potencia

3. **Gráficos:**
   - Energía Consumida vs Exportada
   - Indicadores de Calidad Eléctrica
   - Calidad de Energía (THD, Desequilibrio)

4. **Tabla de Datos:**
   - Fecha, Medidor, Energía Importada/Exportada
   - Consumo Neto, Demanda Pico
   - Factor de Carga, Factor de Potencia

## Configuración

### Variables de Entorno

Asegúrate de que las siguientes variables estén configuradas:

```bash
# Configuración de Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Configuración de base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/mtelumen
```

### Dependencias

```bash
pip install -r requirements.txt
```

## Pruebas

### Ejecutar Pruebas Unitarias

```bash
python manage.py test indicators.tests.test_electric_indicators
```

### Ejecutar Todas las Pruebas

```bash
python manage.py test
```

## Mantenimiento

### Limpieza de Datos Antiguos

Para mantener el rendimiento, se recomienda limpiar datos antiguos:

```sql
-- Eliminar indicadores de más de 2 años
DELETE FROM indicators_electricmeterindicators 
WHERE date < CURRENT_DATE - INTERVAL '2 years';
```

### Monitoreo de Tareas

Verificar el estado de las tareas Celery:

```bash
celery -A core inspect active
celery -A core inspect scheduled
```

## Troubleshooting

### Problemas Comunes

1. **Tareas no se ejecutan:**
   - Verificar que Celery esté ejecutándose
   - Revisar logs de Celery
   - Verificar conexión a Redis

2. **Datos no se calculan:**
   - Verificar que existan mediciones para las fechas
   - Revisar logs de la tarea
   - Verificar permisos de base de datos

3. **Errores de cálculo:**
   - Verificar formato de datos de entrada
   - Revisar valores nulos o inválidos
   - Verificar conversiones de unidades

### Logs

Los logs se escriben en:
- Django: `logs/django.log`
- Celery: `logs/celery.log`
- Aplicación: `logs/app.log`

## Contribución

Para contribuir al desarrollo:

1. Crear una rama feature
2. Implementar cambios
3. Agregar pruebas
4. Actualizar documentación
5. Crear pull request

## Contacto

Para soporte técnico o preguntas:
- Email: soporte@mtelumen.com
- Documentación: https://docs.mtelumen.com
- Issues: https://github.com/mtelumen/app/issues
