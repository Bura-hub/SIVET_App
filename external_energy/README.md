# Datos Externos de Energía

Esta aplicación Django proporciona funcionalidades para obtener, procesar y analizar datos externos de energía, incluyendo precios de KWh, ahorros calculados y análisis del mercado energético.

## Características Principales

### 🔌 Integración con APIs Externas
- **OpenWeatherMap**: Obtiene datos climáticos y solares que afectan la generación fotovoltaica
- **Electricity Maps**: Información sobre precios de energía y composición del mercado
- **Datos Simulados**: Sistema robusto de fallback para desarrollo y pruebas
- **Pronósticos**: Predicciones de precios futuros con niveles de confianza

### 💰 Análisis Económico
- **Cálculo de Ahorros**: Compara consumo vs generación propia
- **ROI Estimado**: Retorno de inversión de la instalación solar
- **Costo Evitado**: Dinero ahorrado por no comprar energía de la red
- **Análisis de Autoconsumo**: Porcentaje de energía generada vs consumida

### 📊 Indicadores y KPIs
- **Precios de Energía**: Historial, tendencias y variaciones
- **Datos Solares**: Radiación solar, cobertura de nubes, temperatura
- **Métricas del Mercado**: Demanda, oferta y composición de generación
- **Alertas Inteligentes**: Notificaciones sobre eventos importantes del mercado
- **Pronósticos**: Predicciones de precios para planificación

## Instalación y Configuración

### 1. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 2. Configurar Variables de Entorno

Copia el archivo `settings_example.py` como `.env` y configura:

#### OpenWeatherMap (Gratuito)
```bash
# Obtén tu API key gratuita en: https://openweathermap.org/api
OPENWEATHER_API_KEY=your_actual_openweather_api_key_here
```

