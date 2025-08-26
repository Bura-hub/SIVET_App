# 🚀 Inicio Rápido - Datos Externos de Energía

## Configuración en 3 Pasos

### 1. Obtener API Key de OpenWeatherMap (Gratuito)

1. Ve a [OpenWeatherMap](https://openweathermap.org/api)
2. Haz clic en "Sign Up" y crea una cuenta gratuita
3. Ve a "My API Keys" en tu perfil
4. Copia tu API key

**Ventajas de OpenWeatherMap:**
- ✅ **Completamente gratuito**
- ✅ **60 llamadas por minuto** (suficiente para desarrollo)
- ✅ **Datos climáticos en tiempo real**
- ✅ **Radiación UV** (perfecto para energía solar)
- ✅ **Cobertura mundial**

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz de tu proyecto:

```bash
# API Keys
OPENWEATHER_API_KEY=tu_api_key_aqui

# Configuraciones de ubicación (Pasto, Nariño, Colombia)
DEFAULT_LATITUDE=1.2084
DEFAULT_LONGITUDE=-77.2785

# Configuraciones de desarrollo
USE_SIMULATED_DATA=true
SIMULATED_DATA_DAYS=90
```

### 3. Ejecutar Comandos

```bash
# Activar entorno virtual
.\env_lumen\Scripts\activate

# Ejecutar migraciones
python manage.py makemigrations external_energy
python manage.py migrate

# Poblar datos simulados para Pasto
python manage.py populate_external_energy_data --days 90 --location Pasto

# Probar funcionalidad
python tests/test_external_energy.py
```

## 🎯 ¿Qué Obtienes?

### Datos Solares Específicos de Pasto
- **Radiación solar** adaptada al altiplano nariñense (2,527 msnm)
- **Cobertura de nubes** que refleja el clima templado de montaña
- **Temperatura** en el rango típico de Pasto (8°C - 22°C)
- **Humedad alta** característica de la región (70-90%)
- **Patrones estacionales** específicos:
  - **Temporada de lluvias**: Marzo-Mayo y Octubre-Diciembre
  - **Temporada seca**: Junio-Septiembre

### Precios de Energía Simulados
- **Variaciones diarias** (±5%)
- **Patrones semanales** (días laborales vs fines de semana)
- **Patrones estacionales** (verano/invierno en Colombia)
- **Tendencias realistas** del mercado

### Análisis Económico
- **Cálculo automático de ahorros**
- **ROI estimado** de tu instalación solar
- **Porcentaje de autoconsumo**
- **Excedentes de energía**

## 🔧 APIs Opcionales

### Electricity Maps
Si quieres datos más reales de energía:
1. Ve a [Electricity Maps](https://www.electricitymaps.com/)
2. Solicita acceso gratuito
3. Añade `ELECTRICITY_MAPS_API_KEY=tu_key` a tu `.env`

### Sin API Keys
Si no quieres configurar APIs externas:
- El sistema usará **datos simulados realistas**
- Perfecto para **desarrollo y pruebas**
- **Funcionalidad completa** sin dependencias externas

## 📱 Uso en el Frontend

El componente `ExternalEnergyData.js` ya está configurado para:
- Mostrar **4 pestañas** de análisis
- **KPIs principales** con datos en tiempo real
- **Gráficos interactivos** de precios y ahorros
- **Análisis comparativo** de consumo vs generación

## 🚨 Solución de Problemas

### Error: "No module named 'external_energy'"
```bash
# Asegúrate de que la app esté en INSTALLED_APPS
python manage.py check
```

### Error: "Table doesn't exist"
```bash
# Ejecuta las migraciones
python manage.py migrate external_energy
```

### Datos no se muestran
```bash
# Pobla datos simulados
python manage.py populate_external_energy_data --clear
```

## 🎉 ¡Listo!

Tu sistema de datos externos de energía está funcionando con:
- ✅ **Datos solares** específicos de Pasto, Nariño
- ✅ **Precios simulados** realistas
- ✅ **Análisis económico** completo
- ✅ **Frontend React** integrado
- ✅ **Datos simulados** como fallback

¡Ahora puedes analizar el impacto económico de tu sistema solar en el altiplano nariñense! 🌞💰
