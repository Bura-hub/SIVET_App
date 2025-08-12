// Importación de hooks y componentes de React
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ElectricalDetails from './components/ElectricalDetails';
import InverterDetails from './components/InverterDetails';
import WeatherStationDetails from './components/WeatherStationDetails';
import ExportReports from './components/ExportReports';
import Sidebar from './components/Sidebar'; // Componente de barra lateral

function App() {
  // Estados para gestionar la sesión del usuario
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken')); // Token de autenticación
  const [username, setUsername] = useState(localStorage.getItem('username')); // Nombre de usuario
  const [isSuperuser, setIsSuperuser] = useState(localStorage.getItem('isSuperuser') === 'true'); // Rol de superusuario

  // Estado para determinar la vista actual (login, dashboard, etc.)
  // Persistir la página actual en localStorage
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('currentPage');
    return authToken ? (savedPage || 'dashboard') : 'login';
  });

  // Estado para controlar si la barra lateral está minimizada
  // Persistir el estado de la sidebar en localStorage
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(() => {
    const savedSidebarState = localStorage.getItem('isSidebarMinimized');
    return savedSidebarState ? JSON.parse(savedSidebarState) : false;
  });

  // Estado para controlar si se debe mostrar la animación de cierre de sesión
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

  // Maneja el éxito en el login: guarda los datos en el estado y en localStorage
  const handleLoginSuccess = (token, user, superuser) => {
    setAuthToken(token);
    setUsername(user);
    setIsSuperuser(superuser);
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('isSuperuser', superuser);
    setCurrentPage('dashboard'); // Redirige al dashboard
    localStorage.setItem('currentPage', 'dashboard'); // Persistir la página
  };

  // Cierra sesión limpiando los datos de sesión y redirigiendo al login
  const performLogout = () => {
    setAuthToken(null);
    setUsername(null);
    setIsSuperuser(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('isSuperuser');
    localStorage.removeItem('currentPage'); // Limpiar la página persistida
    setCurrentPage('login'); // Redirige a la vista de login
  };

  // Muestra una animación antes de cerrar sesión definitivamente
  const handleLogoutWithAnimation = () => {
    setShowLogoutAnimation(true); // Activa el overlay animado
    setTimeout(() => {
      performLogout(); // Ejecuta el cierre real de sesión
      setShowLogoutAnimation(false); // Desactiva el overlay (aunque ya cambia la vista)
    }, 1500); // Duración de la animación (1.5 segundos)
  };

  // Cambia de vista dentro de la aplicación
  const navigateTo = (page) => {
    setCurrentPage(page);
    localStorage.setItem('currentPage', page); // Persistir la nueva página
  };

  // Efecto que asegura que si no hay token, se redirige a login
  useEffect(() => {
    if (!authToken) {
      setCurrentPage('login');
      localStorage.removeItem('currentPage'); // Limpiar la página persistida
    }
  }, [authToken]);

  // Función que decide qué componente renderizar según la vista actual
  const renderPageContent = () => {
    const commonProps = {
      authToken,
      onLogout: handleLogoutWithAnimation,
      username,
      isSuperuser,
      navigateTo,
      isSidebarMinimized,
      setIsSidebarMinimized: (minimized) => {
        setIsSidebarMinimized(minimized);
        localStorage.setItem('isSidebarMinimized', JSON.stringify(minimized)); // Persistir el estado
      },
    };

    switch (currentPage) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'electricalDetails':
        return <ElectricalDetails {...commonProps} />;
      case 'inverterDetails':
        return <InverterDetails {...commonProps} />;
      case 'weatherDetails':
        return <WeatherStationDetails {...commonProps} />;
      case 'exportReports':
        return <ExportReports {...commonProps} />;
      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} />; // Fallback en caso de error
    }
  };

  // Si el usuario está en la página de login, no muestra la barra lateral ni animaciones
  if (currentPage === 'login') {
    return (
      <div className="App">
        {renderPageContent()}
        {/* La animación de logout no aplica en login */}
      </div>
    );
  }

  // Para el resto de vistas, muestra la barra lateral, el contenido y la animación si aplica
  return (
    <div className="flex min-h-screen bg-gray-100 w-full font-inter">
      <Sidebar
        username={username}
        isSuperuser={isSuperuser}
        isSidebarMinimized={isSidebarMinimized}
        setIsSidebarMinimized={(minimized) => {
          setIsSidebarMinimized(minimized);
          localStorage.setItem('isSidebarMinimized', JSON.stringify(minimized)); // Persistir el estado
        }}
        navigateTo={navigateTo}
        onLogout={handleLogoutWithAnimation}
        currentPage={currentPage}
      />
      {/* Contenedor principal de la página */}
      <main className={`flex-1 p-8 bg-gray-100 rounded-tl-3xl shadow-inner transition-all duration-500 ease-in-out ${isSidebarMinimized ? 'ml-0' : ''}`}>
        {renderPageContent()} {/* Renderiza el componente correspondiente */}
      </main>

      {/* Overlay animado mostrado al cerrar sesión */}
      {showLogoutAnimation && (
          <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
              <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500"></div>
                  <p className="mt-4 text-lg text-gray-700">Cerrando sesión...</p>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;