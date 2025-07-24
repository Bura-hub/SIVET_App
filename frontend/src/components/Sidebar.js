import React, { useState, useEffect, useRef } from 'react';
import sivetLogo from './sivet-logo.svg'; // Ajusta la ruta si es necesario

function Sidebar({
  username,
  isSuperuser,
  isSidebarMinimized,
  setIsSidebarMinimized,
  navigateTo,
  onLogout, // onLogout ahora incluye la animación desde App.js
  currentPage // Para determinar qué elemento de navegación está activo
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Cierra el menú de perfil al hacer clic fuera
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

  // Define los elementos de navegación
  const navItems = [
    { 
      name: 'Inicio', 
      page: 'dashboard', 
      icon: (
        <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
      ),
      activeClasses: 'bg-blue-100 text-blue-600 font-semibold hover:text-blue-700',
      inactiveClasses: 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'
    },
    { 
      name: 'Medidores', 
      page: 'electricalDetails', 
      icon: (
        <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      ),
      activeClasses: 'bg-green-100 text-green-600 font-semibold hover:text-green-700',
      inactiveClasses: 'text-gray-600 hover:bg-gray-50 hover:text-green-700'
    },
    { 
      name: 'Inversores', 
      page: 'inverterDetails', 
      icon: (
        <svg
          className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
          <path d="M7 12h2l1 2 2-4 1 2h2"></path>
          <path d="M17 16h.01"></path>
          <path d="M17 8h.01"></path>
        </svg>
      ),
      activeClasses: 'bg-red-100 text-red-600 font-semibold hover:text-red-700',
      inactiveClasses: 'text-gray-600 hover:bg-gray-50 hover:text-red-700'
    },
    { 
      name: 'Estaciones', 
      page: 'weatherDetails', 
      icon: (
        <svg
          className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="6" r="2"></circle>
          <path d="M12 8v4"></path>
          <path d="M6 20h12"></path>
          <path d="M12 12l4 8"></path>
          <path d="M12 12l-4 8"></path>
          <path d="M4 10a8 8 0 0116 0"></path>
        </svg>
      ),
      activeClasses: 'bg-orange-100 text-orange-600 font-semibold hover:text-orange-700',
      inactiveClasses: 'text-gray-600 hover:bg-gray-50 hover:text-orange-700'
    },
    { 
      name: 'Exportar Reportes', 
      page: 'exportReports', 
      icon: (
        <svg className={`w-5 h-5 transition-all duration-300 ${isSidebarMinimized ? '' : 'mr-3'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      ),
      activeClasses: 'bg-blue-100 text-blue-600 font-semibold hover:text-blue-700',
      inactiveClasses: 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'
    },
  ];


  return (
    <aside className={`bg-white p-6 shadow-lg flex flex-col justify-between transition-all duration-300 ${isSidebarMinimized ? 'w-20 items-center overflow-hidden' : 'w-64'}`}>
      <div>
        {/* Logo y botón de minimizado */}
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
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M6 5l7 7-7 7"></path></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
            )}
          </button>
        </div>

        {/* Navegación */}
        <nav>
          <ul>
            {navItems.map((item) => (
              <li key={item.page} className="mb-2">
                <a
                  href="#"
                  className={`flex items-center p-3 rounded-xl transition-colors ${isSidebarMinimized ? 'justify-center' : ''} ${
                    currentPage === item.page ? item.activeClasses : item.inactiveClasses
                  }`}
                  onClick={() => navigateTo(item.page)}
                >
                  {item.icon}
                  <span className={`transition-opacity duration-300 ${isSidebarMinimized ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                    {item.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Gestor de Perfil debajo de Exportar Reportes */}
        <div
          ref={profileMenuRef}
          className={`relative flex items-center p-2 mt-4 rounded-full bg-gray-200 cursor-pointer hover:bg-green-100 transition-colors ${
            isSidebarMinimized ? 'justify-center' : ''
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

          {showProfileMenu && (
            <div
              className={`absolute bottom-full mb-2 ${
                isSidebarMinimized ? 'left-1/2 -translate-x-1/2 w-32' : 'left-0 w-full'
              } bg-white rounded-lg shadow-lg py-2 z-10 transition-opacity duration-200 ease-in-out`}
            >
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Configuración de Perfil</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Ayuda y Soporte</a>
              <div className="border-t border-gray-200 my-1"></div>
              <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;