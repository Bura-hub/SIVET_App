// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";

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

// Componente principal del dashboard
function Dashboard({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Estados para control de carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para los filtros del encabezado (aún sin lógica activa)
  const [selectedTimeRange, setSelectedTimeRange] = useState('Últimos 30 días');
  const [selectedLocation, setSelectedLocation] = useState('Todas');
  const [selectedDevice, setSelectedDevice] = useState('Todos');

  // Estado con datos simulados para los KPIs
  const [kpiData, setKpiData] = useState({
    totalConsumption: { title: "Consumo total", value: "Cargando...", unit: "", change: "", status: "normal" },
    totalGeneration: { title: "Generación total", value: "Cargando...", unit: "", change: "", status: "normal" },
    energyBalance: { title: "Equilibrio energético", value: "Cargando...", unit: "", description: "", status: "normal" },
    activeInverters: { title: "Inversores activos", value: "Cargando...", unit: "", description: "", status: "normal" },
    averageInstantaneousPower: { title: "Pot. instan. promedio", value: "Cargando...", unit: "W", description: "", status: "normal" }, 
    avgDailyTemp: { title: "Temp. prom. diaria", value: "Cargando...", unit: "°C", description: "Rango normal", status: "normal" },
    relativeHumidity: { title: "Humedad relativa", value: "Cargando...", unit: "%", description: "", status: "normal" },
    windSpeed: { title: "Velocidad del viento", value: "Cargando...", unit: "km/h", description: "Moderado", status: "moderado" },
  });

  // Datos dummy para los gráficos (estos se reemplazarán con datos reales de la API)
  const electricityConsumptionData = {
    labels: ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7', 'Día 8', 'Día 9', 'Día 10'], // Ejemplo de 10 días
    datasets: [
      {
        label: 'Consumo (MWh)',
        data: [1.0, 1.1, 1.2, 1.1, 1.3, 1.4, 1.3, 1.2, 1.1, 1.0],
        borderColor: '#3B82F6', // Azul
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // Azul claro para el área
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#3B82F6',
        pointHoverBorderColor: '#fff',
      },
    ],
  };

  const inverterGenerationData = {
    labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    datasets: [
      {
        label: 'Generación (MWh)',
        data: [0.25, 0.28, 0.26, 0.30],
        backgroundColor: '#10B981', // Verde esmeralda
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 5, // Bordes redondeados para las barras
      },
    ],
  };

  const temperatureTrendsData = {
    labels: ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'],
    datasets: [
      {
        label: 'Temp. Prom. (°C)',
        data: [28, 29, 30, 32, 31, 29, 28],
        borderColor: '#EF4444', // Rojo
        backgroundColor: 'rgba(239, 68, 68, 0.2)', // Rojo claro para el área
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#EF4444',
        pointHoverBorderColor: '#fff',
      },
    ],
  };

  const energyBalanceData = {
    labels: ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'],
    datasets: [
      {
        label: 'Balance (kWh)',
        data: [-50, -30, 10, 20, -10, -40, -20], // Ejemplo de balance positivo y negativo
        borderColor: '#8B5CF6', // Púrpura
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)'); // Púrpura más oscuro
          gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)'); // Púrpura medio
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)'); // Transparente
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#8B5CF6',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#8B5CF6',
        pointHoverBorderColor: '#fff',
      },
    ],
  };

  // Opciones genéricas para los gráficos (con soporte para zoom/pan y tooltips)
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
  
  // Hook de efecto para cargar datos desde la API (simulado con dummy + delay)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- Fetch para el KPI de Consumo Total ---
        const kpisResponse = await fetch('/api/dashboard/consumption-summary/', {
          headers: {
            'Authorization': `Token ${authToken}`
          }
        });

        if (!kpisResponse.ok) {
          if (kpisResponse.status === 401 || kpisResponse.status === 403) {
            onLogout(); // Redirigir al login si hay un problema de autenticación
            return;
          }
          const errorData = await kpisResponse.json();
          throw new Error(errorData.detail || 'Error al cargar los KPIs.');
        }

        const kpisDataFetched = await kpisResponse.json();
        
        // Actualizar todos los KPIs en el estado
        setKpiData(prevKpiData => ({
          ...prevKpiData,
          totalConsumption: kpisDataFetched.totalConsumption,
          totalGeneration: kpisDataFetched.totalGeneration,
          energyBalance: kpisDataFetched.energyBalance,
          averageInstantaneousPower: kpisDataFetched.averageInstantaneousPower,
          avgDailyTemp: kpisDataFetched.avgDailyTemp, 
          relativeHumidity: kpisDataFetched.relativeHumidity, 
          windSpeed: kpisDataFetched.windSpeed, // Añadido el nuevo KPI
          activeInverters: kpisDataFetched.activeInverters,
        }));

        // --- Simulación de carga para otros datos (reemplazar con llamadas a la API real) ---
        await new Promise(resolve => setTimeout(resolve, 500));
        // Aquí iría la lógica para llamar a tu API de Django
        // para obtener los datos reales de KPIs, y datos para los gráficos.
        // Por ejemplo:
        // const kpisResponse = await axios.get('/api/scada/local/kpis/', { params: { timeRange: selectedTimeRange, location: selectedLocation, device: selectedDevice } });
        // setKpiData(kpisResponse.data);
        // const chartsResponse = await axios.get('/api/scada/local/charts/', { params: { timeRange: selectedTimeRange, location: selectedLocation, device: selectedDevice } });
        // setElectricityConsumptionData(chartsResponse.data.electricityConsumption);
        // ... y así para los demás gráficos y alertas

      } catch (e) {
        setError(e.message);
        console.error("Error al cargar datos del dashboard:", e);
      } finally {
        setLoading(false);
      }
    };

    // Solo cargar datos si authToken está presente
    if (authToken) {
      fetchDashboardData();
    }
  }, [authToken, onLogout]); // Dependencias de los filtros y auth token

  // Si está cargando, muestra un spinner o mensaje
  if (loading) {
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

  return (
    /* Main Content Area */
    <div className="flex-1 bg-white rounded-tl-3xl shadow-inner">
      {/* Header */}
      <header className="flex p-8 justify-between items-center mb-2 bg-white p-4 -mx-8 -mt-8">
      {/* Header explicitly white, adjusted margins for full width */}
        <h1 className="text-3xl font-bold text-gray-800">Visión General</h1>
        <div className="flex items-center space-x-4">
          {/* Time Range Button */}
          <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Últimos 30 días
          </button>

          {/* Device Filter */}
          <button className="flex items-center bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <path d="M9 19h6" strokeLinecap="round" />
            </svg>
            Todos los Dispositivos
          </button>
        </div>
      </header>

      {/* Sección KPI */}
      <section className="bg-white grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
        {Object.keys(kpiData).map((key) => {
          const item = kpiData[key];
          const description = item.description || (item.change ? item.change : "Datos disponibles");
          return <KpiCard key={key} {...item} description={description} />;
        })}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Consumo de electricidad"
          type="line"
          data={electricityConsumptionData}
          options={chartOptions}
        />
        <ChartCard
          title="Generación de los inversores"
          type="bar"
          data={inverterGenerationData}
          options={chartOptions}
        />
        <ChartCard
          title="Tendencias de la temperatura media diaria"
          type="line"
          data={temperatureTrendsData}
          options={chartOptions}
        />
        <ChartCard
          title="Balance de energía"
          type="line"
          data={energyBalanceData}
          options={chartOptions}
        />
      </section>
    </div>
  );
}

export default Dashboard;