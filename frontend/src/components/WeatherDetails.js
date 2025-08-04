// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';

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
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

// Componente principal de detalles meteorológicos
function WeatherDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Estados para control de carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para los filtros del encabezado
  const [selectedTimeRange, setSelectedTimeRange] = useState('Últimos 30 días');
  const [selectedLocation, setSelectedLocation] = useState('Todas');
  const [selectedDevice, setSelectedDevice] = useState('Todos');

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState('temperatureTrends');

  // Estado para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Iconos mejorados más acordes a cada título
  const temperatureIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thermometer" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>;
  
  const humidityIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplets" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>;
  
  const windIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wind" aria-hidden="true"><path d="M5 8h10"></path><path d="M4 12h16"></path><path d="M8 16h8"></path></svg>;

  // Estado con datos simulados para los KPIs
  const [kpiData, setKpiData] = useState({
    averageTemperature: { title: "Temperatura Promedio", value: "24.5", unit: "°C", change: "+2.1°C", status: "normal", icon: temperatureIcon },
    averageHumidity: { title: "Humedad Promedio", value: "65", unit: "%", change: "-5%", status: "positivo", icon: humidityIcon },
    windSpeed: { title: "Velocidad del Viento", value: "12", unit: "km/h", change: "Moderado", status: "moderado", icon: windIcon },
  });

  // Estados para almacenar los datos de cada gráfico
  const [hourlyTemperatureData, setHourlyTemperatureData] = useState(null);
  const [hourlyHumidityData, setHourlyHumidityData] = useState(null);
  const [windSpeedData, setWindSpeedData] = useState(null);
  const [weatherSummaryData, setWeatherSummaryData] = useState(null);

  // Hook de efecto para cargar datos desde la API
  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!authToken) {
        throw new Error("No hay token de autenticación. Por favor, inicia sesión.");
      }

      // Simular delay de carga
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Datos simulados para temperatura horaria
      const hourlyTemperatureData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: 'Temperatura (°C)',
            data: [
              20, 19, 18, 17, 18, 20, 22, 24, 26, 28, 29, 30,
              31, 30, 29, 28, 26, 24, 22, 21, 20, 19, 18, 17
            ],
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#EF4444',
          },
        ],
      };

      // Datos simulados para humedad horaria
      const hourlyHumidityData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: 'Humedad (%)',
            data: [
              85, 88, 90, 92, 90, 85, 75, 65, 55, 50, 48, 45,
              42, 45, 50, 55, 60, 70, 80, 85, 88, 90, 91, 89
            ],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      };

      // Datos simulados para velocidad del viento
      const windSpeedData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: 'Velocidad del Viento (km/h)',
            data: [
              5, 3, 2, 1, 2, 4, 8, 12, 15, 18, 20, 22,
              25, 23, 20, 18, 15, 12, 10, 8, 6, 4, 3, 2
            ],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#10B981',
          },
        ],
      };

      // Datos simulados para resumen meteorológico
      const weatherSummaryData = {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [
          {
            label: 'Temperatura Máxima (°C)',
            data: [28, 30, 32, 29, 31, 33, 27],
            backgroundColor: '#EF4444',
            borderColor: '#DC2626',
            borderWidth: 1,
            borderRadius: 5,
          },
          {
            label: 'Temperatura Mínima (°C)',
            data: [18, 20, 22, 19, 21, 23, 17],
            backgroundColor: '#3B82F6',
            borderColor: '#2563EB',
            borderWidth: 1,
            borderRadius: 5,
          },
          {
            label: 'Humedad Promedio (%)',
            data: [65, 60, 55, 70, 58, 52, 68],
            backgroundColor: '#10B981',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      };

      setHourlyTemperatureData(hourlyTemperatureData);
      setHourlyHumidityData(hourlyHumidityData);
      setWindSpeedData(windSpeedData);
      setWeatherSummaryData(weatherSummaryData);

    } catch (e) {
      setError(e.message);
      console.error("Error al cargar datos meteorológicos:", e);
    } finally {
      setLoading(false);
    }
  };

  // Agregar un useEffect que se ejecute cuando el componente se monta
  useEffect(() => {
    if (authToken) {
      setLoading(true);
      // Simular un pequeño delay para mostrar la animación
      setTimeout(() => {
        fetchWeatherData();
      }, 300);
    }
  }, []); // Se ejecuta solo al montar el componente

  // Función para mostrar transición
  const showTransitionAnimation = (type = 'info', message = '', duration = 2000) => {
    setTransitionType(type);
    setTransitionMessage(message);
    setShowTransition(true);
    
    setTimeout(() => {
      setShowTransition(false);
    }, duration);
  };

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
            return `Hora: ${context[0].label}`;
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
          minRotation: 0
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
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando datos meteorológicos...</p>
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
  if (!hourlyTemperatureData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-orange-600 text-lg p-4 bg-orange-100 rounded-lg shadow-md">
          No se pudieron cargar los datos de los gráficos. Intente recargar la página.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex p-8 justify-between items-center bg-gray-100 p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Detalles Meteorológicos</h1>
        <div className="flex items-center space-x-4">
          {/* Botón de período de tiempo */}
          <button 
            className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
            onClick={() => {
              setSelectedTimeRange('Últimos 30 días');
              showTransitionAnimation('info', 'Período actualizado: Últimos 30 días', 1500);
            }}
          >
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {selectedTimeRange}
          </button>
          
          {/* Botón de ubicación */}
          <button 
            className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
            onClick={() => {
              setSelectedLocation('Todas');
              showTransitionAnimation('info', 'Ubicación actualizada: Todas', 1500);
            }}
          >
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" fill="currentColor" />
            </svg>
            Ubicación: {selectedLocation}
          </button>

          {/* Botón de dispositivos */}
          <button 
            className="flex items-center bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-orange-100 hover:to-amber-100 transition-all duration-200"
            onClick={() => {
              setSelectedDevice('Todos');
              showTransitionAnimation('info', 'Dispositivo actualizado: Todos', 1500);
            }}
          >
            <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <path d="M9 19h6" strokeLinecap="round" />
            </svg>
            Dispositivo: {selectedDevice}
          </button>
        </div>
      </header>

      {/* Sección KPI */}
      <section className="bg-gray-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
        {Object.keys(kpiData).map((key) => {
          const item = kpiData[key];
          const description = item.description || (item.change ? item.change : "Datos disponibles");
          return <KpiCard key={key} {...item} description={description} icon={item.icon} />;
        })}
      </section>

      {/* Tabs profesionales para diferentes vistas */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('temperatureTrends')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'temperatureTrends'
                  ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Tendencias de Temperatura
              </div>
            </button>
            <button
              onClick={() => setActiveTab('humidityTrends')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'humidityTrends'
                  ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
                </svg>
                Tendencias de Humedad
              </div>
            </button>
            <button
              onClick={() => setActiveTab('windTrends')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'windTrends'
                  ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h10M4 12h16M8 16h8" />
                </svg>
                Tendencias de Viento
              </div>
            </button>
            <button
              onClick={() => setActiveTab('weatherSummary')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'weatherSummary'
                  ? 'border-orange-500 text-orange-600 bg-orange-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                Resumen Semanal
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido basado en la pestaña activa */}
      {activeTab === 'temperatureTrends' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Análisis de Temperatura
            </h2>
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hover sobre los gráficos para ver controles
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard
              title="Temperatura Horaria (Últimas 24 Horas)"
              type="line"
              data={hourlyTemperatureData}
              options={chartOptions}
            />
          </div>
        </section>
      )}

      {activeTab === 'humidityTrends' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
              </svg>
              Análisis de Humedad
            </h2>
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hover sobre los gráficos para ver controles
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard
              title="Humedad Horaria (Últimas 24 Horas)"
              type="line"
              data={hourlyHumidityData}
              options={chartOptions}
            />
          </div>
        </section>
      )}

      {activeTab === 'windTrends' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h10M4 12h16M8 16h8" />
              </svg>
              Análisis de Viento
            </h2>
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hover sobre los gráficos para ver controles
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard
              title="Velocidad del Viento (Últimas 24 Horas)"
              type="line"
              data={windSpeedData}
              options={chartOptions}
            />
          </div>
        </section>
      )}

      {activeTab === 'weatherSummary' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Resumen Meteorológico Semanal
            </h2>
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hover sobre los gráficos para ver controles
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ChartCard
              title="Resumen Semanal de Condiciones Meteorológicas"
              type="bar"
              data={weatherSummaryData}
              options={chartOptions}
            />
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

export default WeatherDetails;