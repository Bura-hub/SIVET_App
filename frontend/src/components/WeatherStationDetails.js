// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';
import WeatherStationFilters from './WeatherStationFilters';
import { ENDPOINTS, buildApiUrl, getDefaultFetchOptions, handleApiResponse } from '../utils/apiConfig';

// Importaciones desde Chart.js y el plugin de zoom
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom'

// Registro de los componentes de Chart.js necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

// Configuración de gráficos
const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '500' }, color: '#374151' }
    },
    title: { display: false },
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
        label: (context) => {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(context.parsed.y);
          }
          return label;
        },
        title: (context) => `Fecha: ${context[0].label}`
      }
    },
    zoom: {
      pan: { enabled: true, mode: 'x', modifierKey: 'ctrl' },
      zoom: {
        wheel: { enabled: true, speed: 0.1 },
        pinch: { enabled: true },
        mode: 'x',
        drag: { enabled: true, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', borderWidth: 1 }
      }
    }
  },
  scales: {
    x: {
      type: 'category',
      grid: { display: true, color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
      ticks: { color: '#6B7280', font: { size: 11, weight: '500' }, maxRotation: 45, minRotation: 0 },
      border: { display: false }
    },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
      ticks: {
        color: '#6B7280',
        font: { size: 11, weight: '500' },
        callback: (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)
      },
      border: { display: false }
    }
  },
  elements: {
    point: { hoverRadius: 6, radius: 4, borderWidth: 2 },
    line: { borderWidth: 3, tension: 0.4 },
    bar: { borderRadius: 6 }
  },
  interaction: { mode: 'nearest', axis: 'x', intersect: false },
  animation: { duration: 1000, easing: 'easeInOutQuart' },
  transitions: { zoom: { animation: { duration: 300, easing: 'easeInOutQuart' } } }
};

// Componente de encabezado de sección
const SectionHeader = ({ title, icon, infoText }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
      <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {title}
    </h2>
    <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
      <span className="flex items-center">
        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {infoText}
      </span>
    </div>
  </div>
);

