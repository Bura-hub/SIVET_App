import os
import sys
import requests
import json
import logging
from datetime import datetime, date, timedelta

# --- INICIO DE CONFIGURACIÓN DE ENTORNO DJANGO ---
# Esto permite que el script acceda a tus modelos y tareas de Celery.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings') # Cambia 'core' si es necesario

import django
django.setup()
# --- FIN DE CONFIGURACIÓN DE ENTORNO DJANGO ---

# Importa los modelos y tareas de Celery
from indicators.models import MonthlyConsumptionKPI, DailyChartData
from indicators.tasks import calculate_monthly_consumption_kpi, calculate_and_save_daily_data
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token # Importamos el modelo de Token

# Configura un logger para la salida del script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuración del endpoint de la API ---
# ¡IMPORTANTE!: Reemplaza la URL base con la de tu servidor Django.
BASE_URL = 'http://127.0.0.1:8000'

# RUTAS DE ENDPOINTS
KPI_ENDPOINT = f"{BASE_URL}/api/dashboard/summary/"
DAILY_CHART_ENDPOINT = f"{BASE_URL}/api/dashboard/chart-data/"

def format_for_comparison(value, unit_type):
    """
    Función auxiliar para formatear valores numéricos para una comparación clara.
    """
    if value is None:
        return "N/A"
    if unit_type in ["kWh", "Wh", "W"]:
        return f"{value:.4f} {unit_type}"
    elif unit_type in ["°C", "%RH", "km/h"]:
        return f"{value:.2f} {unit_type}"
    return str(value)

def main():
    """
    Función principal que maneja la autenticación y ejecuta las pruebas.
    """
    print("--- 1. Preparando entorno: Creando/obteniendo usuario de prueba ---")
    try:
        # Crea o recupera el usuario de prueba
        user, created = User.objects.get_or_create(username='testuser')
        if created:
            user.set_password('testpassword')
            user.save()
            print("  ✅ Usuario 'testuser' creado y configurado.")
        else:
            print("  ✅ Usuario 'testuser' ya existe.")

        # Obtiene o crea el token de autenticación para el usuario
        token, _ = Token.objects.get_or_create(user=user)
        headers = {'Authorization': f'Token {token.key}'}
        print("  ✅ Token de autenticación obtenido exitosamente.")

    except Exception as e:
        logger.error(f"❌ ERROR: Fallo al crear/obtener usuario y token: {e}")
        return

    run_test(headers)

def run_test(headers):
    """
    Función para ejecutar las pruebas con los encabezados de autenticación.
    """
    print("\n--- 2. Ejecutando tareas de Celery ---")
    try:
        print("  -> Ejecutando calculate_monthly_consumption_kpi...")
        task_result_monthly = calculate_monthly_consumption_kpi()
        print(f"  ✅ Tarea mensual finalizada: {task_result_monthly}")

        print("  -> Ejecutando calculate_daily_chart_data...")
        task_result_daily = calculate_and_save_daily_data()
        print(f"  ✅ Tarea diaria finalizada: {task_result_daily}")
    except Exception as e:
        logger.error(f"❌ ERROR: Una de las tareas de Celery falló: {e}")
        import traceback
        traceback.print_exc()
        return

    # --- 3. Recuperar valores directamente de la Base de Datos ---
    print("\n--- 3. Recuperando valores de la Base de Datos para comparación ---")
    db_kpi_record = MonthlyConsumptionKPI.objects.first()
    db_daily_chart_data = list(DailyChartData.objects.all().order_by('date'))

    if not db_kpi_record:
        logger.warning("⚠️ No se encontró ningún registro en MonthlyConsumptionKPI.")
    if not db_daily_chart_data:
        logger.warning("⚠️ No se encontró ningún registro en DailyChartData.")
        
    print(f"  ✅ Datos de KPIs y gráficos recuperados de la DB.")

    # --- 4. Probando el endpoint de KPIs (consumption-summary) ---
    print("\n--- 4. Probando el endpoint de KPIs ---")
    try:
        response = requests.get(KPI_ENDPOINT, headers=headers)
        response.raise_for_status()
        api_data = response.json()

        print(f"  ✅ API respondió con estado {response.status_code}")
        
        # Comparación de KPIs
        kpis_to_check = [
            ("totalConsumption", "Consumo Total", "kWh", db_kpi_record.total_consumption_current_month if db_kpi_record else None, db_kpi_record.total_consumption_previous_month if db_kpi_record else None),
            ("totalGeneration", "Generación Total", "Wh", db_kpi_record.total_generation_current_month if db_kpi_record else None, db_kpi_record.total_generation_previous_month if db_kpi_record else None),
            ("averageInstantaneousPower", "Pot. instan. promedio", "W", db_kpi_record.avg_instantaneous_power_current_month if db_kpi_record else None, db_kpi_record.avg_instantaneous_power_previous_month if db_kpi_record else None),
            ("avgDailyTemp", "Temp. prom. diaria", "°C", db_kpi_record.avg_daily_temp_current_month if db_kpi_record else None, db_kpi_record.avg_daily_temp_previous_month if db_kpi_record else None),
            ("relativeHumidity", "Humedad relativa", "%RH", db_kpi_record.avg_relative_humidity_current_month if db_kpi_record else None, db_kpi_record.avg_relative_humidity_previous_month if db_kpi_record else None),
            ("windSpeed", "Velocidad del viento", "km/h", db_kpi_record.avg_wind_speed_current_month if db_kpi_record else None, db_kpi_record.avg_wind_speed_previous_month if db_kpi_record else None),
        ]

        for api_key, title, base_unit, db_current, db_previous in kpis_to_check:
            api_kpi = api_data.get(api_key, {})
            api_value = float(api_kpi.get('value', 0)) if isinstance(api_kpi.get('value'), (int, float)) else 0.0
            api_unit = api_kpi.get('unit', '')

            # Convertir valor de la API a la unidad base de la DB
            converted_api_value = api_value
            if api_unit == "MWh" and base_unit == "kWh": converted_api_value *= 1000
            elif api_unit == "GWh" and base_unit == "kWh": converted_api_value *= 1_000_000
            elif api_unit == "kWh" and base_unit == "Wh": converted_api_value *= 1000
            elif api_unit == "MW" and base_unit == "W": converted_api_value *= 1_000_000
            elif api_unit == "kW" and base_unit == "W": converted_api_value *= 1000

            print(f"\n--- KPI: {title} ---")
            print(f"    DB (Actual): {format_for_comparison(db_current, base_unit)}")
            print(f"    API (Actual): {api_kpi.get('value')} {api_kpi.get('unit')} (Convertido a DB unit: {converted_api_value:.4f} {base_unit})")
            
            tolerance = 0.01
            if db_current is None or converted_api_value is None:
                print("    -> Coherencia: No se puede comparar (valor es None)")
            elif abs(db_current - converted_api_value) < tolerance:
                print("    ✅ Coherencia: OK")
            else:
                print(f"    ❌ Coherencia: ¡ADVERTENCIA! Discrepancia significativa.")
    except requests.exceptions.RequestException as e:
        print(f"  ❌ ERROR al conectar con el endpoint de KPIs: {e}")

    # --- 5. Probando el endpoint de Daily Chart Data (sin parámetros) ---
    print("\n" + "="*80 + "\n")
    print("--- 5. Probando el endpoint de Daily Chart Data (sin parámetros) ---")
    try:
        response = requests.get(DAILY_CHART_ENDPOINT, headers=headers)
        response.raise_for_status()
        chart_data_from_api = response.json()
        print(f"  ✅ API respondió con estado {response.status_code}")
        print(f"  -> Se recibieron {len(chart_data_from_api)} registros desde la API.")

        if not chart_data_from_api:
            print("  ⚠️ El endpoint de gráfico diario está vacío. Esto podría ser la causa de que el gráfico no se muestre.")
        else:
            last_record_api = chart_data_from_api[-1]
            last_date_str_api = last_record_api.get('date')
            if last_date_str_api:
                last_date_api = datetime.strptime(last_date_str_api, '%Y-%m-%d').date()
                today = date.today()
                
                print(f"  -> Fecha del último registro de la API: {last_date_api}")
                print(f"  -> Fecha de hoy: {today}")

                if last_date_api == today:
                    print("  ✅ Diagnóstico 1: Los datos del gráfico incluyen la fecha de hoy.")
                    print("     El problema no es que falte la data de hoy, sino otra cosa (ver el punto 2).")
                elif last_date_api == today - timedelta(days=1):
                    print("  ⚠️ Diagnóstico 1: El último registro es de ayer. Esto confirma el problema.")
                    print("     Causa probable: La tarea de Celery para 'calculate_daily_chart_data' no se está ejecutando")
                    print("     periódicamente durante el día, sino solo una vez a medianoche (en su versión anterior).")
                else:
                    print(f"  ❌ Diagnóstico 1: La fecha del último registro ({last_date_api}) no es ni hoy ni ayer. Revisa la lógica de la tarea.")
            
        print("\n  --- Diagnóstico de formato de datos para el gráfico ---")
        if chart_data_from_api and isinstance(chart_data_from_api[0], dict):
            first_record = chart_data_from_api[0]
            consumption_value = first_record.get('daily_consumption')
            generation_value = first_record.get('daily_generation')
            date_value = first_record.get('date')
            
            print(f"  -> Verificando las claves del primer registro: {first_record.keys()}")
            
            if not all(k in first_record for k in ['date', 'daily_consumption', 'daily_generation']):
                print("  ❌ Diagnóstico 2: Faltan claves esenciales ('date', 'daily_consumption', 'daily_generation').")
                print("     El componente de React (o Chart.js) no podrá encontrar los datos que necesita.")
            
            if not isinstance(consumption_value, (int, float)):
                print(f"  ❌ Diagnóstico 2: 'daily_consumption' tiene un valor de tipo {type(consumption_value)}. Se esperaba un número.")
                print("     Esto puede hacer que la librería de gráficos (Chart.js, etc.) falle al intentar graficar.")
            
            if not isinstance(generation_value, (int, float)):
                print(f"  ❌ Diagnóstico 2: 'daily_generation' tiene un valor de tipo {type(generation_value)}. Se esperaba un número.")
                print("     Esto puede hacer que la librería de gráficos (Chart.js, etc.) falle al intentar graficar.")
            
            if not isinstance(date_value, str):
                print(f"  ❌ Diagnóstico 2: 'date' tiene un valor de tipo {type(date_value)}. Se esperaba una cadena de texto en formato ISO 8601.")
                print("     El componente de React no podrá procesar correctamente la fecha.")
                
            if isinstance(consumption_value, (int, float)) and isinstance(generation_value, (int, float)) and isinstance(date_value, str):
                print("  ✅ Diagnóstico 2: El formato de datos parece correcto. El problema podría ser en el código de React o Chart.js.")

    except requests.exceptions.RequestException as e:
        print(f"  ❌ ERROR al conectar con el endpoint de gráficos: {e}")
    except (json.JSONDecodeError, IndexError) as e:
        print(f"  ❌ ERROR al procesar la respuesta JSON del gráfico: {e}")

    # --- 6. NUEVA SECCIÓN: Probando el endpoint de Daily Chart Data con parámetros de fecha ---
    print("\n" + "="*80 + "\n")
    print("--- 6. Probando el endpoint de Daily Chart Data (con parámetros de fecha) ---")
    try:
        # Definir el rango de fechas a probar (ej. el mes actual)
        today = date.today()
        start_date = today.replace(day=1) # El primer día del mes actual
        end_date = (start_date.replace(month=start_date.month % 12 + 1, day=1) - timedelta(days=1)) # El último día del mes
        
        params = {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d')
        }
        
        print(f"  -> Probando el rango de fechas: {params['start_date']} a {params['end_date']}")
        
        response = requests.get(DAILY_CHART_ENDPOINT, headers=headers, params=params)
        response.raise_for_status()
        chart_data_with_params = response.json()
        
        print(f"  ✅ API respondió con estado {response.status_code}")
        print(f"  -> Se recibieron {len(chart_data_with_params)} registros para el rango solicitado.")
        
        if not chart_data_with_params:
            print("  ⚠️ El endpoint no devolvió datos para el rango de fechas especificado.")
        else:
            first_record_date_str = chart_data_with_params[0].get('date')
            last_record_date_str = chart_data_with_params[-1].get('date')
            
            first_record_date = datetime.strptime(first_record_date_str, '%Y-%m-%d').date()
            last_record_date = datetime.strptime(last_record_date_str, '%Y-%m-%d').date()
            
            print(f"  -> Fecha del primer registro: {first_record_date}")
            print(f"  -> Fecha del último registro: {last_record_date}")
            
            if first_record_date >= start_date and last_record_date <= end_date:
                print("  ✅ Diagnóstico: Los datos están correctamente filtrados dentro del rango de fechas solicitado.")
            else:
                print("  ❌ Diagnóstico: Los datos devueltos no coinciden con el rango de fechas solicitado.")
                
    except requests.exceptions.RequestException as e:
        print(f"  ❌ ERROR al conectar o consultar el endpoint con parámetros: {e}")
    except (json.JSONDecodeError, IndexError) as e:
        print(f"  ❌ ERROR al procesar la respuesta JSON con parámetros: {e}")


if __name__ == "__main__":
    main()
