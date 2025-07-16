// frontend/src/components/Dashboard.js

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

import sivetLogo from './sivet-logo.svg';

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

// Recibe isSidebarMinimized y setIsSidebarMinimized de App.js
function Dashboard({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('electricidad');
  const [days, setDays] = useState(30);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  const electricityConsumptionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Consumption (MWh)',
        data: [1.0, 1.1, 1.2, 1.1, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 1.0],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#3B82F6',
      },
    ],
  };

  const inverterGenerationData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Generation (MWh)',
        data: [0.25, 0.28, 0.26, 0.30],
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1,
      },
    ],
  };

  const temperatureTrendsData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'Avg Temp (°C)',
        data: [28, 29, 30, 32, 31, 29, 28],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#EF4444',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
    const fetchIndicators = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/indicators/by-source-and-range/?source=${source}&days=${days}`, {
            headers: {
                'Authorization': `Token ${authToken}`
            }
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            onLogout();
            throw new Error('Unauthorized. Please log in again.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (authToken) {
        fetchIndicators();
    }
  }, [source, days, authToken, onLogout]);

  return (
    <div className="flex min-h-screen bg-[#f0f1f0] w-full">
      {/* Sidebar */}
      <aside className={`bg-white p-6 shadow-lg flex flex-col justify-between transition-all duration-300 ${isSidebarMinimized ? 'w-20 items-center overflow-hidden' : 'w-64'}`}>
        <div>
          <div className={`flex items-center mb-3 w-full transition-all duration-300 ${isSidebarMinimized ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarMinimized && (
              <img
                src={sivetLogo}
                alt="SIVET Logo"
                className="max-w-[190px] h-auto object-contain"
              />
            )}
            <button
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={isSidebarMinimized ? "Expandir menú" : "Minimizar menú"}
            >
              {isSidebarMinimized ? (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 5l7 7-7 7M6 5l7 7-7 7"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  ></path>
                </svg>
              )}
            </button>
          </div>

          <nav>
            <ul>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl bg-blue-100 text-blue-700 font-semibold ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('dashboard')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Inicio</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('electricalDetails')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Medidores</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h7m-7 0h-2m7 0v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0h-2m0-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3.337C3 11.901 4.238 13 5.762 13H18.238c1.524 0 2.762-1.099 2.762-2.663V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v3.337"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Inversores</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.325 6.675l-.707.707M6.707 6.707l-.707-.707m12.728 0l-.707-.707M6.707 17.293l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Estaciones</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Exportar Reportes</span>
                </a>
              </li>
            </ul>
          </nav>
          <div
            ref={profileMenuRef}
            className={`relative flex items-center p-2 rounded-full bg-gray-200 cursor-pointer hover:bg-green-100 transition-colors ${
              isSidebarMinimized ? 'justify-center mt-12' : 'mt-6'
            }`}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'Guest')}&background=4F46E5&color=ffffff&size=80&bold=true`}
              alt={`Avatar de ${username || 'Invitado'}`}
              className={`w-10 h-10 rounded-full object-cover shadow-sm ${isSidebarMinimized ? '' : 'mr-3'}`}
            />
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isSidebarMinimized ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'
              }`}
            >
              <p className="font-semibold text-gray-800 whitespace-nowrap">
                {username || 'Invitado'}
              </p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {isSuperuser ? 'Administrador' : 'Usuario Aliado'}
              </p>
            </div>
            {!isSidebarMinimized && (
              <svg
                className={`w-4 h-4 ml-auto text-gray-600 transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                className={`absolute bottom-full mb-2 ${
                  isSidebarMinimized ? 'left-1/2 -translate-x-1/2 w-32' : 'left-0 w-full'
                } bg-white rounded-lg shadow-lg py-2 z-10 transition-opacity duration-200 ease-in-out`}
              >
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Configuración de Perfil
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Ayuda y Soporte
                </a>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-white rounded-tl-3xl shadow-inner">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 -mx-8 -mt-8 rounded-tl-3xl">
          <h1 className="text-3xl font-bold text-gray-800">Visión General</h1>
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

            {/* Site Selector */}
            <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
              {/* Building/Site Icon */}
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M3 3h18v4H3zM6 7v14h12V7" />
                <path d="M10 11h4M10 15h4" strokeLinecap="round" />
              </svg>
              Sitio Actual
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <h3 className="text-gray-600 text-sm mb-2">Consumo Total</h3>
            <p className="text-2xl font-bold text-gray-900">1.2 MWh</p>
            <p className="text-green-500 text-xs">+8.5% vs el mes pasado</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <h3 className="text-gray-600 text-sm mb-2">Variación semanal</h3>
            <p className="text-2xl font-bold text-green-600">+5.2%</p>
            <p className="text-gray-500 text-xs">Crecimiento constante</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <h3 className="text-gray-600 text-sm mb-2">Temperatura máxima</h3>
            <p className="text-2xl font-bold text-gray-900">32°C</p>
            <p className="text-gray-500 text-xs">Prom: 28°C</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-xl shadow-md flex flex-col justify-between">
            <h3 className="text-gray-600 text-sm mb-2">Temperatura mínima</h3>
            <p className="text-2xl font-bold text-gray-900">18°C</p>
            <p className="text-gray-500 text-xs">Prom: 15°C</p>
          </div>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 30-Day Electricity Consumption */}
          <div className="bg-gray-100 p-6 shadow-md rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Consumo de electricidad de 30 días</h3>
            <div className="chart-container">
              <Line data={electricityConsumptionData} options={chartOptions} />
            </div>
          </div>

          {/* Monthly Inverter Generation Comparison */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Comparación de la generación mensual de inversores</h3>
            <div className="chart-container">
              <Bar data={inverterGenerationData} options={chartOptions} />
            </div>
          </div>

          {/* Daily Average Temperature Trends */}
          <div className="bg-gray-100 p-6 rounded-xl shadow-md lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencias de la temperatura media diaria</h3>
            <div className="chart-container">
              <Line data={temperatureTrendsData} options={chartOptions} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;