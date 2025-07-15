import logo from './logo.svg';
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import './index.css'; // Asegúrate de que tus estilos globales y de Tailwind estén aquí
import './App.css'; // Para estilos CSS básicos si los necesitas

function App() {
    // Inicializa el token desde localStorage para persistencia
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

    const handleLoginSuccess = (token) => {
        localStorage.setItem('authToken', token); // Guarda el token
        setAuthToken(token);
    };

    const handleLogout = async () => {
        // Llama al endpoint de logout en Django para invalidar el token en el servidor
        try {
            await fetch('/api/auth/logout/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        } finally {
            localStorage.removeItem('authToken'); // Elimina el token del almacenamiento local
            setAuthToken(null); // Actualiza el estado para mostrar la página de login
        }
    };

    // Renderizado condicional basado en el token de autenticación
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8F8]">
            {authToken ? (
                <Dashboard authToken={authToken} onLogout={handleLogout} />
            ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App;