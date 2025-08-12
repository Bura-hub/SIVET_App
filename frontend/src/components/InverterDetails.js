// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';
import InverterFilters from './InverterFilters';

//###########################################################################
// Importaciones Chart.js
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

// Componente principal de detalles de inversores
function InverterDetails({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  // Estados para control de carga y errores
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para los filtros
  const [filters, setFilters] = useState({
    timeRange: 'daily',
    institutionId: '',
    deviceId: '',
    startDate: '',
    endDate: ''
  });

  // Estados para los datos de indicadores
  const [inverterData, setInverterData] = useState(null);
  const [inverterLoading, setInverterLoading] = useState(false);
  const [inverterError, setInverterError] = useState(null);

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState('monthlyGeneration');

  // Estado para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Referencias para control de requests
  const requestSeqRef = useRef(0);
  const lastFiltersRef = useRef(null);

  // Iconos mejorados más acordes a cada título
  const generationIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-solar-panel" aria-hidden="true"><path d="M12 2v20"></path><path d="M2 12h20"></path><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"></path><path d="M4 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"></path><path d="M12 6v4"></path><path d="M8 8h8"></path></svg>;
  
  const efficiencyIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gauge" aria-hidden="true"><path d="M12 2v10"></path><path d="m19.777 4.3-1.531 1.532a3 3 0 0 0 0 4.242l1.532 1.531"></path><path d="M4.223 4.3l1.531 1.532a3 3 0 0 1 0 4.242L4.223 11.7"></path><path d="M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9Z"></path><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"></path></svg>;
  
  const activeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 21v3"></path><path d="M15 21v3"></path><path d="M1 9h3"></path><path d="M1 15h3"></path><path d="M21 9h3"></path><path d="M21 15h3"></path></svg>;

  // Estado con datos simulados para los KPIs (se actualizará con datos reales)
  const [kpiData, setKpiData] = useState({
    totalGeneration: { 
      title: "Generación Total", 
      value: "1.2", 
      unit: "MWh", 
      change: "+15%", 
      status: "positivo", 
      icon: generationIcon,
      color: "text-blue-600"
    },
    averageEfficiency: { 
      title: "Eficiencia Promedio", 
      value: "94.5", 
      unit: "%", 
      change: "+2.1%", 
      status: "positivo", 
      icon: efficiencyIcon,
      color: "text-green-600"
    },
    activeInverters: { 
      title: "Inversores Activos", 
      value: "8", 
      unit: "", 
      change: "de 10", 
      status: "normal", 
      icon: activeIcon,
      color: "text-purple-600"
    },
    performanceRatio: { 
      title: "Performance Ratio", 
      value: "0.85", 
      unit: "", 
      change: "Eficiencia del sistema", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>,
      color: "text-red-600"
    },
  });

  // Estados para almacenar los datos de cada gráfico
  const [monthlyGenerationData, setMonthlyGenerationData] = useState(null);
  const [dailyGenerationData, setDailyGenerationData] = useState(null);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [inverterStatusData, setInverterStatusData] = useState(null);
  const [generationVsIrradianceData, setGenerationVsIrradianceData] = useState(null);

  // Función para obtener datos de inversores
  const fetchInverterData = useCallback(async (filters) => {
    let seq = 0;
    try {
      seq = ++requestSeqRef.current;
      if (!filters || !filters.institutionId) return; // no tocar UI si no hay institución
      
      setInverterLoading(true);
      setInverterError(null);
      
      // Usar fechas por defecto si no se han especificado
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 10);
      
      const timeRange = filters.timeRange || 'daily';
      const baseParams = {
        time_range: timeRange,
        ...(filters.institutionId && { institution_id: filters.institutionId }),
        ...(filters.deviceId && { device_id: filters.deviceId }),
        start_date: filters.startDate || defaultStartDate.toISOString().split('T')[0],
        end_date: filters.endDate || defaultEndDate.toISOString().split('T')[0]
      };

      const indicatorsParams = new URLSearchParams(baseParams);

      const indicatorsResp = await fetch(`/api/inverter-indicators/?${indicatorsParams.toString()}`, {
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
        setInverterData(indicatorsData);
        
        // Actualizar KPIs con datos reales
        if (indicatorsData.results && indicatorsData.results.length > 0) {
          const latestData = indicatorsData.results[0];
          const totalEnergy = indicatorsData.results.reduce((sum, item) => sum + (item.total_generated_energy_kwh || 0), 0);
          
          setKpiData(prev => ({
            totalGeneration: {
              ...prev.totalGeneration,
              value: (totalEnergy / 1000).toFixed(2), // Convertir kWh a MWh
              change: `${indicatorsData.results.length} registros`
            },
            averageEfficiency: {
              ...prev.averageEfficiency,
              value: (latestData.dc_ac_efficiency_pct || 0).toFixed(1),
              change: latestData.dc_ac_efficiency_pct > 90 ? 'Excelente' : latestData.dc_ac_efficiency_pct > 80 ? 'Bueno' : 'Mejorable'
            },
            activeInverters: {
              ...prev.activeInverters,
              value: indicatorsData.results.length.toString(),
              change: "activos"
            }
          }));
        }

        // Obtener datos de gráficos después de obtener indicadores
        await fetchChartData(filters, seq);
      }
    } catch (error) {
      // Mostrar error solo si esta solicitud sigue siendo la vigente
      if (seq === requestSeqRef.current) {
        setInverterError(error.message || 'Error desconocido');
      }
    } finally {
      if (seq === requestSeqRef.current) setInverterLoading(false);
    }
  }, [authToken]);

  // Función para obtener datos de gráficos
  const fetchChartData = useCallback(async (filters, requestSeq) => {
    try {
      if (!filters || !filters.institutionId) return;
      
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30); // Últimos 30 días para gráficos
      
      const chartParams = new URLSearchParams({
        time_range: filters.timeRange || 'daily',
        institution_id: filters.institutionId,
        ...(filters.deviceId && { device_id: filters.deviceId }),
        start_date: filters.startDate || defaultStartDate.toISOString().split('T')[0],
        end_date: filters.endDate || defaultEndDate.toISOString().split('T')[0]
      });

      const chartResp = await fetch(`/api/inverter-chart-data/?${chartParams.toString()}`, {
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!chartResp.ok) {
        const errText = await chartResp.text();
        throw new Error(errText || chartResp.statusText);
      }

      const chartData = await chartResp.json();

      if (requestSeq === requestSeqRef.current) {
        // Procesar datos de gráficos
        processChartData(chartData.results || []);
      }
    } catch (error) {
      console.error('Error al obtener datos de gráficos:', error);
      // No mostrar error en UI para gráficos, solo en consola
    }
  }, [authToken]);

  // Función para procesar datos de gráficos y actualizar estados
  const processChartData = useCallback((chartData) => {
    if (!chartData || chartData.length === 0) return;

    // Agrupar datos por fecha para procesamiento
    const dataByDate = {};
    chartData.forEach(item => {
      const date = item.date;
      if (!dataByDate[date]) {
        dataByDate[date] = {
          efficiency: [],
          generation: [],
          irradiance: [],
          temperature: [],
          dcPower: [],
          acPower: []
        };
      }
      
      // Agregar datos horarios si existen
      if (item.hourly_efficiency) dataByDate[date].efficiency.push(...item.hourly_efficiency);
      if (item.hourly_generation) dataByDate[date].generation.push(...item.hourly_generation);
      if (item.hourly_irradiance) dataByDate[date].irradiance.push(...item.hourly_irradiance);
      if (item.hourly_temperature) dataByDate[date].temperature.push(...item.hourly_temperature);
      if (item.hourly_dc_power) dataByDate[date].dcPower.push(...item.hourly_dc_power);
      if (item.hourly_ac_power) dataByDate[date].acPower.push(...item.hourly_ac_power);
    });

    // Ordenar fechas
    const sortedDates = Object.keys(dataByDate).sort();

    // Generar datos para gráficos
    const labels = sortedDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    });

    // Gráfico de Generación Diaria (4.2. Energía Total Generada)
    const dailyGenerationData = {
      labels,
      datasets: [{
        label: 'Generación Diaria (kWh)',
        data: sortedDates.map(date => {
          const dailyGen = dataByDate[date].generation.reduce((sum, val) => sum + (val || 0), 0);
          return Math.round(dailyGen * 100) / 100; // Redondear a 2 decimales
        }),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3B82F6',
      }]
    };

    // Gráfico de Eficiencia (4.1. Eficiencia de Conversión DC-AC)
    const efficiencyData = {
      labels,
      datasets: [
        {
          label: 'Eficiencia Promedio (%)',
          data: sortedDates.map(date => {
            const avgEfficiency = dataByDate[date].efficiency.reduce((sum, val) => sum + (val || 0), 0) / 
                                Math.max(dataByDate[date].efficiency.filter(v => v !== null).length, 1);
            return Math.round(avgEfficiency * 100) / 100;
          }),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#F59E0B',
        },
        {
          label: 'Meta de Eficiencia (%)',
          data: labels.map(() => 95),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderDash: [5, 5],
        }
      ]
    };

    // Gráfico de Generación vs Irradiancia (4.4. Curva de Generación vs. Irradiancia/Temperatura)
    const generationVsIrradianceData = {
      labels: sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Generación (kWh)',
          data: sortedDates.map(date => {
            const dailyGen = dataByDate[date].generation.reduce((sum, val) => sum + (val || 0), 0);
            return Math.round(dailyGen * 100) / 100;
          }),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          yAxisID: 'y',
        },
        {
          label: 'Irradiancia Promedio (W/m²)',
          data: sortedDates.map(date => {
            const avgIrradiance = dataByDate[date].irradiance.reduce((sum, val) => sum + (val || 0), 0) / 
                                Math.max(dataByDate[date].irradiance.filter(v => v !== null).length, 1);
            return Math.round(avgIrradiance);
          }),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          yAxisID: 'y1',
        }
      ]
    };

    // Gráfico de Estado de Inversores (4.5. Factor de Potencia y Calidad de Inyección)
    const inverterStatusData = {
      labels: sortedDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Potencia AC Promedio (kW)',
          data: sortedDates.map(date => {
            const avgAcPower = dataByDate[date].acPower.reduce((sum, val) => sum + (val || 0), 0) / 
                             Math.max(dataByDate[date].acPower.filter(v => v !== null).length, 1);
            return Math.round((avgAcPower / 1000) * 100) / 100; // Convertir W a kW
          }),
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#8B5CF6',
        }
      ]
    };

    // Actualizar estados de gráficos
    setDailyGenerationData(dailyGenerationData);
    setEfficiencyData(efficiencyData);
    setInverterStatusData(inverterStatusData);
    setGenerationVsIrradianceData(generationVsIrradianceData);
    
    // Para el gráfico mensual, agrupar por mes
    const monthlyData = generateMonthlyData(chartData);
    setMonthlyGenerationData(monthlyData);
  }, []);

  // Función para generar datos mensuales
  const generateMonthlyData = useCallback((chartData) => {
    const monthlyGroups = {};
    
    chartData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {
          generation: 0,
          count: 0
        };
      }
      
      // Sumar generación diaria
      if (item.hourly_generation) {
        const dailyGen = item.hourly_generation.reduce((sum, val) => sum + (val || 0), 0);
        monthlyGroups[monthKey].generation += dailyGen;
        monthlyGroups[monthKey].count++;
      }
    });

    // Convertir a formato de gráfico
    const months = Object.keys(monthlyGroups).sort();
    const monthLabels = months.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString('es-ES', { month: 'short' });
    });

    return {
      labels: monthLabels,
      datasets: [{
        label: 'Generación Mensual (kWh)',
        data: months.map(month => {
          const avgGen = monthlyGroups[month].generation / Math.max(monthlyGroups[month].count, 1);
          return Math.round(avgGen * 100) / 100;
        }),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 5,
      }]
    };
  }, []);

  // Función para calcular datos de inversores
  const calculateInverterData = useCallback(async () => {
    if (!filters.institutionId) {
      showTransitionAnimation('info', 'Selecciona una institución primero', 2000);
      return;
    }

    try {
      setInverterLoading(true);
      showTransitionAnimation('info', 'Calculando datos de inversores...', 2000);

      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const requestData = {
        time_range: filters.timeRange || 'daily',
        start_date: filters.startDate || defaultStartDate.toISOString().split('T')[0],
        end_date: filters.endDate || defaultEndDate.toISOString().split('T')[0],
        institution_id: filters.institutionId,
        ...(filters.deviceId && { device_id: filters.deviceId })
      };

      const response = await fetch('/api/inverters/calculate/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const result = await response.json();
      
      if (result.success) {
        showTransitionAnimation('success', `Cálculo iniciado: ${result.message}`, 3000);
        // Esperar un momento y luego recargar los datos
        setTimeout(() => {
          fetchInverterData(filters);
        }, 2000);
      } else {
        showTransitionAnimation('error', `Error en el cálculo: ${result.message}`, 3000);
      }
    } catch (error) {
      console.error('Error al calcular datos:', error);
      showTransitionAnimation('error', `Error: ${error.message}`, 3000);
    } finally {
      setInverterLoading(false);
    }
  }, [filters, authToken, fetchInverterData]);

  // Función para manejar cambios en los filtros
  const handleFiltersChange = useCallback((newFilters) => {
    console.log('Filters changed in InverterDetails:', newFilters);
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

    // Si se seleccionó una institución, cargar datos inmediatamente
    if (newFilters.institutionId && (!prev.institutionId || prev.institutionId !== newFilters.institutionId)) {
      fetchInverterData(newFilters);
      return;
    }

    // Debounce para evitar múltiples requests
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInverterLoading(false);
    debounceRef.current = setTimeout(() => {
      fetchInverterData(newFilters);
    }, 450);
  }, [fetchInverterData]);

  // Referencia para debounce
  const debounceRef = useRef(null);

  // Hook de efecto para cargar datos desde la API
  const fetchInverterDataInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!authToken) {
        throw new Error("No hay token de autenticación. Por favor, inicia sesión.");
      }

      // Simular delay de carga
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Ya no usamos datos simulados - los datos se cargarán cuando se seleccionen los filtros
      // Los gráficos se mostrarán vacíos hasta que se seleccione una institución
      
      // Inicializar gráficos con datos vacíos
      const emptyChartData = {
        labels: [],
        datasets: [{
          label: 'Sin datos',
          data: [],
          backgroundColor: '#E5E7EB',
          borderColor: '#9CA3AF',
          borderWidth: 1,
        }]
      };

      setMonthlyGenerationData(emptyChartData);
      setDailyGenerationData(emptyChartData);
      setEfficiencyData(emptyChartData);
      setInverterStatusData(emptyChartData);
      setGenerationVsIrradianceData(emptyChartData);

    } catch (e) {
      setError(e.message);
      console.error("Error al cargar datos de inversores:", e);
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
        fetchInverterDataInitial();
      }, 300);
    }
  }, []); // Se ejecuta solo al montar el componente

  // Efecto para actualizar datos cuando cambien los filtros
  useEffect(() => {
    if (filters.institutionId && (filters.startDate || filters.endDate)) {
      // Si hay institución seleccionada y fechas, cargar datos
      fetchInverterData(filters);
    }
  }, [filters, fetchInverterData]);

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

  // Estados de carga y error (suavizados)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando datos de inversores...</p>
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

  // Si no hay datos de gráficos pero no está cargando, mostrar mensaje
  if (!monthlyGenerationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-orange-600 text-lg p-4 bg-orange-100 rounded-lg shadow-md">
          No se pudieron cargar los datos de los gráficos. Intente recargar la página.
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-700 shadow-lg -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
        <div className="px-4 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="p-3 bg-white/20 rounded-xl self-start lg:self-auto">
              <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">Detalles de Inversores</h1>
              <p className="text-green-100 mt-1 text-sm lg:text-base">Análisis y monitoreo de indicadores fotovoltaicos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Sección de Medidores Eléctricos */}
      <section className="mb-6 lg:mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 lg:px-8 py-4 lg:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
              <div className="p-2 lg:p-3 bg-white/20 rounded-xl self-start lg:self-auto">
                <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg lg:text-2xl font-bold text-white">Indicadores de Inversores Fotovoltaicos</h2>
                <p className="text-indigo-100 mt-1 text-sm lg:text-base">Análisis detallado por institución e inversor</p>
                {/* Indicador de rango de fechas */}
                {filters.startDate && filters.endDate && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-xs text-white">
                    <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(filters.startDate).toLocaleDateString('es-ES')} - {new Date(filters.endDate).toLocaleDateString('es-ES')}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Contenido de la sección */}
          <div className="p-4 lg:p-8">
            <InverterFilters 
              onFiltersChange={handleFiltersChange}
              authToken={authToken}
            />
            
            {/* Indicador de cálculo en progreso */}
            {inverterLoading && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-600 mr-3"></div>
                  <span className="text-yellow-800 font-medium">Calculando datos de inversores...</span>
                </div>
                <p className="text-yellow-700 text-sm mt-2">
                  Esto puede tomar unos minutos dependiendo de la cantidad de datos a procesar.
                </p>
              </div>
            )}

            {/* Mensaje informativo sobre fechas por defecto */}
            {filters.institutionId && !filters.startDate && !filters.endDate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center text-sm text-blue-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mostrando datos de los últimos 10 días. Selecciona fechas específicas para personalizar el rango.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mensaje informativo cuando no hay institución seleccionada */}
      {!filters.institutionId && (
        <section className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-blue-800">Selecciona una Institución</h3>
            </div>
            <p className="text-blue-700 mb-4">
              Para ver los indicadores y gráficos de inversores, primero selecciona una institución en los filtros superiores.
            </p>
            <div className="text-sm text-blue-600 mb-4">
              <p>• Los KPIs mostrarán datos en tiempo real</p>
              <p>• Los gráficos se actualizarán automáticamente</p>
              <p>• Puedes filtrar por dispositivo específico</p>
            </div>
            <div className="text-xs text-blue-500 mb-4">
              <p>💡 <strong>Tip:</strong> Los datos se calculan automáticamente cuando seleccionas una institución</p>
            </div>
            <button
              onClick={calculateInverterData}
              disabled={!filters.institutionId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Calcular Datos de Inversores
            </button>
          </div>
        </section>
      )}

      {/* KPIs */}
      <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 lg:p-8 -mt-4 lg:-mt-8 mb-6 lg:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
          ) : inverterLoading ? (
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
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700 font-medium">Selecciona una institución para ver los indicadores</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && inverterLoading && (
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-700 font-medium">Cargando indicadores de la institución...</span>
            </div>
          </div>
        )}
        
        {filters.institutionId && !inverterLoading && inverterData && (!inverterData.results || inverterData.results.length === 0) && (
          <div className="text-center mt-4 lg:mt-6">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">No hay datos disponibles para esta institución en el período seleccionado</span>
            </div>
          </div>
        )}
      </section>

      {/* Mensaje de error si hay problemas al obtener datos */}
      {inverterError && (
        <section className="mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">Error al obtener datos:</span>
              <span className="text-red-700 ml-2">{inverterError}</span>
            </div>
          </div>
        </section>
      )}

      {/* Mensaje de éxito cuando se hayan calculado datos */}
      {inverterData && inverterData.results && inverterData.results.length > 0 && !inverterLoading && (
        <section className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">Datos disponibles:</span>
              <span className="text-green-700 ml-2">
                {inverterData.results.length} registro{inverterData.results.length !== 1 ? 's' : ''} de inversores
              </span>
            </div>
            <p className="text-green-700 text-sm mt-2">
              Los indicadores y gráficos se han actualizado con los datos más recientes.
            </p>
          </div>
        </section>
      )}

      {/* Gráficos con diseño moderno */}
      {filters.institutionId && inverterData && !inverterLoading && (
        <section className="mb-6 lg:mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
            {/* Header de la sección de gráficos */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
              <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl self-start lg:self-auto">
                  <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-white">Análisis de Indicadores de Inversores</h2>
                  <p className="text-emerald-100 mt-1 text-sm lg:text-base">Visualización detallada de métricas fotovoltaicas por período</p>
                  {/* Indicador de fechas por defecto */}
                  {filters.institutionId && !filters.startDate && !filters.endDate && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-white/20 rounded-full text-xs text-white">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Últimos 10 días
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Contenido de la sección */}
            <div className="p-3 lg:p-4 xl:p-6">
              {/* Tabs profesionales para diferentes vistas */}
              <div className="mb-8">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('monthlyGeneration')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'monthlyGeneration'
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Generación Mensual
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('dailyGeneration')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'dailyGeneration'
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generación Diaria
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('efficiency')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'efficiency'
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Eficiencia
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('generationVsIrradiance')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'generationVsIrradiance'
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Generación vs Irradiancia
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('inverterStatus')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        activeTab === 'inverterStatus'
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50 rounded-t-lg'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.5-4a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
                        </svg>
                        Estado de Inversores
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Contenido de los gráficos */}
              {activeTab === 'monthlyGeneration' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Generación Mensual de Inversores"
                    icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    infoText="Hover sobre los gráficos para ver controles"
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {monthlyGenerationData && monthlyGenerationData.labels && monthlyGenerationData.labels.length > 0 ? (
                      <ChartCard
                        title="Generación Mensual (Año Actual)"
                        type="bar"
                        data={monthlyGenerationData}
                        options={CHART_OPTIONS}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                        <p className="text-gray-500 mb-4">
                          {!filters.institutionId 
                            ? "Selecciona una institución para ver la generación mensual"
                            : "No hay datos de generación mensual para el período seleccionado"
                          }
                        </p>
                        {filters.institutionId && (
                          <button
                            onClick={calculateInverterData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Calcular Datos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'dailyGeneration' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Generación Diaria de Inversores"
                    icon="M13 10V3L4 14h7v7l9-11h-7z"
                    infoText="Hover sobre los gráficos para ver controles"
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {dailyGenerationData && dailyGenerationData.labels && dailyGenerationData.labels.length > 0 ? (
                      <ChartCard
                        title="Generación Diaria (Últimos 30 Días)"
                        type="line"
                        data={dailyGenerationData}
                        options={CHART_OPTIONS}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                        <p className="text-gray-500 mb-4">
                          {!filters.institutionId 
                            ? "Selecciona una institución para ver la generación diaria"
                            : "No hay datos de generación diaria para el período seleccionado"
                          }
                        </p>
                        {filters.institutionId && (
                          <button
                            onClick={calculateInverterData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Calcular Datos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'efficiency' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Análisis de Eficiencia"
                    icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    infoText="Hover sobre los gráficos para ver controles"
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {efficiencyData && efficiencyData.labels && efficiencyData.labels.length > 0 ? (
                      <ChartCard
                        title="Eficiencia Diaria (Últimos 30 Días)"
                        type="line"
                        data={efficiencyData}
                        options={CHART_OPTIONS}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                        <p className="text-gray-500 mb-4">
                          {!filters.institutionId 
                            ? "Selecciona una institución para ver los datos de eficiencia"
                            : "No hay datos de eficiencia para el período seleccionado"
                          }
                        </p>
                        {filters.institutionId && (
                          <button
                            onClick={calculateInverterData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Calcular Datos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'generationVsIrradiance' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Generación vs Irradiancia"
                    icon="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    infoText="Hover sobre los gráficos para ver controles"
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {generationVsIrradianceData && generationVsIrradianceData.labels && generationVsIrradianceData.labels.length > 0 ? (
                      <ChartCard
                        title="Generación vs Irradiancia (Últimos 30 Días)"
                        type="line"
                        data={generationVsIrradianceData}
                        options={CHART_OPTIONS}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                        <p className="text-gray-500 mb-4">
                          {!filters.institutionId 
                            ? "Selecciona una institución para ver la relación generación vs irradiancia"
                            : "No hay datos de generación vs irradiancia para el período seleccionado"
                          }
                        </p>
                        {filters.institutionId && (
                          <button
                            onClick={calculateInverterData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Calcular Datos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'inverterStatus' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Estado de Inversores"
                    icon="M9 12l2 2 4-4m5.5-4a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"
                    infoText="Hover sobre los gráficos para ver controles"
                  />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {inverterStatusData && inverterStatusData.labels && inverterStatusData.labels.length > 0 ? (
                      <ChartCard
                        title="Potencia Actual por Inversor"
                        type="bar"
                        data={inverterStatusData}
                        options={CHART_OPTIONS}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.5-4a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                        <p className="text-gray-500 mb-4">
                          {!filters.institutionId 
                            ? "Selecciona una institución para ver el estado de los inversores"
                            : "No hay datos de estado de inversores para el período seleccionado"
                          }
                        </p>
                        {filters.institutionId && (
                          <button
                            onClick={calculateInverterData}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Calcular Datos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Overlay de transición */}
      <TransitionOverlay 
        show={showTransition}
        type={transitionType}
        message={transitionMessage}
      />

      {/* Estados de carga y error */}
      {inverterLoading && (
        <div className="flex items-center justify-center py-8 lg:py-12 transition-opacity duration-300 ease-in-out">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-emerald-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-transparent border-t-emerald-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-3 lg:mt-4 text-base lg:text-lg font-medium text-gray-700">Cargando datos de inversores...</p>
            <p className="mt-1 lg:mt-2 text-sm text-gray-500">Procesando indicadores fotovoltaicos</p>
          </div>
        </div>
      )}

      {inverterError && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 lg:p-6 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 lg:ml-4">
              <h3 className="text-base lg:text-lg font-semibold text-red-800 mb-1">Error al cargar datos</h3>
              <p className="text-red-700 text-sm lg:text-base">{inverterError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InverterDetails;