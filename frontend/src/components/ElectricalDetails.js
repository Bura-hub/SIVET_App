import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
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
  Filler // Importar Filler para áreas de gráfico
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom'

// Registrar componentes de Chart.js
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

function ElectricalDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('electricalDetailsActiveTab') || 'consumptionTrends');
  
  useEffect(() => {
    localStorage.setItem('electricalDetailsActiveTab', activeTab);
  }, [activeTab]);

  // Dummy data for charts in Electrical Details
  const dailyConsumptionData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14', 'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20', 'Day 21', 'Day 22', 'Day 23', 'Day 24', 'Day 25', 'Day 26', 'Day 27', 'Day 28', 'Day 29', 'Day 30'],
    datasets: [
      {
        label: 'Consumo Diario (kWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * (700 - 300 + 1)) + 300), // Random data between 300-700 kWh
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#3B82F6',
      },
      {
        label: 'Pico (kW)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * (900 - 600 + 1)) + 600), // Random data for peak
        borderColor: '#EF4444', // Red for Peak
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#EF4444',
        borderDash: [5, 5], // Dashed line for peak
      },
      {
        label: 'Meta (kWh)',
        data: Array.from({ length: 30 }, () => 550), // Green for Target
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 0, // No points for target line
      },
    ],
  };

  const hourlyLoadData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), // Labels from 0:00 to 23:00
    datasets: [
      {
        label: 'Carga Horaria (kW)',
        data: [
          100, 90, 80, 70, 60, 80, 150, 250, 350, 400, 420, 410, // Morning to Noon
          380, 350, 320, 300, 280, 250, 200, 180, 160, 140, 120, 110 // Afternoon to Night
        ], // Example hourly load data
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#3B82F6',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, // Display legend for multiple datasets
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
      zoom: { // Enable zoom and pan
        pan: {
          enabled: true,
          mode: 'x', // Pan only on x-axis
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x', // Zoom only on x-axis
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
    // In a real app, you would fetch data based on activeTab, time range, etc.
    // For now, we just simulate loading
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
          <p className="mt-4 text-lg text-gray-700">Cargando detalles eléctricos...</p>
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
    <div className="flex-1 bg-white rounded-tl-3xl shadow-inner">
      {/* Header */}
      <header className="flex p-8 justify-between items-center mb-2 bg-white p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Detalles Eléctricos</h1> {/* Updated title */}
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
      <section className="bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"> {/* Changed to 3 columns */}
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm font-medium text-gray-400 mb-2">Carga Diaria Promedio</h3>
          <p className="text-2xl font-bold text-gray-900">500 kWh</p>
          <p className="text-gray-500 text-xs">Estable</p> {/* Changed text */}
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm font-medium text-gray-400 mb-2">Demanda Pico</h3>
          <p className="text-2xl font-bold text-gray-900">750 kW</p>
          <p className="text-gray-500 text-xs font-semibold text-red-600">14:30 ayer</p> {/* Changed text */}
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm font-medium text-gray-400 mb-2">Consumo Acumulado</h3>
          <p className="text-2xl font-bold text-gray-900">3.5 MWh</p>
          <p className="text-gray-500 text-xs font-semibold text-green-600">YTD</p> {/* Changed text */}
        </div>
      </section>

      {/* Tabs for Consumption Trends, Generation Overview, Energy Balance */}
      <div className="mb-6 flex space-x-6">
        <button
        flex items-center p-3 rounded-xl bg-green-100 text-green-700 font-semibold 
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'consumptionTrends' ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:text-green-700 font-semibold'}`}
          onClick={() => setActiveTab('consumptionTrends')}
        >
          Tendencias de Consumo
        </button>
        <button
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'generationOverview' ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:text-green-700 font-semibold'}`}
          onClick={() => setActiveTab('generationOverview')}
        >
          Visión General de Generación
        </button>
        <button
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'energyBalance' ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:text-green-700 font-semibold'}`}
          onClick={() => setActiveTab('energyBalance')}
        >
          Balance Energético
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'consumptionTrends' && (
        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Daily Consumption Chart */}
          <div className="bg-gray-100 p-6 shadow-md rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Consumo Diario (Últimos 30 Días)</h3>
            <p className="text-sm text-gray-500 mb-4">Gráfico interactivo con Tooltips y Líneas codificadas por color (ej. Rojo para Pico, Verde para Meta)</p>
            <div className="chart-container">
              <Line data={dailyConsumptionData} options={chartOptions} />
            </div>
          </div>

          {/* Hourly Load Profile Chart */}
          <div className="bg-gray-100 p-6 shadow-md rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Perfil de Carga Horaria (Hoy)</h3>
            <p className="text-sm text-gray-500 mb-4">Gráfico interactivo con Zoom & Pan</p>
            <div className="chart-container">
              <Line data={hourlyLoadData} options={chartOptions} />
            </div>
          </div>
        </section>
      )}

      {/* Placeholder for other tabs */}
      {activeTab === 'generationOverview' && (
        <div className="bg-white p-6 shadow-md rounded-xl h-96 flex items-center justify-center text-gray-500">
          Contenido para Visión General de Generación
        </div>
      )}
      {activeTab === 'energyBalance' && (
        <div className="bg-white p-6 shadow-md rounded-xl h-96 flex items-center justify-center text-gray-500">
          Contenido para Balance Energético
        </div>
      )}
    </div>
  );
}

export default ElectricalDetails;