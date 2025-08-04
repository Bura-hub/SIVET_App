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
} from 'chart.js';
import TransitionOverlay from './TransitionOverlay';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function InverterDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('inverterDetailsActiveTab') || 'monthlyGeneration');

  // Estados para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  const profileMenuRef = useRef(null);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('inverterDetailsActiveTab', activeTab);
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

  // Dummy data for charts in Inverter Details
  const monthlyGenerationData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Generación Mensual (MWh)',
        data: [100, 120, 110, 130, 150, 140, 160, 155, 145, 135, 125, 115], // Example monthly generation
        backgroundColor: '#10B981', // Emerald green
        borderColor: '#059669',
        borderWidth: 1,
      },
    ],
  };

  const dailyGenerationData = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Generación Diaria (kWh)',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000), // Random daily generation
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
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
      zoom: { // Enable zoom and pan for daily generation
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
          <p className="mt-4 text-lg text-gray-700">Cargando detalles de inversores...</p>
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
        <h1 className="text-3xl font-bold text-gray-800">Detalles de Inversores</h1> {/* Updated title */}
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"> {/* Changed to 4 columns */}
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Energía Total Generada</h3>
          <p className="text-2xl font-bold text-gray-900">1.2 GWh</p>
          <p className="text-green-500 text-xs">+15% YTD</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Eficiencia promedio</h3>
          <p className="text-2xl font-bold text-gray-900">98.5%</p>
          <p className="text-gray-500 text-xs">Estable</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Tiempo de actividad del sistema</h3>
          <p className="text-2xl font-bold text-gray-900">99.9%</p>
          <p className="text-green-500 text-xs">Últimos 30 días</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
          <h3 className="text-gray-600 text-sm mb-2">Inversores defectuosos</h3>
          <p className="text-2xl font-bold text-red-600">2</p>
          <p className="text-red-500 text-xs">Necesita atención</p>
        </div>
      </section>

      {/* Tabs for Monthly Generation and Daily Generation */}
      <div className="mb-6 flex space-x-6">
        <button
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'monthlyGeneration' ? 'bg-red-100 text-red-700 font-semibold' : 'text-gray-600 hover:text-red-700 font-semibold'}`}
          onClick={() => setActiveTab('monthlyGeneration')}
        >
          Generación Mensual
        </button>
        <button
          className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'dailyGeneration' ? 'bg-red-100 text-red-700 font-semibold' : 'text-gray-600 hover:text-red-700 font-semibold'}`}
          onClick={() => setActiveTab('dailyGeneration')}
        >
          Generación Diaria
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'monthlyGeneration' && (
        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Monthly Energy Generation Chart */}
          <div className="bg-gray-100 p-6 shadow-md rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Generación mensual de energía (gráfico de barras)</h3>
            <p className="text-sm text-gray-500 mb-4">Gráfico interactivo con información sobre herramientas</p>
            <div className="chart-container">
              <Bar data={monthlyGenerationData} options={chartOptions} />
            </div>
          </div>
        </section>
      )}

      {activeTab === 'dailyGeneration' && (
        <section className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Daily Energy Generation Chart */}
          <div className="bg-gray-100 p-6 shadow-md rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Generación diaria de energía (gráfico de área)</h3>
            <p className="text-sm text-gray-500 mb-4">Gráfico interactivo con zoom y desplazamiento</p>
            <div className="chart-container">
              <Line data={dailyGenerationData} options={chartOptions} />
            </div>
          </div>
        </section>
      )}

      {/* Individual Inverter Profiles Section */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Perfiles de inversor individuales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Inverter Card 1 */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-sm border border-green-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">INV-001</h3>
              <span className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg">ÓPTIMO</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Estado:</span>
              <span className="font-bold text-green-600">Activo</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Última potencia:</span>
              <span className="font-bold">50 kW</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Eficiencia:</span>
              <span className="font-bold">98.9%</span>
            </div>
          </div>

          {/* Inverter Card 2 */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-sm border border-orange-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">INV-002</h3>
              <span className="bg-orange-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg">ADVERTENCIA</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Estado:</span>
              <span className="font-bold text-orange-600">Activo (Reducido)</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Última potencia:</span>
              <span className="font-bold">35 kW</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Eficiencia:</span>
              <span className="font-bold">90.1%</span>
            </div>
          </div>

          {/* Inverter Card 3 */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-sm border border-red-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">INV-003</h3>
              <span className="bg-red-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg">FALLA</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Estado:</span>
              <span className="font-bold text-red-600">Desconectado</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Última potencia:</span>
              <span className="font-bold">0 kW</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Eficiencia:</span>
              <span className="font-bold">0%</span>
            </div>
          </div>

          {/* Inverter Card 4 */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-sm border border-green-300">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">INV-004</h3>
              <span className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-lg">ÓPTIMO</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Estado:</span>
              <span className="font-bold text-green-500">Activo</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Última potencia:</span>
              <span className="font-bold">48 kW</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Eficiencia:</span>
              <span className="font-bold">98.0%</span>
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

export default InverterDetails;