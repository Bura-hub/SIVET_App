import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('electricidad'); // Fuente por defecto
  const [days, setDays] = useState(30); // Rango de días por defecto

  useEffect(() => {
    const fetchIndicators = async () => {
      setLoading(true);
      setError(null);
      try {
        // La URL usa el proxy configurado en package.json
        const response = await fetch(`/api/indicators/by-source-and-range/?source=${source}&days=${days}`);
        if (!response.ok) {
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

    fetchIndicators();
  }, [source, days]); // Dependencias: re-ejecutar cuando source o days cambien

  // Preparar los datos para Chart.js
  const chartData = {
    labels: data.map(item => new Date(item.timestamp).toLocaleDateString('es-ES')),
    datasets: [
      {
        label: `${source.charAt(0).toUpperCase() + source.slice(1)} (${data.length > 0 ? data[0].unit : ''})`,
        data: data.map(item => item.value),
        borderColor: '#3B82F6', // Color azul de Tailwind
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3B82F6',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Importante para que el gráfico respete el tamaño del contenedor
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Indicadores de ${source.charAt(0).toUpperCase() + source.slice(1)} (Últimos ${days} días)`,
      },
      tooltip: {
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
        title: {
          display: true,
          text: 'Fecha',
        },
      },
      y: {
        grid: {
          color: 'rgba(200, 200, 200, 0.2)',
        },
        title: {
          display: true,
          text: 'Valor',
        },
      },
    },
  };

  return (
    <div className="App p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Dashboard de Indicadores</h1>

      <div className="flex justify-center space-x-4 mb-8">
        <select
          className="p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="electricidad">Electricidad</option>
          <option value="inversor">Inversor</option>
          <option value="meteorologica">Meteorológica</option>
        </select>

        <select
          className="p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
        >
          <option value={7}>Últimos 7 días</option>
          <option value={30}>Últimos 30 días</option>
          <option value={90}>Últimos 90 días</option>
          <option value={365}>Últimos 365 días</option>
        </select>
      </div>

      {loading && <p className="text-center text-gray-600">Cargando datos...</p>}
      {error && <p className="text-center text-red-500">Error: {error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="text-center text-gray-600">No hay datos disponibles para la selección actual.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="chart-container bg-white p-6 rounded-lg shadow-lg mx-auto">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}

export default App;