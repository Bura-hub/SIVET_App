import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

import requests

class ScadaConnectorClient:
    """
    A client for connecting to and interacting with SCADA systems.
    ... (copia el resto de tu clase ScadaConnectorClient aquí) ...
    """
    # Usar variable de entorno para la URL base
    base_url: str = os.getenv('SCADA_BASE_URL')

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiration: Optional[datetime] = None

    def _is_token_valid(self) -> bool:
        return (
            self._token
            and self._token_expiration
            and datetime.now(timezone.utc) < self._token_expiration
        )

    def get_token(self) -> str:
        if self._is_token_valid():
            return self._token

        # Accede a las variables de entorno
        username = os.getenv("SCADA_USERNAME")
        password = os.getenv("SCADA_PASSWORD")

        if not username or not password:
            raise EnvironmentError("SCADA_USERNAME or SCADA_PASSWORD are not defined in environment.")

        url = f"{self.base_url}/auth/login"
        headers = {"accept": "application/json", "Content-Type": "application/json"}
        data = {"username": username, "password": password}
        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            auth_data = response.json()
            self._token = auth_data.get("accessToken")
            self._token_expiration = datetime.now(timezone.utc) + timedelta(hours=23)
            return self._token
        else:
            response.raise_for_status()

    def get_institutions(self, token: str) -> Dict[str, Any]:
        url = f"{self.base_url}/institution"
        headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json()

    def get_device_categories(
        self,
        token: str,
        name: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/device-category"
        headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}
        params = {k: v for k, v in {"name": name, "limit": limit, "offset": offset}.items() if v is not None}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_devices(
        self,
        token: str,
        # Nuevos parámetros para filtrar por categoría en la API SCADA
        category_scada_id: Optional[str] = None, # Usará el parámetro 'category' en la URL
        category_name_filter: Optional[str] = None, # Usará el parámetro 'name' en la URL
        institution_id: Optional[Union[str, int]] = None,
        device_name: Optional[str] = None, # Para filtrar por el nombre específico del dispositivo
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/device"
        headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}
        params = {}
        # Priorizar filtro por SCADA ID de categoría si se proporciona
        if category_scada_id:
            params["category"] = category_scada_id
        # Si no hay SCADA ID, intentar filtrar por nombre de categoría
        elif category_name_filter:
            params["name"] = category_name_filter # Este es el filtro por nombre de categoría confirmado

        # Añadir otros parámetros
        if institution_id is not None:
            params["institution"] = institution_id
        
        # Si se proporciona un nombre de dispositivo específico Y NO se usó category_name_filter,
        # entonces aplicar el filtro por nombre de dispositivo.
        # Esto evita sobrescribir el parámetro 'name' si ya se usó para el filtro de categoría.
        if device_name is not None and not category_name_filter:
            params["name"] = device_name
        
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_measurements(
        self,
        token: str,
        device_id: Union[str, int],
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        order_by: str = "date desc",
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/measurement/device/{device_id}"
        headers = {"accept": "application/json", "Authorization": f"Bearer {token}"}
        params = {k: v for k, v in {
            "from": from_date,
            "to": to_date,
            "orderBy": order_by,
            "limit": limit,
            "offset": offset,
        }.items() if v is not None}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()