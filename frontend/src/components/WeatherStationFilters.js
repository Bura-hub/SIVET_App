import React, { useState, useEffect } from 'react';
import { ENDPOINTS, getDefaultFetchOptions } from '../utils/apiConfig';

const WeatherStationFilters = ({ onFiltersChange, authToken }) => {
  const [timeRange, setTimeRange] = useState('daily');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  
  // Calcular fechas por defecto: 10 días atrás hasta hoy
  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  
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
      setSelectedDevice('');
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
      const response = await fetch(ENDPOINTS.electrical.institutions, {
        ...getDefaultFetchOptions(authToken)
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      setInstitutions(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching institutions:', error);
      setInstitutions([]);
    }
  };
  
  const fetchDevices = async (institutionId) => {
    setLoading(true);
    try {
      const url = `${ENDPOINTS.weather.stations}?institution_id=${institutionId}`;
      const response = await fetch(url, {
        ...getDefaultFetchOptions(authToken)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      setDevices(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching weather stations:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Botón de período de tiempo */}
        <button 
          className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
          onClick={() => setTimeRange(timeRange === 'daily' ? 'monthly' : 'daily')}
        >
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" />
            <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {timeRange === 'daily' ? 'Diario' : 'Mensual'}
        </button>
        
        {/* Selector de institución */}
        <select 
          className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
          value={selectedInstitution}
          onChange={(e) => setSelectedInstitution(e.target.value)}
        >
          <option value="">Seleccionar Institución</option>
          {institutions.map(inst => (
            <option key={inst.id} value={inst.id}>{inst.name}</option>
          ))}
        </select>

        {/* Selector de estación */}
        <select 
          className="flex items-center bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:from-orange-100 hover:to-amber-100 transition-all duration-200"
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          disabled={!selectedInstitution || loading}
        >
          <option value="">Todas las Estaciones</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>{device.name}</option>
          ))}
        </select>

        {/* Fecha de inicio */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Fecha Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fecha de fin */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Fecha Fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default WeatherStationFilters;
