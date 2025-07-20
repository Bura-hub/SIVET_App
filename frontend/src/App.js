import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ElectricalDetails from './components/ElectricalDetails';
import InverterDetails from './components/InverterDetails';
import WeatherDetails from './components/WeatherDetails';
import ExportReports from './components/ExportReports'; // Import the new component
import './index.css';

function App() {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [username, setUsername] = useState(localStorage.getItem('username'));
    const [isSuperuser, setIsSuperuser] = useState(localStorage.getItem('isSuperuser') === 'true');
    const [showLogoutAnimation, setShowLogoutAnimation] = useState(false);

    const [currentPage, setCurrentPage] = useState(localStorage.getItem('currentPage') || 'dashboard');
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(
        localStorage.getItem('isSidebarMinimized') === 'true'
    );

    useEffect(() => {
        localStorage.setItem('currentPage', currentPage);
    }, [currentPage]);

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
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
    };

    const handleLogout = async () => {
        setShowLogoutAnimation(true);

        setTimeout(async () => {
            try {
                if (authToken) {
                    const response = await fetch('/auth/logout/', {
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
                localStorage.removeItem('currentPage');
                localStorage.removeItem('isSidebarMinimized');
                localStorage.removeItem('electricalDetailsActiveTab');
                localStorage.removeItem('inverterDetailsActiveTab');
                localStorage.removeItem('weatherDetailsActiveTab');
                setAuthToken(null);
                setUsername(null);
                setIsSuperuser(false);
                setShowLogoutAnimation(false);
                setCurrentPage('dashboard');
            }
        }, 3000);
    };

    const navigateTo = (page) => {
      setCurrentPage(page);
    };

    return (
        <div className="min-h-screen w-full">
            {authToken ? (
                // Render content based on currentPage state
                currentPage === 'dashboard' ? (
                    <Dashboard
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized}
                        setIsSidebarMinimized={setIsSidebarMinimized}
                    />
                ) : currentPage === 'electricalDetails' ? (
                    <ElectricalDetails
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized}
                        setIsSidebarMinimized={setIsSidebarMinimized}
                    />
                ) : currentPage === 'inverterDetails' ? (
                    <InverterDetails
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized}
                        setIsSidebarMinimized={setIsSidebarMinimized}
                    />
                ) : currentPage === 'weatherDetails' ? (
                    <WeatherDetails
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized}
                        setIsSidebarMinimized={setIsSidebarMinimized}
                    />
                ) : ( // New condition for ExportReports
                    <ExportReports
                        authToken={authToken}
                        onLogout={handleLogout}
                        username={username}
                        isSuperuser={isSuperuser}
                        navigateTo={navigateTo}
                        isSidebarMinimized={isSidebarMinimized}
                        setIsSidebarMinimized={setIsSidebarMinimized}
                    />
                )
            ) : (
                <div className="min-h-screen flex flex-col items-center justify-center bg-white w-full">
                    <LoginPage onLoginSuccess={handleLoginSuccess} />
                </div>
            )}

            {/* Animation Overlay for Logout */}
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