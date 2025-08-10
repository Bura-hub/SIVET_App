// Configuración base de la API
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// Endpoints organizados por categoría
export const ENDPOINTS = {
  dashboard: {
    kpi: '/api/dashboard/summary/',
    charts: '/api/dashboard/chart-data/',
    tasks: '/api/dashboard/tasks/'
  },
  electrical: {
    meters: '/api/electrical/meters/',
    consumption: '/api/electrical/consumption/',
    details: '/api/electrical/details/',
    energy: '/api/electrical/energy/',  // Nuevo endpoint
  },
  inverters: {
    status: '/api/inverters/status/',
    generation: '/api/inverters/generation/',
    details: '/api/inverters/details/'
  },
  weather: {
    current: '/api/weather/current/',
    forecast: '/api/weather/forecast/',
    details: '/api/weather/details/'
  },
  tasks: {
    sync: '/tasks/fetch-historical/',
    deviceSync: '/local/sync-devices/',
    kpiCalculation: '/api/dashboard/calculate-kpis/',
    dailyData: '/api/dashboard/calculate-daily-data/'
  }
};

/**
 * Función para construir URLs completas de la API
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} params - Parámetros de consulta
 * @returns {string} - URL completa
 */
export const buildApiUrl = (endpoint, params = {}) => {
  const url = new URL(API_BASE_URL + endpoint, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

/**
 * Opciones por defecto para las peticiones fetch
 * @param {string} authToken - Token de autenticación
 * @returns {Object} - Opciones de configuración
 */
export const getDefaultFetchOptions = (authToken) => ({
  headers: {
    'Authorization': `Token ${authToken}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Función para manejar errores de la API
 * @param {Response} response - Respuesta de fetch
 * @returns {Promise} - Promesa resuelta con los datos o rechazada con error
 */
export const handleApiResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Error de red desconocido'
    }));
    throw new Error(error.detail || `Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
