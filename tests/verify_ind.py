import os
import sys # Importar sys para modificar el path
import requests
import logging
from datetime import datetime, timedelta, timezone

# --- INICIO DE CONFIGURACIÓN DE ENTORNO DJANGO ---
# Obtener la ruta del directorio base del proyecto (donde reside manage.py)
# Esto asume que el script se ejecuta desde la raíz del proyecto o desde un subdirectorio como 'indicators'.
# Si el script está en 'MTE-SIVE-App/indicators/exe.py', entonces el base_dir será 'MTE-SIVE-App'.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR) # Añadir el directorio base al Python path

# Asegúrate de que 'MTE-SIVE-App' sea el nombre de tu proyecto Django
# (el directorio que contiene settings.py y urls.py).
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings') # <--- ¡IMPORTANTE! Reemplaza 'MTE-SIVE-App' con el nombre de tu proyecto

import django
django.setup()
# --- FIN DE CONFIGURACIÓN DE ENTORNO DJANGO ---

from rest_framework.test import APIRequestFactory
from rest_framework import status
from rest_framework.response import Response

# Importa las clases necesarias de tus aplicaciones
from scada_proxy.scada_client import ScadaConnectorClient
from indicators.views import ConsumptionSummaryView
from indicators.models import MonthlyConsumptionKPI
from indicators.tasks import calculate_monthly_consumption_kpi # Importar la tarea
from scada_proxy.models import DeviceCategory # Necesario para la vista

# Configura un logger básico para ver los mensajes de info y error
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 1. Preparar el entorno ---
print("--- Preparando entorno de prueba ---")
factory = APIRequestFactory()

# CORRECCIÓN: Usar HTTP_HOST dinámico para evitar DisallowedHost
backend_host = os.getenv('DOMAIN_NAME', 'localhost')
request = factory.get('/api/indicators/consumption-summary/', HTTP_HOST=backend_host)

view = ConsumptionSummaryView.as_view() # Obtiene la función de vista para llamar

# Simular un usuario autenticado (necesario por permission_classes = [IsAuthenticated])
from django.contrib.auth.models import User
try:
    user = User.objects.get(username='testuser')
except User.DoesNotExist:
    user = User.objects.create_user(username='testuser', password='testpassword')
    print("Usuario 'testuser' creado.")

request.user = user # Asignar un usuario para pasar IsAuthenticated

print("Entorno de prueba preparado.")

# --- 2. Ejecutar la tarea de Celery para asegurar datos actualizados en DB ---
print("\n--- Ejecutando la tarea de Celery para actualizar los KPIs en la DB ---")
try:
    task_result = calculate_monthly_consumption_kpi()
    print(f"Tarea de Celery finalizada: {task_result}")
except Exception as e:
    print(f"ERROR: La tarea de Celery falló: {e}")
    import traceback
    traceback.print_exc()
    # No llamar a exit() aquí para permitir que el script continúe y muestre el error de la API
    # exit()

# --- 3. Recuperar valores directamente de la Base de Datos ---
print("\n--- Recuperando valores de KPIs directamente de la Base de Datos ---")
db_kpi_record = MonthlyConsumptionKPI.objects.first()

