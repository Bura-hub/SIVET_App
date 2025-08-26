import requests
import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
import json

logger = logging.getLogger(__name__)


class OpenWeatherEnergyService:
    """Servicio para obtener datos climáticos que afectan la generación solar"""
    
    def __init__(self):
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.api_key = getattr(settings, 'OPENWEATHER_API_KEY', None)
        self.session = requests.Session()
        
        # Configuraciones específicas de Pasto
        self.latitude = getattr(settings, 'DEFAULT_LATITUDE', 1.2084)  # Pasto, Nariño
        self.longitude = getattr(settings, 'DEFAULT_LONGITUDE', -77.2785)
        self.altitude = getattr(settings, 'PASTO_ALTITUDE', 2527)
        self.rainy_seasons = getattr(settings, 'PASTO_RAINY_SEASONS', [3, 4, 5, 10, 11, 12])
        self.dry_seasons = getattr(settings, 'PASTO_DRY_SEASONS', [6, 7, 8, 9])
        self.temp_range = getattr(settings, 'PASTO_TEMP_RANGE', (8, 22))
        self.humidity_range = getattr(settings, 'PASTO_HUMIDITY_RANGE', (70, 90))
        
        if self.api_key:
            self.session.headers.update({
                'Content-Type': 'application/json'
            })
    
    def fetch_solar_data(self, start_date, end_date, lat=None, lon=None):
        """
        Obtiene datos solares que afectan la generación de energía
        """
        try:
            # Usar coordenadas de Pasto por defecto si no se especifican
            if lat is None:
                lat = self.latitude
            if lon is None:
                lon = self.longitude
            
            if not self.api_key:
                return self._get_simulated_solar_data(start_date, end_date, lat, lon)
            
            # Para OpenWeather, usamos el endpoint actual del clima y simulamos datos históricos
            # ya que el endpoint histórico tiene limitaciones
            solar_data = []
            current_date = start_date
            
            while current_date <= end_date:
                # Solo obtener datos actuales si es hoy
                if current_date == timezone.now().date():
                    try:
                        endpoint = f"{self.base_url}/weather"
                        params = {
                            'lat': lat,
                            'lon': lon,
                            'appid': self.api_key,
                            'units': 'metric'
                        }
                        
                        response = self.session.get(endpoint, params=params, timeout=30)
                        
                        if response.status_code == 200:
                            data = response.json()
                            solar_data.append(self._parse_current_weather_data(data, current_date))
                        else:
                            # Fallback a datos simulados si hay error
                            solar_data.append(self._get_simulated_solar_data_for_date(current_date, lat, lon))
                    except Exception as e:
                        logger.error(f"Error obteniendo datos actuales: {str(e)}")
                        solar_data.append(self._get_simulated_solar_data_for_date(current_date, lat, lon))
                else:
                    # Para fechas pasadas o futuras, usar datos simulados
                    solar_data.append(self._get_simulated_solar_data_for_date(current_date, lat, lon))
                
                current_date += timedelta(days=1)
            
            return solar_data
            
        except Exception as e:
            logger.error(f"Error al obtener datos solares: {str(e)}")
            return self._get_simulated_solar_data(start_date, end_date, lat, lon)
    
    def _parse_current_weather_data(self, data, date):
        """Parsea datos del clima actual de OpenWeather"""
        try:
            # Extraer datos relevantes
            clouds = data.get('clouds', {}).get('all', 50)
            temp = data.get('main', {}).get('temp', 20)
            humidity = data.get('main', {}).get('humidity', 60)
            wind_speed = data.get('wind', {}).get('speed', 0)
            
            # Calcular radiación solar aproximada basada en cobertura de nubes
            # Menos nubes = más radiación
            # En Pasto, la altitud alta aumenta la radiación solar
            base_radiation = 850  # W/m² en un día despejado en altitud alta
            cloud_factor = 1 - (clouds / 100) * 0.7  # Las nubes reducen la radiación hasta 70%
            altitude_factor = 1.1  # Factor de altitud para Pasto (2,527 msnm)
            solar_radiation = base_radiation * cloud_factor * altitude_factor
            
            return {
                'date': date,
                'solar_radiation': round(solar_radiation, 2),
                'cloud_coverage': round(clouds, 2),
                'temperature': round(temp, 1),
                'humidity': round(humidity, 1),
                'wind_speed': round(wind_speed, 1)
            }
        except Exception as e:
            logger.error(f"Error al parsear datos del clima: {str(e)}")
            return self._get_simulated_solar_data_for_date(date, self.latitude, self.longitude)
    
    def _get_simulated_solar_data(self, start_date, end_date, lat=None, lon=None):
        """Genera datos solares simulados"""
        solar_data = []
        current_date = start_date
        
        while current_date <= end_date:
            solar_data.append(self._get_simulated_solar_data_for_date(current_date, lat, lon))
            current_date += timedelta(days=1)
        
        return solar_data
    
    def _get_simulated_solar_data_for_date(self, date, lat=None, lon=None):
        """Genera datos solares simulados para una fecha específica en Pasto"""
        import random
        
        # Usar coordenadas de Pasto por defecto
        if lat is None:
            lat = self.latitude
        if lon is None:
            lon = self.longitude
        
        month = date.month
        
        # Configuraciones específicas del clima de Pasto
        if month in self.rainy_seasons:  # Temporada de lluvias
            base_radiation = random.uniform(500, 700)  # Menos radiación por nubes
            base_clouds = random.uniform(60, 85)  # Más nubes
            base_humidity = random.uniform(80, 95)  # Alta humedad
        elif month in self.dry_seasons:  # Temporada seca
            base_radiation = random.uniform(800, 950)  # Más radiación
            base_clouds = random.uniform(25, 45)  # Menos nubes
            base_humidity = random.uniform(65, 80)  # Humedad moderada
        else:  # Transiciones
            base_radiation = random.uniform(650, 800)
            base_clouds = random.uniform(40, 60)
            base_humidity = random.uniform(70, 85)
        
        # Simular variaciones diarias
        variation = random.uniform(-0.15, 0.15)
        daily_radiation = base_radiation * (1 + variation)
        daily_clouds = base_clouds * (1 + random.uniform(-0.1, 0.1))
        
        # Temperatura específica de Pasto (clima templado de montaña)
        daily_temp = random.uniform(self.temp_range[0], self.temp_range[1])
        
        # Humedad específica de Pasto (alta humedad típica)
        daily_humidity = max(self.humidity_range[0], 
                           min(self.humidity_range[1], 
                               base_humidity + random.uniform(-5, 5)))
        
        # Velocidad del viento (moderada en Pasto)
        daily_wind = random.uniform(0, 12)
        
        return {
            'date': date,
            'solar_radiation': round(daily_radiation, 2),
            'cloud_coverage': round(daily_clouds, 2),
            'temperature': round(daily_temp, 1),
            'humidity': round(daily_humidity, 1),
            'wind_speed': round(daily_wind, 1)
        }


class ElectricityMapsService:
    """Servicio para obtener datos de energía desde Electricity Maps (más accesible)"""
    
    def __init__(self):
        self.base_url = "https://api.electricitymap.org/v3"
        self.api_key = getattr(settings, 'ELECTRICITY_MAPS_API_KEY', None)
        self.session = requests.Session()
        
        if self.api_key:
            self.session.headers.update({
                'auth-token': self.api_key,
                'Content-Type': 'application/json'
            })
    
    def fetch_energy_prices(self, start_date, end_date):
        """
        Obtiene precios de energía desde Electricity Maps
        """
        try:
            if not self.api_key:
                return self._get_simulated_prices(start_date, end_date)
            
            # Electricity Maps tiene datos limitados gratuitos, usar simulados como fallback
            return self._get_simulated_prices(start_date, end_date)
            
        except Exception as e:
            logger.error(f"Error al obtener precios de Electricity Maps: {str(e)}")
            return self._get_simulated_prices(start_date, end_date)
    
    def fetch_market_data(self, target_date=None):
        """
        Obtiene datos del mercado de energía
        """
        try:
            if not target_date:
                target_date = timezone.now().date()
            
            if not self.api_key:
                return self._get_simulated_market_data(target_date)
            
            # Usar datos simulados como fallback
            return self._get_simulated_market_data(target_date)
            
        except Exception as e:
            logger.error(f"Error al obtener datos del mercado: {str(e)}")
            return self._get_simulated_market_data(target_date)
    
    def _get_simulated_prices(self, start_date, end_date):
        """Genera datos simulados de precios para desarrollo/pruebas"""
        prices = []
        current_date = start_date
        
        # Precio base en COP/kWh (precio típico en Colombia)
        base_price = 450.0
        
        while current_date <= end_date:
            # Simular variaciones diarias
            import random
            variation = random.uniform(-0.05, 0.05)  # ±5%
            daily_price = base_price * (1 + variation)
            
            # Simular patrones semanales (precios más altos en días laborales)
            if current_date.weekday() < 5:  # Lunes a viernes
                daily_price *= 1.1
            
            # Simular patrones estacionales
            if current_date.month in [12, 1, 2]:  # Diciembre a febrero (verano)
                daily_price *= 1.15
            elif current_date.month in [6, 7, 8]:  # Junio a agosto (invierno)
                daily_price *= 0.95
            
            prices.append({
                'date': current_date,
                'price': round(daily_price, 2)
            })
            
            current_date += timedelta(days=1)
        
        return prices
    
    def _get_simulated_market_data(self, target_date):
        """Genera datos simulados del mercado para desarrollo/pruebas"""
        import random
        
        return {
            'demand_mw': round(random.uniform(8000, 12000), 2),
            'supply_mw': round(random.uniform(8500, 12500), 2),
            'hydro_percentage': round(random.uniform(60, 80), 2),
            'thermal_percentage': round(random.uniform(15, 25), 2),
            'renewable_percentage': round(random.uniform(5, 15), 2),
            'market_price_cop_mwh': round(random.uniform(150000, 250000), 2)
        }


class EnergyCalculationService:
    """Servicio para calcular ahorros y métricas de energía"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def calculate_energy_savings(self, start_date, end_date):
        """
        Calcula ahorros de energía para un período específico
        """
        try:
            from indicators.models import ElectricMeterEnergyConsumption, InverterChartData
            
            savings_data = []
            current_date = start_date
            
            while current_date <= end_date:
                # Obtener consumo del medidor eléctrico
                consumption = ElectricMeterEnergyConsumption.objects.filter(
                    date=current_date
                ).first()
                
                # Obtener generación del inversor
                generation = InverterChartData.objects.filter(
                    date=current_date
                ).first()
                
                if consumption and generation:
                    consumed_kwh = float(consumption.totalactivepower or 0)
                    generated_kwh = float(generation.totalactivepower or 0)
                    
                    # Obtener precio promedio del día
                    from .models import EnergyPrice
                    price_record = EnergyPrice.objects.filter(date=current_date).first()
                    price_per_kwh = float(price_record.price_per_kwh) if price_record else 450.0
                    
                    savings_data.append({
                        'date': current_date,
                        'consumed': consumed_kwh,
                        'generated': generated_kwh,
                        'price': price_per_kwh
                    })
                
                current_date += timedelta(days=1)
            
            return savings_data
            
        except Exception as e:
            self.logger.error(f"Error al calcular ahorros de energía: {str(e)}")
            return []
    
    def calculate_roi(self, total_savings, installation_cost):
        """
        Calcula el retorno de inversión
        """
        try:
            if installation_cost > 0:
                return (total_savings / installation_cost) * 100
            return 0
        except Exception as e:
            self.logger.error(f"Error al calcular ROI: {str(e)}")
            return 0
    
    def calculate_capacity_factor(self, total_generated, installed_capacity, hours):
        """
        Calcula el factor de capacidad
        """
        try:
            if installed_capacity > 0 and hours > 0:
                theoretical_generation = installed_capacity * hours
                if theoretical_generation > 0:
                    return (total_generated / theoretical_generation) * 100
            return 0
        except Exception as e:
            self.logger.error(f"Error al calcular factor de capacidad: {str(e)}")
            return 0


class PriceForecastService:
    """Servicio para pronósticos de precios de energía"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def get_price_forecast(self, start_date, days_ahead):
        """
        Obtiene pronósticos de precios de energía
        """
        try:
            # Intentar obtener pronósticos de la base de datos
            from .models import EnergyPriceForecast
            
            forecasts = EnergyPriceForecast.objects.filter(
                date__range=[start_date, start_date + timedelta(days=days_ahead)]
            ).order_by('date')
            
            if forecasts.exists():
                return [
                    {
                        'date': f.date.strftime('%Y-%m-%d'),
                        'price': float(f.predicted_price_kwh)
                    }
                    for f in forecasts
                ]
            
            # Si no hay pronósticos, generar simulados
            return self._generate_simulated_forecast(start_date, days_ahead)
            
        except Exception as e:
            self.logger.error(f"Error al obtener pronósticos: {str(e)}")
            return self._generate_simulated_forecast(start_date, days_ahead)
    
    def _generate_simulated_forecast(self, start_date, days_ahead):
        """Genera pronósticos simulados basados en datos históricos"""
        try:
            from .models import EnergyPrice
            
            # Obtener precio promedio reciente
            recent_prices = EnergyPrice.objects.filter(
                date__lte=start_date
            ).order_by('-date')[:7]
            
            if recent_prices.exists():
                avg_price = sum(float(p.price_per_kwh) for p in recent_prices) / len(recent_prices)
            else:
                avg_price = 450.0  # Precio por defecto
            
            forecasts = []
            current_date = start_date
            
            for i in range(days_ahead):
                # Simular tendencia con ruido
                import random
                trend = 0.0005 * i  # Tendencia muy sutil
                noise = random.uniform(-0.01, 0.01)  # ±1% de ruido
                predicted_price = avg_price * (1 + trend + noise)
                
                forecasts.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'price': round(predicted_price, 2)
                })
                
                current_date += timedelta(days=1)
            
            return forecasts
            
        except Exception as e:
            self.logger.error(f"Error al generar pronósticos simulados: {str(e)}")
            return []


