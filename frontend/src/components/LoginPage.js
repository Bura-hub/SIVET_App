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

        try {
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
                setMessage({ text: 'Server error: Unexpected response. (Is backend running?)', type: 'error' });
                console.error('Error parsing JSON:', jsonError);
                console.error('Server response:', await response.text());
                setLoading(false);
                return;
            }

            if (response.ok) {
                setMessage({ text: 'Inicio exitoso. Redireccionando...', type: 'success' });
                setShowAnimation(true); // Show animation on success

                // Simulate 3-second animation before calling onLoginSuccess
                setTimeout(() => {
                    setShowAnimation(false); // Hide animation
                    onLoginSuccess(data); // Proceed with login success
                }, 2000); // 3 seconds
            } else {
                // Manejar errores específicos de la API (ej. credenciales inválidas)
                const errorMessage = data.non_field_errors ? data.non_field_errors[0] : 'Credenciales inválidas. Inténtalo de nuevo.';
                setMessage({ text: errorMessage, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error de red. Inténtalo de nuevo más tarde.', type: 'error' });
            console.error('Error de login:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-card">
            <img
                src={sivetLogo}
                alt="SIVET Logo"
                className="w-50 h-auto mx-auto"
            />
            <p className="text-sm text-gray-500 mb-8">Transparencia energética para un futuro descentralizado</p>

            <form onSubmit={handleSubmit}>
                <div className="mb-5 text-left">
                    <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">Usuario</label>
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
                <a href="#" className="secondary-link">Olvido su contraseña?</a>
                <a href="#" className="secondary-link">Crear una cuenta</a>
            </div>
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