import React, { useState } from 'react';
import sivetLogo from './sivet-logo.svg'; 

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false); // New state for animation

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage({ text: '', type: '' }); // Limpiar mensajes anteriores
        setLoading(true);
        setShowAnimation(true); // Mostrar animación al iniciar sesión

        try {
            // Asegúrate que esta es la URL correcta para tu endpoint de login de Django
            const response = await fetch('/auth/login/', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                setMessage({ text: 'Error del servidor: Respuesta inesperada. (¿Está el backend funcionando?)', type: 'error' });
                console.error('Error parsing JSON:', jsonError);
                console.error('Server response:', await response.text());
                setLoading(false);
                setShowAnimation(false); // Ocultar animación en caso de error de parsing
                return;
            }
            
            if (response.ok) {
                setMessage({ text: 'Inicio exitoso. Redireccionando...', type: 'success' });
                // Simular animación de 2 segundos antes de llamar a onLoginSuccess
                setTimeout(() => {
                    setShowAnimation(false); // Ocultar animación
                    // Pasar los datos de autenticación como se espera en App.js
                    // Asume que la API devuelve data.token, data.username, data.is_superuser
                    onLoginSuccess(data.token, data.username, data.is_superuser); 
                }, 1500); 
            } else {
                // Manejar errores específicos de la API (ej. credenciales inválidas)
                const errorMessage = data.non_field_errors ? data.non_field_errors[0] : 'Credenciales inválidas. Inténtalo de nuevo.';
                setMessage({ text: errorMessage, type: 'error' });
                setShowAnimation(false); // Ocultar animación en caso de error de login
            }
        } catch (error) {
            setMessage({ text: 'Error de red. Inténtalo de nuevo más tarde.', type: 'error' });
            console.error('Error de login:', error);
            setShowAnimation(false); // Ocultar animación en caso de error de red
        } finally {
            setLoading(false); // Desactivar loading, la animación se maneja por showAnimation
        }
    };

    return (
        // Contenedor principal para centrar el formulario.
        // Usamos flexbox para centrar y min-h-screen para ocupar toda la altura.
        // bg-gray-100 para el fondo de la página de login.
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-inter">
            {/* Aquí se usa la clase 'login-card' de tu index.css */}
            <div className="login-card">
                <div className="flex justify-center mb-6"> {/* Centra el logo */}
                    <img
                    src={sivetLogo}
                    alt="SIVET Logo"
                    className="w-50 h-auto mx-auto"
                    />
                </div>
                <p className="text-sm text-gray-500 text-center mb-8">Transparencia energética para un futuro descentralizado</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4 text-left">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">Usuario</label>
                        {/* Aquí se usa la clase 'input-field' de tu index.css */}
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Introduce tu usuario"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6 text-left">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">Contraseña</label>
                        {/* Aquí se usa la clase 'input-field' de tu index.css */}
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Introduce tu contraseña"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {/* Aquí se usa la clase 'login-button' de tu index.css */}
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>

                {message.text && (
                    <div className={`mt-6 p-3 rounded-md text-sm block ${
                        message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="mt-8 flex justify-between text-sm">
                    {/* Aquí se usa la clase 'secondary-link' de tu index.css */}
                    <a href="#" className="secondary-link">¿Olvidó su contraseña?</a>
                    {/* Aquí se usa la clase 'secondary-link' de tu index.css */}
                    <a href="#" className="secondary-link">Crear una cuenta</a>
                </div>
            </div>

            {/* Animación de carga (spinner) */}
            {showAnimation && (
                <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                        <p className="mt-4 text-lg text-gray-700">Iniciando sesión...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoginPage;