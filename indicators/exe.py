import os
import requests
import logging
from datetime import datetime, timedelta, timezone

from rest_framework.test import APIRequestFactory
from rest_framework import status
from rest_framework.response import Response

# Importa las clases necesarias de tus aplicaciones
from scada_proxy.scada_client import ScadaConnectorClient
from indicators.views import ConsumptionSummaryView
from indicators.models import MonthlyConsumptionKPI
from scada_proxy.models import DeviceCategory # Necesario para la vista

# Configura un logger básico para ver los mensajes de info y error
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 1. Preparar el entorno ---
print("--- Preparando entorno de prueba ---")
factory = APIRequestFactory()
view = ConsumptionSummaryView.as_view() # Obtiene la función de vista para llamar

# Simular un usuario autenticado (necesario por permission_classes = [IsAuthenticated])
# En un entorno real, usarías un usuario de prueba o un token real.
# Para esta prueba de shell, simulamos un usuario simple.
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

try:
    user = User.objects.get(username='testuser')
except User.DoesNotExist:
    user = User.objects.create_user(username='testuser', password='testpassword')
    print("Usuario 'testuser' creado.")

import os
import requests
import logging
from datetime import datetime, timedelta, timezone

from rest_framework.test import APIRequestFactory
from rest_framework import status
from rest_framework.response import Response

# Importa las clases necesarias de tus aplicaciones
from scada_proxy.scada_client import ScadaConnectorClient
from indicators.views import ConsumptionSummaryView
from indicators.models import MonthlyConsumptionKPI
from scada_proxy.models import DeviceCategory # Necesario para la vista

# Configura un logger básico para ver los mensajes de info y error
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 1. Preparar el entorno ---
print("--- Preparando entorno de prueba ---")
factory = APIRequestFactory()
view = ConsumptionSummaryView.as_view() # Obtiene la función de vista para llamar

# Simular un usuario autenticado (necesario por permission_classes = [IsAuthenticated])
# En un entorno real, usarías un usuario de prueba o un token real.
# Para esta prueba de shell, simulamos un usuario simple.
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

try:
    user = User.objects.get(username='testuser')
except User.DoesNotExist:
    user = User.objects.create_user(username='testuser', password='testpassword')
    print("Usuario 'testuser' creado.")

# Si usas TokenAuthentication en tu settings.py
# token_obj, created = Token.objects.get_or_create(user=user)
# auth_token = token_obj.key

# Si usas JWT, necesitarías generar un token JWT aquí.
# Para simplificar la prueba de la vista, podemos simular el request.user
# o, si la vista usa el token directamente de scada_client, no necesitamos un token de Django.
# Para esta prueba, la vista se encarga de obtener su propio token de SCADA.
# Solo necesitamos un request.user para pasar la verificación de IsAuthenticated.
request = factory.get('/api/indicators/consumption-summary/')
request.user = user # Asignar un usuario para pasar IsAuthenticated

print("Entorno de prueba preparado. Ejecutando la vista...")

# --- 2. Ejecutar la vista de resumen de consumo ---
try:
    response = view(request)
    
    # Asegurarse de que la respuesta sea una instancia de Response
    if not isinstance(response, Response):
        print(f"ERROR: La vista no devolvió una instancia de Response. Tipo: {type(response)}")
        print(f"Contenido: {response}")
        exit()

    print(f"\n--- Respuesta de la API (Código de estado: {response.status_code}) ---")
    
    if response.status_code == status.HTTP_200_OK:
        data = response.data
        print("Datos recibidos exitosamente:")
        
        print("\n--- KPI: Consumo Total ---")
        consumption = data.get('totalConsumption', {})
        print(f"  Título: {consumption.get('title')}")
        print(f"  Valor: {consumption.get('value')} {consumption.get('unit')}")
        print(f"  Cambio: {consumption.get('change')}")
        print(f"  Estado: {consumption.get('status')}")
        print(f"  Descripción: {consumption.get('description')}")

        print("\n--- KPI: Generación Total ---")
        generation = data.get('totalGeneration', {})
        print(f"  Título: {generation.get('title')}")
        print(f"  Valor: {generation.get('value')} {generation.get('unit')}")
        print(f"  Cambio: {generation.get('change')}")
        print(f"  Estado: {generation.get('status')}")
        print(f"  Descripción: {generation.get('description')}")

        print("\n--- KPI: Equilibrio Energético ---")
        balance = data.get('energyBalance', {})
        print(f"  Título: {balance.get('title')}")
        print(f"  Valor: {balance.get('value')} {balance.get('unit')}")
        print(f"  Cambio: {balance.get('change')}") # Esto debería ser el cambio porcentual vs mes pasado
        print(f"  Descripción: {balance.get('description')}") # Esto debería ser "Déficit", "Superávit", "Equilibrio"
        print(f"  Estado: {balance.get('status')}")

        print("\n--- KPI: Inversores Activos ---")
        active_inverters = data.get('activeInverters', {})
        print(f"  Título: {active_inverters.get('title')}")
        print(f"  Valor: {active_inverters.get('value')} {active_inverters.get('unit')}")
        print(f"  Descripción: {active_inverters.get('description')}")
        print(f"  Estado: {active_inverters.get('status')}")
        
        print("\n--- Verificación adicional de datos en la DB local (MonthlyConsumptionKPI) ---")
        kpi_record = MonthlyConsumptionKPI.objects.first()
        if kpi_record:
            print(f"  Registro KPI en DB (último cálculo: {kpi_record.last_calculated}):")
            print(f"    Consumo Mes Actual (DB): {kpi_record.total_consumption_current_month} kWh")
            print(f"    Generación Mes Actual (DB): {kpi_record.total_generation_current_month} Wh")
            print(f"    Importado Mes Actual (DB): {kpi_record.total_imported_current_month} kWh")
            print(f"    Exportado Mes Actual (DB): {kpi_record.total_exported_current_month} kWh")
            print(f"    Balance Neto (Importado - Exportado) (DB): {kpi_record.total_imported_current_month - kpi_record.total_exported_current_month} kWh")
        else:
            print("  No se encontró ningún registro en MonthlyConsumptionKPI. La tarea de Celery no se ha ejecutado o falló.")

    elif response.status_code == status.HTTP_202_ACCEPTED:
        print("La vista indica que los KPIs se están calculando. Intente de nuevo en unos minutos.")
        print(response.data)
    else:
        print(f"La API devolvió un error: {response.status_code}")
        print(response.data)

except Exception as e:
    print(f"ERROR INESPERADO al ejecutar la vista: {e}")
    import traceback
    traceback.print_exc()