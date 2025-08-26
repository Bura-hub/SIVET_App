import React, { useState, useEffect } from 'react';
import { KpiCard } from "./KPI/KpiCard";
import { ChartCard } from "./KPI/ChartCard";
import TransitionOverlay from './TransitionOverlay';
import { buildApiUrl, getDefaultFetchOptions } from '../utils/apiConfig';

// Componente para datos externos de energía
const ExternalEnergyData = () => {
  const [loading, setLoading] = useState(true);
  const [energyData, setEnergyData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [savingsData, setSavingsData] = useState(null);
  const [error, setError] = useState(null);

  // Estados para las diferentes pestañas
  const [activeTab, setActiveTab] = useState('prices');
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    fetchExternalEnergyData();
  }, [dateRange]);

  const fetchExternalEnergyData = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      const options = getDefaultFetchOptions(authToken);
      
      // Obtener datos de precios de energía
      const pricesResponse = await fetch(
        buildApiUrl('/api/external-energy/prices/', { range: dateRange }),
        options
      );
      
      if (!pricesResponse.ok) {
        throw new Error('Error al obtener precios de energía');
      }
      
      const pricesData = await pricesResponse.json();
      
      // Obtener datos de ahorro calculado
      const savingsResponse = await fetch(
        buildApiUrl('/api/external-energy/savings/', { range: dateRange }),
        options
      );
      
      if (!savingsResponse.ok) {
        throw new Error('Error al obtener datos de ahorro');
      }
      
      const savingsData = await savingsResponse.json();
      
      setEnergyData(pricesData);
      setPriceHistory(pricesData.price_history || []);
      setSavingsData(savingsData);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching external energy data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatEnergy = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return `${Number(value).toFixed(2)} kWh`;
  };

  const calculateSavingsPercentage = (generated, consumed, price) => {
    if (consumed === 0 || !generated || !consumed || !price) return 0;
    const savings = (generated * price) / (consumed * price) * 100;
    return Math.min(savings, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Cargando datos de energía...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-red-200/50 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Error al cargar datos</h3>
                <p className="text-gray-600 mt-1">No se pudieron obtener los datos de energía externa</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-6 border border-red-100 mb-6">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={fetchExternalEnergyData}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header mejorado */}
        <div className="mb-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-8">
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Datos Externos de Energía</h1>
                  <p className="text-blue-100 text-lg">Análisis avanzado de precios, ahorros y mercado energético</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                      🌍 Pasto, Nariño, Colombia
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                      ⚡ Datos en tiempo real
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de rango de fechas mejorado */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Período de Análisis</h3>
              <div className="text-sm text-gray-500">Selecciona el rango de fechas para analizar</div>
            </div>
            <div className="flex space-x-3">
              {[
                { key: 'week', label: 'Semana', icon: '📅' },
                { key: 'month', label: 'Mes', icon: '📊' },
                { key: 'quarter', label: 'Trimestre', icon: '📈' },
                { key: 'year', label: 'Año', icon: '🎯' }
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setDateRange(range.key)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    dateRange === range.key
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md border border-gray-200'
                  }`}
                >
                  <span className="text-lg">{range.icon}</span>
                  <span>{range.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs principales mejorados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">💰</div>
              <div className="text-blue-100 text-sm">COP/kWh</div>
            </div>
            <div className="text-2xl font-bold mb-1">
              {energyData?.average_price ? formatCurrency(energyData.average_price) : 'N/A'}
            </div>
            <div className="text-blue-100 text-sm">Precio Promedio</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">💚</div>
              <div className="text-green-100 text-sm">COP</div>
            </div>
            <div className="text-2xl font-bold mb-1">
              {savingsData?.total_savings ? formatCurrency(savingsData.total_savings) : 'N/A'}
            </div>
            <div className="text-green-100 text-sm">Ahorro Total</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">☀️</div>
              <div className="text-orange-100 text-sm">kWh</div>
            </div>
            <div className="text-2xl font-bold mb-1">
              {savingsData?.total_generated ? formatEnergy(savingsData.total_generated) : 'N/A'}
            </div>
            <div className="text-orange-100 text-sm">Energía Generada</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">📊</div>
              <div className="text-purple-100 text-sm">%</div>
            </div>
            <div className="text-2xl font-bold mb-1">
              {savingsData?.savings_percentage ? `${Number(savingsData.savings_percentage).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-purple-100 text-sm">Porcentaje de Ahorro</div>
          </div>
        </div>

        {/* Tabs de navegación mejorados */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
            <nav className="flex">
              {[
                { id: 'prices', name: 'Precios de Energía', icon: '💰', color: 'blue' },
                { id: 'savings', name: 'Análisis de Ahorro', icon: '💚', color: 'green' },
                { id: 'comparison', name: 'Comparación', icon: '⚖️', color: 'purple' },
                { id: 'forecast', name: 'Pronóstico', icon: '🔮', color: 'indigo' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenido de las pestañas mejorado */}
        <div className="space-y-8">
          {/* Pestaña de Precios */}
          {activeTab === 'prices' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <ChartCard
                  title="Historial de Precios de Energía"
                  type="line"
                  data={{
                    labels: priceHistory.map(item => item.date),
                    datasets: [{
                      label: 'Precio COP/kWh',
                      data: priceHistory.map(item => item.price),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      borderWidth: 3,
                      pointBackgroundColor: 'rgb(59, 130, 246)',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 6,
                      pointHoverRadius: 8
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Precio (COP/kWh)',
                          font: {
                            size: 14,
                            weight: '600'
                          }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  Información de Precios
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
                    <span className="text-gray-700 font-medium">Precio más alto:</span>
                    <span className="font-bold text-red-600 text-lg">
                      {energyData?.max_price ? formatCurrency(energyData.max_price) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="text-gray-700 font-medium">Precio más bajo:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {energyData?.min_price ? formatCurrency(energyData.min_price) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-gray-700 font-medium">Variación:</span>
                    <span className={`font-bold text-lg ${
                      energyData?.price_variation > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {energyData?.price_variation ? `${energyData.price_variation > 0 ? '+' : ''}${Number(energyData.price_variation).toFixed(2)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Ahorro */}
          {activeTab === 'savings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <ChartCard
                  title="Ahorro Mensual"
                  type="bar"
                  data={{
                    labels: savingsData?.monthly_savings?.map(item => item.month) || [],
                    datasets: [{
                      label: 'Ahorro (COP)',
                      data: savingsData?.monthly_savings?.map(item => item.savings) || [],
                      backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      borderColor: 'rgb(34, 197, 94)',
                      borderWidth: 2,
                      borderRadius: 8,
                      borderSkipped: false
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Ahorro (COP)',
                          font: {
                            size: 14,
                            weight: '600'
                          }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">💚</span>
                  Resumen de Ahorro
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-700 font-medium">Energía consumida:</span>
                    <span className="font-bold text-gray-900 text-lg">
                      {savingsData?.total_consumed ? formatEnergy(savingsData.total_consumed) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="text-gray-700 font-medium">Energía generada:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {savingsData?.total_generated ? formatEnergy(savingsData.total_generated) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-gray-700 font-medium">Costo evitado:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {savingsData?.avoided_cost ? formatCurrency(savingsData.avoided_cost) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="text-gray-700 font-medium">ROI estimado:</span>
                    <span className="font-bold text-purple-600 text-lg">
                      {savingsData?.roi ? `${Number(savingsData.roi).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Comparación */}
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <ChartCard
                  title="Comparación: Consumo vs Generación"
                  type="doughnut"
                  data={{
                    labels: ['Energía Consumida', 'Energía Generada'],
                    datasets: [{
                      data: [
                        savingsData?.total_consumed || 0,
                        savingsData?.total_generated || 0
                      ],
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                      ],
                      borderColor: [
                        'rgb(239, 68, 68)',
                        'rgb(34, 197, 94)'
                      ],
                      borderWidth: 3,
                      hoverOffset: 4
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          font: {
                            size: 14,
                            weight: '600'
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">⚖️</span>
                  Análisis de Eficiencia
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100">
                    <span className="text-gray-700 font-medium">Autoconsumo:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {savingsData?.self_consumption ? `${Number(savingsData.self_consumption).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-gray-700 font-medium">Excedentes:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {savingsData?.excess_energy ? formatEnergy(savingsData.excess_energy) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="text-gray-700 font-medium">Factor de capacidad:</span>
                    <span className="font-bold text-purple-600 text-lg">
                      {savingsData?.capacity_factor ? `${Number(savingsData.capacity_factor).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Pronóstico */}
          {activeTab === 'forecast' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <ChartCard
                  title="Pronóstico de Precios (Próximos 30 días)"
                  type="line"
                  data={{
                    labels: energyData?.price_forecast?.map(item => item.date) || [],
                    datasets: [{
                      label: 'Precio Pronosticado',
                      data: energyData?.price_forecast?.map(item => item.price) || [],
                      borderColor: 'rgb(168, 85, 247)',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      borderDash: [5, 5],
                      tension: 0.4,
                      borderWidth: 3,
                      pointBackgroundColor: 'rgb(168, 85, 247)',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 6,
                      pointHoverRadius: 8
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Precio (COP/kWh)',
                          font: {
                            size: 14,
                            weight: '600'
                          }
                        },
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="text-2xl mr-3">🔮</span>
                  Recomendaciones
                </h3>
                <div className="space-y-6">
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">📈</span>
                      Tendencias de Precios
                    </h4>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      {energyData?.price_trend === 'increasing' 
                        ? 'Los precios muestran tendencia alcista. Considere aumentar el autoconsumo y optimizar el uso de energía durante las horas de menor costo.'
                        : energyData?.price_trend === 'decreasing'
                        ? 'Los precios muestran tendencia bajista. Puede ser momento de vender excedentes y aprovechar los precios favorables.'
                        : 'Los precios se mantienen estables. Continúe con su estrategia actual de consumo y generación.'}
                    </p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">💡</span>
                      Optimización
                    </h4>
                    <p className="text-green-800 text-sm leading-relaxed">
                      Basado en el análisis actual, se recomienda optimizar el consumo en horas pico,
                      maximizar el uso de energía generada durante el día y considerar el almacenamiento
                      de excedentes para uso nocturno.
                    </p>
                  </div>
                  
                  <div className="p-5 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">⚠️</span>
                      Alertas
                    </h4>
                    <p className="text-yellow-800 text-sm leading-relaxed">
                      {energyData?.alerts?.length > 0 
                        ? energyData.alerts.join(', ')
                        : 'No hay alertas activas en este momento. El sistema está funcionando de manera óptima.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalEnergyData;
