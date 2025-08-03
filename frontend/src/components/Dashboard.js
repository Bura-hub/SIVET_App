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

  // SVG de los iconos para cada tarjeta. Se definen aquí para pasarlos como props.
  const boltIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lightbulb" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>;
  const solarPanelIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>;
  const scaleIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scale" aria-hidden="true"><path d="M12 3V19"></path><path d="M6 15H18"></path><path d="M14 11V19"></path><path d="M10 11V19"></path><path d="M12 19L19 12L22 15L12 19"></path><path d="M12 19L5 12L2 15L12 19"></path></svg>;
  const inverterIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"></path></svg>;
  const powerIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-power" aria-hidden="true"><path d="M12 2v5"></path><path d="M18 13v-2"></path><path d="M6 13v-2"></path><path d="M4.9 16.5l3.5-3.5"></path><path d="M19.1 16.5l-3.5-3.5"></path><path d="M12 19v3"></path><path d="M12 12v4"></path></svg>;
  const thermometerIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud-rain" aria-hidden="true"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M16 14v6"></path><path d="M8 14v6"></path><path d="M12 16v6"></path></svg>;
  const humidityIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-drizzle" aria-hidden="true"><path d="M8 6v10" strokeDasharray="2 2"></path><path d="M16 6v10" strokeDasharray="2 2"></path><path d="M12 10v12" strokeDasharray="2 2"></path><path d="M4 10v12" strokeDasharray="2 2"></path></svg>;
  const windIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wind" aria-hidden="true"><path d="M5 8h10"></path><path d="M4 12h16"></path><path d="M8 16h8"></path></svg>;

  // Estado con datos simulados para los KPIs
  const [kpiData, setKpiData] = useState({
    totalConsumption: { title: "Consumo total", value: "Cargando...", unit: "", change: "", status: "normal", icon: boltIcon },
    totalGeneration: { title: "Generación total", value: "Cargando...", unit: "", change: "", status: "normal", icon: solarPanelIcon },
    energyBalance: { title: "Equilibrio energético", value: "Cargando...", unit: "", description: "", status: "normal", icon: scaleIcon },
    activeInverters: { title: "Inversores activos", value: "Cargando...", unit: "", description: "", status: "normal", icon: inverterIcon },
    averageInstantaneousPower: { title: "Pot. instan. promedio", value: "Cargando...", unit: "W", description: "", status: "normal", icon: powerIcon },
    avgDailyTemp: { title: "Temp. prom. diaria", value: "Cargando...", unit: "°C", description: "Rango normal", status: "normal", icon: thermometerIcon },
    relativeHumidity: { title: "Humedad relativa", value: "Cargando...", unit: "%", description: "", status: "normal", icon: humidityIcon },
    windSpeed: { title: "Velocidad del viento", value: "Cargando...", unit: "km/h", description: "Moderado", status: "moderado", icon: windIcon },
  });

  // Estados para almacenar los datos de cada gráfico
  const [electricityConsumptionData, setElectricityConsumptionData] = useState(null);
  const [inverterGenerationData, setInverterGenerationData] = useState(null);
  const [temperatureTrendsData, setTemperatureTrendsData] = useState(null);
  const [energyBalanceData, setEnergyBalanceData] = useState(null);

  // URLs de los endpoints de tu API
  const KPI_API_URL = '/api/dashboard/summary/';
  const CHART_API_URL = '/api/dashboard/chart-data/';

  // Hook de efecto para cargar datos desde la API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!authToken) {
          throw new Error("No hay token de autenticación. Por favor, inicia sesión.");
        }

        // --- CALCULAR FECHAS PARA LAS LLAMADAS A LA API ---
        // Se formatea la fecha como 'YYYY-MM-DD' para la API
        const formatDate = (date) => date.toISOString().split('T')[0];

        const today = new Date();

        // Fechas para el mes actual
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Fechas para el mes pasado
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        // --- REALIZAR LLAMADAS A LA API CON MANEJO DE ERRORES INDIVIDUAL ---
        // Se usa Promise.allSettled para que todas las promesas se resuelvan
        // sin que un error en una de ellas detenga la ejecución.
        const [kpisResponse, currentMonthChartsResponse, prevMonthChartsResponse] = await Promise.allSettled([
          fetch(KPI_API_URL, { headers: { 'Authorization': `Token ${authToken}` } }),
          fetch(`${CHART_API_URL}?start_date=${formatDate(currentMonthStart)}&end_date=${formatDate(currentMonthEnd)}`, { headers: { 'Authorization': `Token ${authToken}` } }),
          fetch(`${CHART_API_URL}?start_date=${formatDate(prevMonthStart)}&end_date=${formatDate(prevMonthEnd)}`, { headers: { 'Authorization': `Token ${authToken}` } }),
        ]);

        let hasError = false;

        // Verificamos y manejamos la respuesta de los KPIs
        if (kpisResponse.status === 'fulfilled' && kpisResponse.value.ok) {
          const kpisDataFetched = await kpisResponse.value.json();
          setKpiData(prevKpiData => ({
            ...prevKpiData,
            totalConsumption: { ...kpisDataFetched.totalConsumption, icon: boltIcon },
            totalGeneration: { ...kpisDataFetched.totalGeneration, icon: solarPanelIcon },
            energyBalance: { ...kpisDataFetched.energyBalance, icon: scaleIcon },
            averageInstantaneousPower: { ...kpisDataFetched.averageInstantaneousPower, icon: powerIcon },
            avgDailyTemp: { ...kpisDataFetched.avgDailyTemp, icon: thermometerIcon },
            relativeHumidity: { ...kpisDataFetched.relativeHumidity, icon: humidityIcon },
            windSpeed: { ...kpisDataFetched.windSpeed, icon: windIcon },
            activeInverters: { ...kpisDataFetched.activeInverters, icon: inverterIcon },
          }));
        } else {
          console.error("Error al cargar los KPIs:", kpisResponse.reason);
          hasError = true;
        }

        // Verificamos y manejamos las respuestas de los gráficos
        if (currentMonthChartsResponse.status === 'fulfilled' && currentMonthChartsResponse.value.ok && prevMonthChartsResponse.status === 'fulfilled' && prevMonthChartsResponse.value.ok) {
          const currentMonthChartsData = await currentMonthChartsResponse.value.json();
          const prevMonthChartsData = await prevMonthChartsResponse.value.json();

          // --- PROCESAMIENTO DE DATOS PARA GRÁFICOS ---
          // Extraemos los labels (fechas) y los valores para los datasets
          const currentMonthLabels = currentMonthChartsData.map(item => {
            const parts = item.date.split('-'); // item.date es una cadena 'YYYY-MM-DD'
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // El mes es base 0 en el constructor de Date
            const day = parseInt(parts[2]);
            
            // Crear un objeto Date en la zona horaria LOCAL del usuario
            const date = new Date(year, month, day); 
            
            // Formatear como 'DD/MM/YYYY' para la visualización
            // Aseguramos que el día y el mes tengan dos dígitos
            const formattedDay = String(date.getDate()).padStart(2, '0');
            const formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
            const formattedYear = date.getFullYear();

            return `${formattedDay}/${formattedMonth}/${formattedYear}`;
          });

          // Datos de consumo del mes actual
          const dailyConsumptionCurrentMonth = currentMonthChartsData.map(item => item.daily_consumption / 1000);

          // Datos de consumo del mes pasado
          const dailyConsumptionPrevMonth = prevMonthChartsData.map(item => item.daily_consumption / 1000);

          // 1. Datos para Consumo comparativo (gráfico de líneas)
          setElectricityConsumptionData({
            labels: currentMonthLabels,
            datasets: [
              {
                label: 'Actual (MWh)',
                data: dailyConsumptionCurrentMonth,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
              },
              {
                label: 'Anterior (MWh)',
                data: dailyConsumptionPrevMonth,
                borderColor: '#A1A1AA',
                backgroundColor: 'rgba(161, 161, 170, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
              },
            ],
          });
          
          const dailyGenerationCurrentMonth = currentMonthChartsData.map(item => item.daily_generation / 1000000);

          // Datos de generación del mes pasado (AÑADE ESTA LÍNEA)
          const dailyGenerationPrevMonth = prevMonthChartsData.map(item => item.daily_generation / 1000000); // MWh

          // 2. Datos para Generación de los inversores (gráfico de barras)
          setInverterGenerationData({
            labels: currentMonthLabels,
            datasets: [
              {
                label: 'Actual (MWh)', // Cambiar la etiqueta
                data: dailyGenerationCurrentMonth,
                backgroundColor: '#10B981', // Verde para el mes actual
                borderColor: '#059669',
                borderWidth: 1,
                borderRadius: 5,
              },
              {
                label: 'Anterior (MWh)', // Nuevo dataset para el mes pasado
                data: dailyGenerationPrevMonth, // Usa los datos del mes pasado
                backgroundColor: 'rgba(161, 161, 170, 0.6)', // Un color diferente, por ejemplo, gris con transparencia
                borderColor: 'rgba(161, 161, 170, 1)',
                borderWidth: 1,
                borderRadius: 5,
                // Si quieres que sea una línea en lugar de barra para el mes pasado, descomenta la siguiente línea:
                // type: 'line',
                // tension: 0.4,
                // pointRadius: 3,
              },
            ],
          });

          // 3. Datos para el Balance de energía (gráfico de líneas) - No se modifica
          // Datos para el balance de energía (gráfico de líneas)
          const dailyEnergyBalanceDataCurrent = currentMonthChartsData.map(item => item.daily_balance / 1000); // Balance en MWh
          const dailyEnergyBalanceDataPrevious = prevMonthChartsData.map(item => item.daily_balance / 1000); // Balance en MWh

          // Se configura el estado del gráfico de balance de energía con dos datasets
          setEnergyBalanceData({
            labels: currentMonthLabels,
            datasets: [
              {
                label: 'Actual (MWh)',
                data: dailyEnergyBalanceDataCurrent,
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
                label: 'Anterior (MWh)',
                data: dailyEnergyBalanceDataPrevious,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: false,
                tension: 0.4,
              },
            ],
          });

          // 4. Datos para Temperatura (gráfico de líneas) - No se modifica
          // Se mantiene la data simulada para que el componente no falle.
          // Se debe crear un nuevo endpoint en la API para obtener esta data.
          const dailyTempDataCurrent = currentMonthChartsData.map(item => item.avg_daily_temp);
          const dailyTempDataPrevious = prevMonthChartsData.map(item => item.avg_daily_temp);

          setTemperatureTrendsData({
            labels: currentMonthLabels,
            datasets: [
              {
                label: 'Actual (°C)',
                data: dailyTempDataCurrent,
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                tension: 0.4,
                fill: false,
              },
              {
                label: 'Anterior (°C)',
                data: dailyTempDataPrevious,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.4,
                fill: false,
              },
            ],
          });

        } else {
          console.error("Error al cargar los datos de los gráficos:", currentMonthChartsResponse.reason, prevMonthChartsResponse.reason);
          hasError = true;
        }

        // Si ha habido algún error, establece el estado de error
        if (hasError) {
            setError("Se ha producido un error al cargar algunos datos del dashboard.");
        }


      } catch (e) {
        setError(e.message);
        console.error("Error al cargar datos del dashboard:", e);
      } finally {
        setLoading(false);
      }
    };

    if (authToken) {
      fetchDashboardData();
    }
  }, [authToken, onLogout]);


  // Opciones genéricas para los gráficos (con soporte para zoom/pan y tooltips)
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
        type: 'category', // <-- ¡IMPORTANTE! Asegúrate de que esto sea 'category'
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

  // Si está cargando, muestra un spinner o mensaje
  if (loading || !electricityConsumptionData) {
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
    <div className="flex-1 bg-gray-100 rounded-tl-3xl shadow-inner">
      <header className="flex p-8 justify-between items-center mb-2 bg-gray-100 p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Visión General</h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Últimos 30 días
          </button>
          <button className="flex items-center bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-gray-200 shadow-sm">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <path d="M9 19h6" strokeLinecap="round" />
            </svg>
            Todos los Dispositivos
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

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Consumo de Electricidad"
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
          title="Balance de energía"
          type="line"
          data={energyBalanceData}
          options={chartOptions}
        />
        {/* Este gráfico usa datos simulados ya que la API no proporciona un endpoint de series de tiempo de temperatura */}
        <ChartCard
          title="Tendencias de la temperatura media diaria"
          type="line"
          data={temperatureTrendsData}
          options={chartOptions}
        />
      </section>
    </div>
  );
}

export default Dashboard;
