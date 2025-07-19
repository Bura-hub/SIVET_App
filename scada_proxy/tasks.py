import logging
from celery import shared_task
from datetime import datetime, timedelta, timezone
from django.utils.dateparse import parse_datetime
from django.utils.timezone import make_aware, is_naive
import requests
from django.db import transaction, IntegrityError

# Importa tu cliente SCADA y tus modelos
from .scada_client import ScadaConnectorClient
from .models import Institution, DeviceCategory, Device, Measurement

logger = logging.getLogger(__name__)
scada_client = ScadaConnectorClient()

# Tarea para sincronizar metadatos (instituciones y categorías de dispositivos)
@shared_task(bind=True, retry_backoff=60, max_retries=3)
def sync_scada_metadata(self):
    try:
        token = scada_client.get_token()

        # Sincronizar Instituciones
        institutions_data = scada_client.get_institutions(token).get('data', [])
        for inst_data in institutions_data:
            Institution.objects.update_or_create(
                scada_id=str(inst_data['id']), # Asegura que sea string si el campo es CharField
                defaults={
                    'name': inst_data['name'],
                    'description': inst_data.get('description', '')
                }
            )
        logger.info(f"Sincronizadas {len(institutions_data)} instituciones.")

        # Sincronizar Categorías de Dispositivos
        categories_data = scada_client.get_device_categories(token).get('data', [])
        for cat_data in categories_data:
            DeviceCategory.objects.update_or_create(
                scada_id=str(cat_data['id']),
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data.get('description', '')
                }
            )
        logger.info(f"Sincronizadas {len(categories_data)} categorías de dispositivos.")

        # Sincronizar Dispositivos (todos los que la API SCADA liste)
        # Puede que necesites paginar esta llamada si hay muchos dispositivos
        all_devices_data = scada_client.get_devices(token).get('data', []) # Asume que esta llamada no necesita category/institution_id para listar todos
        existing_scada_device_ids = set(Device.objects.values_list('scada_id', flat=True))
        fetched_scada_device_ids = set()

        for device_data in all_devices_data:
            fetched_scada_device_ids.add(str(device_data['id']))
            category_obj = None
            if device_data.get('category_id'): # Asume que la API de dispositivos devuelve 'category_id'
                try:
                    category_obj = DeviceCategory.objects.get(scada_id=str(device_data['category_id']))
                except DeviceCategory.DoesNotExist:
                    logger.warning(f"Categoría {device_data['category_id']} no encontrada para el dispositivo {device_data['name']}. Sincroniza las categorías primero.")

            institution_obj = None
            if device_data.get('institution_id'): # Asume que la API de dispositivos devuelve 'institution_id'
                try:
                    institution_obj = Institution.objects.get(scada_id=str(device_data['institution_id']))
                except Institution.DoesNotExist:
                    logger.warning(f"Institución {device_data['institution_id']} no encontrada para el dispositivo {device_data['name']}. Sincroniza las instituciones primero.")

            device, created = Device.objects.update_or_create(
                scada_id=str(device_data['id']),
                defaults={
                    'name': device_data['name'],
                    'category': category_obj,
                    'institution': institution_obj,
                    'status': device_data.get('status', ''),
                    'is_active': True, # Asumimos que los dispositivos fetched están activos
                }
            )
            if created:
                logger.info(f"Dispositivo '{device.name}' ({device.scada_id}) creado/actualizado.")

        # Desactivar dispositivos que ya no existen en la API SCADA
        devices_to_deactivate = existing_scada_device_ids - fetched_scada_device_ids
        if devices_to_deactivate:
            Device.objects.filter(scada_id__in=list(devices_to_deactivate)).update(is_active=False)
            logger.info(f"Desactivados {len(devices_to_deactivate)} dispositivos que ya no se encuentran en la API SCADA.")


    except requests.exceptions.RequestException as e:
        logger.error(f"Error de red/API al sincronizar metadatos: {e}")
        raise self.retry(exc=e, countdown=self.request.retries * 60) # Reintentar con backoff
    except Exception as e:
        logger.error(f"Error inesperado al sincronizar metadatos: {e}", exc_info=True)
        raise


@shared_task(bind=True, retry_backoff=10, max_retries=5)
def fetch_and_save_measurements_for_device(self, device_scada_id: str, django_device_id: int, from_datetime_str: str, to_datetime_str: str):
    """
    Obtiene y guarda mediciones para un dispositivo SCADA.
    Cada medicion se guarda como un solo JSON por timestamp.
    Usa update_or_create para evitar duplicados.
    """
    try:
        token = scada_client.get_token()
        device_instance = Device.objects.get(id=django_device_id)

        from_dt = datetime.fromisoformat(from_datetime_str).astimezone(timezone.utc)
        to_dt = datetime.fromisoformat(to_datetime_str).astimezone(timezone.utc)

        page_size = 1000
        offset = 0
        total_created, total_updated = 0, 0

        while True:
            measurements_response = scada_client.get_measurements(
                token,
                device_id=device_scada_id,
                from_date=from_dt.isoformat(timespec='seconds'),
                to_date=to_dt.isoformat(timespec='seconds'),
                limit=page_size,
                offset=offset
            )
            measurements_data = measurements_response.get('data', [])

            if not measurements_data:
                break

            for measurement_entry in measurements_data:
                date_str = measurement_entry.get('date')
                data_dict = measurement_entry.get('data', {})

                if not date_str or not data_dict:
                    logger.warning(f"Medición incompleta: {measurement_entry}")
                    continue

                dt = parse_datetime(date_str)
                if dt is None:
                    logger.warning(f"Fecha inválida: {date_str}")
                    continue

                if is_naive(dt):
                    dt = make_aware(dt)

                _, created = Measurement.objects.update_or_create(
                    device=device_instance,
                    date=dt,
                    defaults={"data": data_dict}
                )

                if created:
                    total_created += 1
                else:
                    total_updated += 1

            if len(measurements_data) < page_size:
                break
            offset += page_size

        logger.info(f"Dispositivo {device_scada_id}: {total_created} nuevas, {total_updated} actualizadas")

    except Device.DoesNotExist:
        logger.error(f"Dispositivo con id {django_device_id} no encontrado.")
    except Exception as e:
        logger.error(f"Error al obtener/guardar mediciones: {e}", exc_info=True)
        raise

@shared_task
def fetch_historical_measurements_for_all_devices(time_range_seconds: int):
    """
    Lanza subtareas para obtener mediciones históricas de todos los dispositivos en el rango dado.
    """
    time_range = timedelta(seconds=time_range_seconds)
    now_utc = datetime.now(timezone.utc)
    from_date = now_utc - time_range

    logger.info(f"Iniciando la obtención de mediciones históricas para los últimos {time_range}.")

    devices = Device.objects.filter(is_active=True)

    if not devices.exists():
        logger.warning("No hay dispositivos activos registrados en la base de datos.")
        return

    for device in devices:
        fetch_and_save_measurements_for_device.delay(
            device_scada_id=device.scada_id,
            django_device_id=device.id,
            from_datetime_str=from_date.isoformat(),
            to_datetime_str=now_utc.isoformat()
        )
        logger.info(f"Tarea creada para dispositivo {device.name} ({device.scada_id}) "
                    f"desde {from_date} hasta {now_utc}.")

    logger.info("Todas las subtareas para obtener mediciones han sido encoladas.")