import React, { useState, useEffect } from 'react';

const ElectricMeterFilters = ({ onFiltersChange, authToken }) => {
  const [timeRange, setTimeRange] = useState('daily');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar instituciones al montar el componente
  useEffect(() => {
    fetchInstitutions();
  }, []);

  // Cargar dispositivos cuando cambie la institución
  useEffect(() => {
    if (selectedInstitution) {
      fetchDevices(selectedInstitution);
    } else {
      setDevices([]);
    }
  }, [selectedInstitution]);

  // Notificar cambios en los filtros
  useEffect(() => {
    onFiltersChange({
      timeRange,
      institutionId: selectedInstitution,
      deviceId: selectedDevice,
      startDate,
      endDate
    });
  }, [timeRange, selectedInstitution, selectedDevice, startDate, endDate, onFiltersChange]);

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/institutions/', {
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      // Espera formato: [{id, name}]
      setInstitutions(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching institutions:', error);
      setInstitutions([]);
    }
  };
  
  const fetchDevices = async (institutionId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/electric-meters/list/?institution_id=${institutionId}`, {
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      // Backend devuelve { devices: [ { scada_id, name, ... } ], total_count }
      const parsed = Array.isArray(data) ? data : (data.devices || []);
      setDevices(parsed);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      {/* Filtro de rango de tiempo */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Rango de Tiempo</label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="daily">Diario</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>

      {/* Filtro de institución */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Institución</label>
        <select
          value={selectedInstitution}
          onChange={(e) => {
            setSelectedInstitution(e.target.value);
            setSelectedDevice(''); // Reset device when institution changes
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar institución</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de dispositivo */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Medidor</label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={!selectedInstitution || loading}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Todos los medidores</option>
          {devices.map((device) => (
            <option key={device.scada_id} value={device.scada_id}>
              {device.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de fecha de inicio */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filtro de fecha de fin */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-2 focus:border-transparent"
        />
      </div>

      {/* Indicador de carga */}
      {loading && (
        <div className="flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Cargando medidores...
        </div>
      )}
    </div>
  );
};

export default ElectricMeterFilters;
