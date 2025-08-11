# Solución al Problema de Relaciones Faltantes en Dispositivos

## 🔍 Problema Identificado

El problema de que los dispositivos aparezcan con `category: null` e `institution: null` en el endpoint `GET /local/devices/` se debe a que **las tareas de Celery que se ejecutan cada hora están sobrescribiendo las relaciones existentes**.

### Causa Raíz

1. **Tarea `check_devices_status`** se ejecuta cada hora (a los 30 minutos)
2. Esta tarea usa `update_or_create` sin preservar las relaciones existentes
3. Cuando SCADA no devuelve datos completos de `category` e `institution`, Django los establece como `NULL`
4. Las relaciones se pierden y solo se recuperan manualmente con `POST /local/sync-devices/`

### Dispositivos Afectados

Según el reporte del usuario, los siguientes dispositivos tenían problemas:
- "Medidor 1 - Alvernia" (categoría: null)
- "Fronius - UCC" (categoría: null)
- "inverter1" (categoría: null)
- "Bloque Nuevo - Medidor 3" (categoría: null)
- "Estación Alvernia" (categoría: null)
- "Prueba" (categoría: null)

## 🛠️ Solución Implementada

### 1. **Corrección de Tareas de Celery**

#### `check_devices_status` (cada hora)
- ✅ **ANTES**: Sobrescribía `category` e `institution` como `NULL`
- ✅ **DESPUÉS**: Preserva las relaciones existentes y solo actualiza si hay datos válidos de SCADA

#### `sync_scada_metadata` y `sync_scada_metadata_enhanced`
- ✅ **ANTES**: Podían establecer relaciones como `NULL` si no había datos válidos
- ✅ **DESPUÉS**: Solo actualizan relaciones cuando hay objetos válidos

### 2. **Nueva Tarea de Reparación Automática**

#### `repair_device_relationships`
- 🆕 **Nueva tarea** que se ejecuta 5 minutos después de `check_devices_status`
- 🔧 **Repara automáticamente** las relaciones perdidas basándose en patrones de nombres
- 📊 **Proporciona logging detallado** del proceso de reparación

### 3. **Cronograma de Celery Mejorado**

```python
# Verificar dispositivos cada hora
'check-devices-status-hourly': {
    'task': 'scada_proxy.tasks.check_devices_status',
    'schedule': crontab(minute=30),  # Cada hora a los 30 minutos
},

# Reparar relaciones después de la verificación
'repair-device-relationships-after-check': {
    'task': 'scada_proxy.tasks.repair_device_relationships',
    'schedule': crontab(minute=35),  # 5 minutos después
},
```

### 4. **Lógica de Reparación Inteligente**

#### Categorías (basadas en patrones de nombres)
- `medidor` o `meter` → `electricmeter`
- `inversor` o `inverter` → `inverter`
- `estación` o `weather` → `weatherstation`

#### Instituciones (basadas en nombres en el dispositivo)
- Busca coincidencias parciales entre el nombre del dispositivo y las instituciones disponibles

## 🚀 Cómo Usar la Solución

### 1. **Reparación Automática**
- Las tareas de Celery ahora reparan automáticamente las relaciones cada hora
- No se requiere intervención manual

### 2. **Reparación Manual Inmediata**
```bash
# Reparar todos los dispositivos
python manage.py repair_device_relationships

# Modo dry-run (ver qué se haría)
python manage.py repair_device_relationships --dry-run

# Con información detallada
python manage.py repair_device_relationships --verbose
```

### 3. **API de Reparación**
```bash
# Reparar todos los dispositivos
POST /local/repair-devices/
{
    "repair_all": true
}

# Reparar dispositivos específicos
POST /local/repair-devices/
{
    "device_ids": [15, 16, 17]
}
```

### 4. **Diagnóstico**
```bash
# Ejecutar diagnóstico completo
python manage.py shell < tests/diagnose_device_relationships.py

# Probar tareas de Celery
python manage.py shell < tests/test_celery_tasks.py
```

## 📊 Monitoreo y Logging

### Logs de Celery
- `check_devices_status`: Logs de verificación de estado
- `repair_device_relationships`: Logs detallados de reparación
- Errores y advertencias para dispositivos problemáticos

### Métricas de Reparación
- Dispositivos reparados exitosamente
- Dispositivos que no se pudieron reparar
- Razones de fallo en la reparación

## 🔒 Prevención de Problemas Futuros

### 1. **Validación de Datos SCADA**
- Verificación de que `category` e `institution` sean objetos válidos antes de actualizar
- Logging de advertencias cuando los datos de SCADA sean incompletos

### 2. **Preservación de Relaciones**
- Las tareas de Celery NO sobrescriben relaciones existentes
- Solo se actualizan cuando hay datos válidos y confirmados

### 3. **Reparación Automática**
- Tarea de reparación se ejecuta automáticamente después de cada verificación
- Detecta y corrige problemas antes de que afecten a los usuarios

## 🧪 Pruebas y Validación

### Scripts de Prueba Disponibles
1. **`diagnose_device_relationships.py`**: Diagnóstico completo del estado
2. **`test_celery_tasks.py`**: Prueba de tareas de Celery
3. **Comando de gestión**: `repair_device_relationships`

### Casos de Prueba
- ✅ Dispositivos con nombres que contienen patrones reconocibles
- ✅ Dispositivos con nombres que no contienen patrones
- ✅ Preservación de relaciones existentes durante actualizaciones
- ✅ Reparación automática después de tareas de verificación

## 📈 Beneficios de la Solución

1. **🔄 Automatización**: No se requiere intervención manual
2. **⚡ Prevención**: Las relaciones se reparan automáticamente cada hora
3. **🛡️ Robustez**: Las tareas de Celery no destruyen relaciones existentes
4. **📊 Visibilidad**: Logging detallado para monitoreo y debugging
5. **🔧 Flexibilidad**: Múltiples opciones para reparación manual cuando sea necesario

## 🚨 Consideraciones Importantes

1. **Patrones de Nombres**: La reparación automática depende de patrones en los nombres de dispositivos
2. **Datos SCADA**: Si SCADA no proporciona datos de categoría/institución, se usan patrones de nombres
3. **Frecuencia**: La reparación se ejecuta cada hora, no en tiempo real
4. **Logging**: Monitorear los logs de Celery para detectar problemas tempranamente

## 🔮 Próximos Pasos Recomendados

1. **Monitorear** las tareas de Celery durante las próximas horas
2. **Verificar** que no aparezcan más dispositivos con `category: null` o `institution: null`
3. **Revisar logs** para asegurar que la reparación automática funcione correctamente
4. **Considerar** ajustar los patrones de nombres si hay dispositivos que no se puedan reparar automáticamente
