// Importaciones necesarias de React y componentes personalizados
import React, { useState, useEffect, useRef } from 'react';
import TransitionOverlay from './TransitionOverlay';
import { formatDateForAPI, getCurrentDateISO } from '../utils/dateUtils';
import { ENDPOINTS, buildApiUrl, getDefaultFetchOptions, handleApiResponse } from '../utils/apiConfig';

function ExportReports({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
 
  // Estados para datos de la API
  const [institutions, setInstitutions] = useState([]);
  const [electricMeters, setElectricMeters] = useState([]);
  const [inverters, setInverters] = useState([]);
  const [weatherStations, setWeatherStations] = useState([]);
  const [deviceCategories, setDeviceCategories] = useState([]);

  // Estados para el formulario de generación de reportes
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [reportType, setReportType] = useState('');
  const [timeRange, setTimeRange] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('CSV');

  // Estados para la animación de transición
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState('info');
  const [transitionMessage, setTransitionMessage] = useState('');

  // Estados para reportes previos
  const [previousExports, setPreviousExports] = useState([]);
  const [loadingExports, setLoadingExports] = useState(false);

  // Definir categorías de dispositivos disponibles
  const availableCategories = [
    { id: 'electricMeter', name: 'Medidores Eléctricos', description: 'Reportes de consumo, demanda y calidad eléctrica' },
    { id: 'inverter', name: 'Inversores', description: 'Reportes de generación, eficiencia y rendimiento fotovoltaico' },
    { id: 'weatherStation', name: 'Estaciones Meteorológicas', description: 'Reportes climáticos y condiciones ambientales' }
  ];

  // Definir tipos de reportes por categoría
  const reportTypesByCategory = {
    electricMeter: [
      { id: 'consumption_summary', name: 'Resumen de Consumo', description: 'Consumo energético total y por períodos' },
      { id: 'demand_analysis', name: 'Análisis de Demanda', description: 'Demanda pico, promedio y factor de carga' },
      { id: 'power_quality', name: 'Calidad de Potencia', description: 'THD, factor de potencia y desbalance' },
      { id: 'energy_balance', name: 'Balance Energético', description: 'Energía importada vs exportada' },
      { id: 'comprehensive', name: 'Reporte Integral', description: 'Todos los indicadores eléctricos' }
    ],
    inverter: [
      { id: 'generation_summary', name: 'Resumen de Generación', description: 'Energía total generada y eficiencia' },
      { id: 'performance_analysis', name: 'Análisis de Rendimiento', description: 'Performance Ratio y curvas de generación' },
      { id: 'operational_metrics', name: 'Métricas Operativas', description: 'Factor de potencia y estabilidad' },
      { id: 'anomaly_report', name: 'Reporte de Anomalías', description: 'Detección y análisis de anomalías' },
      { id: 'comprehensive', name: 'Reporte Integral', description: 'Todos los indicadores de inversores' }
    ],
    weatherStation: [
      { id: 'climate_summary', name: 'Resumen Climático', description: 'Temperatura, humedad y precipitación' },
      { id: 'solar_analysis', name: 'Análisis Solar', description: 'Irradiancia y horas solares pico' },
      { id: 'wind_analysis', name: 'Análisis de Viento', description: 'Velocidad y dirección del viento' },
      { id: 'environmental_impact', name: 'Impacto Ambiental', description: 'Condiciones para generación fotovoltaica' },
      { id: 'comprehensive', name: 'Reporte Integral', description: 'Todos los indicadores meteorológicos' }
    ]
  };

  // Inicializar fechas con valores por defecto en zona horaria de Colombia
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(formatDateForAPI(firstDayOfMonth));
    setEndDate(formatDateForAPI(today));
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (authToken) {
      loadInstitutions();
      loadPreviousExports();
    }
  }, [authToken]);

  // Cargar dispositivos cuando cambie la institución o categoría
  useEffect(() => {
    if (selectedInstitution && selectedCategory) {
      loadDevices();
    } else {
      setElectricMeters([]);
      setInverters([]);
      setWeatherStations([]);
    }
  }, [selectedInstitution, selectedCategory]);

  // Cargar instituciones disponibles
  const loadInstitutions = async () => {
    try {
      const response = await fetch(buildApiUrl(ENDPOINTS.electrical.institutions), {
        ...getDefaultFetchOptions(authToken)
      });
      const data = await handleApiResponse(response);
      setInstitutions(data);
    } catch (error) {
      console.error('Error cargando instituciones:', error);
      setError('Error al cargar instituciones');
    }
  };

  // Cargar dispositivos según la categoría seleccionada
  const loadDevices = async () => {
    if (!selectedInstitution || !selectedCategory) return;

    try {
      let endpoint;
      let setterFunction;

      switch (selectedCategory) {
        case 'electricMeter':
          endpoint = ENDPOINTS.electrical.devices;
          setterFunction = setElectricMeters;
          break;
        case 'inverter':
          endpoint = ENDPOINTS.inverters.list;
          setterFunction = setInverters;
          break;
        case 'weatherStation':
          endpoint = ENDPOINTS.weather.stations;
          setterFunction = setWeatherStations;
          break;
        default:
          return;
      }

      const response = await fetch(buildApiUrl(endpoint, { institution_id: selectedInstitution }), {
        ...getDefaultFetchOptions(authToken)
      });
      const data = await handleApiResponse(response);
      
      // Adaptar la respuesta según el endpoint
      if (selectedCategory === 'weatherStation') {
        setterFunction(data.results || []);
      } else {
        setterFunction(data.devices || []);
      }
    } catch (error) {
      console.error('Error cargando dispositivos:', error);
      setError('Error al cargar dispositivos');
    }
  };

  // Cargar reportes previos
  const loadPreviousExports = async () => {
    setLoadingExports(true);
    try {
      // Llamada real a la API para obtener historial de reportes
      const response = await fetch(buildApiUrl(ENDPOINTS.reports.history), {
        ...getDefaultFetchOptions(authToken)
      });

      if (!response.ok) {
        throw new Error('Error al cargar historial de reportes');
      }

      const data = await response.json();
      
      // Transformar datos de la API al formato esperado por el componente
      const transformedExports = data.results.map(report => ({
        id: report.id,
        type: report.report_type,
        category: report.category === 'electricMeter' ? 'Medidores Eléctricos' :
                  report.category === 'inverter' ? 'Inversores' :
                  report.category === 'weatherStation' ? 'Estaciones Meteorológicas' : report.category,
        institution: report.institution_name,
        date: new Date(report.created_at).toLocaleString('es-CO'),
        format: report.format,
        status: report.status === 'completed' ? 'Completed' :
                report.status === 'failed' ? 'Failed' :
                report.status === 'processing' ? 'Processing' : 'Pending',
        fileSize: report.file_size || 'N/A',
        recordCount: report.record_count || 0
      }));
      
      setPreviousExports(transformedExports);
      
    } catch (error) {
      console.error('Error cargando reportes previos:', error);
      // En caso de error, mostrar lista vacía
      setPreviousExports([]);
    } finally {
      setLoadingExports(false);
    }
  };

  // Validar formulario antes de exportar
  const validateForm = () => {
    if (!selectedInstitution) {
      setError('Debe seleccionar una institución');
      return false;
    }
    if (!selectedCategory) {
      setError('Debe seleccionar una categoría de dispositivo');
      return false;
    }
    if (selectedDevices.length === 0) {
      setError('Debe seleccionar al menos un dispositivo');
      return false;
    }
    if (!reportType) {
      setError('Debe seleccionar un tipo de reporte');
      return false;
    }
    if (!startDate || !endDate) {
      setError('Debe especificar fechas de inicio y fin');
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin');
      return false;
    }
    return true;
  };

  // Generar y exportar reporte
  const handleExport = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setExportProgress(0);
    setError(null);

    try {
      // Llamada real a la API para generar reporte
      const response = await fetch(buildApiUrl(ENDPOINTS.reports.generate), {
        method: 'POST',
        ...getDefaultFetchOptions(authToken),
        body: JSON.stringify({
          institution_id: parseInt(selectedInstitution),
          category: selectedCategory,
          devices: selectedDevices,
          report_type: reportType,
          time_range: timeRange,
          start_date: startDate,
          end_date: endDate,
          format: exportFormat
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al generar el reporte');
      }

      const result = await response.json();
      
      if (result.success) {
        // Mostrar mensaje de éxito
        showTransitionAnimation('success', `Generación de reporte iniciada exitosamente!`, 3000);
        
        // Iniciar monitoreo del estado
        monitorReportStatus(result.task_id);
        
        // Agregar a la lista de reportes previos
        const newExport = {
          id: result.task_id,
          type: reportType,
          category: availableCategories.find(cat => cat.id === selectedCategory)?.name,
          institution: institutions.find(inst => inst.id.toString() === selectedInstitution)?.name,
          date: new Date().toLocaleString('es-CO'),
          format: exportFormat,
          status: 'Pending',
          fileSize: 'Generando...',
          recordCount: 0
        };
        setPreviousExports(prev => [newExport, ...prev]);
      } else {
        throw new Error(result.message || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error en la exportación:', error);
      setError(error.message || 'Error al generar el reporte');
      setLoading(false);
      setExportProgress(0);
    }
  };

  // Monitorear el estado de generación del reporte
  const monitorReportStatus = async (taskId) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(buildApiUrl(ENDPOINTS.reports.status, { task_id: taskId }), {
          ...getDefaultFetchOptions(authToken)
        });

        if (!response.ok) {
          throw new Error('Error al consultar estado del reporte');
        }

        const statusInfo = await response.json();
        
        // Actualizar progreso
        setExportProgress(statusInfo.progress);
        
        if (statusInfo.status === 'completed') {
          // Reporte completado
          setLoading(false);
          setExportProgress(100);
          
          // Descargar archivo automáticamente
          downloadReport(taskId);
          
          // Actualizar estado en la lista
          setPreviousExports(prev => prev.map(exp => 
            exp.id === taskId 
              ? { ...exp, status: 'Completed', fileSize: 'Descargando...', recordCount: statusInfo.record_count || 0 }
              : exp
          ));
          
          showTransitionAnimation('success', `Reporte "${reportType}" generado exitosamente!`, 3000);
          
        } else if (statusInfo.status === 'failed') {
          // Reporte falló
          setLoading(false);
          setExportProgress(0);
          setError(`Error al generar reporte: ${statusInfo.error}`);
          
          // Actualizar estado en la lista
          setPreviousExports(prev => prev.map(exp => 
            exp.id === taskId 
              ? { ...exp, status: 'Failed', fileSize: 'Error', recordCount: 0 }
              : exp
          ));
          
        } else if (statusInfo.status === 'processing') {
          // Reporte en proceso, continuar monitoreando
          setTimeout(checkStatus, 2000);
        }
        
      } catch (error) {
        console.error('Error monitoreando estado:', error);
        // Reintentar en 5 segundos
        setTimeout(checkStatus, 5000);
      }
    };

    // Iniciar monitoreo
    checkStatus();
  };

  // Descargar reporte generado
  const downloadReport = async (taskId) => {
    try {
      const response = await fetch(buildApiUrl(ENDPOINTS.reports.download, { task_id: taskId }), {
        ...getDefaultFetchOptions(authToken)
      });

      if (!response.ok) {
        throw new Error('Error al descargar el reporte');
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${reportType.replace(/ /g, '_')}_${startDate}_${endDate}.${exportFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Actualizar estado en la lista
      setPreviousExports(prev => prev.map(exp => 
        exp.id === taskId 
          ? { ...exp, fileSize: `${(blob.size / 1024 / 1024).toFixed(1)} MB` }
          : exp
      ));
      
    } catch (error) {
      console.error('Error descargando reporte:', error);
      setError('Error al descargar el reporte generado');
    }
  };

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

  // Limpiar selección de dispositivos cuando cambie la categoría
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedDevices([]);
    setReportType('');
  };

  // Obtener dispositivos disponibles según la categoría
  const getAvailableDevices = () => {
    switch (selectedCategory) {
      case 'electricMeter':
        return electricMeters;
      case 'inverter':
        return inverters;
      case 'weatherStation':
        return weatherStations;
      default:
        return [];
    }
  };

  // Obtener tipos de reporte disponibles según la categoría
  const getAvailableReportTypes = () => {
    return reportTypesByCategory[selectedCategory] || [];
  };

  // Regenerar reporte
  const regenerateReport = async (exportItem) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl(ENDPOINTS.reports.generate), {
        method: 'POST',
        ...getDefaultFetchOptions(authToken),
        body: JSON.stringify({
          institution_id: parseInt(selectedInstitution),
          category: exportItem.category,
          devices: selectedDevices, // Assuming selectedDevices is available or can be re-fetched
          report_type: exportItem.type,
          time_range: timeRange,
          start_date: startDate,
          end_date: endDate,
          format: exportFormat
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al regenerar el reporte');
      }

      const result = await response.json();

      if (result.success) {
        showTransitionAnimation('success', `Generación de reporte iniciada exitosamente!`, 3000);
        monitorReportStatus(result.task_id);
        const newExport = {
          id: result.task_id,
          type: exportItem.type,
          category: exportItem.category,
          institution: exportItem.institution,
          date: new Date().toLocaleString('es-CO'),
          format: exportFormat,
          status: 'Pending',
          fileSize: 'Generando...',
          recordCount: 0
        };
        setPreviousExports(prev => [newExport, ...prev]);
      } else {
        throw new Error(result.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error al regenerar reporte:', error);
      setError(error.message || 'Error al regenerar el reporte');
      setLoading(false);
    }
  };

  // Eliminar reporte
  const deleteReport = async (taskId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este reporte? Esta acción no se puede deshacer.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl(ENDPOINTS.reports.delete, { task_id: taskId }), {
        method: 'DELETE',
        ...getDefaultFetchOptions(authToken)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar el reporte');
      }

      setPreviousExports(prev => prev.filter(exp => exp.id !== taskId));
      showTransitionAnimation('success', 'Reporte eliminado exitosamente!');
    } catch (error) {
      console.error('Error al eliminar reporte:', error);
      setError(error.message || 'Error al eliminar el reporte');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex p-8 justify-between items-center bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 -mx-8 -mt-8">
        <div>
          <h1 className="text-3xl font-bold">Exportar Reportes</h1>
          <p className="text-blue-100 mt-2">Genera reportes profesionales de todos tus dispositivos</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Aviso estático para el generador de reportes */}
          <div className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generador Profesional
          </div>
          
          {/* Aviso estático para formatos disponibles */}
          <div className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-full text-sm font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV • PDF • Excel
          </div>
        </div>
      </header>

      {/* Mensaje de error */}
      {error && (
        <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Generate New Report Section */}
      <section className="mx-8 mt-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <svg className="w-7 h-7 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Generar Nuevo Reporte
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Filtros principales */}
          <div className="space-y-6">
            {/* Institución */}
            <div>
              <label htmlFor="institution" className="block text-sm font-semibold text-gray-700 mb-2">
                Institución <span className="text-red-500">*</span>
              </label>
              <select
                id="institution"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setSelectedCategory('');
                  setSelectedDevices([]);
                  setReportType('');
                }}
              >
                <option value="">Seleccionar institución</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            {/* Categoría de Dispositivo */}
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría de Dispositivo <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={!selectedInstitution}
              >
                <option value="">Seleccionar categoría</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {selectedCategory && (
                <p className="mt-2 text-sm text-gray-600">
                  {availableCategories.find(cat => cat.id === selectedCategory)?.description}
                </p>
              )}
            </div>

            {/* Dispositivos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dispositivos <span className="text-red-500">*</span>
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {getAvailableDevices().length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {selectedCategory ? 'No hay dispositivos disponibles' : 'Seleccione una categoría primero'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getAvailableDevices().map(device => (
                      <label key={device.id || device.scada_id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedDevices.includes(device.id || device.scada_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevices(prev => [...prev, device.id || device.scada_id]);
                            } else {
                              setSelectedDevices(prev => prev.filter(id => id !== (device.id || device.scada_id)));
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{device.name}</span>
                        {device.status && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {device.status}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedDevices.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedDevices.length} dispositivo(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Columna derecha - Configuración del reporte */}
          <div className="space-y-6">
            {/* Tipo de Reporte */}
            <div>
              <label htmlFor="reportType" className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Reporte <span className="text-red-500">*</span>
              </label>
              <select
                id="reportType"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={!selectedCategory}
              >
                <option value="">Seleccionar tipo de reporte</option>
                {getAvailableReportTypes().map(type => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
              {reportType && (
                <p className="mt-2 text-sm text-gray-600">
                  {getAvailableReportTypes().find(type => type.name === reportType)?.description}
                </p>
              )}
            </div>

            {/* Rango de Tiempo */}
            <div>
              <label htmlFor="timeRange" className="block text-sm font-semibold text-gray-700 mb-2">
                Rango de Tiempo
              </label>
              <select
                id="timeRange"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="daily">Diario</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Formato de Exportación */}
            <div>
              <label htmlFor="exportFormat" className="block text-sm font-semibold text-gray-700 mb-2">
                Formato de Exportación
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['CSV', 'PDF', 'Excel'].map(format => (
                  <label key={format} className="flex items-center justify-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format}
                      checked={exportFormat === format}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`text-center ${exportFormat === format ? 'text-blue-600' : 'text-gray-600'}`}>
                      <div className={`text-lg font-semibold ${exportFormat === format ? 'text-blue-600' : 'text-gray-600'}`}>
                        {format}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format === 'CSV' ? 'Datos tabulares' : format === 'PDF' ? 'Documento' : 'Hoja de cálculo'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        {loading && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Generando reporte...</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Botón de Exportación */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleExport}
            disabled={loading || !selectedInstitution || !selectedCategory || selectedDevices.length === 0 || !reportType}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-semibold text-lg shadow-lg"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando Reporte...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generar y Exportar Reporte
              </div>
            )}
          </button>
        </div>
      </section>

      {/* Previous Exports Section */}
      <section className="mx-8 mt-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <svg className="w-7 h-7 mr-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Reportes Generados
        </h2>
        
        {loadingExports ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Tipo de Reporte
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Categoría
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Institución
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Formato
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Detalles
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previousExports.map((exportItem) => (
                  <tr key={exportItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{exportItem.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{exportItem.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{exportItem.institution}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{exportItem.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        exportItem.format === 'CSV' ? 'bg-green-100 text-green-800' :
                        exportItem.format === 'PDF' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {exportItem.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        exportItem.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {exportItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{exportItem.fileSize}</div>
                      <div>{exportItem.recordCount.toLocaleString()} registros</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50"
                          title="Descargar"
                          onClick={() => downloadReport(exportItem.id)}
                          disabled={exportItem.status !== 'Completed'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-900 transition-colors p-1 rounded hover:bg-purple-50"
                          title="Regenerar"
                          onClick={() => regenerateReport(exportItem)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 transition-colors p-1 rounded hover:bg-red-50"
                          title="Eliminar"
                          onClick={() => deleteReport(exportItem.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {previousExports.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes generados</h3>
                <p className="mt-1 text-sm text-gray-500">Los reportes que generes aparecerán aquí.</p>
              </div>
            )}
          </div>
        )}
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

export default ExportReports;