# CORRECCIÓN: Eliminar indentación excesiva para facilitar el pegado en la shell
if db_kpi_record:
    print(f"Última actualización de KPIs en DB: {db_kpi_record.last_calculated.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    
    db_consumption_current = db_kpi_record.total_consumption_current_month
    db_consumption_previous = db_kpi_record.total_consumption_previous_month
    
    db_generation_current = db_kpi_record.total_generation_current_month
    db_generation_previous = db_kpi_record.total_generation_previous_month

    db_avg_power_current = db_kpi_record.avg_instantaneous_power_current_month
    db_avg_power_previous = db_kpi_record.avg_instantaneous_power_previous_month

    db_avg_temp_current = db_kpi_record.avg_daily_temp_current_month
    db_avg_temp_previous = db_kpi_record.avg_daily_temp_previous_month

    db_avg_humidity_current = db_kpi_record.avg_relative_humidity_current_month
    db_avg_humidity_previous = db_kpi_record.avg_relative_humidity_previous_month

    # Nuevo KPI de velocidad del viento
    db_avg_wind_speed_current = db_kpi_record.avg_wind_speed_current_month
    db_avg_wind_speed_previous = db_kpi_record.avg_wind_speed_previous_month

    db_balance_current = (db_generation_current / 1000.0) - db_consumption_current
    db_balance_previous = (db_generation_previous / 1000.0) - db_consumption_previous

    print("\n--- Valores en Base de Datos ---")
    print(f"  Consumo (Actual): {db_consumption_current:.4f} kWh")
    print(f"  Consumo (Anterior): {db_consumption_previous:.4f} kWh")
    print(f"  Generación (Actual): {db_generation_current:.4f} Wh")
    print(f"  Generación (Anterior): {db_generation_previous:.4f} Wh")
    print(f"  Pot. Instan. Prom. (Actual): {db_avg_power_current:.4f} W")
    print(f"  Pot. Instan. Prom. (Anterior): {db_avg_power_previous:.4f} W")
    print(f"  Temp. Prom. Diaria (Actual): {db_avg_temp_current:.2f} °C") 
    print(f"  Temp. Prom. Diaria (Anterior): {db_avg_temp_previous:.2f} °C") 
    print(f"  Humedad Relativa (Actual): {db_avg_humidity_current:.2f} %RH") 
    print(f"  Humedad Relativa (Anterior): {db_avg_humidity_previous:.2f} %RH") 
    print(f"  Velocidad del Viento (Actual): {db_avg_wind_speed_current:.2f} km/h") # Formato para velocidad del viento
    print(f"  Velocidad del Viento (Anterior): {db_avg_wind_speed_previous:.2f} km/h") # Formato para velocidad del viento
    print(f"  Balance (Actual): {db_balance_current:.4f} kWh")
    print(f"  Balance (Anterior): {db_balance_previous:.4f} kWh")

else:
    print("ADVERTENCIA: No se encontró ningún registro en MonthlyConsumptionKPI en la DB.")

# --- 4. Ejecutar la vista de resumen de consumo (API Endpoint) ---
print("\n--- Ejecutando la vista de la API (/api/indicators/consumption-summary/) ---")
try:
    response = view(request)
    
    if not isinstance(response, Response):
        print(f"ERROR: La vista no devolvió una instancia de Response. Tipo: {type(response)}")
        print(f"Contenido: {response}")
        # No llamar a exit() aquí
        # exit()

    print(f"\nCódigo de estado de la API: {response.status_code}")
    
    if response.status_code == status.HTTP_200_OK:
        api_data = response.data
        print("Datos recibidos de la API:")
        
        # --- Comparación de KPIs ---
        print("\n--- Comparación de KPIs (DB vs API) ---")

        kpis_to_check = [
            ("totalConsumption", "Consumo Total", "kWh", db_consumption_current, db_consumption_previous),
            ("totalGeneration", "Generación Total", "Wh", db_generation_current, db_generation_previous),
            ("energyBalance", "Equilibrio Energético", "kWh", db_balance_current, db_balance_previous),
            ("averageInstantaneousPower", "Pot. instan. promedio", "W", db_avg_power_current, db_avg_power_previous),
            ("avgDailyTemp", "Temp. prom. diaria", "°C", db_avg_temp_current, db_avg_temp_previous),
            ("relativeHumidity", "Humedad relativa", "%RH", db_avg_humidity_current, db_avg_humidity_previous),
            ("windSpeed", "Velocidad del viento", "km/h", db_avg_wind_speed_current, db_avg_wind_speed_previous), # Nuevo KPI
        ]

        # Helper para formatear valores para comparación
        def format_for_comparison(value, unit_type):
            if value is None: 
                return "N/A"
            if unit_type == "kWh":
                return f"{value:.4f} kWh"
            elif unit_type == "Wh":
                return f"{value:.4f} Wh"
            elif unit_type == "W":
                return f"{value:.4f} W"
            elif unit_type == "°C": 
                return f"{value:.2f} °C"
            elif unit_type == "%RH": 
                return f"{value:.2f} %RH"
            elif unit_type == "km/h": # Formato específico para velocidad del viento
                return f"{value:.2f} km/h"
            return str(value)

        for api_key, title, base_unit, db_current, db_previous in kpis_to_check:
            api_kpi = api_data.get(api_key, {})
            api_value_raw = api_kpi.get('value', 0)
            api_value = 0.0
            if isinstance(api_value_raw, str):
                try:
                    api_value = float(api_value_raw.replace(',', '.'))
                except ValueError:
                    api_value = 0.0 
            elif api_value_raw is not None:
                api_value = float(api_value_raw)

            api_unit = api_kpi.get('unit', '')

            # Convertir el valor de la API a la unidad base de la DB para comparación directa
            converted_api_value = api_value
            if api_unit == "MWh" and base_unit == "kWh":
                converted_api_value *= 1000
            elif api_unit == "GWh" and base_unit == "kWh":
                converted_api_value *= 1_000_000
            elif api_unit == "kWh" and base_unit == "Wh":
                converted_api_value *= 1000
            elif api_unit == "MW" and base_unit == "W":
                converted_api_value *= 1_000_000
            elif api_unit == "kW" and base_unit == "W":
                converted_api_value *= 1000
            # No se necesita conversión para °C, %RH o km/h si ya está en la unidad base

            print(f"\n--- KPI: {title} ---")
            print(f"  DB (Actual): {format_for_comparison(db_current, base_unit)}")
            print(f"  API (Actual): {api_kpi.get('value')} {api_kpi.get('unit')} (Convertido a DB unit: {converted_api_value:.4f} {base_unit})")
            print(f"  Descripción API: {api_kpi.get('description')}")
            print(f"  Estado API: {api_kpi.get('status')}")
            
            tolerance = 0.01 
            if db_current is None or converted_api_value is None: 
                print("  -> Coherencia: No se puede comparar (valor es None)")
            elif abs(db_current - converted_api_value) < tolerance:
                print("  -> Coherencia: OK")
            else:
                print(f"  -> Coherencia: ¡ADVERTENCIA! Discrepancia significativa. DB: {db_current}, API (convertido): {converted_api_value}")

        # KPI de Inversores Activos (no tiene valores de mes anterior/cálculo complejo en DB)
        print("\n--- KPI: Inversores Activos (Solo API) ---")
        active_inverters = api_data.get('activeInverters', {})
        print(f"  Título: {active_inverters.get('title')}")
        print(f"  Valor: {active_inverters.get('value')} {active_inverters.get('unit')}")
        print(f"  Descripción: {active_inverters.get('description')}")
        print(f"  Estado: {active_inverters.get('status')}")

    elif response.status_code == status.HTTP_202_ACCEPTED:
        print("La API devolvió 202 ACCEPTED. Los KPIs se están calculando. Intente de nuevo en unos minutos.")
        print(response.data)
    else:
        print(f"La API devolvió un error: {response.status_code}")
        print(response.data)

except Exception as e:
    print(f"ERROR INESPERADO al ejecutar la vista de la API: {e}")
    import traceback
    traceback.print_exc()