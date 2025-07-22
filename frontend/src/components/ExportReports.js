import React, { useState, useEffect, useRef } from 'react';

function ExportReports({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(false); // No data fetching for now, so default to false
  const [error, setError] = useState(null);
 
  // States for report generation form
  const [reportType, setReportType] = useState('Electrical Summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [device, setDevice] = useState('All Devices');
  const [userRole, setUserRole] = useState('All Roles');

  // Dummy data for previous exports
  const previousExports = [
    { type: 'Electrical Summary', date: '2023-10-26 10:30 AM', format: 'CSV', status: 'Completed' },
    { type: 'Inverter Log', date: '2023-10-25 04:15 PM', format: 'PDF', status: 'Completed' },
    { type: 'Weather Overview', date: '2023-10-25 09:00 AM', format: 'CSV', status: 'Pending' },
  ];

  const handleExport = (format) => {
    // Simulate export logic
    setLoading(true);
    console.log(`Exporting ${reportType} report as ${format} from ${startDate} to ${endDate} for ${location}, ${device}, ${userRole}`);
    setTimeout(() => {
      setLoading(false);
      // In a real app, you would trigger a backend export and potentially download the file
      alert(`Reporte de ${reportType} exportado como ${format}! (Simulado)`);
    }, 1500);
  };

  return (
    <div className="flex-1 bg-white rounded-tl-3xl shadow-inner">
      {/* Header */}
      <header className="flex p-8 justify-between items-center mb-8 bg-white p-4 -mx-8 -mt-8">
        <h1 className="text-3xl font-bold text-gray-800">Exportar Reportes</h1> {/* Updated title */}
        <div className="flex items-center space-x-4">
          {/* No specific filters shown in mockup for export reports header, so keeping it clean */}
        </div>
      </header>

      {/* Generate New Report Section */}
      <section className="bg-gray-100 p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Generar Nuevo Reporte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Report Type */}
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Reporte</label>
            <div className="relative">
              <select
                id="reportType"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option>Electrical Summary</option>
                <option>Inverter Log</option>
                <option>Weather Overview</option>
                <option>Custom Report</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
            <div className="relative">
              <input
                type="date"
                id="startDate"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
            <div className="relative">
              <input
                type="date"
                id="endDate"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <div className="relative">
              <select
                id="location"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option>All Locations</option>
                <option>Site A</option>
                <option>Site B</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Device */}
          <div>
            <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-1">Dispositivo</label>
            <div className="relative">
              <select
                id="device"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
              >
                <option>All Devices</option>
                <option>Inverter 1</option>
                <option>Meter 1</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* User Role */}
          <div>
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-1">Rol de Usuario</label>
            <div className="relative">
              <select
                id="userRole"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option>All Roles</option>
                <option>Admin</option>
                <option>Operator</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => handleExport('CSV')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md"
            disabled={loading}
          >
            {loading ? 'Exportando...' : 'Exportar como CSV'}
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md"
            disabled={loading}
          >
            {loading ? 'Exportando...' : 'Exportar como PDF'}
          </button>
        </div>
      </section>

      {/* Previous Exports Section */}
      <section className="bg-gray-100 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Exportaciones Anteriores</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  Tipo de Reporte
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  Formato
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  Descargar
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-100 divide-y divide-gray-200">
              {previousExports.map((exportItem, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal text-gray-900">
                    {exportItem.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal">
                    {exportItem.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-normal">
                    {exportItem.format}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      exportItem.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {exportItem.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" className="text-blue-600 hover:text-blue-900">Descargar</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ExportReports;