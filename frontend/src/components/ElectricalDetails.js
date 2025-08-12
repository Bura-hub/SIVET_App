import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';
import ElectricMeterFilters from './ElectricMeterFilters';

//###########################################################################
// Importaciones Chart.js
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler, zoomPlugin
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
      <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {title}
    </h2>
    <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
      <span className="flex items-center">
        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {infoText}
      </span>
    </div>
  </div>
);





// Componente principal
function ElectricalDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
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
  
  // Estados de medidores eléctricos
  const [meterData, setMeterData] = useState(null);
  const [meterLoading, setMeterLoading] = useState(false);
  const [meterError, setMeterError] = useState(null);
  const requestSeqRef = useRef(0);
  const debounceRef = useRef(null);
  const lastFiltersRef = useRef(null);

  // KPIs dinámicos basados en datos reales
  const [kpiData, setKpiData] = useState({
    totalEnergyConsumed: { 
      title: "Energía Total Consumida", 
      value: "0.00", 
      unit: "kWh", 
      change: "Este período", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"></path></svg>,
      color: "text-blue-600"
    },
    peakDemand: { 
      title: "Demanda Pico", 
      value: "0.00", 
      unit: "kW", 
      change: "Máximo registrado", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"></polyline><polyline points="16,7 22,7 22,13"></polyline></svg>,
      color: "text-red-600"
    },
    loadFactor: { 
      title: "Factor de Carga", 
      value: "0.0", 
      unit: "%", 
      change: "Eficiencia del sistema", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>,
      color: "text-green-600"
    },
    powerFactor: { 
      title: "Factor de Potencia", 
      value: "0.00", 
      unit: "", 
      change: "Calidad de energía", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>,
      color: "text-purple-600"
    }
  });

  // Funciones optimizadas
  const showTransitionAnimation = (type = 'info', message = '', duration = 2000) => {
    setTransitionType(type);
    setTransitionMessage(message);
    setShowTransition(true);
    setTimeout(() => setShowTransition(false), duration);
  };

  const handleFilterChange = (filterType, value, message) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    showTransitionAnimation('info', message, 1500);
  };

  const fetchMeterData = useCallback(async (filters) => {
    let seq = 0;
    try {
      seq = ++requestSeqRef.current;
      if (!filters || !filters.institutionId) return; // no tocar UI si no hay institución
      setMeterLoading(true);
      setMeterError(null);
      const timeRange = filters.timeRange || 'daily';
      const baseParams = {
        time_range: timeRange,
        ...(filters.institutionId && { institution_id: filters.institutionId }),
        ...(filters.deviceId && { device_id: filters.deviceId }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate })
      };

      const indicatorsParams = new URLSearchParams(baseParams);

      const indicatorsResp = await fetch(`/api/electric-meter-indicators/?${indicatorsParams.toString()}`, {
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
        setMeterData(indicatorsData);
        

      }
    } catch (error) {
      // Mostrar error solo si esta solicitud sigue siendo la vigente
      if (seq === requestSeqRef.current) {
        setMeterError(error.message || 'Error desconocido');
      }
    } finally {
      if (seq === requestSeqRef.current) setMeterLoading(false);
    }
  }, [authToken]);

  const handleFiltersChange = useCallback((newFilters) => {
    console.log('Filters changed in ElectricalDetails:', newFilters);
    console.log('Previous filters:', filters);
    setFilters(newFilters);
    
    // Evitar fetch si filtros no cambiaron
    const prev = lastFiltersRef.current || {};
    const same = prev.timeRange === newFilters.timeRange &&
                 prev.institutionId === newFilters.institutionId &&
                 prev.deviceId === newFilters.deviceId &&
                 prev.startDate === newFilters.startDate &&
                 prev.endDate === newFilters.endDate;
    if (same) return;
    lastFiltersRef.current = newFilters;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Ocultar loader mientras debouncing para evitar parpadeos si el usuario cambia rápidamente
    setMeterLoading(false);
    debounceRef.current = setTimeout(() => {
      fetchMeterData(newFilters);
    }, 450);
  }, [fetchMeterData]);



  // Cargar datos al montar: solo una vez
  useEffect(() => {
    if (!authToken) return;
    setLoading(false);
  }, []);

  // Actualizar KPIs cuando cambien los datos del medidor
  useEffect(() => {
    if (meterData && meterData.results && meterData.results.length > 0) {
      const latestData = meterData.results[0];
      const totalEnergy = meterData.results.reduce((sum, item) => sum + (item.imported_energy_kwh || 0), 0);
      
      setKpiData(prev => ({
        totalEnergyConsumed: {
          ...prev.totalEnergyConsumed,
          value: totalEnergy.toFixed(2),
          change: `${meterData.results.length} registros`
        },
        peakDemand: {
          ...prev.peakDemand,
          value: (latestData.peak_demand_kw || 0).toFixed(2),
          change: latestData.date ? new Date(latestData.date).toLocaleDateString('es-ES') : 'Último registro'
        },
        loadFactor: {
          ...prev.loadFactor,
          value: (latestData.load_factor_pct || 0).toFixed(1),
          change: latestData.load_factor_pct > 80 ? 'Excelente' : latestData.load_factor_pct > 60 ? 'Bueno' : 'Mejorable'
        },
        powerFactor: {
          ...prev.powerFactor,
          value: (latestData.avg_power_factor || 0).toFixed(2),
          change: latestData.avg_power_factor > 0.95 ? 'Óptimo' : latestData.avg_power_factor > 0.85 ? 'Bueno' : 'Mejorable'
        }
      }));
    }
  }, [meterData]);

  // Estados de carga y error (suavizados)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando datos eléctricos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-700 shadow-lg -mx-8 -mt-8">
        <div className="px-8 py-12">
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Detalles Eléctricos</h1>
              <p className="text-blue-100 mt-1">Análisis y monitoreo de indicadores eléctricos</p>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 -mt-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {!filters.institutionId ? (
            // Estado de carga cuando no hay institución seleccionada
            Array.from({ length: 4 }).map((_, index) => (
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
          ) : meterLoading ? (
            // Estado de carga cuando se están cargando los datos
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 overflow-hidden relative">
                {/* Skeleton loader con animación azul */}
                <div className="animate-pulse">
                  {/* Icono skeleton */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-200 rounded-lg"></div>
                    <div className="w-20 h-4 bg-blue-200 rounded"></div>
                  </div>
                  
                  {/* Título skeleton */}
                  <div className="w-32 h-5 bg-blue-200 rounded mb-2"></div>
                  
                  {/* Valor skeleton */}
                  <div className="flex items-baseline">
                    <div className="w-24 h-8 bg-blue-200 rounded"></div>
                    <div className="w-16 h-6 bg-blue-200 rounded ml-2"></div>
                  </div>
                  
                  {/* Línea inferior skeleton */}
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="w-28 h-3 bg-blue-200 rounded"></div>
        </div>
      </div>

                {/* Overlay de shimmer azul */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent animate-shimmer pointer-events-none"></div>
              </div>
            ))
          ) : (
            // KPIs reales cuando hay datos
            Object.keys(kpiData).map((key) => {
              const item = kpiData[key];
              // Mapear colores del KPI a colores de estilo adaptado
              const colorMap = {
                'text-blue-600': { bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                'text-red-600': { bgColor: 'bg-red-50', borderColor: 'border-red-200' },
                'text-green-600': { bgColor: 'bg-green-50', borderColor: 'border-green-200' },
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
          <div className="text-center mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700 font-medium">Selecciona una institución para ver los indicadores</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && meterLoading && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <svg className="w-5 h-5 text-blue-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-700 font-medium">Cargando indicadores de la institución...</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && !meterLoading && meterData && (!meterData.results || meterData.results.length === 0) && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full">
              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">No hay datos disponibles para esta institución en el período seleccionado</span>
            </div>
          </div>
        )}
      </section>

      {/* Sección de Medidores Eléctricos */}
      <section className="mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Indicadores de Medidores Eléctricos</h2>
                <p className="text-indigo-100 mt-1">Análisis detallado por institución y medidor</p>
              </div>
            </div>
          </div>
          
          {/* Contenido de la sección */}
          <div className="p-8">
          <ElectricMeterFilters onFiltersChange={handleFiltersChange} authToken={authToken} />

          {meterLoading && (
            <div className="flex items-center justify-center py-12 transition-opacity duration-300 ease-in-out">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-600 absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-lg font-medium text-gray-700">Cargando datos de medidores...</p>
                <p className="mt-2 text-sm text-gray-500">Procesando indicadores eléctricos</p>
              </div>
            </div>
          )}

          {meterError && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-1">Error al cargar datos</h3>
                  <p className="text-red-700">{meterError}</p>
                </div>
              </div>
            </div>
          )}

          {meterData && !meterLoading && (
            <>


              {/* Gráficos con diseño moderno */}
              {meterData.results && meterData.results.length > 0 && (
                <div className="space-y-8">
                  {/* Gráfico principal de energía - Ancho completo */}
                  <div className="w-full">
                  <ChartCard
                      title="Análisis de Energía"
                      description="Consumo, exportación y balance energético en el tiempo"
                    type="line"
                    data={{
                        labels: meterData.results.slice().reverse().map(item => new Date(item.date).toLocaleDateString('es-ES')),
                      datasets: [
                        {
                            label: 'Energía Importada (kWh)',
                            data: meterData.results.slice().reverse().map(item => item.imported_energy_kwh || 0),
                          borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                            pointRadius: 4,
                          pointBackgroundColor: '#3B82F6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                        },
                        {
                            label: 'Energía Exportada (kWh)',
                            data: meterData.results.slice().reverse().map(item => item.exported_energy_kwh || 0),
                          borderColor: '#EF4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#EF4444',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                          },
                          {
                            label: 'Consumo Neto (kWh)',
                            data: meterData.results.slice().reverse().map(item => item.net_energy_consumption_kwh || 0),
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          fill: false,
                          tension: 0.4,
                            pointRadius: 4,
                            borderDash: [8, 4],
                            pointBackgroundColor: '#10B981',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                        }
                      ],
                    }}
                      options={{
                        ...CHART_OPTIONS,
                        plugins: {
                          ...CHART_OPTIONS.plugins,
                          title: {display: false},
                          legend: {
                            ...CHART_OPTIONS.plugins.legend,
                            position: 'top',
                            align: 'start',
                            labels: {
                              ...CHART_OPTIONS.plugins.legend.labels,
                              usePointStyle: true,
                              padding: 20,
                              font: { size: 13, weight: '600' }
                            }
                          }
                        },
                        scales: {
                          ...CHART_OPTIONS.scales,
                          y: {
                            ...CHART_OPTIONS.scales.y,
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Gráficos secundarios en grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Indicadores de calidad */}
                  <ChartCard
                      title="Indicadores de Calidad Eléctrica"
                      description="Demanda, factor de carga y eficiencia del sistema"
                    type="line"
                    data={{
                        labels: meterData.results.slice().reverse().map(item => new Date(item.date).toLocaleDateString('es-ES')),
                      datasets: [
                        {
                            label: 'Demanda Pico (kW)',
                            data: meterData.results.slice().reverse().map(item => item.peak_demand_kw || 0),
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          fill: true,
                          tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: '#F59E0B',
                          },
                          {
                            label: 'Demanda Promedio (kW)',
                            data: meterData.results.slice().reverse().map(item => item.avg_demand_kw || 0),
                            borderColor: '#8B5CF6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: '#8B5CF6',
                          },
                          {
                            label: 'Factor de Carga (%)',
                            data: meterData.results.slice().reverse().map(item => item.load_factor_pct || 0),
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          fill: false,
                          tension: 0.4,
                            pointRadius: 3,
                            borderDash: [6, 3],
                            pointBackgroundColor: '#10B981',
                          }
                        ]
                      }}
                      options={{
                        ...CHART_OPTIONS,
                        plugins: {
                          ...CHART_OPTIONS.plugins,
                          title: {display: false},
                          legend: {
                            ...CHART_OPTIONS.plugins.legend,
                            position: 'top',
                            align: 'start'
                          }
                        }
                      }}
                    />

                    {/* Calidad de energía */}
                    <ChartCard
                      title="Calidad de Energía"
                      description="Desequilibrios y distorsiones armónicas"
                      type="line"
                      data={{
                        labels: meterData.results.slice().reverse().map(item => new Date(item.date).toLocaleDateString('es-ES')),
                        datasets: [
                          {
                            label: 'Desequilibrio de Voltaje (%)',
                            data: meterData.results.slice().reverse().map(item => item.max_voltage_unbalance_pct || 0),
                            borderColor: '#EF4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: '#EF4444',
                          },
                          {
                            label: 'Desequilibrio de Corriente (%)',
                            data: meterData.results.slice().reverse().map(item => item.max_current_unbalance_pct || 0),
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: '#F59E0B',
                          },
                          {
                            label: 'THD de Voltaje (%)',
                            data: meterData.results.slice().reverse().map(item => item.max_voltage_thd_pct || 0),
                            borderColor: '#8B5CF6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            fill: false,
                            tension: 0.4,
                            pointRadius: 3,
                            borderDash: [6, 3],
                            pointBackgroundColor: '#8B5CF6',
                            },
                        ]
                      }}
                      options={{
                        ...CHART_OPTIONS,
                        plugins: {
                          ...CHART_OPTIONS.plugins,
                          title: {display: false},
                          legend: {
                            ...CHART_OPTIONS.plugins.legend,
                            position: 'top',
                            align: 'start'
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Tabla de datos moderna */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">Indicadores Eléctricos Detallados</h3>
                        <p className="text-gray-600 mt-1">Datos históricos y análisis de tendencias</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-lg shadow-sm">
                        {meterData.results?.length || 0} registros
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                      <tr>
                        {[
                          { label: 'Fecha', width: 'w-24' },
                          { label: 'Medidor', width: 'w-32' },
                          { label: 'Energía Importada (kWh)', width: 'w-40' },
                          { label: 'Energía Exportada (kWh)', width: 'w-40' },
                          { label: 'Consumo Neto (kWh)', width: 'w-36' },
                          { label: 'Demanda Pico (kW)', width: 'w-32' },
                          { label: 'Factor de Carga (%)', width: 'w-36' },
                          { label: 'Factor de Potencia', width: 'w-32' }
                        ].map((header) => (
                          <th key={header.label} className={`${header.width} px-4 py-5 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider border-b border-indigo-100`}>
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {meterData.results && meterData.results.length > 0 ? (
                        meterData.results.map((item, index) => (
                          <tr key={index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(item.date).toLocaleDateString('es-ES')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.device_name || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-blue-600">
                                {(item.imported_energy_kwh || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-red-600">
                                {(item.exported_energy_kwh || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className={`text-sm font-semibold ${(item.net_energy_consumption_kwh || 0) >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {(item.net_energy_consumption_kwh || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-orange-600">
                                {(item.peak_demand_kw || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-semibold text-gray-900">
                                  {(item.load_factor_pct || 0).toFixed(1)}%
                                </div>
                                <div className={`ml-2 w-2 h-2 rounded-full ${
                                  (item.load_factor_pct || 0) > 80 ? 'bg-green-500' : 
                                  (item.load_factor_pct || 0) > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-semibold text-gray-900">
                                  {(item.avg_power_factor || 0).toFixed(2)}
                                </div>
                                <div className={`ml-2 w-2 h-2 rounded-full ${
                                  (item.avg_power_factor || 0) > 0.95 ? 'bg-green-500' : 
                                  (item.avg_power_factor || 0) > 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</p>
                              <p className="text-gray-500">Selecciona una institución y medidor para ver los indicadores eléctricos</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </div>
          </div>
        </section>



      <TransitionOverlay show={showTransition} type={transitionType} message={transitionMessage} />
    </div>
  );
}

export default ElectricalDetails;