# Mantener compatibilidad con el código existente
class XMEnergyService:
    """Servicio legacy - ahora usa ElectricityMapsService"""
    
    def __init__(self):
        self.electricity_service = ElectricityMapsService()
        self.weather_service = OpenWeatherEnergyService()
    
    def fetch_energy_prices(self, start_date, end_date):
        return self.electricity_service.fetch_energy_prices(start_date, end_date)
    
    def fetch_market_data(self, target_date=None):
        return self.electricity_service.fetch_market_data(target_date)
    
    def sync_all_data(self):
        try:
            today = timezone.now().date()
            start_date = today - timedelta(days=30)
            
            # Obtener precios
            prices = self.fetch_energy_prices(start_date, today)
            
            # Obtener datos del mercado
            market_data = self.fetch_market_data(today)
            
            # Obtener datos solares
            solar_data = self.weather_service.fetch_solar_data(start_date, today)
            
            return {
                'prices_synced': len(prices),
                'market_data_synced': 1 if market_data else 0,
                'solar_data_synced': len(solar_data),
                'last_sync': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error en sync_all_data: {str(e)}")
            return {
                'error': str(e),
                'last_sync': timezone.now().isoformat()
            }
    
    def fetch_price_forecasts(self, start_date, days_ahead):
        forecast_service = PriceForecastService()
        return forecast_service.get_price_forecast(start_date, days_ahead)