**Pasos para obtener API key gratuita:**
1. Ve a [OpenWeatherMap](https://openweathermap.org/api)
2. Crea una cuenta gratuita
3. Ve a "My API Keys"
4. Copia tu API key
5. La versión gratuita incluye:
   - 60 llamadas por minuto
   - Datos climáticos actuales e históricos
   - Datos de radiación UV (útil para energía solar)

#### Electricity Maps (Opcional)
```bash
# Obtén tu API key en: https://www.electricitymaps.com/
ELECTRICITY_MAPS_API_KEY=your_electricity_maps_api_key_here
```

**Nota:** Electricity Maps tiene acceso limitado gratuito. Si no tienes API key, el sistema usará datos simulados realistas.

#### Configuraciones Adicionales
```bash
# Configuraciones de datos simulados (para desarrollo)
USE_SIMULATED_DATA=true  # Cambiar a false en producción

# Ubicación por defecto (Bogotá, Colombia)
DEFAULT_LATITUDE=4.7110
DEFAULT_LONGITUDE=-74.0721
```

### 3. Ejecutar Migraciones

```bash
python manage.py makemigrations external_energy
python manage.py migrate
```

### 4. Poblar Datos Simulados (Desarrollo)

```bash
python manage.py populate_external_energy_data --days 90
```

## Uso de la API

### Endpoints Disponibles

#### Precios de Energía
```http
GET /api/external-energy/prices/?range=month
```

**Parámetros:**
- `range`: week, month, quarter, year

**Respuesta:**
```json
{
  "average_price": 450.25,
  "max_price": 495.50,
  "min_price": 405.75,
  "price_variation": 2.5,
  "price_trend": "increasing",
  "price_history": [...],
  "price_forecast": [...],
  "alerts": [...],
  "market_demand": 9500.0,
  "market_supply": 10200.0,
  "renewable_percentage": 12.5
}
```

#### Ahorros de Energía
```http
GET /api/external-energy/savings/?range=month
```

**Respuesta:**
```json
{
  "total_consumed": 4500.0,
  "total_generated": 3200.0,
  "total_savings": 1440000.0,
  "avoided_cost": 1440000.0,
  "savings_percentage": 32.0,
  "self_consumption": 71.1,
  "excess_energy": 0.0,
  "capacity_factor": 15.2,
  "roi": 2.88,
  "monthly_savings": [...]
}
```

#### Sincronización de Datos
```http
POST /api/external-energy/sync/
```

#### Vista del Mercado
```http
GET /api/external-energy/market-overview/
```

## Modelos de Datos

### EnergyPrice
Almacena precios históricos de energía por fecha y fuente.

### EnergySavings
Calcula automáticamente ahorros basados en consumo vs generación.

### EnergyPriceForecast
Pronósticos de precios futuros con niveles de confianza.

### EnergyMarketData
Datos del mercado energético (demanda, oferta, composición).

### EnergyAlert
Sistema de alertas para eventos importantes del mercado.

## Servicios

### OpenWeatherEnergyService
- Obtiene datos climáticos de OpenWeatherMap
- Datos de radiación solar y cobertura de nubes
- Fallback a datos simulados si no hay API key
- Manejo de errores y reintentos

### ElectricityMapsService
- Obtiene datos de energía desde Electricity Maps
- Fallback a datos simulados si no hay API key
- Datos del mercado energético

### EnergyCalculationService
- Calcula ahorros y métricas de eficiencia
- Integra con modelos existentes del sistema
- Procesa datos históricos

### PriceForecastService
- Genera pronósticos de precios
- Utiliza datos históricos y tendencias
- Configurable para diferentes algoritmos

## Comandos de Gestión

### Poblar Datos Simulados
```bash
python manage.py populate_external_energy_data --days 90 --clear
```

**Opciones:**
- `--days`: Número de días de datos a generar
- `--clear`: Limpiar datos existentes antes de poblar

## Configuración del Admin

La aplicación incluye una interfaz de administración completa con:

- Gestión de precios de energía
- Monitoreo de ahorros
- Configuración de alertas
- Análisis de pronósticos
- Datos del mercado

## Desarrollo y Pruebas

### Datos Simulados
Para desarrollo, la aplicación puede usar datos simulados que incluyen:

- **Variaciones diarias de precios** (±5%)
- **Patrones semanales** (precios más altos en días laborales)
- **Patrones estacionales** (verano/invierno en Colombia)
- **Datos solares realistas** basados en ubicación geográfica
- **Fluctuaciones del mercado** realistas

### Logging
```python
import logging
logger = logging.getLogger(__name__)
logger.info('Operación completada exitosamente')
```

## Integración con el Frontend

El componente React `ExternalEnergyData.js` proporciona:

- **4 Pestañas**: Precios, Ahorro, Comparación, Pronóstico
- **KPIs Principales**: Precio promedio, ahorro total, energía generada
- **Gráficos Interactivos**: Historial de precios, ahorros mensuales
- **Análisis Comparativo**: Consumo vs generación
- **Recomendaciones**: Basadas en tendencias del mercado

## Monitoreo y Mantenimiento

### Tareas Programadas
- Sincronización automática de datos externos
- Actualización de pronósticos
- Generación de alertas

### Métricas de Salud
- Estado de conexión con APIs externas
- Calidad de datos recibidos
- Rendimiento de cálculos

## APIs Alternativas

### OpenWeatherMap (Recomendado para empezar)
- **Gratuito**: 60 llamadas/minuto
- **Datos**: Clima, radiación UV, cobertura de nubes
- **Cobertura**: Mundial
- **Registro**: Simple, solo email

### Electricity Maps
- **Gratuito**: Acceso limitado
- **Datos**: Precios de energía, composición del mercado
- **Cobertura**: Principalmente Europa y Norteamérica
- **Registro**: Requiere aprobación

### Otras Opciones
- **CREG (Colombia)**: Datos oficiales del mercado colombiano
- **IEA**: Datos internacionales de energía
- **EIA**: Datos de energía de Estados Unidos

## Soporte y Contribución

### Reportar Problemas
- Usar el sistema de issues del proyecto
- Incluir logs y contexto relevante

### Contribuir
- Fork del repositorio
- Crear rama para nueva funcionalidad
- Pull request con descripción detallada

## Licencia

Este proyecto está bajo la misma licencia que el proyecto principal MTE - SIVE App.
