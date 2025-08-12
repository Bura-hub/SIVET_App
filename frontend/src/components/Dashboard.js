// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';

// Utilidades para manejo de fechas en zona horaria de Colombia
import { 
  formatDateForAPI, 
  getCurrentMonthStart, 
  getCurrentMonthEnd, 
  getPreviousMonthStart, 
  getPreviousMonthEnd,
  formatDateForDisplay,
  formatAPIDateForDisplay, // Nueva función
  parseISODateToColombia
} from '../utils/dateUtils';

// Importaciones desde Chart.js y el plugin de zoom
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler // Para gráficos con relleno de área
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom'

// Registro de los componentes de Chart.js necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

// Constantes para las unidades y sus conversiones
export const unitConversions = {
  power: {
    W: 1,
    kW: 1000,
    MW: 1000000,
    VAr: 1,
    kVAR: 1000,
    MVAR: 1000000,
    VA: 1,
    kVA: 1000,
    MVA: 1000000
  },
  energy: {
    Wh: 1,
    kWh: 1000,
    MWh: 1000000,
    VArh: 1,
    kVARh: 1000,
    MVARh: 1000000,
    VAh: 1,
    kVAh: 1000,
    MVAh: 1000000
  },
  temperature: {
    '°C': 1,
    '°F': 'special'
  },
  humidity: {
    '%RH': 1
  },
  speed: {
    'km/h': 1,
    'm/s': 3.6
  }
};

/**
 * Convierte un valor de una unidad a otra
 * @param {number} value - Valor a convertir
 * @param {string} fromUnit - Unidad original
 * @param {string} toUnit - Unidad destino
 * @param {string} type - Tipo de medida (power, energy, etc.)
 * @returns {number} - Valor convertido
 */
export const convertUnit = (value, fromUnit, toUnit, type = 'power') => {
  if (value === null || value === undefined) return 0;
  if (fromUnit === toUnit) return value;

  const conversions = unitConversions[type];
  if (!conversions) throw new Error(`Tipo de unidad no soportado: ${type}`);

  // Manejo especial para conversiones de temperatura
  if (type === 'temperature') {
    if (fromUnit === '°F' && toUnit === '°C') {
      return (value - 32) * (5/9);
    } else if (fromUnit === '°C' && toUnit === '°F') {
      return (value * (9/5)) + 32;
    }
  }

  return (value * conversions[fromUnit]) / conversions[toUnit];
};

/**
 * Formatea un valor numérico con su unidad
 * @param {number} value - Valor a formatear
 * @param {string} unit - Unidad del valor
 * @param {number} decimals - Número de decimales
 * @returns {string} - Valor formateado con unidad
 */
