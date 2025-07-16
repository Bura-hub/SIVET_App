import React, { useState, useEffect, useRef } from 'react';
// Import the SVG logo
import sivetLogo from './sivet-logo.svg';

function ExportReports({ authToken, onLogout, username, isSuperuser, navigateTo, isSidebarMinimized, setIsSidebarMinimized }) {
  const [loading, setLoading] = useState(false); // No data fetching for now, so default to false
  const [error, setError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // States for report generation form
  const [reportType, setReportType] = useState('Electrical Summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('All Locations');
  const [device, setDevice] = useState('All Devices');
  const [userRole, setUserRole] = useState('All Roles');

  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

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
    <div className="flex min-h-screen bg-[#f0f1f0] w-full">
      {/* Sidebar - Reused from Dashboard */}
      <aside className={`bg-white p-6 shadow-lg flex flex-col justify-between transition-all duration-300 ${isSidebarMinimized ? 'w-20 items-center overflow-hidden' : 'w-64'}`}>
        <div>
          <div className={`flex items-center mb-3 w-full transition-all duration-300 ${isSidebarMinimized ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarMinimized && (
              <img
                src={sivetLogo}
                alt="SIVET Logo"
                className="max-w-[190px] h-auto object-contain"
              />
            )}
            <button
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={isSidebarMinimized ? "Expandir menú" : "Minimizar menú"}
            >
              {isSidebarMinimized ? (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 5l7 7-7 7M6 5l7 7-7 7"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  ></path>
                </svg>
              )}
            </button>
          </div>

          <nav>
            <ul>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-blue-700 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('dashboard')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Inicio</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-green-700 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('electricalDetails')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Medidores</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-red-700 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('inverterDetails')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0h7m-7 0h-2m7 0v-6a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2zm0 0h-2m0-9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3.337C3 11.901 4.238 13 5.762 13H18.238c1.524 0 2.762-1.099 2.762-2.663V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v3.337"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Inversores</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-orange-700 transition-colors ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('weatherDetails')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h1M4 12H3m15.325 6.675l-.707.707M6.707 6.707l-.707-.707m12.728 0l-.707-.707M6.707 17.293l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Estaciones</span>
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className={`flex items-center p-3 rounded-xl bg-blue-100 text-blue-700 font-semibold ${isSidebarMinimized ? 'justify-center' : ''}`} onClick={() => navigateTo('exportReports')}>
                  <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Exportar Reportes</span>
                </a>
              </li>
            </ul>
          </nav>
          <div
            ref={profileMenuRef}
            className={`relative flex items-center p-2 rounded-full bg-gray-200 cursor-pointer hover:bg-green-100 transition-colors ${
              isSidebarMinimized ? 'justify-center mt-12' : 'mt-6'
            }`}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'Guest')}&background=4F46E5&color=ffffff&size=80&bold=true`}
              alt={`Avatar de ${username || 'Invitado'}`}
              className={`w-10 h-10 rounded-full object-cover shadow-sm ${isSidebarMinimized ? '' : 'mr-3'}`}
            />
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isSidebarMinimized ? 'max-w-0 opacity-0' : 'max-w-xs opacity-100'
              }`}
            >
              <p className="font-semibold text-gray-800 whitespace-nowrap">
                {username || 'Invitado'}
              </p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {isSuperuser ? 'Administrador' : 'Usuario Aliado'}
              </p>
            </div>
            {!isSidebarMinimized && (
              <svg
                className={`w-4 h-4 ml-auto text-gray-600 transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                className={`absolute bottom-full mb-2 ${
                  isSidebarMinimized ? 'left-1/2 -translate-x-1/2 w-32' : 'left-0 w-full'
                } bg-white rounded-lg shadow-lg py-2 z-10 transition-opacity duration-200 ease-in-out`}
              >
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Configuración de Perfil
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Ayuda y Soporte
                </a>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-white rounded-tl-3xl shadow-inner">
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
      </main>
    </div>
  );
}

export default ExportReports;