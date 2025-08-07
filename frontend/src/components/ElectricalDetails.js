import React, { useState, useEffect } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';
import ElectricMeterFilters from './ElectricMeterFilters';

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

// Configuración de pestañas
const TAB_CONFIG = {
  consumptionTrends: {
    id: 'consumptionTrends',
    label: 'Tendencias de Consumo',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  electricMeters: {
    id: 'electricMeters',
    label: 'Medidores Eléctricos',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  generationOverview: {
    id: 'generationOverview',
    label: 'Visión General de Generación',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  energyBalance: {
    id: 'energyBalance',
    label: 'Balance Energético',
    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3'
  }
};

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

// Componente de pestaña
const TabButton = ({ tab, isActive, onClick }) => (
  <button
    onClick={() => onClick(tab.id)}
    className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
      isActive ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <div className="flex items-center">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
      </svg>
      {tab.label}
    </div>
  </button>
);

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

// Componente de botón de filtro
const FilterButton = ({ icon, label, value, onClick, gradientFrom, gradientTo, borderColor, textColor }) => (
  <button 
    className={`flex items-center bg-gradient-to-r ${gradientFrom} ${gradientTo} border ${borderColor} ${textColor} px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-blue-100 hover:to-indigo-100 transition-all duration-200`}
    onClick={onClick}
  >
    <svg className={`w-5 h-5 mr-2 ${textColor.replace('text-', 'text-')}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {icon}
    </svg>
    {label}: {value}
  </button>
);

// Datos simulados consolidados
const MOCK_DATA = {
  dailyConsumption: {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Consumo Diario (kWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 400) + 300),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#3B82F6',
      },
      {
        label: 'Pico (kW)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 300) + 600),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#EF4444',
        borderDash: [5, 5],
      },
      {
        label: 'Meta (kWh)',
        data: Array.from({ length: 30 }, () => 550),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  },
  hourlyLoad: {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Carga Horaria (kW)',
      data: [100, 90, 80, 70, 60, 80, 150, 250, 350, 400, 420, 410, 380, 350, 320, 300, 280, 250, 200, 180, 160, 140, 120, 110],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointBackgroundColor: '#3B82F6',
    }]
  },
  generationOverview: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Generación Solar (MWh)',
        data: [120, 140, 160, 180, 200, 220, 240, 230, 210, 190, 170, 150],
        backgroundColor: '#F59E0B',
        borderColor: '#D97706',
        borderWidth: 1,
        borderRadius: 5,
      },
      {
        label: 'Generación Eólica (MWh)',
        data: [80, 90, 100, 110, 120, 130, 140, 135, 125, 115, 105, 95],
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 5,
      }
    ]
  },
  energyBalance: {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Consumo (MWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 8) + 8),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Generación (MWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 9) + 12),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Balance Neto (MWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 11) - 2),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
      }
    ]
  }
};

// Componente principal
function ElectricalDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Estados consolidados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('consumptionTrends');
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    timeRange: 'Últimos 30 días',
    location: 'Todas',
    device: 'Todos'
  });
  
  // Estados de medidores eléctricos
  const [meterData, setMeterData] = useState(null);
  const [meterLoading, setMeterLoading] = useState(false);
  const [meterError, setMeterError] = useState(null);

  // KPIs con iconos inline
  const [kpiData] = useState({
    dailyAverageLoad: { 
      title: "Carga Diaria Promedio", 
      value: "500", 
      unit: "kWh", 
      change: "", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"></path></svg>
    },
    peakDemand: { 
      title: "Demanda Pico", 
      value: "750", 
      unit: "kW", 
      change: "14:30 ayer", 
      status: "critico", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"></polyline><polyline points="16,7 22,7 22,13"></polyline></svg>
    },
    accumulatedConsumption: { 
      title: "Consumo Acumulado", 
      value: "3.5", 
      unit: "MWh", 
      change: "YTD", 
      status: "positivo", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
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

  const fetchMeterData = async (filters) => {
    if (!filters.institutionId) {
      setMeterData(null);
      return;
    }

    setMeterLoading(true);
    setMeterError(null);

    try {
      const params = new URLSearchParams({
        time_range: filters.timeRange,
        institution_id: filters.institutionId,
        ...(filters.deviceId && { device_id: filters.deviceId }),
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

      const response = await fetch(`/api/electric-meters/?${params}`, {
        headers: { 'Authorization': `Token ${authToken}`, 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setMeterData(await response.json());
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setMeterError(error.message);
      console.error('Error fetching meter data:', error);
    } finally {
      setMeterLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    fetchMeterData(newFilters);
  };

  // Cargar datos al montar
  useEffect(() => {
    if (authToken) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  }, [authToken]);

  // Estados de carga y error
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex p-8 justify-between items-center bg-gray-100 p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Detalles Eléctricos</h1>
        <div className="flex items-center space-x-4">
          <FilterButton
            icon={<><circle cx="12" cy="12" r="9" stroke="currentColor" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></>}
            label="Período"
            value={filters.timeRange}
            onClick={() => handleFilterChange('timeRange', 'Últimos 30 días', 'Período actualizado: Últimos 30 días')}
            gradientFrom="from-blue-50"
            gradientTo="to-indigo-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
          />
          <FilterButton
            icon={<><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" fill="currentColor" /></>}
            label="Ubicación"
            value={filters.location}
            onClick={() => handleFilterChange('location', 'Todas', 'Ubicación actualizada: Todas')}
            gradientFrom="from-green-50"
            gradientTo="to-emerald-50"
            borderColor="border-green-200"
            textColor="text-green-800"
          />
          <FilterButton
            icon={<><rect x="5" y="3" width="14" height="18" rx="2" ry="2" /><path d="M9 19h6" strokeLinecap="round" /></>}
            label="Dispositivo"
            value={filters.device}
            onClick={() => handleFilterChange('device', 'Todos', 'Dispositivo actualizado: Todos')}
            gradientFrom="from-blue-50"
            gradientTo="to-indigo-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
          />
        </div>
      </header>

      {/* KPIs */}
      <section className="bg-gray-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
        {Object.keys(kpiData).map((key) => {
          const item = kpiData[key];
          return <KpiCard key={key} {...item} description={item.change || "Datos disponibles"} icon={item.icon} />;
        })}
      </section>

      {/* Navegación */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {Object.values(TAB_CONFIG).map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={setActiveTab}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido de pestañas */}
      {activeTab === 'consumptionTrends' && (
        <section className="space-y-6">
          <SectionHeader
            title="Análisis de Consumo Eléctrico"
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            infoText="Hover sobre los gráficos para ver controles"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Consumo Diario (Últimos 30 Días)" type="line" data={MOCK_DATA.dailyConsumption} options={CHART_OPTIONS} />
            <ChartCard title="Perfil de Carga Horaria (Hoy)" type="line" data={MOCK_DATA.hourlyLoad} options={CHART_OPTIONS} />
          </div>
        </section>
      )}

      {activeTab === 'electricMeters' && (
        <section className="space-y-6">
          <SectionHeader
            title="Indicadores de Medidores Eléctricos"
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            infoText="Datos filtrados por institución y medidor"
          />
          
          <ElectricMeterFilters onFiltersChange={handleFiltersChange} authToken={authToken} />

          {meterLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
                <p className="mt-4 text-lg text-gray-700">Cargando datos de medidores...</p>
              </div>
            </div>
          )}

          {meterError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">Error: {meterError}</p>
              </div>
            </div>
          )}

          {meterData && !meterLoading && (
            <>
              {/* Resumen de datos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                  { title: "Consumo Total", value: meterData.summary.total_consumption.toFixed(2), unit: "kWh", color: "text-blue-600", subtitle: `Promedio diario: ${meterData.summary.avg_daily_consumption.toFixed(2)} kWh` },
                  { title: "Demanda Pico", value: meterData.summary.peak_demand.toFixed(2), unit: "kW", color: "text-red-600", subtitle: "Máxima demanda registrada" },
                  { title: "Medidores Activos", value: meterData.summary.active_devices, unit: `/${meterData.summary.total_devices}`, color: "text-green-600", subtitle: "Dispositivos activos" }
                ].map((item, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value} {item.unit}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.subtitle}</p>
                  </div>
                ))}
              </div>

              {/* Gráficos */}
              {meterData.consumption_data.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard
                    title="Energía Consumida Acumulada"
                    type="line"
                    data={{
                      labels: meterData.consumption_data.map(item => new Date(item.date).toLocaleDateString('es-ES')),
                      datasets: [
                        {
                          label: 'Consumo Acumulado (kWh)',
                          data: meterData.consumption_data.map(item => item.cumulative_active_power),
                          borderColor: '#3B82F6',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          fill: true,
                          tension: 0.4,
                          pointRadius: 3,
                          pointBackgroundColor: '#3B82F6',
                        },
                        {
                          label: 'Consumo Total (kWh)',
                          data: meterData.consumption_data.map(item => item.total_active_power),
                          borderColor: '#EF4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          fill: false,
                          tension: 0.4,
                          pointRadius: 2,
                          pointBackgroundColor: '#EF4444',
                          borderDash: [5, 5],
                        }
                      ],
                    }}
                    options={{...CHART_OPTIONS, plugins: {...CHART_OPTIONS.plugins, title: {display: true, text: 'Energía Consumida Acumulada', font: {size: 16, weight: 'bold'}, color: '#374151'}}}}
                  />
                  <ChartCard
                    title="Demanda Pico por Período"
                    type="bar"
                    data={{
                      labels: meterData.consumption_data.map(item => new Date(item.date).toLocaleDateString('es-ES')),
                      datasets: [
                        {
                          label: 'Demanda Pico (kW)',
                          data: meterData.consumption_data.map(item => item.peak_demand),
                          backgroundColor: '#F59E0B',
                          borderColor: '#D97706',
                          borderWidth: 1,
                          borderRadius: 5,
                        },
                        {
                          label: 'Demanda Promedio (kW)',
                          data: meterData.consumption_data.map(item => item.avg_demand),
                          backgroundColor: '#10B981',
                          borderColor: '#059669',
                          borderWidth: 1,
                          borderRadius: 5,
                        }
                      ],
                    }}
                    options={{...CHART_OPTIONS, plugins: {...CHART_OPTIONS.plugins, title: {display: true, text: 'Demanda Pico y Promedio', font: {size: 16, weight: 'bold'}, color: '#374151'}}}}
                  />
                </div>
              )}

              {/* Tabla de datos */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Datos Detallados de Consumo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Fecha', 'Medidor', 'Consumo Acumulado (kWh)', 'Consumo Total (kWh)', 'Demanda Pico (kW)', 'Demanda Promedio (kW)', 'Mediciones'].map((header) => (
                          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {meterData.consumption_data && meterData.consumption_data.length > 0 ? (
                        meterData.consumption_data.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.date).toLocaleDateString('es-ES')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.device_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.cumulative_active_power.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.total_active_power.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.peak_demand.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.avg_demand.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.measurement_count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            No hay datos disponibles para esta institución y medidor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'generationOverview' && (
        <section className="space-y-6">
          <SectionHeader
            title="Visión General de Generación"
            icon="M13 10V3L4 14h7v7l9-11h-7z"
            infoText="Hover sobre los gráficos para ver controles"
          />
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard title="Generación por Fuente (Año Actual)" type="bar" data={MOCK_DATA.generationOverview} options={CHART_OPTIONS} />
          </div>
        </section>
      )}

      {activeTab === 'energyBalance' && (
        <section className="space-y-6">
          <SectionHeader
            title="Balance Energético"
            icon="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            infoText="Hover sobre los gráficos para ver controles"
          />
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard title="Balance Energético Diario (Últimos 30 Días)" type="line" data={MOCK_DATA.energyBalance} options={CHART_OPTIONS} />
          </div>
        </section>
      )}

      <TransitionOverlay show={showTransition} type={transitionType} message={transitionMessage} />
    </div>
  );
}

export default ElectricalDetails;