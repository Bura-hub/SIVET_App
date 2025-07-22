import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ElectricalDetails from './components/ElectricalDetails';
import InverterDetails from './components/InverterDetails';
import WeatherDetails from './components/WeatherDetails';
import ExportReports from './components/ExportReports';
import Sidebar from './components/Sidebar'; // Importa el nuevo componente Sidebar

function App() {
  // Estado para la autenticación
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [isSuperuser, setIsSuperuser] = useState(localStorage.getItem('isSuperuser') === 'true');

  // Estado para la navegación (qué componente mostrar)
  const [currentPage, setCurrentPage] = useState(authToken ? 'dashboard' : 'login');

  // Estado para minimizar/expandir la barra lateral (compartido entre todas las páginas)
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  // Nuevo estado para controlar la animación de cierre de sesión
  const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

  // Función para manejar el éxito del login
  const handleLoginSuccess = (token, user, superuser) => {
    setAuthToken(token);
    setUsername(user);
    setIsSuperuser(superuser);
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', user);
    localStorage.setItem('isSuperuser', superuser);
    setCurrentPage('dashboard'); // Navegar al dashboard después del login
  };

  // Función para manejar el logout real (sin animación)
  const performLogout = () => {
    setAuthToken(null);
    setUsername(null);
    setIsSuperuser(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('isSuperuser');
    setCurrentPage('login'); // Volver a la página de login
  };

  // Función para manejar el cierre de sesión CON animación
  const handleLogoutWithAnimation = () => {
    setShowLogoutAnimation(true); // Mostrar animación
    // Después de un tiempo, ejecutar el logout real
    setTimeout(() => {
      performLogout();
      setShowLogoutAnimation(false); // Ocultar animación (aunque la página cambiará)
    }, 1500); // Duración de la animación (ej. 1.5 segundos)
  };

  // Función para navegar entre páginas
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Efecto para verificar el token al cargar la aplicación
  useEffect(() => {
    if (!authToken) {
      setCurrentPage('login');
    }
  }, [authToken]);

  // Renderizado condicional basado en currentPage
  const renderPageContent = () => { // Renombrado para evitar confusión con renderPage de la estructura anterior
    const commonProps = {
      authToken,
      onLogout: handleLogoutWithAnimation, // Pasa la función con animación
      username,
      isSuperuser,
      navigateTo,
      isSidebarMinimized,
      setIsSidebarMinimized,
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
        return <WeatherDetails {...commonProps} />;
      case 'exportReports':
        return <ExportReports {...commonProps} />;
      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} />; // Fallback
    }
  };

  // Si la página actual es 'login', solo renderiza LoginPage
  if (currentPage === 'login') {
    return (
      <div className="App">
        {renderPageContent()}
        {/* La animación de logout no se muestra en la página de login */}
      </div>
    );
  }

  // Para todas las demás páginas (dashboard, etc.), renderiza Sidebar y el contenido de la página
  return (
    <div className="flex min-h-screen bg-gray-100 w-full font-inter">
      <Sidebar
        username={username}
        isSuperuser={isSuperuser}
        isSidebarMinimized={isSidebarMinimized}
        setIsSidebarMinimized={setIsSidebarMinimized}
        navigateTo={navigateTo}
        onLogout={handleLogoutWithAnimation} // Pasa la función de logout con animación
        currentPage={currentPage} // Pasa la página actual para resaltar el elemento activo
      />
      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-white rounded-tl-3xl shadow-inner">
        {renderPageContent()} {/* Renderiza el contenido de la página actual */}
      </main>

      {/* Animation Overlay for Logout (ahora en App.js y solo visible cuando se activa) */}
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