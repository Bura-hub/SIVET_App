import React, { useRef, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';

export function ChartCard({ title, type = "line", data, options }) {
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ChartComponent = type === "bar" ? Bar : Line;

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  return (
    <>
      <div className="bg-gray-100 p-6 rounded-xl shadow-md relative">
        <div className="absolute top-2 right-2 flex space-x-2">
          <button
            onClick={resetZoom}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            title="Resetear Zoom"
          >
            Reset
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="bg-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-400"
            title="Maximizar"
          >
            ⛶
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="chart-container h-64">
          <ChartComponent ref={chartRef} data={data} options={options} />
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-11/12 h-5/6 relative">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
            <ChartComponent ref={chartRef} data={data} options={options} />
          </div>
        </div>
      )}
    </>
  );
}