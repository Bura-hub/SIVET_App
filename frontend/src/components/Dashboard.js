// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';

// Utilidades para manejo de fechas en zona horaria de Colombia
import { 
  formatDateForAPI, 
  getCurrentMonthStart, 
  getCurrentMonthEnd, 
  getPreviousMonthStart, 
  getPreviousMonthEnd,
  formatDateForDisplay,
  formatAPIDateForDisplay, // Nueva función
  parseISODateToColombia
} from '../utils/dateUtils';

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

  // Estados para el botón de ejecución de tareas
  const [taskExecuting, setTaskExecuting] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');

  // Estado para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Iconos mejorados más acordes a cada título
  const consumptionIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"></path></svg>;
  
  const generationIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-solar-panel" aria-hidden="true"><path d="M12 2v20"></path><path d="M2 12h20"></path><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"></path><path d="M4 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"></path><path d="M12 6v4"></path><path d="M8 8h8"></path></svg>;
  
  const balanceIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scale" aria-hidden="true"><path d="M12 3V19"></path><path d="M6 15H18"></path><path d="M14 11V19"></path><path d="M10 11V19"></path><path d="M12 19L19 12L22 15L12 19"></path><path d="M12 19L5 12L2 15L12 19"></path></svg>;
  
  const invertersIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 21v3"></path><path d="M15 21v3"></path><path d="M1 9h3"></path><path d="M1 15h3"></path><path d="M21 9h3"></path><path d="M21 15h3"></path></svg>;
  
  const powerIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-power" aria-hidden="true"><path d="M12 2v5"></path><path d="M18 13v-2"></path><path d="M6 13v-2"></path><path d="M4.9 16.5l3.5-3.5"></path><path d="M19.1 16.5l-3.5-3.5"></path><path d="M12 19v3"></path><path d="M12 12v4"></path></svg>;
  
  const temperatureIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-thermometer" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>;
  
  const humidityIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplets" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>;
  
  const windIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wind" aria-hidden="true"><path d="M5 8h10"></path><path d="M4 12h16"></path><path d="M8 16h8"></path></svg>;
  
  const taskIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-circle" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polygon points="10,8 16,12 10,16"></polygon></svg>;

  // Estado con datos simulados para los KPIs
  const [kpiData, setKpiData] = useState({
    totalConsumption: { title: "Consumo total", value: "Cargando...", unit: "", change: "", status: "normal", icon: consumptionIcon },
    totalGeneration: { title: "Generación total", value: "Cargando...", unit: "", change: "", status: "normal", icon: generationIcon },
    energyBalance: { title: "Equilibrio energético", value: "Cargando...", unit: "", description: "", status: "normal", icon: balanceIcon },
    activeInverters: { title: "Inversores activos", value: "Cargando...", unit: "", description: "", status: "normal", icon: invertersIcon },
    averageInstantaneousPower: { title: "Pot. instan. promedio", value: "Cargando...", unit: "W", description: "", status: "normal", icon: powerIcon },
    avgDailyTemp: { title: "Temp. prom. diaria", value: "Cargando...", unit: "°C", description: "Rango normal", status: "normal", icon: temperatureIcon },
    relativeHumidity: { title: "Humedad relativa", value: "Cargando...", unit: "%", description: "", status: "normal", icon: humidityIcon },
    windSpeed: { title: "Velocidad del viento", value: "Cargando...", unit: "km/h", description: "Moderado", status: "moderado", icon: windIcon },
    taskExecution: { 
      title: "Ejecutar Tareas", 
      value: taskExecuting ? "Ejecutando..." : "Ejecutar", 
      unit: "", 
      description: taskStatus || "Sincronizar metadatos y datos SCADA", 
      status: taskExecuting ? "loading" : "normal", 
      icon: taskIcon,
      onClick: null // Se asignará después
    }
  });

  // Estados para almacenar los datos de cada gráfico
  const [electricityConsumptionData, setElectricityConsumptionData] = useState(null);
  const [inverterGenerationData, setInverterGenerationData] = useState(null);
  const [temperatureTrendsData, setTemperatureTrendsData] = useState(null);
  const [energyBalanceData, setEnergyBalanceData] = useState(null);

  // URLs de los endpoints de tu API
  const KPI_API_URL = '/api/dashboard/summary/';
  const CHART_API_URL = '/api/dashboard/chart-data/';
  const TASK_API_URL = '/tasks/fetch-historical/';
  const SYNC_API_URL = '/local/sync-devices/';
  const KPI_CALCULATION_API_URL = '/api/dashboard/calculate-kpis/';
  const DAILY_DATA_API_URL = '/api/dashboard/calculate-daily-data/';

  // Función para ejecutar todas las tareas programadas
  async function executeAllTasks() {
    if (taskExecuting) return; // Evitar múltiples ejecuciones

    setTaskExecuting(true);
    setTaskStatus('Iniciando sincronización...');
    showTransitionAnimation('info', 'Ejecutando tareas de sincronización...', 3000);

    try {
      // 1. Sincronizar metadatos de SCADA (instituciones, categorías, dispositivos)
      setTaskStatus('Sincronizando metadatos de SCADA...');
      const syncResponse = await fetch(SYNC_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!syncResponse.ok) {
        throw new Error(`Error en sincronización: ${syncResponse.status}`);
      }

      // 2. Ejecutar tarea de mediciones históricas (2 días = 172800 segundos)
      setTaskStatus('Iniciando recolección de datos históricos...');
      const taskResponse = await fetch(TASK_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          time_range_seconds: 172800 // 2 días en segundos
        })
      });

      if (!taskResponse.ok) {
        throw new Error(`Error al iniciar tarea: ${taskResponse.status}`);
      }

      // 3. Calcular KPIs mensuales
      setTaskStatus('Calculando KPIs mensuales...');
      const kpiResponse = await fetch(KPI_CALCULATION_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!kpiResponse.ok) {
        throw new Error(`Error al calcular KPIs: ${kpiResponse.status}`);
      }

      // 4. Calcular datos diarios para gráficos (últimos 3 días)
      setTaskStatus('Calculando datos diarios para gráficos...');
      const dailyDataResponse = await fetch(DAILY_DATA_API_URL, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          days_back: 3 // Calcular para los últimos 3 días
        })
      });

      if (!dailyDataResponse.ok) {
        throw new Error(`Error al calcular datos diarios: ${dailyDataResponse.status}`);
      }

      // Mostrar éxito
      showTransitionAnimation('success', 'Tareas ejecutadas exitosamente', 2000);
      setTaskStatus('Tareas completadas exitosamente');

      // 5. Actualizar el estado del KPI
      setKpiData(prevKpiData => ({
        ...prevKpiData,
        taskExecution: {
          ...prevKpiData.taskExecution,
          value: "Completado",
          description: "Sincronización, recolección y cálculos iniciados",
          status: "success"
        }
      }));

      // 6. Recargar datos del dashboard después de un breve delay
      setTimeout(() => {
        fetchDashboardData();
      }, 3000); // Aumentado a 3 segundos para dar más tiempo a las tareas

    } catch (error) {
      console.error('Error ejecutando tareas:', error);
      showTransitionAnimation('error', 'Error al ejecutar las tareas', 3000);
      setTaskStatus('Error al ejecutar las tareas');
      
      setKpiData(prevKpiData => ({
        ...prevKpiData,
        taskExecution: {
          ...prevKpiData.taskExecution,
          value: "Error",
          description: `Error: ${error.message}`,
          status: "error"
        }
      }));
    } finally {
      setTaskExecuting(false);
    }
  }

  // Hook de efecto para cargar datos desde la API
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!authToken) {
        throw new Error("No hay token de autenticación. Por favor, inicia sesión.");
      }

      // --- CALCULAR FECHAS PARA LAS LLAMADAS A LA API ---
      // Usar las utilidades de fecha estandarizadas para Colombia
      const currentMonthStart = getCurrentMonthStart();
      const currentMonthEnd = getCurrentMonthEnd();
      const prevMonthStart = getPreviousMonthStart();
      const prevMonthEnd = getPreviousMonthEnd();

      // --- REALIZAR LLAMADAS A LA API ---
      const [kpisResponse, currentMonthChartsResponse, prevMonthChartsResponse] = await Promise.allSettled([
        fetch(KPI_API_URL, { headers: { 'Authorization': `Token ${authToken}` } }),
        fetch(`${CHART_API_URL}?start_date=${formatDateForAPI(currentMonthStart)}&end_date=${formatDateForAPI(currentMonthEnd)}`, { headers: { 'Authorization': `Token ${authToken}` } }),
        fetch(`${CHART_API_URL}?start_date=${formatDateForAPI(prevMonthStart)}&end_date=${formatDateForAPI(prevMonthEnd)}`, { headers: { 'Authorization': `Token ${authToken}` } }),
      ]);

      let hasError = false;

      // Verificamos y manejamos la respuesta de los KPIs
      if (kpisResponse.status === 'fulfilled' && kpisResponse.value.ok) {
        const kpisDataFetched = await kpisResponse.value.json();
        setKpiData(prevKpiData => ({
          ...prevKpiData,
          totalConsumption: { ...kpisDataFetched.totalConsumption, icon: consumptionIcon },
          totalGeneration: { ...kpisDataFetched.totalGeneration, icon: generationIcon },
          energyBalance: { ...kpisDataFetched.energyBalance, icon: balanceIcon },
          averageInstantaneousPower: { ...kpisDataFetched.averageInstantaneousPower, icon: powerIcon },
          avgDailyTemp: { ...kpisDataFetched.avgDailyTemp, icon: temperatureIcon },
          relativeHumidity: { ...kpisDataFetched.relativeHumidity, icon: humidityIcon },
          windSpeed: { ...kpisDataFetched.windSpeed, icon: windIcon },
          activeInverters: { ...kpisDataFetched.activeInverters, icon: invertersIcon },
          taskExecution: { 
            ...prevKpiData.taskExecution,
            onClick: executeAllTasks,
            value: taskExecuting ? "Ejecutando..." : "Ejecutar",
            description: taskStatus || "Sincronizar metadatos y datos SCADA",
            status: taskExecuting ? "loading" : "normal"
          }
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
        // Ordenar los datos por fecha antes de procesarlos
        const sortByDate = (a, b) => parseISODateToColombia(a.date) - parseISODateToColombia(b.date);
        const sortedCurrentMonthData = currentMonthChartsData.sort(sortByDate);
        const sortedPrevMonthData = prevMonthChartsData.sort(sortByDate);

        // Extraemos los labels (fechas) usando la función específica para fechas de la API
        const currentMonthLabels = sortedCurrentMonthData.map(item => {
          return formatAPIDateForDisplay(item.date);
        });

        // Datos de consumo del mes actual (usar datos ordenados)
        const dailyConsumptionCurrentMonth = sortedCurrentMonthData.map(item => item.daily_consumption / 1000);

        // Datos de consumo del mes pasado (usar datos ordenados)
        const dailyConsumptionPrevMonth = sortedPrevMonthData.map(item => item.daily_consumption / 1000);

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
        
        // Usar datos ordenados para generación también
        const dailyGenerationCurrentMonth = sortedCurrentMonthData.map(item => item.daily_generation / 1000000);
        const dailyGenerationPrevMonth = sortedPrevMonthData.map(item => item.daily_generation / 1000000);

        // 2. Datos para Generación de los inversores (gráfico de barras)
        setInverterGenerationData({
          labels: currentMonthLabels,
          datasets: [
            {
              label: 'Actual (MWh)',
              data: dailyGenerationCurrentMonth,
              backgroundColor: '#10B981',
              borderColor: '#059669',
              borderWidth: 1,
              borderRadius: 5,
            },
            {
              label: 'Anterior (MWh)',
              data: dailyGenerationPrevMonth,
              backgroundColor: 'rgba(161, 161, 170, 0.6)',
              borderColor: 'rgba(161, 161, 170, 1)',
              borderWidth: 1,
              borderRadius: 5,
            },
          ],
        });

        // 3. Datos para el Balance de energía (usar datos ordenados)
        const dailyEnergyBalanceDataCurrent = sortedCurrentMonthData.map(item => item.daily_balance / 1000);
        const dailyEnergyBalanceDataPrevious = sortedPrevMonthData.map(item => item.daily_balance / 1000);

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

        // 4. Datos para Temperatura (usar datos ordenados)
        const dailyTempDataCurrent = sortedCurrentMonthData.map(item => item.avg_daily_temp);
        const dailyTempDataPrevious = sortedPrevMonthData.map(item => item.avg_daily_temp);

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

  // Agregar un useEffect que se ejecute cuando el componente se monta
  useEffect(() => {
  if (authToken) {
    setLoading(true);
    // Simular un pequeño delay para mostrar la animación
    setTimeout(() => {
      fetchDashboardData();
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
            return `Fecha: ${context[0].label}`;
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
          minRotation: 0,
          // Mostrar todas las fechas en el eje X
          callback: function(value, index, values) {
            return value;
          }
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
  if (loading) { // Solo verificar loading, no electricityConsumptionData
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

  // Si no hay datos de gráficos pero no está cargando, mostrar mensaje
  if (!electricityConsumptionData) {
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
        <h1 className="text-3xl font-bold text-gray-800">Visión General</h1>
        <div className="flex items-center space-x-4">
          {/* Aviso estático para período de tiempo */}
          <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Últimos 30 días
          </div>
          
          {/* Aviso estático para dispositivos */}
          <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
              <path d="M9 19h6" strokeLinecap="round" />
            </svg>
            Todos los Dispositivos
          </div>
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

      {/* Charts Section con diseño mejorado */}
      <section className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <svg className="w-6 h-6 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Análisis de Datos
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <ChartCard
            title="Temperatura media"
            type="line"
            data={temperatureTrendsData}
            options={chartOptions}
          />
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

export default Dashboard;