export const formatWithUnit = (value, unit, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)} ${unit}`;
};

/**
 * Determina el estado de un valor basado en umbrales
 * @param {number} value - Valor a evaluar
 * @param {Object} thresholds - Umbrales para cada estado
 * @returns {string} - Estado del valor (success, warning, error, normal)
 */
export const getValueStatus = (value, thresholds) => {
  if (!thresholds) return 'normal';
  
  if (value >= thresholds.error) return 'error';
  if (value >= thresholds.warning) return 'warning';
  if (value >= thresholds.success) return 'success';
  return 'normal';
};

/**
 * Objeto con las configuraciones de umbrales para diferentes medidas
 */
export const defaultThresholds = {
  temperature: {
    success: 18,
    warning: 25,
    error: 30
  },
  humidity: {
    success: 30,
    warning: 60,
    error: 80
  },
  powerFactor: {
    success: 0.95,
    warning: 0.85,
    error: 0.8
  }
};

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
    details: '/api/electrical/details/'
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

// Estados posibles para las tareas
export const TaskStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * Clase para manejar las tareas de Celery
 */
export class TaskManager {
  constructor(authToken, onStatusChange) {
    this.authToken = authToken;
    this.onStatusChange = onStatusChange;
    this.activeTasks = new Map();
  }

  /**
   * Ejecuta una tarea específica
   * @param {string} taskType - Tipo de tarea a ejecutar
   * @param {Object} params - Parámetros para la tarea
   * @returns {Promise} - Promesa con el resultado de la tarea
   */
  async executeTask(taskType, params = {}) {
    this._updateTaskStatus(taskType, TaskStatus.RUNNING);

    try {
      const endpoint = this._getEndpointForTask(taskType);
      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        ...getDefaultFetchOptions(this.authToken),
        body: JSON.stringify(params)
      });

      const data = await handleApiResponse(response);
      this._updateTaskStatus(taskType, TaskStatus.COMPLETED);
      return data;
    } catch (error) {
      this._updateTaskStatus(taskType, TaskStatus.ERROR, error.message);
      throw error;
    }
  }

  /**
   * Ejecuta una secuencia de tareas en orden
   * @param {Array} tasks - Array de objetos de tarea
   * @returns {Promise} - Promesa con los resultados de todas las tareas
   */
  async executeTaskSequence(tasks) {
    const results = [];
    for (const task of tasks) {
      try {
        const result = await this.executeTask(task.type, task.params);
        results.push({ type: task.type, success: true, data: result });
      } catch (error) {
        results.push({ type: task.type, success: false, error: error.message });
        if (task.critical) break;
      }
    }
    return results;
  }

  /**
   * Obtiene el endpoint correspondiente a un tipo de tarea
   * @private
   */
  _getEndpointForTask(taskType) {
    switch (taskType) {
      case 'sync':
        return ENDPOINTS.tasks.sync;
      case 'deviceSync':
        return ENDPOINTS.tasks.deviceSync;
      case 'kpiCalculation':
        return ENDPOINTS.tasks.kpiCalculation;
      case 'dailyData':
        return ENDPOINTS.tasks.dailyData;
      default:
        throw new Error(`Tipo de tarea no soportado: ${taskType}`);
    }
  }

  /**
   * Actualiza el estado de una tarea
   * @private
   */
  _updateTaskStatus(taskType, status, error = null) {
    const taskState = {
      status,
      timestamp: new Date(),
      error
    };
    
    this.activeTasks.set(taskType, taskState);
    if (this.onStatusChange) {
      this.onStatusChange(taskType, taskState);
    }
  }
}

// Definir los iconos fuera del componente ya que son constantes
const Icons = {
  consumption: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"></path></svg>,
  
  generation: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-solar-panel" aria-hidden="true"><path d="M12 2v20"></path><path d="M2 12h20"></path><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"></path><path d="M4 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"></path><path d="M12 6v4"></path><path d="M8 8h8"></path></svg>,
  
  balance: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scale" aria-hidden="true"><path d="M12 3V19"></path><path d="M6 15H18"></path><path d="M14 11V19"></path><path d="M10 11V19"></path><path d="M12 19L19 12L22 15L12 19"></path><path d="M12 19L5 12L2 15L12 19"></path></svg>,
  
  inverters: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 21v3"></path><path d="M15 21v3"></path><path d="M1 9h3"></path><path d="M1 15h3"></path><path d="M21 9h3"></path><path d="M21 15h3"></path></svg>,
  
  power: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-power" aria-hidden="true"><path d="M12 2v5"></path><path d="M18 13v-2"></path><path d="M6 13v-2"></path><path d="M4.9 16.5l3.5-3.5"></path><path d="M19.1 16.5l-3.5-3.5"></path><path d="M12 19v3"></path><path d="M12 12v4"></path></svg>,
  
  temperature: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thermometer" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>,
  
  humidity: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplets" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>,
  
  wind: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wind" aria-hidden="true"><path d="M5 8h10"></path><path d="M4 12h16"></path><path d="M8 16h8"></path></svg>,
  
  task: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-circle" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polygon points="10,8 16,12 10,16"></polygon></svg>
};

// Componente principal del dashboard
function Dashboard({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Primero definimos la función showTransitionAnimation
  const showTransitionAnimation = useCallback((type = 'info', message = '', duration = 2000) => {
    setTransitionType(type);
    setTransitionMessage(message);
    setShowTransition(true);
    
      setTimeout(() => {
      setShowTransition(false);
    }, duration);
  }, []);

  // Luego definimos handleTaskStatusChange que usa showTransitionAnimation
  const handleTaskStatusChange = useCallback((taskType, taskState) => {
    setTaskStates(prev => ({
      ...prev,
      [taskType]: taskState
    }));

    if (taskState.status === TaskStatus.RUNNING) {
      showTransitionAnimation('info', `Ejecutando tarea: ${taskType}...`);
    } else if (taskState.status === TaskStatus.COMPLETED) {
      showTransitionAnimation('success', `Tarea ${taskType} completada`);
    } else if (taskState.status === TaskStatus.ERROR) {
      showTransitionAnimation('error', `Error en tarea ${taskType}: ${taskState.error}`);
    }
  }, [showTransitionAnimation]);

  // Ahora declaramos todos los estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Últimos 30 días');
  const [selectedLocation, setSelectedLocation] = useState('Todas');
  const [selectedDevice, setSelectedDevice] = useState('Todos');
  const [taskExecuting, setTaskExecuting] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskStates, setTaskStates] = useState({});
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');
  
  // Creamos el taskManager después de tener todas las funciones necesarias
  const [taskManager] = useState(() => new TaskManager(authToken, handleTaskStatusChange));

  // Estados para los datos
  const [kpiData, setKpiData] = useState({
    totalConsumption: { title: "Consumo total", value: "Cargando...", unit: "", change: "", status: "normal", icon: Icons.consumption },
    totalGeneration: { title: "Generación total", value: "Cargando...", unit: "", change: "", status: "normal", icon: Icons.generation },
    energyBalance: { title: "Equilibrio energético", value: "Cargando...", unit: "", description: "", status: "normal", icon: Icons.balance },
    activeInverters: { title: "Inversores activos", value: "Cargando...", unit: "", description: "", status: "normal", icon: Icons.inverters },
    averageInstantaneousPower: { title: "Pot. instan. promedio", value: "Cargando...", unit: "W", description: "", status: "normal", icon: Icons.power },
    avgDailyTemp: { title: "Temp. prom. diaria", value: "Cargando...", unit: "°C", description: "Rango normal", status: "normal", icon: Icons.temperature },
    relativeHumidity: { title: "Humedad relativa", value: "Cargando...", unit: "%", description: "", status: "normal", icon: Icons.humidity },
    windSpeed: { title: "Velocidad del viento", value: "Cargando...", unit: "km/h", description: "Moderado", status: "moderado", icon: Icons.wind },
        taskExecution: {
      title: "Ejecutar Tareas", 
      value: taskExecuting ? "Ejecutando..." : "Ejecutar", 
      unit: "", 
      description: taskStatus || "Sincronizar metadatos y datos SCADA", 
      status: taskExecuting ? "loading" : "normal", 
      icon: Icons.task,
      onClick: null
    }
  });

  const [electricityConsumptionData, setElectricityConsumptionData] = useState(null);
  const [inverterGenerationData, setInverterGenerationData] = useState(null);
  const [temperatureTrendsData, setTemperatureTrendsData] = useState(null);
  const [energyBalanceData, setEnergyBalanceData] = useState(null);

  // Función mejorada para ejecutar todas las tareas
  const executeAllTasks = async () => {
    if (taskExecuting) return;
    setTaskExecuting(true);

    try {
      const tasks = [
        { type: 'deviceSync', critical: true },
        { type: 'sync', params: { time_range_seconds: 172800 }, critical: false },
        { type: 'kpiCalculation', critical: false },
        { type: 'dailyData', params: { days_back: 3 }, critical: false }
      ];

      const results = await taskManager.executeTaskSequence(tasks);
      const hasErrors = results.some(result => !result.success);

      if (hasErrors) {
        showTransitionAnimation('warning', 'Algunas tareas no se completaron correctamente', 3000);
      } else {
        showTransitionAnimation('success', 'Todas las tareas completadas exitosamente', 2000);
      }

      // Recargar datos después de completar las tareas
      await fetchDashboardData();

    } catch (error) {
      console.error('Error en la ejecución de tareas:', error);
      showTransitionAnimation('error', 'Error en la ejecución de tareas', 3000);
    } finally {
      setTaskExecuting(false);
    }
  };

  // Hook de efecto para cargar datos desde la API
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fechas para las consultas
      const dates = {
        currentMonth: {
          start: getCurrentMonthStart(),
          end: getCurrentMonthEnd()
        },
        prevMonth: {
          start: getPreviousMonthStart(),
          end: getPreviousMonthEnd()
        }
      };

      // Realizar todas las llamadas en paralelo
      const [kpisResponse, currentMonthChartsResponse, prevMonthChartsResponse] = 
        await Promise.all([
          fetch(buildApiUrl(ENDPOINTS.dashboard.kpi), getDefaultFetchOptions(authToken)),
          fetch(buildApiUrl(ENDPOINTS.dashboard.charts, {
            start_date: formatDateForAPI(dates.currentMonth.start),
            end_date: formatDateForAPI(dates.currentMonth.end)
          }), getDefaultFetchOptions(authToken)),
          fetch(buildApiUrl(ENDPOINTS.dashboard.charts, {
            start_date: formatDateForAPI(dates.prevMonth.start),
            end_date: formatDateForAPI(dates.prevMonth.end)
          }), getDefaultFetchOptions(authToken))
        ]);

      // Procesar las respuestas
      const [kpisData, currentMonthCharts, prevMonthCharts] = await Promise.all([
        handleApiResponse(kpisResponse),
        handleApiResponse(currentMonthChartsResponse),
        handleApiResponse(prevMonthChartsResponse)
      ]);

      // Actualizar KPIs con las unidades correctas
      updateKPIs(kpisData);

      // Procesar y actualizar datos de gráficos
      updateCharts(currentMonthCharts, prevMonthCharts);

    } catch (error) {
      setError(error.message);
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar KPIs
  const updateKPIs = (data) => {
        setKpiData(prevKpiData => ({
          ...prevKpiData,
      totalConsumption: {
        ...data.totalConsumption,
        value: parseFloat(data.totalConsumption.value), // Usar el valor tal como viene del backend
        icon: Icons.consumption,
        color: "text-blue-600"
      },
      totalGeneration: {
        ...data.totalGeneration,
        value: parseFloat(data.totalGeneration.value), // Usar el valor tal como viene del backend
        icon: Icons.generation,
        color: "text-green-600"
      },
      energyBalance: {
        ...data.energyBalance,
        value: parseFloat(data.energyBalance.value), // Usar el valor tal como viene del backend
        icon: Icons.balance,
        color: "text-purple-600"
      },
      averageInstantaneousPower: {
        ...data.averageInstantaneousPower,
        value: parseFloat(data.averageInstantaneousPower.value), // Usar el valor tal como viene del backend
        icon: Icons.power,
        color: "text-orange-600"
      },
      avgDailyTemp: {
        ...data.avgDailyTemp,
        value: parseFloat(data.avgDailyTemp.value), // Usar el valor tal como viene del backend
        icon: Icons.temperature,
        color: "text-red-600"
      },
      relativeHumidity: {
        ...data.relativeHumidity,
        value: parseFloat(data.relativeHumidity.value), // Usar el valor tal como viene del backend
        icon: Icons.humidity,
        color: "text-cyan-600"
      },
      windSpeed: {
        ...data.windSpeed,
        value: parseFloat(data.windSpeed.value), // Usar el valor tal como viene del backend
        icon: Icons.wind,
        color: "text-teal-600"
      },
      activeInverters: {
        ...data.activeInverters,
        value: parseInt(data.activeInverters.value), // Usar el valor tal como viene del backend
        icon: Icons.inverters,
        color: "text-indigo-600"
      },
          taskExecution: { 
            ...prevKpiData.taskExecution,
            onClick: executeAllTasks,
            value: taskExecuting ? "Ejecutando..." : "Ejecutar",
            description: taskStatus || "Sincronizar metadatos y datos SCADA",
            status: taskExecuting ? "loading" : "normal",
            color: "text-gray-600"
          }
        }));
  };

  // Función para actualizar gráficos
  const updateCharts = (currentData, previousData) => {
    // Ordenar datos por fecha
    const sortedCurrentData = currentData.sort((a, b) => 
      parseISODateToColombia(a.date) - parseISODateToColombia(b.date)
    );
    const sortedPrevData = previousData.sort((a, b) => 
      parseISODateToColombia(a.date) - parseISODateToColombia(b.date)
    );

    // Actualizar cada gráfico con los datos procesados
    updateConsumptionChart(sortedCurrentData, sortedPrevData);
    updateGenerationChart(sortedCurrentData, sortedPrevData);
    updateBalanceChart(sortedCurrentData, sortedPrevData);
    updateTemperatureChart(sortedCurrentData, sortedPrevData);
  };

  // Modificar las funciones de actualización de gráficos para usar unidades dinámicas
  const updateConsumptionChart = (currentData, prevData) => {
    const units = currentData[0]?.units?.consumption || 'kWh';
    
    setElectricityConsumptionData({
      labels: currentData.map(item => formatAPIDateForDisplay(item.date)),
      datasets: [
        {
          label: `Actual (${units})`,
          data: currentData.map(item => parseFloat(item.daily_consumption)),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4
        },
        {
          label: `Anterior (${units})`,
          data: prevData.map(item => parseFloat(item.daily_consumption)),
          borderColor: '#A1A1AA',
          backgroundColor: 'rgba(161, 161, 170, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    });
  };

  const updateGenerationChart = (currentData, prevData) => {
    const units = currentData[0]?.units?.generation || 'kWh';
    
    setInverterGenerationData({
      labels: currentData.map(item => formatAPIDateForDisplay(item.date)),
      datasets: [
        {
          label: `Actual (${units})`,
          data: currentData.map(item => parseFloat(item.daily_generation)),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1,
          borderRadius: 5,
        },
        {
          label: `Anterior (${units})`,
          data: prevData.map(item => parseFloat(item.daily_generation)),
          backgroundColor: 'rgba(161, 161, 170, 0.6)',
          borderColor: 'rgba(161, 161, 170, 1)',
          borderWidth: 1,
          borderRadius: 5,
        }
      ]
    });
  };

  const updateBalanceChart = (currentData, prevData) => {
    const units = currentData[0]?.units?.balance || 'kWh';
    
    setEnergyBalanceData({
      labels: currentData.map(item => formatAPIDateForDisplay(item.date)),
      datasets: [
        {
          label: `Actual (${units})`,
          data: currentData.map(item => parseFloat(item.daily_balance)),
          borderColor: '#8B5CF6',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
            gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
        },
        {
          label: `Anterior (${units})`,
          data: prevData.map(item => parseFloat(item.daily_balance)),
          borderColor: 'rgba(161, 161, 170, 1)',
          backgroundColor: 'rgba(161, 161, 170, 0.2)',
          fill: true,
          tension: 0.4,
        }
      ]
    });
  };

  const updateTemperatureChart = (currentData, prevData) => {
        setTemperatureTrendsData({
      labels: currentData.map(item => formatAPIDateForDisplay(item.date)),
          datasets: [
            {
              label: 'Actual (°C)',
          data: currentData.map(item => parseFloat(item.avg_daily_temp)), // Usar valor tal como viene del backend
              borderColor: 'rgb(255, 159, 64)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
              tension: 0.4,
              fill: false,
            },
            {
              label: 'Anterior (°C)',
          data: prevData.map(item => parseFloat(item.avg_daily_temp)), // Usar valor tal como viene del backend
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              tension: 0.4,
              fill: false,
        }
      ]
    });
  };

  // Agregar un useEffect que se ejecute cuando el componente se monta
  useEffect(() => {
  if (authToken) {
    setLoading(true);
    // Simular un pequeño delay para mostrar la animación
    setTimeout(() => {
      fetchDashboardData();
    }, 300);
  }
}, []); // Se ejecuta solo al montar el componente

  // Modificar onLogout para incluir animación
  const handleLogout = () => {
    showTransitionAnimation('logout', 'Cerrando sesión...', 1500);
    setTimeout(() => {
      onLogout();
    }, 1500);
  };

  // Opciones genéricas para los gráficos (con soporte para zoom/pan y tooltips mejorados)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          color: '#374151'
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('es-ES', { 
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              }).format(context.parsed.y);
            }
            return label;
          },
          title: function(context) {
            return `Fecha: ${context[0].label}`;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl',
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 1,
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: '500'
          },
          maxRotation: 45,
          minRotation: 0,
          // Mostrar todas las fechas en el eje X
          callback: function(value, index, values) {
            return value;
          }
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
            weight: '500'
          },
          callback: function(value) {
            return new Intl.NumberFormat('es-ES', {
              maximumFractionDigits: 1
            }).format(value);
          }
        },
        border: {
          display: false
        }
      },
    },
    elements: {
      point: {
        hoverRadius: 6,
        radius: 4,
        borderWidth: 2,
      },
      line: {
        borderWidth: 3,
        tension: 0.4,
      },
      bar: {
        borderRadius: 6,
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
    transitions: {
      zoom: {
        animation: {
          duration: 300,
          easing: 'easeInOutQuart',
        }
      }
    }
  };

  // Si está cargando, muestra un spinner o mensaje
  if (loading) { // Solo verificar loading, no electricityConsumptionData
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  // Si hay un error, muestra el mensaje de error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
          Error: {error}
        </div>
      </div>
    );
  }

  // Si no hay datos de gráficos pero no está cargando, mostrar mensaje
  if (!electricityConsumptionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-orange-600 text-lg p-4 bg-orange-100 rounded-lg shadow-md">
          No se pudieron cargar los datos de los gráficos. Intente recargar la página.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header con banner profesional */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg -mx-8 -mt-8">
        <div className="px-8 py-12">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Dashboard Principal</h1>
              <p className="text-blue-100 mt-1">Visión general y análisis de indicadores del sistema</p>
            </div>
          </div>
        </div>
      </header>



      {/* Sección KPI superpuesta con el banner */}
      <section className="-mt-8 mb-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Contenido de KPIs */}
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.keys(kpiData).map((key) => {
                const item = kpiData[key];
                const description = item.description || (item.change ? item.change : "Datos disponibles");
                
                // Mapear colores del KPI a colores de estilo adaptado
                const colorMap = {
                  'text-blue-600': { bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                  'text-green-600': { bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                  'text-purple-600': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                  'text-indigo-600': { bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
                  'text-orange-600': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                  'text-red-600': { bgColor: 'bg-red-50', borderColor: 'border-red-200' },
                  'text-cyan-600': { bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
                  'text-teal-600': { bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
                  'text-gray-600': { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
                };
                const styleColors = colorMap[item.color] || { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
                
                return (
                  <div 
                    key={key} 
                    className={`${styleColors.bgColor} p-6 rounded-xl shadow-md border ${styleColors.borderColor} transform hover:scale-105 transition-all duration-300 hover:shadow-lg ${item.onClick ? 'cursor-pointer' : ''}`}
                    onClick={item.onClick || undefined}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg ${styleColors.bgColor.replace('bg-', 'bg-').replace('-50', '-100')}`}>
                        {item.icon}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-600">{description}</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                    <div className="flex items-baseline">
                      <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                      <span className="ml-2 text-lg text-gray-500">{item.unit}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section con diseño mejorado */}
      <section className="mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Análisis de Datos</h2>
                <p className="text-blue-100 mt-1">Tendencias y patrones del sistema energético</p>
              </div>
            </div>
          </div>
          
          {/* Contenido de gráficos */}
          <div className="p-8">
            <div className="mb-6">
              <div className="text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-xl border border-blue-200 inline-flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Hover sobre los gráficos para ver controles de zoom y pan</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChartCard
                title="Consumo de Electricidad"
                description="Análisis del consumo energético diario comparando el mes actual con el anterior"
                type="line"
                data={electricityConsumptionData}
                options={chartOptions}
                height="300px"
                fullscreenHeight="700px"
              />
              <ChartCard
                title="Generación de los Inversores"
                description="Producción de energía solar diaria y comparación mensual de rendimiento"
                type="bar"
                data={inverterGenerationData}
                options={chartOptions}
                height="280px"
                fullscreenHeight="650px"
              />
              <ChartCard
                title="Balance de Energía"
                description="Diferencia entre consumo y generación, mostrando la eficiencia del sistema"
                type="line"
                data={energyBalanceData}
                options={chartOptions}
                height="320px"
                fullscreenHeight="750px"
              />
              <ChartCard
                title="Temperatura Media Diaria"
                description="Seguimiento de las condiciones ambientales y su impacto en el rendimiento"
                type="line"
                data={temperatureTrendsData}
                options={chartOptions}
                height="260px"
                fullscreenHeight="600px"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Overlay de transición */}
      <TransitionOverlay 
        show={showTransition}
        type={transitionType}
        message={transitionMessage}
      />
    </div>
  );
}

export default Dashboard;