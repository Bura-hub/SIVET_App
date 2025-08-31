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
  const [inverterData, setInverterData] = useState({ results: [] });
  const [inverterLoading, setInverterLoading] = useState(false);
  const [inverterError, setInverterError] = useState(null);
  const [kpisUpdating, setKpisUpdating] = useState(false);

  // Estado para la pestaña activa


  // Estado para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Referencias para control de requests
  const requestSeqRef = useRef(0);
  const lastFiltersRef = useRef(null);
  
  // Variables de estado para paginación de la tabla
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Iconos mejorados más acordes a cada título
  const generationIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-solar-panel" aria-hidden="true"><path d="M12 2v20"></path><path d="M2 12h20"></path><path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"></path><path d="M4 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"></path><path d="M12 6v4"></path><path d="M8 8h8"></path></svg>;
  
  const efficiencyIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gauge" aria-hidden="true"><path d="M12 2v10"></path><path d="m19.777 4.3-1.531 1.532a3 3 0 0 0 0 4.242l1.532 1.531"></path><path d="M4.223 4.3l1.531 1.532a3 3 0 0 1 0 4.242L4.223 11.7"></path><path d="M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9Z"></path><path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"></path></svg>;
  
  const activeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 21v3"></path><path d="M15 21v3"></path><path d="M1 9h3"></path><path d="M1 15h3"></path><path d="M21 9h3"></path><path d="M21 15h3"></path></svg>;

  // Función para generar KPIs por defecto
  const getDefaultKPIs = useCallback(() => ({
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
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18"></path>
        <path d="M18 17V9"></path>
        <path d="M13 17V5"></path>
        <path d="M8 17v-3"></path>
      </svg>,
      color: "text-red-600"
    },
    powerFactor: { 
      title: "Factor de Potencia", 
      value: "0.95", 
      unit: "", 
      change: "Calidad de energía", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>,
      color: "text-indigo-600"
    },
    phaseUnbalance: { 
      title: "Desbalance de Fases", 
      value: "2.1", 
      unit: "%", 
      change: "Voltaje", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 11-12h-7z"></path>
        <path d="M6 18l-2-2 2-2"></path>
        <path d="M10 18l2-2-2-2"></path>
      </svg>,
      color: "text-orange-600"
    },
    frequencyStability: { 
      title: "Estabilidad Frecuencia", 
      value: "60.0", 
      unit: "Hz", 
      change: "Estable", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20"></path>
        <path d="M2 12h20"></path>
        <path d="M12 2a10 10 0 0 1 0 20"></path>
      </svg>,
      color: "text-teal-600"
    },
    thdVoltage: { 
      title: "THD Voltaje", 
      value: "1.8", 
      unit: "%", 
      change: "Calidad", 
      status: "normal", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4"></path>
        <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
        <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
      </svg>,
      color: "text-pink-600"
    }
  }), [generationIcon, efficiencyIcon, activeIcon]);

  // Estado con datos simulados para los KPIs (se actualizará con datos reales)
  const [kpiData, setKpiData] = useState(() => getDefaultKPIs());

  // Función para calcular KPIs dinámicamente basándose en los datos reales
  const calculateDynamicKPIs = useCallback((data) => {
    if (!data || !data.results || data.results.length === 0) {
      return getDefaultKPIs(); // Retornar KPIs por defecto si no hay datos
    }

    const results = data.results;
    
    // Calcular total de generación
    const totalGeneration = results.reduce((sum, item) => {
      return sum + (item.total_generated_energy_kwh || 0);
    }, 0);

    // Calcular eficiencia promedio
    const efficiencyValues = results
      .map(item => item.dc_ac_efficiency_pct)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const averageEfficiency = efficiencyValues.length > 0 
      ? efficiencyValues.reduce((sum, val) => sum + val, 0) / efficiencyValues.length 
      : 0;

    // Contar inversores activos (con datos)
    const activeInverters = new Set(results.map(item => item.device_id || item.device_name)).size;

    // Calcular performance ratio promedio
    const prValues = results
      .map(item => item.performance_ratio)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const avgPerformanceRatio = prValues.length > 0 
      ? prValues.reduce((sum, val) => sum + val, 0) / prValues.length 
      : 0;

    // Calcular factor de potencia promedio
    const pfValues = results
      .map(item => item.avg_power_factor || item.power_factor || item.power_factor_avg)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const avgPowerFactor = pfValues.length > 0 
      ? pfValues.reduce((sum, val) => sum + val, 0) / pfValues.length 
      : 0;

    // Calcular desbalance de fases promedio
    const unbalanceValues = results
      .map(item => item.max_voltage_unbalance_pct || item.voltage_unbalance_pct || item.unbalance_voltage || item.voltage_unbalance)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const avgPhaseUnbalance = unbalanceValues.length > 0 
      ? unbalanceValues.reduce((sum, val) => sum + val, 0) / unbalanceValues.length 
      : 0;

    // Calcular frecuencia promedio
    const freqValues = results
      .map(item => item.avg_frequency_hz || item.frequency_hz || item.frequency || item.freq)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const avgFrequency = freqValues.length > 0 
      ? freqValues.reduce((sum, val) => sum + val, 0) / freqValues.length 
      : 60;

    // Calcular THD de voltaje promedio
    const thdValues = results
      .map(item => item.max_voltage_thd_pct || item.voltage_thd_pct || item.thd_voltage || item.voltage_thd)
      .filter(val => val !== null && val !== undefined && !isNaN(val));
    
    const avgThdVoltage = thdValues.length > 0 
      ? thdValues.reduce((sum, val) => sum + val, 0) / thdValues.length 
      : 0;

    // Calcular cambios porcentuales (comparar con valores anteriores si es posible)
    const calculateChange = (currentValue, previousValue) => {
      if (!previousValue || previousValue === 0) return "N/A";
      const change = ((currentValue - previousValue) / previousValue) * 100;
      return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
    };

    // Obtener valores del período anterior para comparación (si hay suficientes datos)
    const previousPeriodData = results.length > 1 ? results.slice(0, Math.floor(results.length / 2)) : [];
    const currentPeriodData = results.length > 1 ? results.slice(Math.floor(results.length / 2)) : results;

    const previousTotalGen = previousPeriodData.reduce((sum, item) => sum + (item.total_generated_energy_kwh || 0), 0);
    const previousEfficiency = previousPeriodData.length > 0 
      ? previousPeriodData
          .map(item => item.dc_ac_efficiency_pct)
          .filter(val => val !== null && val !== undefined && !isNaN(val))
          .reduce((sum, val) => sum + val, 0) / Math.max(previousPeriodData.length, 1)
      : 0;

    const generationChange = calculateChange(totalGeneration, previousTotalGen);
    const efficiencyChange = calculateChange(averageEfficiency, previousEfficiency);

    return {
      totalGeneration: { 
        title: "Generación Total", 
        value: (totalGeneration / 1000).toFixed(2), // Convertir a MWh
        unit: "MWh", 
        change: generationChange !== "N/A" ? generationChange : "Datos disponibles", 
        status: generationChange !== "N/A" && parseFloat(generationChange) > 0 ? "positivo" : "normal", 
        icon: generationIcon,
        color: "text-blue-600"
      },
      averageEfficiency: { 
        title: "Eficiencia Promedio", 
        value: averageEfficiency.toFixed(1), 
        unit: "%", 
        change: efficiencyChange !== "N/A" ? efficiencyChange : "Datos disponibles", 
        status: efficiencyChange !== "N/A" && parseFloat(efficiencyChange) > 0 ? "positivo" : "normal", 
        icon: efficiencyIcon,
        color: "text-green-600"
      },
      activeInverters: { 
        title: "Inversores Activos", 
        value: activeInverters.toString(), 
        unit: "", 
        change: `de ${activeInverters} dispositivos`, 
        status: "normal", 
        icon: activeIcon,
        color: "text-purple-600"
      },
      performanceRatio: { 
        title: "Performance Ratio", 
        value: avgPerformanceRatio.toFixed(2), 
        unit: "", 
        change: "Eficiencia del sistema", 
        status: avgPerformanceRatio > 0.8 ? "positivo" : "normal", 
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18"></path>
          <path d="M18 17V9"></path>
          <path d="M13 17V5"></path>
          <path d="M8 17v-3"></path>
        </svg>,
        color: "text-red-600"
      },
      powerFactor: { 
        title: "Factor de Potencia", 
        value: avgPowerFactor.toFixed(2), 
        unit: "", 
        change: "Calidad de energía", 
        status: avgPowerFactor > 0.95 ? "positivo" : "normal", 
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>,
        color: "text-indigo-600"
      },
      phaseUnbalance: { 
        title: "Desbalance de Fases", 
        value: avgPhaseUnbalance.toFixed(1), 
        unit: "%", 
        change: "Voltaje", 
        status: avgPhaseUnbalance < 3 ? "positivo" : "normal", 
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 11-12h-7z"></path>
          <path d="M6 18l-2-2 2-2"></path>
          <path d="M10 18l2-2-2-2"></path>
        </svg>,
        color: "text-orange-600"
      },
      frequencyStability: { 
        title: "Estabilidad Frecuencia", 
        value: avgFrequency.toFixed(1), 
        unit: "Hz", 
        change: Math.abs(avgFrequency - 60) < 0.5 ? "Estable" : "Variable", 
        status: Math.abs(avgFrequency - 60) < 0.5 ? "positivo" : "normal", 
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20"></path>
          <path d="M2 12h20"></path>
          <path d="M12 2a10 10 0 0 1 0 20"></path>
        </svg>,
        color: "text-teal-600"
      },
      thdVoltage: { 
        title: "THD Voltaje", 
        value: avgThdVoltage.toFixed(1), 
        unit: "%", 
        change: "Calidad", 
        status: avgThdVoltage < 5 ? "positivo" : "normal", 
        icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
          <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
        </svg>,
        color: "text-pink-600"
      }
    };
  }, [generationIcon, efficiencyIcon, activeIcon]);

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
        // Mostrar estado de actualización de KPIs
        setKpisUpdating(true);
        // Actualizar KPIs inmediatamente con los nuevos datos
        const newKpiData = calculateDynamicKPIs(indicatorsData);
        console.log('KPIs calculados dinámicamente:', newKpiData);
        setKpiData(newKpiData);
        // Ocultar estado de actualización después de un breve delay
        setTimeout(() => setKpisUpdating(false), 1000);
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

  // Función para obtener información detallada de cada KPI
  const getKpiDetailedInfo = (kpiKey) => {
    const kpiInfo = {
      totalGeneration: {
        title: "Generación Total de Energía",
        description: "Representa la cantidad total de energía solar generada por todos los inversores activos en la institución seleccionada.",
        calculation: "Se calcula sumando la energía generada (total_generation_kwh) de todos los inversores durante el período seleccionado.",
        dataSource: "Datos obtenidos de inversores solares SCADA en tiempo real, incluyendo mediciones de energía activa generada.",
        units: "kWh (kilovatios-hora)",
        frequency: "Actualización cada 5 minutos desde SCADA, cálculo automático según el período seleccionado."
      },
      averageEfficiency: {
        title: "Eficiencia Promedio",
        description: "Indica el rendimiento promedio de los inversores solares, comparando la energía generada con la energía solar incidente.",
        calculation: "Eficiencia = (Energía Generada / Energía Solar Incidente) × 100%. Valores altos indican mejor rendimiento.",
        dataSource: "Cálculo derivado de las mediciones de generación y condiciones ambientales de los inversores.",
        units: "% (porcentaje)",
        frequency: "Cálculo automático basado en datos de generación, actualización según el período seleccionado."
      },
      activeInverters: {
        title: "Inversores Activos",
        description: "Representa el número de inversores solares que están funcionando correctamente en el sistema.",
        calculation: "Se cuenta el número de inversores con estado 'online' y funcionamiento normal en el sistema SCADA.",
        dataSource: "Estado de conexión y operación de inversores en tiempo real desde SCADA.",
        units: "Cantidad (número de inversores)",
        frequency: "Verificación cada 5 minutos desde SCADA, conteo automático de dispositivos activos."
      },
      performanceRatio: {
        title: "Performance Ratio",
        description: "Mide la eficiencia del sistema fotovoltaico comparando la generación real con la generación teórica esperada.",
        calculation: "PR = (Energía Generada Real / Energía Teórica) × 100%. Valores cercanos a 100% indican excelente rendimiento.",
        dataSource: "Cálculo derivado de generación real y condiciones ambientales (irradiancia, temperatura).",
        units: "Adimensional (sin unidades)",
        frequency: "Cálculo automático basado en datos de generación y ambientales, actualización según el período."
      },
      powerFactor: {
        title: "Factor de Potencia",
        description: "Indica la eficiencia del uso de la potencia aparente en los inversores solares.",
        calculation: "Factor de Potencia = Potencia Activa / Potencia Aparente. Valores cercanos a 1.0 indican alta eficiencia.",
        dataSource: "Mediciones de potencia activa y aparente desde inversores solares SCADA.",
        units: "Adimensional (sin unidades)",
        frequency: "Actualización cada 5 minutos desde SCADA, promedio automático del período seleccionado."
      },
      phaseUnbalance: {
        title: "Desbalance de Fases",
        description: "Mide la diferencia en el voltaje entre las fases del sistema trifásico de los inversores.",
        calculation: "Desbalance = ((Vmax - Vmin) / Vpromedio) × 100%. Valores bajos indican mejor balance del sistema.",
        dataSource: "Mediciones de voltaje por fase desde inversores solares SCADA.",
        units: "% (porcentaje)",
        frequency: "Actualización cada 5 minutos desde SCADA, cálculo automático del desbalance."
      },
      frequencyStability: {
        title: "Estabilidad de Frecuencia",
        description: "Indica la estabilidad de la frecuencia de operación del sistema eléctrico de los inversores.",
        calculation: "Se mide la desviación de la frecuencia nominal (60 Hz). Valores estables indican buen funcionamiento.",
        dataSource: "Mediciones de frecuencia desde inversores solares SCADA.",
        units: "Hz (Hertz)",
        frequency: "Actualización cada 5 minutos desde SCADA, monitoreo continuo de estabilidad."
      },
      thdVoltage: {
        title: "THD de Voltaje",
        description: "Mide la distorsión armónica total en el voltaje de salida de los inversores solares.",
        calculation: "THD = √(Σ(Vh²) / V1²) × 100%. Valores bajos indican mejor calidad de energía.",
        dataSource: "Análisis armónico del voltaje desde inversores solares SCADA.",
        units: "% (porcentaje)",
        frequency: "Actualización cada 5 minutos desde SCADA, análisis automático de distorsión armónica."
      }
    };
    
    return kpiInfo[kpiKey] || null;
  };

  // Estados para mostrar información detallada de KPIs
  const [showKpiInfo, setShowKpiInfo] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // useEffect para manejar la animación de apertura
  useEffect(() => {
    if (showKpiInfo && isOpening) {
      // Pequeño delay para que la animación de entrada funcione
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showKpiInfo, isOpening]);

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

    // Aquí se procesarían los datos para los gráficos si fuera necesario
    // Por ahora, los gráficos se generan directamente desde los datos de la API
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

    // Si hay institución y fechas, cargar datos
    if (newFilters.institutionId && (newFilters.startDate || newFilters.endDate)) {
      // Debounce para evitar múltiples requests
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setInverterLoading(false);
      debounceRef.current = setTimeout(() => {
        fetchInverterData(newFilters);
      }, 450);
    }
  }, [fetchInverterData]);

  // Referencia para debounce
  const debounceRef = useRef(null);
  
  // Funciones de paginación
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && totalPages > 0) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1 && totalPages > 0) {
      setCurrentPage(currentPage - 1);
    }
  };



  // Agregar un useEffect que se ejecute cuando el componente se monta
  useEffect(() => {
    if (authToken) {
      setLoading(true);
      // Simular un pequeño delay para mostrar la animación
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [authToken]); // Se ejecuta cuando cambie el token

  // Efecto para actualizar datos cuando cambien los filtros
  useEffect(() => {
    if (filters.institutionId && (filters.startDate || filters.endDate)) {
      // Si hay institución seleccionada y fechas, cargar datos
      fetchInverterData(filters);
    }
  }, [filters, fetchInverterData]);

  // Efecto para actualizar KPIs cuando cambien los datos de inversores
  useEffect(() => {
    if (inverterData && inverterData.results) {
      const newKpiData = calculateDynamicKPIs(inverterData);
      setKpiData(newKpiData);
    }
  }, [inverterData, calculateDynamicKPIs]);

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

  // Variables calculadas para paginación
  const totalItems = inverterData?.results?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Asegurar que currentPage no exceda totalPages
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  if (safeCurrentPage !== currentPage) {
    setCurrentPage(safeCurrentPage);
  }
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = inverterData?.results?.slice(startIndex, endIndex) || [];
  
  // Verificar que inverterData existe antes de usar
  const hasData = inverterData && inverterData.results && inverterData.results.length > 0;

  // Estados de carga y error (suavizados)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500"></div>
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

    return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
        <div className="px-4 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="p-3 bg-white/20 rounded-xl self-start lg:self-auto">
              <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
              <path d="M7 12h2l1 2 2-4 1 2h2"></path>
              <path d="M17 16h.01"></path>
              <path d="M17 8h.01"></path>
              </svg>
        </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold text-white">Detalles de Inversores</h1>
              <p className="text-blue-100 mt-1 text-sm lg:text-base">Análisis y monitoreo de indicadores de inversores fotovoltaicos</p>
      </div>
          </div>
        </div>
      </header>

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
                'text-purple-600': { bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                'text-orange-600': { bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                'text-indigo-600': { bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
                'text-teal-600': { bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
                'text-pink-600': { bgColor: 'bg-pink-50', borderColor: 'border-pink-200' }
              };
              const styleColors = colorMap[item.color] || { bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };

  return (
                <div key={key} className={`${styleColors.bgColor} p-6 rounded-xl shadow-md border ${styleColors.borderColor} transform hover:scale-105 transition-all duration-300 hover:shadow-lg relative ${kpisUpdating ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}>
                  {/* Indicador de actualización */}
                  {kpisUpdating && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showKpiInfo === key) {
                          // Cerrar con animación
                          setIsAnimating(true);
                          setTimeout(() => {
                            setShowKpiInfo(null);
                            setIsAnimating(false);
                          }, 500);
                        } else {
                          // Abrir con animación
                          setIsOpening(true);
                          setShowKpiInfo(key);
                        }
                      }}
                      className={`p-2 rounded-lg ${styleColors.bgColor.replace('bg-', 'bg-').replace('-50', '-100')} hover:scale-110 transition-transform duration-200 cursor-pointer`}
                      title="Acerca de este KPI"
                    >
                      {item.icon}
                    </button>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-600">{item.change}</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <div className="flex items-baseline">
                    <p className={`text-3xl font-bold ${item.color} ${kpisUpdating ? 'animate-pulse' : ''}`}>{item.value}</p>
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
              <span className="text-blue-700 font-medium">Cargando indicadores y actualizando KPIs...</span>
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
            <div className="mt-4">
          <button 
                onClick={calculateInverterData}
                disabled={inverterLoading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inverterLoading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
                    Calculando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Calcular Datos de Inversores
                  </>
                )}
          </button>
        </div>
          </div>
        )}
        
        {/* Indicador de KPIs actualizados */}
        {filters.institutionId && inverterData && inverterData.results && inverterData.results.length > 0 && (
          <div className="text-center mt-4 lg:mt-6 space-y-2">
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm lg:text-base">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 font-medium">
                KPIs actualizados con datos de {inverterData.results.length} registros
                {filters.startDate && filters.endDate && (
                  <span className="ml-2 text-xs opacity-75">
                    ({new Date(filters.startDate).toLocaleDateString('es-ES')} - {new Date(filters.endDate).toLocaleDateString('es-ES')})
                  </span>
                )}
              </span>
            </div>
            
            {/* Información adicional sobre la actualización automática */}
            <div className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-xs lg:text-sm">
              <svg className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700">
                Los KPIs se actualizan automáticamente al cambiar filtros de institución o fechas
              </span>
            </div>
          </div>
        )}
        
        {/* Overlay de información detallada del KPI - Se superpone en toda la sección */}
        {showKpiInfo && getKpiDetailedInfo(showKpiInfo) && (
          <div 
            className={`absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-gray-200 shadow-2xl z-20 p-8 overflow-y-auto transition-all duration-500 ease-out transform ${
              isAnimating 
                ? 'opacity-0 scale-95 translate-y-4 backdrop-blur-none' 
                : isOpening
                ? 'opacity-0 scale-95 translate-y-4 backdrop-blur-none'
                : 'opacity-100 scale-100 translate-y-0 backdrop-blur-sm'
            }`}
          >
            <div className={`flex justify-between items-start mb-6 transition-all duration-700 delay-100 ${
              isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}>
              <h3 className="font-bold text-gray-800 text-2xl">
                {getKpiDetailedInfo(showKpiInfo).title}
              </h3>
              <button
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setShowKpiInfo(null);
                    setIsAnimating(false);
                  }, 500);
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                title="Cerrar"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`bg-blue-50 p-4 rounded-xl border border-blue-200 transition-all duration-700 delay-200 ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}>
                <span className="text-base font-semibold text-blue-800">Descripción</span>
                <p className="text-sm text-blue-700 mt-2 leading-relaxed">
                  {getKpiDetailedInfo(showKpiInfo).description}
                </p>
              </div>
              
              <div className={`bg-green-50 p-4 rounded-xl border border-green-200 transition-all duration-700 delay-300 ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}>
                <span className="text-base font-semibold text-green-800">Cálculo</span>
                <p className="text-sm text-green-700 mt-2 leading-relaxed">
                  {getKpiDetailedInfo(showKpiInfo).calculation}
                </p>
              </div>
              
              <div className={`bg-purple-50 p-4 rounded-xl border border-purple-200 transition-all duration-700 delay-400 ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}>
                <span className="text-base font-semibold text-purple-800">Fuente de datos</span>
                <p className="text-sm text-purple-700 mt-2 leading-relaxed">
                  {getKpiDetailedInfo(showKpiInfo).dataSource}
                </p>
              </div>
              
              <div className={`bg-orange-50 p-4 rounded-xl border border-orange-200 transition-all duration-700 delay-500 ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}>
                <span className="text-base font-semibold text-orange-800">Unidades</span>
                <p className="text-sm text-orange-700 mt-2 leading-relaxed">
                  {getKpiDetailedInfo(showKpiInfo).units}
                </p>
              </div>
              
              <div className={`bg-teal-50 p-4 rounded-xl border border-teal-200 lg:col-span-2 transition-all duration-700 delay-600 ${
                isAnimating ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
              }`}>
                <span className="text-base font-semibold text-teal-800">Frecuencia</span>
                <p className="text-sm text-teal-700 mt-2 leading-relaxed">
                  {getKpiDetailedInfo(showKpiInfo).frequency}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sección de Indicadores de Inversores Fotovoltaicos */}
      <section className="mb-6 lg:mb-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
          {/* Header de la sección */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 lg:px-8 py-4 lg:py-6">
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
            <InverterFilters onFiltersChange={handleFiltersChange} authToken={authToken} />

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

            {inverterLoading && (
              <div className="flex items-center justify-center py-8 lg:py-12 transition-opacity duration-300 ease-in-out">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-indigo-200"></div>
                    <div className="animate-spin rounded-full h-12 w-12 lg:h-16 lg:w-16 border-4 border-transparent border-t-indigo-600 absolute top-0 left-0"></div>
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

            {inverterData && !inverterLoading && (
              <>
                {/* Mensaje cuando no hay datos */}
                {(!inverterData.results || inverterData.results.length === 0) && (
                  <div className="text-center py-8 lg:py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gray-100 mb-4 lg:mb-6">
                      <svg className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">No hay datos disponibles</h3>
                    <p className="text-gray-600 mb-6 lg:mb-8 max-w-md mx-auto">
                      No se encontraron indicadores para los filtros seleccionados. Puedes calcular los datos o ajustar los filtros.
                    </p>
            <button
                      onClick={calculateInverterData}
                      disabled={inverterLoading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inverterLoading ? (
                        <>
                          <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Calculando...
                        </>
                      ) : (
                        <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                          Calcular Datos de Inversores
                        </>
                      )}
            </button>
              </div>
                )}

                {/* Gráficos con diseño moderno */}
                {hasData && (
                  <>

                  <div className="space-y-6 lg:space-y-8">
                    {/* Gráfico principal de generación - Ancho completo */}
                    <div className="w-full">
                      <ChartCard
                        title="Análisis de Generación Fotovoltaica"
                        description="Energía generada, eficiencia y rendimiento del sistema en el tiempo"
                        type="line"
                        data={{
                          labels: inverterData.results.slice().reverse().map(item => {
                            // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                            const rawDate = item.date;
                            // Crear fecha en zona horaria local para evitar desfase UTC
                            const localDate = new Date(rawDate + 'T00:00:00');
                            const formattedDate = localDate.toLocaleDateString('es-ES');
                            
                            return formattedDate;
                          }),
                          datasets: [
                            {
                              label: 'Energía Total Generada (kWh)',
                              data: inverterData.results.slice().reverse().map(item => item.total_generated_energy_kwh || 0),
                              borderColor: '#10B981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointBackgroundColor: '#10B981',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                            },
                            {
                              label: 'Eficiencia DC-AC (%)',
                              data: inverterData.results.slice().reverse().map(item => item.dc_ac_efficiency_pct || 0),
                              borderColor: '#F59E0B',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointBackgroundColor: '#F59E0B',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                            },
                            {
                              label: 'Performance Ratio',
                              data: inverterData.results.slice().reverse().map(item => item.performance_ratio || 0),
                              borderColor: '#8B5CF6',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              fill: false,
                              tension: 0.4,
                              pointRadius: 4,
                              borderDash: [8, 4],
                              pointBackgroundColor: '#8B5CF6',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                            }
                          ]
                        }}
                        options={{
                          ...CHART_OPTIONS,
                          plugins: {
                            ...CHART_OPTIONS.plugins,
                            title: { display: false },
                            legend: {
                              ...CHART_OPTIONS.plugins.legend,
                              position: 'top',
                              align: 'start',
                              labels: {
                                ...CHART_OPTIONS.plugins.legend.labels,
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 13, weight: '600' }
                              }
                            }
                          },
                          scales: {
                            ...CHART_OPTIONS.scales,
                            y: {
                              ...CHART_OPTIONS.scales.y,
                              beginAtZero: true,
                              grid: { color: 'rgba(0, 0, 0, 0.05)' }
                            }
                          }
                        }}
                        height="400px"
                        fullscreenHeight="800px"
                      />
                    </div>

                    {/* Gráficos secundarios en grid responsive */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 xl:gap-8 w-full">
                      {/* Calidad de energía y factor de potencia */}
                      <ChartCard
                        title="Calidad de Energía y Factor de Potencia"
                        description="Factor de potencia, THD y estabilidad del sistema"
                        type="line"
                        data={{
                          labels: inverterData.results.slice().reverse().map(item => {
                            // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                            const rawDate = item.date;
                            // Crear fecha en zona horaria local para evitar desfase UTC
                            const localDate = new Date(rawDate + 'T00:00:00');
                            const formattedDate = localDate.toLocaleDateString('es-ES');
                            
                            return formattedDate;
                          }),
                          datasets: [
                            {
                              label: 'Factor de Potencia Promedio',
                              data: inverterData.results.slice().reverse().map(item => item.avg_power_factor || item.power_factor || item.power_factor_avg || 0),
                              borderColor: '#3B82F6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 3,
                              pointBackgroundColor: '#3B82F6',
                            },
                            {
                              label: 'THD de Voltaje (%)',
                              data: inverterData.results.slice().reverse().map(item => item.max_voltage_thd_pct || item.voltage_thd_pct || item.thd_voltage || item.voltage_thd || 0),
                              borderColor: '#EF4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 3,
                              pointBackgroundColor: '#EF4444',
                            },
                            {
                              label: 'THD de Corriente (%)',
                              data: inverterData.results.slice().reverse().map(item => item.max_current_thd_pct || item.current_thd_pct || item.thd_current || item.current_thd || 0),
                              borderColor: '#8B5CF6',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              fill: false,
                              tension: 0.4,
                              pointRadius: 3,
                              borderDash: [6, 3],
                              pointBackgroundColor: '#8B5CF6',
                            }
                          ]
                        }}
                        options={{
                          ...CHART_OPTIONS,
                          plugins: {
                            ...CHART_OPTIONS.plugins,
                            title: { display: false },
                            legend: {
                              ...CHART_OPTIONS.plugins.legend,
                              position: 'top',
                              align: 'start'
                            }
                          }
                        }}
                        height="350px"
                        fullscreenHeight="700px"
                      />

                      {/* Desbalance de fases y frecuencia */}
                      <ChartCard
                        title="Desbalance de Fases y Estabilidad"
                        description="Análisis de desbalance y frecuencia del sistema"
                        type="line"
                        data={{
                          labels: inverterData.results.slice().reverse().map(item => {
                            // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                            const rawDate = item.date;
                            // Crear fecha en zona horaria local para evitar desfase UTC
                            const localDate = new Date(rawDate + 'T00:00:00');
                            const formattedDate = localDate.toLocaleDateString('es-ES');
                            
                            return formattedDate;
                          }),
                          datasets: [
                            {
                              label: 'Desbalance de Voltaje (%)',
                              data: inverterData.results.slice().reverse().map(item => item.max_voltage_unbalance_pct || item.voltage_unbalance_pct || item.unbalance_voltage || item.voltage_unbalance || 0),
                              borderColor: '#F59E0B',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 3,
                              pointBackgroundColor: '#F59E0B',
                            },
                            {
                              label: 'Desbalance de Corriente (%)',
                              data: inverterData.results.slice().reverse().map(item => item.max_current_unbalance_pct || item.current_unbalance_pct || item.unbalance_current || item.current_unbalance || 0),
                              borderColor: '#10B981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 3,
                              pointBackgroundColor: '#10B981',
                            },
                            {
                              label: 'Frecuencia Promedio (Hz)',
                              data: inverterData.results.slice().reverse().map(item => item.avg_frequency_hz || item.frequency_hz || item.frequency || item.freq || 0),
                              borderColor: '#8B5CF6',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              fill: false,
                              tension: 0.4,
                              pointRadius: 3,
                              borderDash: [6, 3],
                              pointBackgroundColor: '#8B5CF6',
                            }
                          ]
                        }}
                        options={{
                          ...CHART_OPTIONS,
                          plugins: {
                            ...CHART_OPTIONS.plugins,
                            title: { display: false },
                            legend: {
                              ...CHART_OPTIONS.plugins.legend,
                              position: 'top',
                              align: 'start'
                            }
                          }
                        }}
                        height="350px"
                        fullscreenHeight="700px"
                      />
                    </div>

                    {/* Gráfico de temperatura vs eficiencia */}
                    <div className="w-full">
                      <ChartCard
                        title="Análisis de Temperatura y Eficiencia"
                        description="Relación entre temperatura del inversor y eficiencia del sistema"
                        type="line"
                        data={{
                          labels: inverterData.results.slice().reverse().map(item => {
                            // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                            const rawDate = item.date;
                            // Crear fecha en zona horaria local para evitar desfase UTC
                            const localDate = new Date(rawDate + 'T00:00:00');
                            const formattedDate = localDate.toLocaleDateString('es-ES');
                            
                            return formattedDate;
                          }),
                          datasets: [
                            {
                              label: 'Temperatura Promedio (°C)',
                              data: inverterData.results.slice().reverse().map(item => item.avg_temperature_c || 0),
                              borderColor: '#EF4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 4,
                              pointBackgroundColor: '#EF4444',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                              yAxisID: 'y'
                            },
                            {
                              label: 'Eficiencia DC-AC (%)',
                              data: inverterData.results.slice().reverse().map(item => item.dc_ac_efficiency_pct || 0),
                              borderColor: '#10B981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              fill: false,
                              tension: 0.4,
                              pointRadius: 4,
                              borderDash: [8, 4],
                              pointBackgroundColor: '#10B981',
                              pointBorderColor: '#ffffff',
                              pointBorderWidth: 2,
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                        options={{
                          ...CHART_OPTIONS,
                          plugins: {
                            ...CHART_OPTIONS.plugins,
                            title: { display: false },
                            legend: {
                              ...CHART_OPTIONS.plugins.legend,
                              position: 'top',
                              align: 'start',
                              labels: {
                                ...CHART_OPTIONS.plugins.legend.labels,
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 13, weight: '600' }
                              }
                            }
                          },
                          scales: {
                            x: {
                              ...CHART_OPTIONS.scales.x,
                              grid: { display: true, color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
                              ticks: { color: '#6B7280', font: { size: 11, weight: '500' }, maxRotation: 45, minRotation: 0 },
                              border: { display: false }
                            },
                            y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
                              ticks: {
                                color: '#6B7280',
                                font: { size: 11, weight: '500' },
                                callback: (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)
                              },
                              border: { display: false }
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              grid: { drawOnChartArea: false },
                              ticks: {
                                color: '#6B7280',
                                font: { size: 11, weight: '500' },
                                callback: (value) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)
                              },
                              border: { display: false }
                            }
                          }
                        }}
                        height="400px"
                        fullscreenHeight="800px"
                      />
                    </div>
                  </div>
                </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tabla de Registros */}
      {hasData && (
        <section className="mb-6 lg:mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
            {/* Header de la sección de tabla */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
              <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl self-start lg:self-auto">
                  <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-white">Datos Históricos Detallados</h2>
                  <p className="text-red-100 mt-1 text-sm lg:text-base">Registros completos de indicadores de inversores por fecha</p>
                </div>
              </div>
            </div>
            
            {/* Contenido de la tabla */}
            <div className="p-3 lg:p-4 xl:p-6">
              {/* Tabla de datos moderna y responsive */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-3 lg:px-4 xl:px-6 py-3 lg:py-4 xl:py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base lg:text-lg xl:text-xl font-bold text-gray-800">Indicadores de Inversores Detallados</h3>
                        <p className="text-gray-600 mt-1 text-sm">Datos históricos y análisis de tendencias</p>
                        {/* Indicador de fechas por defecto */}
                        {filters.institutionId && !filters.startDate && !filters.endDate && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Últimos 10 días
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-3 lg:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-sm">
                        {totalItems} registros
                        {totalItems > 20 && totalPages > 0 && (
                          <span className="ml-2 text-xs opacity-90">
                            (página {currentPage} de {totalPages})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabla responsive con scroll horizontal */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gradient-to-r from-red-50 to-red-100">
                      <tr>
                        {[
                          { label: 'Fecha', width: 'w-20 lg:w-24 xl:w-32' },
                          { label: 'Inversor', width: 'w-24 lg:w-28 xl:w-36' },
                          { label: 'Energía Generada (kWh)', width: 'w-32 lg:w-36 xl:w-40' },
                          { label: 'Eficiencia DC-AC (%)', width: 'w-28 lg:w-32 xl:w-36' },
                          { label: 'Performance Ratio', width: 'w-28 lg:w-32 xl:w-36' },
                          { label: 'Factor de Potencia', width: 'w-24 lg:w-28 xl:w-32' },
                          { label: 'Temperatura (°C)', width: 'w-24 lg:w-28 xl:w-32' }
                        ].map((header) => (
                          <th key={header.label} className={`${header.width} px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-5 text-left text-xs font-bold text-red-700 uppercase tracking-wider border-b border-red-100`}>
                            {header.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                                          <tbody className="bg-white divide-y divide-gray-50">
                        {currentItems && Array.isArray(currentItems) && currentItems.length > 0 ? (
                        currentItems.map((item, index) => (
                          <tr key={startIndex + index} className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-200 border-b border-gray-50">
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">
                                {(() => {
                                  // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                                  const rawDate = item.date;
                                  const localDate = new Date(rawDate + 'T00:00:00');
                                  return localDate.toLocaleDateString('es-ES');
                                })()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  // 🔍 CORREGIR PROCESAMIENTO DE FECHAS PARA EVITAR DESFASE
                                  const rawDate = item.date;
                                  const localDate = new Date(rawDate + 'T00:00:00');
                                  return localDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                })()}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">{item.device_name || 'N/A'}</div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-semibold text-green-600">
                                {(item.total_generated_energy_kwh || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-xs lg:text-sm font-semibold text-gray-900">
                                  {(item.dc_ac_efficiency_pct || 0).toFixed(1)}%
                                </div>
                                <div className={`ml-2 w-2 h-2 rounded-full ${
                                  (item.dc_ac_efficiency_pct || 0) > 90 ? 'bg-green-500' : 
                                  (item.dc_ac_efficiency_pct || 0) > 80 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-semibold text-blue-600">
                                {(item.performance_ratio || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-xs lg:text-sm font-semibold text-gray-900">
                                  {(item.avg_power_factor || 0).toFixed(2)}
                                </div>
                                <div className={`ml-2 w-2 h-2 rounded-full ${
                                  (item.avg_power_factor || 0) > 0.95 ? 'bg-green-500' : 
                                  (item.avg_power_factor || 0) > 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 xl:py-4 whitespace-nowrap">
                              <div className="text-xs lg:text-sm font-semibold text-orange-600">
                                {(item.avg_temperature_c || 0).toFixed(1)}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-4 lg:px-6 py-8 lg:py-12 text-center">
                            <div className="flex flex-col items-center">
                              <svg className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400 mb-3 lg:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-base lg:text-lg font-medium text-gray-900 mb-1 lg:mb-2">No hay datos disponibles</p>
                              <p className="text-gray-500 text-sm lg:text-base mb-4">Selecciona una institución para ver los indicadores de inversores</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Paginación - Solo mostrar si hay más de 20 registros */}
                {totalItems > 20 && totalPages > 0 && (
                  <div className="px-3 lg:px-4 xl:px-6 py-4 lg:py-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      {/* Información de página */}
                      <div className="flex items-center text-sm text-gray-700">
                        <span className="font-medium">
                          Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} registros
                        </span>
                      </div>
                      
                      {/* Controles de paginación */}
                      <div className="flex items-center space-x-2">
                        {/* Botón Anterior */}
                        <button
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {/* Números de página */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                                  currentPage === pageNum
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Botón Siguiente */}
                        <button
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Overlay de transición */}
      <TransitionOverlay 
        show={showTransition}
        type={transitionType}
        message={transitionMessage}
        onClose={() => setShowTransition(false)}
      />
    </div>
  );
}

export default InverterDetails;