import React, { useRef, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';

// Componente reutilizable que renderiza una tarjeta con un gráfico (línea o barras),
// permite resetear el zoom del gráfico y expandirlo a pantalla completa.
export function ChartCard({ title, type = "line", data, options }) {
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selección dinámica del tipo de gráfico: línea o barras
  const ChartComponent = type === "bar" ? Bar : Line;

  // Función para resetear el zoom del gráfico utilizando la referencia
  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  // Iconos SVG modernos
  const ResetIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  const MaximizeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

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
          minRotation: 0
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

  return (
    <>
      {/* Contenedor principal de la tarjeta del gráfico */}
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
        {/* Header elegante con título y controles */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
              {title}
            </h3>
            
            {/* Botones de acciones con diseño mejorado */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={resetZoom}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105 group/btn"
                title="Resetear Zoom"
              >
                <ResetIcon />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Resetear
                </span>
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 group/btn"
                title="Maximizar"
              >
                <MaximizeIcon />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Maximizar
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor del gráfico con padding y altura definida */}
        <div className="p-6">
          <div className="chart-container h-64 relative">
            <ChartComponent ref={chartRef} data={data} options={options} />
            
            {/* Overlay sutil para indicar interactividad */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/20 pointer-events-none group-hover:to-gray-50/10 transition-all duration-300 rounded-lg"></div>
          </div>
        </div>

        {/* Indicador de interactividad en la parte inferior */}
        <div className="px-6 pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center text-xs text-gray-500 space-x-4">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Zoom con rueda
            </span>
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Arrastrar para mover
            </span>
          </div>
        </div>
      </div>

      {/* Vista de gráfico en pantalla completa mejorada */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 h-5/6 max-w-7xl relative overflow-hidden">
            {/* Header del modal con diseño elegante */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-3"></div>
                  {title}
                </h3>
                
                {/* Controles del modal */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={resetZoom}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
                    title="Resetear Zoom"
                  >
                    <ResetIcon />
                  </button>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 text-white/70 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-105"
                    title="Cerrar"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 h-full">
              <div className="chart-container h-full">
                <ChartComponent ref={chartRef} data={data} options={options} />
              </div>
            </div>

            {/* Indicador de controles en la parte inferior */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-6">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Zoom con rueda del mouse
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Arrastrar para mover
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}