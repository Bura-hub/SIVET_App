import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
} from 'chart.js';
import TransitionOverlay from './TransitionOverlay';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function WeatherDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('weatherDetailsActiveTab') || 'temperatureTrends');

  // Estados para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('weatherDetailsActiveTab', activeTab);
  }, [activeTab]);

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

  // Dummy data for charts in Weather Details
  const hourlyTemperatureData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), // Labels from 0:00 to 23:00
    datasets: [
      {
        label: 'Temperatura (°C)',
        data: [
          20, 19, 18, 17, 18, 20, 22, 24, 26, 28, 29, 30,
          31, 30, 29, 28, 26, 24, 22, 21, 20, 19, 18, 17
        ], // Example hourly temperature data
        borderColor: '#EF4444', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#EF4444',
      },
    ],
  };

  const hourlyHumidityData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Humedad (%)',
        data: [
          85, 88, 90, 92, 90, 85, 75, 65, 55, 50, 48, 45,
          42, 45, 50, 55, 60, 70, 80, 85, 88, 90, 91, 89
        ], // Example hourly humidity data
        borderColor: '#3B82F6', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 0, // No points for area chart
      },
    ],
  };

  const hourlyWindSpeedData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Velocidad del Viento (km/h)',
        data: [
          5, 4, 3, 3, 4, 6, 8, 10, 12, 15, 18, 20,
          22, 20, 18, 15, 12, 10, 8, 6, 5, 4, 4, 3
        ], // Example hourly wind speed data
        borderColor: '#10B981', // Green
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: false, // Line chart without fill
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#10B981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(200, 200, 200, 0.1)',
        },
      },
    },
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // Simulate network request
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Si está cargando, muestra un spinner o mensaje
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando detalles del clima...</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex p-8 justify-between items-center mb-2 bg-white p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Detalles del Clima</h1> {/* Updated title */}
        <div className="flex items-center space-x-4">
          {/* Time Range Button */}
          <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            {/* Time Icon */}
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Últimos 30 días
          </button>

          {/* Location Filter */}
          <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            {/* Location Icon */}
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" fill="currentColor" />
            </svg>
            Ubicación: Todas
          </button>

          {/* Device Filter */}
          <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            {/* Device Icon */}
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <path d="M9 19h6" strokeLinecap="round" />
            </svg>
            Dispositivo: Todos
          </button>
        </div>
      </header>

      {/* Key Indicators Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Temperatura media diaria</h3>
          <p className="text-2xl font-bold text-gray-900">22.5°C</p>
          <p className="text-gray-500 text-xs">Últimas 24 horas</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Velocidad máxima del viento</h3>
          <p className="text-2xl font-bold text-gray-900">35 km/h</p>
          <p className="text-orange-500 text-xs">Ráfagas hoy</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Promedio. Humedad</h3>
          <p className="text-2xl font-bold text-gray-900">68%</p>
          <p className="text-green-500 text-xs">Estable</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Precipitación total</h3>
          <p className="text-2xl font-bold text-gray-900">5 mm</p>
          <p className="text-gray-500 text-xs">Últimas 24 horas</p>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Hourly Temperature Trends */}
        <div className="bg-gray-100 p-6 shadow-md rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencias de temperatura por hora</h3>
          <p className="text-sm text-gray-500 mb-4">Gráfico de líneas: Temperatura (°C) vs. Tiempo (horario) - Con etiquetas de eje, unidades y leyenda</p>
          <div className="chart-container">
            <Line data={hourlyTemperatureData} options={chartOptions} />
          </div>
        </div>

        {/* Hourly Humidity Levels */}
        <div className="bg-gray-100 p-6 shadow-md rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Niveles de humedad por hora</h3>
          <p className="text-sm text-gray-500 mb-4">Gráfico de áreas: Humedad (%) vs. Tiempo (por hora) - Con etiquetas de eje, unidades y leyenda</p>
          <div className="chart-container">
            <Line data={hourlyHumidityData} options={chartOptions} />
          </div>
        </div>

        {/* Hourly Wind Speed */}
        <div className="bg-gray-100 p-6 shadow-md rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Velocidad del viento por hora</h3>
          <p className="text-sm text-gray-500 mb-4">Gráfico de líneas: Velocidad del viento (km/h) vs. Tiempo (por hora) - Con etiquetas de eje, unidades y leyenda</p>
          <div className="chart-container">
            <Line data={hourlyWindSpeedData} options={chartOptions} />
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

export default WeatherDetails;