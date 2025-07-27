import React, { useState } from 'react';
import sivetLogo from './sivet-logo.svg'; // Logo de la aplicación
import background from './bg.png'; // Imagen de fondo local

// Componente funcional que representa la página de login
function LoginPage({ onLoginSuccess }) {
    // Estados para campos del formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Estado para mostrar mensajes de éxito/error
    const [message, setMessage] = useState({ text: '', type: '' });
    
    // Estado de carga para deshabilitar botón durante la petición
    const [loading, setLoading] = useState(false);
    
    // Controla si se muestra la animación de "iniciando sesión"
    const [showAnimation, setShowAnimation] = useState(false);

    // Función que se ejecuta al enviar el formulario
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevenir comportamiento por defecto del form
        setMessage({ text: '', type: '' }); // Limpia mensajes anteriores
        setLoading(true); // Activa el estado de carga
        setShowAnimation(true); // Muestra la animación

        try {
            // Petición POST al backend Django
            const response = await fetch('/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }), // Enviar credenciales
            });

            let data;
            try {
                // Intentar parsear la respuesta a JSON
                data = await response.json();
            } catch (jsonError) {
                // Si el backend no responde con JSON válido
                setMessage({ text: 'Error del servidor: Respuesta inesperada. (¿Está el backend funcionando?)', type: 'error' });
                console.error('Error parsing JSON:', jsonError);
                console.error('Server response:', await response.text());
                setLoading(false);
                setShowAnimation(false);
                return;
            }

            if (response.ok) {
                // Si el login fue exitoso
                setMessage({ text: 'Inicio exitoso. Redireccionando...', type: 'success' });
                
                // Espera breve para mostrar animación y luego ejecuta el callback
                setTimeout(() => {
                    setShowAnimation(false);
                    onLoginSuccess(data.token, data.username, data.is_superuser); // Se pasa la data relevante a App.js
                }, 1500);
            } else {
                // Si la autenticación falló (credenciales incorrectas, etc.)
                const errorMessage = data.non_field_errors ? data.non_field_errors[0] : 'Credenciales inválidas. Inténtalo de nuevo.';
                setMessage({ text: errorMessage, type: 'error' });
                setShowAnimation(false);
            }
        } catch (error) {
            // Si hay error de red o de servidor
            setMessage({ text: 'Error de red. Inténtalo de nuevo más tarde.', type: 'error' });
            console.error('Error de login:', error);
            setShowAnimation(false);
        } finally {
            setLoading(false); // Apaga el estado de carga siempre al final
        }
    };

    return (
        // Contenedor principal con imagen de fondo
        <div 
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4 font-inter"
            style={{ backgroundImage: `url(${background})` }} // Usa imagen local
        >
            {/* Card de login con clases personalizadas en CSS */}
            <div className="login-card">
                {/* Logo centrado */}
                <div className="flex justify-center mb-6">
                    <img
                        src={sivetLogo}
                        alt="SIVET Logo"
                        className="w-50 h-auto mx-auto"
                    />
                </div>

                {/* Lema de la aplicación */}
                <p className="text-sm text-gray-500 text-center mb-8">
                    Transparencia energética para un futuro descentralizado
                </p>

                {/* Formulario de inicio de sesión */}
                <form onSubmit={handleSubmit}>
                    {/* Campo de usuario */}
                    <div className="mb-4 text-left">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Introduce tu usuario"
                            className="input-field" // Clase definida en CSS
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {/* Campo de contraseña */}
                    <div className="mb-6 text-left">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">Contraseña</label>
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

                    {/* Botón de login */}
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>

                {/* Mensaje de éxito o error */}
                {message.text && (
                    <div className={`mt-6 p-3 rounded-md text-sm block ${
                        message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Enlaces secundarios (no funcionales por ahora) */}
                <div className="mt-8 flex justify-between text-sm">
                    <a href="#" className="secondary-link">¿Olvidó su contraseña?</a>
                    <a href="#" className="secondary-link">Crear una cuenta</a>
                </div>
            </div>

            {/* Overlay de animación al iniciar sesión */}
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