"""
Configuración para la aplicación de datos externos de energía
"""

import os
from pathlib import Path

# Cargar variables de entorno desde .env
def load_env_vars():
    """Carga variables de entorno desde archivo .env"""
    env_file = Path(__file__).parent.parent.parent / '.env'
    
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

# Cargar variables de entorno
load_env_vars()

# Configuraciones de OpenWeather
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')
OPENWEATHER_BASE_URL = os.environ.get('OPENWEATHER_BASE_URL', 'https://api.openweathermap.org/data/2.5')
OPENWEATHER_TIMEOUT = int(os.environ.get('OPENWEATHER_TIMEOUT', 30))

# Coordenadas de Pasto, Nariño, Colombia
# Pasto está ubicado en el altiplano nariñense a 2,527 msnm
DEFAULT_LATITUDE = float(os.environ.get('DEFAULT_LATITUDE', 1.2084))  # Pasto, Nariño
DEFAULT_LONGITUDE = float(os.environ.get('DEFAULT_LONGITUDE', -77.2785))

# Configuraciones específicas de Pasto
PASTO_ALTITUDE = 2527  # metros sobre el nivel del mar
PASTO_CLIMATE_ZONE = 'tropical_highland'  # Clima de altiplano tropical

# Configuraciones de Electricity Maps
ELECTRICITY_MAPS_API_KEY = os.environ.get('ELECTRICITY_MAPS_API_KEY')
ELECTRICITY_MAPS_BASE_URL = os.environ.get('ELECTRICITY_MAPS_BASE_URL', 'https://api.electricitymap.org/v3')
ELECTRICITY_MAPS_TIMEOUT = int(os.environ.get('ELECTRICITY_MAPS_TIMEOUT', 30))

# Configuraciones de caché
ENERGY_DATA_CACHE_TTL = int(os.environ.get('ENERGY_DATA_CACHE_TTL', 3600))
SOLAR_DATA_CACHE_TTL = int(os.environ.get('SOLAR_DATA_CACHE_TTL', 7200))
PRICE_FORECAST_CACHE_TTL = int(os.environ.get('PRICE_FORECAST_CACHE_TTL', 7200))

# Configuraciones de sincronización
SYNC_INTERVAL_HOURS = int(os.environ.get('SYNC_INTERVAL_HOURS', 6))
MAX_SYNC_RETRIES = int(os.environ.get('MAX_SYNC_RETRIES', 3))

# Configuraciones de alertas
PRICE_SPIKE_THRESHOLD = float(os.environ.get('PRICE_SPIKE_THRESHOLD', 0.15))
DEMAND_SPIKE_THRESHOLD = float(os.environ.get('DEMAND_SPIKE_THRESHOLD', 0.20))
GENERATION_DROP_THRESHOLD = float(os.environ.get('GENERATION_DROP_THRESHOLD', 0.25))
SOLAR_RADIATION_THRESHOLD = float(os.environ.get('SOLAR_RADIATION_THRESHOLD', 500))

# Configuraciones de pronósticos
FORECAST_DAYS_AHEAD = int(os.environ.get('FORECAST_DAYS_AHEAD', 30))
FORECAST_CONFIDENCE_THRESHOLD = float(os.environ.get('FORECAST_CONFIDENCE_THRESHOLD', 70.0))

# Configuraciones de datos simulados
USE_SIMULATED_DATA = os.environ.get('USE_SIMULATED_DATA', 'true').lower() == 'true'
SIMULATED_DATA_DAYS = int(os.environ.get('SIMULATED_DATA_DAYS', 90))

# Configuraciones de logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
LOG_FILE = os.environ.get('LOG_FILE', 'external_energy.log')

# Configuraciones de datos solares
SOLAR_RADIATION_UNITS = os.environ.get('SOLAR_RADIATION_UNITS', 'W/m²')
CLOUD_COVERAGE_UNITS = os.environ.get('CLOUD_COVERAGE_UNITS', '%')
TEMPERATURE_UNITS = os.environ.get('TEMPERATURE_UNITS', 'Celsius')

# Configuraciones específicas del clima de Pasto
# Pasto tiene un clima templado de montaña con lluvias frecuentes
PASTO_RAINY_SEASONS = [3, 4, 5, 10, 11, 12]  # Marzo-Mayo y Octubre-Diciembre
PASTO_DRY_SEASONS = [6, 7, 8, 9]  # Junio-Septiembre
PASTO_TEMP_RANGE = (8, 22)  # Rango típico de temperatura en Pasto
PASTO_HUMIDITY_RANGE = (70, 90)  # Alta humedad típica de Pasto