// Componente principal
function WeatherStationDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Estados consolidados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    timeRange: 'daily',
    institutionId: null,
    deviceId: null,
    startDate: null,
    endDate: null
  });
  
  // Estados de datos meteorológicos
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const requestSeqRef = useRef(0);
  const debounceRef = useRef(null);
  const lastFiltersRef = useRef(null);

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState('irradiance');

  // KPIs dinámicos basados en datos reales
  const [kpiData, setKpiData] = useState({
    irradiance: { 
      title: "Irradiancia Acumulada", 
      value: "0.00", 
      unit: "kWh/m²", 
      change: "Este período", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66-1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 6.34-1.41-1.41"/><path d="m17.66 6.34-1.41-1.41"/></svg>,
      color: "text-orange-600"
    },
    hsp: { 
      title: "Horas Solares Pico", 
      value: "0.0", 
      unit: "HSP", 
      change: "Equivalente solar", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v6"/><path d="M12 17v6"/><path d="M4.22 4.22l4.24 4.24"/><path d="M15.54 15.54l4.24 4.24"/><path d="M1 12h6"/><path d="M17 12h6"/><path d="M4.22 19.78l4.24-4.24"/><path d="M15.54 8.46l4.24-4.24"/></svg>,
      color: "text-yellow-600"
    },
    windSpeed: { 
      title: "Velocidad del Viento", 
      value: "0.0", 
      unit: "km/h", 
      change: "Promedio del período", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8h10"/><path d="M4 12h16"/><path d="M8 16h8"/></svg>,
      color: "text-blue-600"
    },
    precipitation: { 
      title: "Precipitación Acumulada", 
      value: "0.00", 
      unit: "cm/día", 
      change: "Acumulado del período", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/></svg>,
      color: "text-cyan-600"
    },
    pvPower: { 
      title: "Potencia Fotovoltaica", 
      value: "0.0", 
      unit: "W", 
      change: "Basada en irradiancia", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 12h2l1 2 2-4 1 2h2"></path><path d="M17 16h.01"></path><path d="M17 8h.01"></path></svg>,
      color: "text-purple-600"
    }
  });

  // Estados para datos de gráficos
  const [chartData, setChartData] = useState({});

  // Funciones optimizadas
  const showTransitionAnimation = (type = 'info', message = '', duration = 2000) => {
    setTransitionType(type);
    setTransitionMessage(message);
    setShowTransition(true);
    setTimeout(() => setShowTransition(false), duration);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const fetchChartData = useCallback(async (params, requestSeq) => {
    try {
      const chartParams = new URLSearchParams(params);
      const response = await fetch(`/api/weather-station-chart-data/?${chartParams.toString()}`, {
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();

      if (requestSeq === requestSeqRef.current) {
        processChartData(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }, [authToken]);

  const fetchWeatherData = useCallback(async (filters) => {
    let seq = 0;
    try {
      seq = ++requestSeqRef.current;
      if (!filters || !filters.institutionId) return;
      
      setWeatherLoading(true);
      setWeatherError(null);
      
      // Usar fechas por defecto si no se han especificado
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 10);
      
      const timeRange = filters.timeRange || 'daily';
      const baseParams = {
        time_range: timeRange,
        ...(filters.institutionId && { institution_id: filters.institutionId }),
        ...(filters.deviceId && { device_id: filters.deviceId }),
        start_date: filters.startDate || defaultStartDate.toISOString().split('T')[0],
        end_date: filters.endDate || defaultEndDate.toISOString().split('T')[0]
      };

      const indicatorsParams = new URLSearchParams(baseParams);

      const indicatorsResp = await fetch(`/api/weather-station-indicators/?${indicatorsParams.toString()}`, {
          headers: {
            'Authorization': `Token ${authToken}`,
            'Content-Type': 'application/json'
          }
      });

      if (!indicatorsResp.ok) {
        const errText = await indicatorsResp.text();
        throw new Error(errText || indicatorsResp.statusText);
      }

      const indicatorsData = await indicatorsResp.json();

      if (seq === requestSeqRef.current) {
        setWeatherData(indicatorsData);
        
        // Procesar KPIs si hay datos
        if (indicatorsData.results && indicatorsData.results.length > 0) {
          const latest = indicatorsData.results[0];
          processKPIData(latest);
        }
        
        // Obtener datos de gráficos
        await fetchChartData(baseParams, seq);
      }
    } catch (error) {
      if (seq === requestSeqRef.current) {
        setWeatherError(error.message || 'Error desconocido');
      }
    } finally {
      if (seq === requestSeqRef.current) setWeatherLoading(false);
    }
  }, [authToken, fetchChartData]);

  const calculateWeatherData = useCallback(async () => {
    try {
      if (!filters.institutionId) {
        showTransitionAnimation('error', 'Debe seleccionar una institución primero', 3000);
        return;
      }

      if (!filters.startDate || !filters.endDate) {
        showTransitionAnimation('error', 'Debe seleccionar fechas de inicio y fin', 3000);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || ''}/api/weather-stations/calculate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_range: filters.timeRange,
          start_date: filters.startDate,
          end_date: filters.endDate,
          institution_id: filters.institutionId,
          device_id: filters.deviceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al calcular datos meteorológicos');
      }

      const result = await response.json();
      showTransitionAnimation('success', 'Cálculo de datos meteorológicos iniciado correctamente', 3000);
      
      // Recargar datos después de un breve delay
      setTimeout(() => {
        fetchWeatherData(filters);
      }, 2000);

    } catch (error) {
      if (error.name === 'AbortError') return;
      setWeatherError(error.message || 'Error desconocido al calcular datos');
      showTransitionAnimation('error', error.message || 'Error al calcular datos meteorológicos', 3000);
    } finally {
      setWeatherLoading(false);
    }
  }, [filters, authToken, fetchWeatherData]);

  // Función para procesar datos de KPIs
  const processKPIData = (latestData) => {
    const kpis = {
      irradiance: {
        title: "Irradiancia Acumulada",
        value: (latestData.daily_irradiance_kwh_m2 || 0).toFixed(2),
        unit: "kWh/m²",
        change: latestData.daily_hsp_hours ? `${latestData.daily_hsp_hours.toFixed(1)} HSP` : "N/A",
        status: "normal",
        icon: kpiData.irradiance.icon,
        color: kpiData.irradiance.color
      },
      hsp: {
        title: "Horas Solares Pico",
        value: (latestData.daily_hsp_hours || 0).toFixed(1),
        unit: "HSP",
        change: "Equivalente solar",
        status: "normal",
        icon: kpiData.hsp.icon,
        color: kpiData.hsp.color
      },
      windSpeed: {
        title: "Velocidad del Viento",
        value: (latestData.avg_wind_speed_kmh || 0).toFixed(1),
        unit: "km/h",
        change: "Promedio del período",
        status: "normal",
        icon: kpiData.windSpeed.icon,
        color: kpiData.windSpeed.color
      },
      precipitation: {
        title: "Precipitación Acumulada",
        value: (latestData.daily_precipitation_cm || 0).toFixed(2),
        unit: "cm/día",
        change: "Acumulado del período",
        status: "normal",
        icon: kpiData.precipitation.icon,
        color: kpiData.precipitation.color
      },
      pvPower: {
        title: "Potencia Fotovoltaica",
        value: (latestData.theoretical_pv_power_w || 0).toFixed(1),
        unit: "W",
        change: "Basada en irradiancia",
        status: "normal",
        icon: kpiData.pvPower.icon,
        color: kpiData.pvPower.color
      }
    };

    setKpiData(kpis);
  };

  // Función para procesar datos de gráficos
  const processChartData = (chartResults) => {
    if (!chartResults || chartResults.length === 0) {
      // Si no hay datos de gráficos, crear datos de ejemplo basados en los indicadores
      if (weatherData?.results && weatherData.results.length > 0) {
        const latest = weatherData.results[0];
        const charts = {
          irradiance: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Irradiancia (W/m²)',
              data: Array.from({ length: 24 }, (_, i) => {
                // Simular patrón diario de irradiancia
                if (i >= 6 && i <= 18) {
                  return Math.max(0, Math.sin((i - 6) * Math.PI / 12) * (latest.daily_irradiance_kwh_m2 || 5) * 200);
                }
                return 0;
              }),
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          temperature: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Temperatura (°C)',
              data: Array.from({ length: 24 }, (_, i) => {
                // Simular patrón diario de temperatura
                const baseTemp = latest.avg_temperature_c || 25;
                const variation = Math.sin((i - 6) * Math.PI / 12) * 8;
                return baseTemp + variation;
              }),
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          humidity: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Humedad (%)',
              data: Array.from({ length: 24 }, (_, i) => {
                // Simular patrón diario de humedad (inversa a temperatura)
                const baseHumidity = latest.avg_humidity_pct || 60;
                const variation = -Math.sin((i - 6) * Math.PI / 12) * 20;
                return Math.max(0, Math.min(100, baseHumidity + variation));
              }),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              fill: true,
              tension: 0.4
            }]
          },
          windSpeed: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
              label: 'Velocidad del Viento (km/h)',
              data: Array.from({ length: 24 }, (_, i) => {
                // Simular patrón diario de viento
                const baseWind = latest.avg_wind_speed_kmh || 15;
                const variation = Math.random() * 10;
                return Math.max(0, baseWind + variation);
              }),
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              fill: true,
              tension: 0.4
            }]
          }
        };
        setChartData(charts);
      }
      return;
    }

    const latest = chartResults[0];
    
    const charts = {
      irradiance: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Irradiancia (W/m²)',
          data: latest.hourly_irradiance || Array(24).fill(0),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      temperature: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Temperatura (°C)',
          data: latest.hourly_temperature || Array(24).fill(0),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      humidity: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Humedad (%)',
          data: latest.hourly_humidity || Array(24).fill(0),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      windSpeed: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Velocidad del Viento (km/h)',
          data: latest.hourly_wind_speed || Array(24).fill(0),
          borderColor: '#10B981',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4
        }]
      }
    };

    setChartData(charts);
  };

  // Efectos
  useEffect(() => {
    if (authToken) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [authToken]);

  // Efecto para recargar datos cuando cambien los filtros
  useEffect(() => {
    if (filters.institutionId) {
      fetchWeatherData(filters);
    }
  }, [filters, fetchWeatherData]);

  // Si está cargando, muestra un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando estaciones meteorológicas...</p>
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-amber-700 shadow-lg -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
        <div className="px-4 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="p-3 bg-white/20 rounded-xl self-start lg:self-auto">
              <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l-1.41-1.41M2 12h2M20 12h2M6.34 6.34l-1.41-1.41M17.66 6.34l-1.41-1.41" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">Estaciones Meteorológicas</h1>
              <p className="text-orange-100 mt-1 text-sm lg:text-base">Análisis y monitoreo de indicadores meteorológicos</p>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 lg:p-8 -mt-4 lg:-mt-8 mb-6 lg:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          {!filters.institutionId ? (
            // Estado de carga cuando no hay institución seleccionada
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 overflow-hidden relative">
                {/* Skeleton loader con animación */}
                <div className="animate-pulse">
                  {/* Icono skeleton */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                  </div>
                  
                  {/* Título skeleton */}
                  <div className="w-32 h-5 bg-gray-200 rounded mb-2"></div>
                  
                  {/* Valor skeleton */}
                  <div className="flex items-baseline">
                    <div className="w-24 h-8 bg-gray-200 rounded"></div>
                    <div className="w-16 h-6 bg-gray-200 rounded ml-2"></div>
                  </div>
                  
                  {/* Línea inferior skeleton */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="w-28 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
                
                {/* Overlay de shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none"></div>
              </div>
            ))
          ) : weatherLoading ? (
            // Estado de carga cuando se están cargando los datos
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-orange-200 p-6 overflow-hidden relative">
                {/* Skeleton loader con animación naranja */}
                <div className="animate-pulse">
                  {/* Icono skeleton */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-200 rounded-lg"></div>
                    <div className="w-20 h-4 bg-orange-200 rounded"></div>
                  </div>
                  
                  {/* Título skeleton */}
                  <div className="w-32 h-5 bg-orange-200 rounded mb-2"></div>
                  
                  {/* Valor skeleton */}
                  <div className="flex items-baseline">
                    <div className="w-24 h-8 bg-orange-200 rounded"></div>
                    <div className="w-16 h-6 bg-orange-200 rounded ml-2"></div>
                  </div>
                  
                  {/* Línea inferior skeleton */}
                  <div className="mt-3 pt-3 border-t border-orange-100">
                    <div className="w-28 h-3 bg-orange-200 rounded"></div>
                  </div>
                </div>
                
                {/* Overlay de shimmer naranja */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-100/30 to-transparent animate-shimmer pointer-events-none"></div>
              </div>
            ))
          ) : (
            // KPIs reales cuando hay datos
            Object.keys(kpiData).map((key) => {
              const item = kpiData[key];
              // Mapear colores del KPI a colores de estilo adaptado
              const colorMap = {
                'text-orange-600': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                'text-yellow-600': { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
                'text-blue-600': { bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                'text-cyan-600': { bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
                'text-purple-600': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
              };
              const styleColors = colorMap[item.color] || { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
              
              return (
                <div key={key} className={`${styleColors.bgColor} p-6 rounded-xl shadow-md border ${styleColors.borderColor} transform hover:scale-105 transition-all duration-300 hover:shadow-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${styleColors.bgColor.replace('bg-', 'bg-').replace('-50', '-100')}`}>
                      {item.icon}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-600">{item.change}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <div className="flex items-baseline">
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <span className="ml-2 text-lg text-gray-500">{item.unit}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{item.change}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Mensaje de estado */}
        {!filters.institutionId && (
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-orange-700 font-medium">Selecciona una institución para ver los indicadores</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && weatherLoading && (
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-orange-700 font-medium">Cargando indicadores de la institución...</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && !weatherLoading && weatherData && (!weatherData.results || weatherData.results.length === 0) && (
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">No hay datos disponibles para esta institución en el período seleccionado</span>
            </div>
            <div className="mt-4">
              <button
                onClick={calculateWeatherData}
                disabled={weatherLoading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Calcular Datos Meteorológicos
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 lg:p-8 mb-6 lg:mb-8">
        <WeatherStationFilters 
          onFiltersChange={handleFilterChange}
          authToken={authToken}
        />
      </section>

      {/* Gráficos */}
      {weatherData && weatherData.results && weatherData.results.length > 0 && (
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 lg:p-8 mb-6 lg:mb-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('irradiance')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'irradiance'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66-1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 6.34-1.41-1.41"/><path d="m17.66 6.34l-1.41-1.41"/></svg>
                  Irradiancia
                </div>
              </button>
              <button
                onClick={() => setActiveTab('temperature')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'temperature'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
                  </svg>
                  Temperatura
                </div>
              </button>
              <button
                onClick={() => setActiveTab('humidity')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'humidity'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path>
                  </svg>
                  Humedad
                </div>
              </button>
              <button
                onClick={() => setActiveTab('wind')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'wind'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 8h10"></path><path d="M4 12h16"></path><path d="M8 16h8"></path></svg>
                Viento
                </div>
              </button>
              <button
                onClick={() => setActiveTab('windRose')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'windRose'
                    ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>
                  Rosa de Vientos
                </div>
              </button>
            </nav>
          </div>
              {activeTab === 'irradiance' && (
          <div className="space-y-6">
            <SectionHeader 
              title="Análisis de Irradiancia"
              icon="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l-1.41-1.41M2 12h2M20 12h2M6.34 6.34l-1.41-1.41M17.66 6.34l-1.41-1.41"
              infoText="Datos de irradiancia solar en tiempo real"
            />
            
            {chartData.irradiance ? (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <ChartCard
                  title="Irradiancia Horaria (Últimas 24 Horas)"
                  type="line"
                  data={chartData.irradiance}
                  options={CHART_OPTIONS}
                />
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de irradiancia disponibles</h3>
                <p className="text-gray-500">Selecciona una institución y estación para ver los datos de irradiancia</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'temperature' && (
          <div className="space-y-6">
            <SectionHeader 
              title="Análisis de Temperatura"
              icon="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"
              infoText="Variación de temperatura a lo largo del día"
            />
            
            {chartData.temperature ? (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <ChartCard
                  title="Temperatura Horaria (Últimas 24 Horas)"
                  type="line"
                  data={chartData.temperature}
                  options={CHART_OPTIONS}
                />
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de temperatura disponibles</h3>
                <p className="text-gray-500">Selecciona una institución y estación para ver los datos de temperatura</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'humidity' && (
          <div className="space-y-6">
            <SectionHeader 
              title="Análisis de Humedad"
              icon="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"
              infoText="Niveles de humedad relativa del ambiente"
            />
            
            {chartData.humidity ? (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <ChartCard
                  title="Humedad Horaria (Últimas 24 Horas)"
                  type="line"
                  data={chartData.humidity}
                  options={CHART_OPTIONS}
                />
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de humedad disponibles</h3>
                <p className="text-gray-500">Selecciona una institución y estación para ver los datos de humedad</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wind' && (
          <div className="space-y-6">
            <SectionHeader 
              title="Análisis de Viento"
              icon="M5 8h10M4 12h16M8 16h8"
              infoText="Velocidad del viento en tiempo real"
            />
            
            {chartData.windSpeed ? (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <ChartCard
                  title="Velocidad del Viento (Últimas 24 Horas)"
                  type="line"
                  data={chartData.windSpeed}
                  options={CHART_OPTIONS}
                />
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h10M4 12h16M8 16h8" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de viento disponibles</h3>
                <p className="text-gray-500">Selecciona una institución y estación para ver los datos de viento</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'windRose' && weatherData?.results?.length > 0 && (
          <div className="space-y-6">
            <SectionHeader 
              title="Rosa de los Vientos"
              icon="M12 2v20M2 12h20"
              infoText="Distribución de direcciones y velocidades del viento"
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución de direcciones del viento */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Direcciones</h3>
                {weatherData.results[0]?.wind_direction_distribution ? (
                  <div className="space-y-2">
                    {Object.entries(weatherData.results[0].wind_direction_distribution).map(([direction, count]) => (
                      <div key={direction} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{direction}</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(count / Math.max(...Object.values(weatherData.results[0].wind_direction_distribution))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay datos de dirección del viento disponibles</p>
                )}
              </div>
              
              {/* Distribución de velocidades del viento */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Velocidades</h3>
                {weatherData.results[0]?.wind_speed_distribution ? (
                  <div className="space-y-2">
                    {Object.entries(weatherData.results[0].wind_speed_distribution).map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{range} km/h</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full" 
                              style={{ width: `${(count / Math.max(...Object.values(weatherData.results[0].wind_speed_distribution))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay datos de velocidad del viento disponibles</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Nueva Sección de Tabla de Datos */}
      {weatherData && !weatherLoading && weatherData.results && weatherData.results.length > 0 && (
        <section className="mb-6 lg:mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
            {/* Header de la sección de tabla */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-700 px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
              <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl self-start lg:self-auto">
                  <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-white">Datos Históricos Detallados</h2>
                  <p className="text-orange-100 mt-1 text-sm lg:text-base">Registros completos de indicadores meteorológicos por fecha y estación</p>
                </div>
              </div>
            </div>
            
            {/* Contenido de la tabla */}
            <div className="p-3 lg:p-4 xl:p-6">
              {/* Tabla de datos moderna y responsive */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4 xl:py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base lg:text-lg xl:text-xl font-bold text-gray-800">Indicadores Meteorológicos Detallados</h3>
                        <p className="text-gray-600 mt-1 text-sm">Datos históricos y análisis de tendencias climáticas</p>
                        {/* Indicador de fechas por defecto */}
                        {filters.institutionId && !filters.startDate && !filters.endDate && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Últimos 10 días
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-3 lg:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm">
                        {weatherData.results.length} registros
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabla responsive con scroll horizontal */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gradient-to-r from-orange-50 to-amber-50">
                      <tr>
                        {[
                          { label: 'Fecha', width: 'w-20 lg:w-24 xl:w-32' },
                          { label: 'Estación', width: 'w-24 lg:w-28 xl:w-36' },
                          { label: 'Irradiancia (kWh/m²)', width: 'w-32 lg:w-36 xl:w-40' },
                          { label: 'HSP (Horas)', width: 'w-24 lg:w-28 xl:w-32' },
                          { label: 'Temperatura (°C)', width: 'w-28 lg:w-32 xl:w-36' },
                          { label: 'Humedad (%)', width: 'w-24 lg:w-28 xl:w-32' },
                          { label: 'Viento (km/h)', width: 'w-24 lg:w-28 xl:w-32' },
                          { label: 'Precipitación (cm)', width: 'w-28 lg:w-32 xl:w-36' }
                        ].map((header) => (
                          <th key={header.label} className={`${header.width} px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-5 text-left text-xs font-bold text-orange-700 uppercase tracking-wider border-b border-orange-100`}>
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {weatherData.results && weatherData.results.length > 0 ? (
                        weatherData.results.map((item, index) => (
                          <tr key={index} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200 border-b border-gray-50">
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {new Date(item.date).toLocaleDateString('es-ES')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">{item.device_name || 'N/A'}</div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.daily_irradiance_kwh_m2 || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.daily_hsp_hours || 0).toFixed(1)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.avg_temperature_c || 0).toFixed(1)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.avg_humidity_pct || 0).toFixed(1)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.avg_wind_speed_kmh || 0).toFixed(1)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(item.daily_precipitation_cm || 0).toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                            No hay datos disponibles para mostrar
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Overlay de transición */}
      <TransitionOverlay 
        show={showTransition}
        type={transitionType}
        message={transitionMessage}
      />
    </div>
  );
}

export default WeatherStationDetails;
