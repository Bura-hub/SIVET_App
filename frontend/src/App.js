import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ElectricalDetails from './components/ElectricalDetails'; // Import the new component
import './index.css';

function App() {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [isSuperuser, setIsSuperuser] = useState(localStorage.getItem('isSuperuser') === 'true');
    const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);
    // Inicializar currentPage desde localStorage, si no existe, usa 'dashboard'
    const [currentPage, setCurrentPage] = useState(localStorage.getItem('currentPage') || 'dashboard');
    // Inicializar isSidebarMinimized desde localStorage, si no existe, usa false (expandido por defecto)
    // localStorage almacena strings, así que 'true'/'false' deben convertirse a booleanos
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(
        localStorage.getItem('isSidebarMinimized') === 'true'
    );

    // useEffect para guardar el estado de la página actual en localStorage
    useEffect(() => {
        localStorage.setItem('currentPage', currentPage);
    }, [currentPage]);

    // useEffect para guardar el estado de la barra lateral en localStorage
    useEffect(() => {
        localStorage.setItem('isSidebarMinimized', isSidebarMinimized);
    }, [isSidebarMinimized]);

    const handleLoginSuccess = (data) => {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('isSuperuser', data.is_superuser);
        setAuthToken(data.token);
        setUsername(data.username);
        setIsSuperuser(data.is_superuser);
        setCurrentPage('dashboard'); // Redirigir a dashboard después del login
        localStorage.setItem('currentPage', 'dashboard'); // Asegurar que se guarda en localStorage
    };

    const handleLogout = async () => {
        setShowLogoutAnimation(true);

        setTimeout(async () => {
            try {
                if (authToken) {
                    const response = await fetch('/api/auth/logout/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        console.error('Error al cerrar sesión en el servidor:', response.statusText);
                    }
                }
            } catch (error) {
                console.error('Error de red al cerrar sesión:', error);
            } finally {
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                localStorage.removeItem('isSuperuser');
                localStorage.removeItem('currentPage'); // Limpiar la página guardada
                localStorage.removeItem('isSidebarMinimized'); // Limpiar el estado de la barra lateral
                setAuthToken(null);
                setUsername(null);
                setIsSuperuser(false);
                setShowLogoutAnimation(false);
                setCurrentPage('dashboard'); // Resetear a dashboard después del logout
            }
        }, 2000);
    };

    // Function to change the current page
    const navigateTo = (page) => {
      setCurrentPage(page);
    };

    return (
        <div className="min-h-screen w-full">
            {authToken ? (
                // Renderizar contenido basado en el estado currentPage
                currentPage === 'dashboard' ? (
                    <Dashboard
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized} // Pasar estado de la barra lateral
                        setIsSidebarMinimized={setIsSidebarMinimized} // Pasar setter de la barra lateral
                    />
                ) : (
                    <ElectricalDetails
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized} // Pasar estado de la barra lateral
                        setIsSidebarMinimized={setIsSidebarMinimized} // Pasar setter de la barra lateral
                    />
                )
            ) : (
                <div className="min-h-screen flex flex-col items-center justify-center bg-white w-full">
                    <LoginPage onLoginSuccess={handleLoginSuccess} />
                </div>
            )}

            {/* Overlay de animación para Cerrar Sesión */}
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