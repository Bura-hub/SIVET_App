import React, { useState } from 'react';

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage({ text: '', type: '' }); // Limpiar mensajes anteriores
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ text: 'Inicio de sesión exitoso. Redirigiendo...', type: 'success' });
                // Llama a la función pasada por props para manejar el éxito del login
                onLoginSuccess(data.token);
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
            <div className="flex justify-center mb-4">
                <span className="text-4xl text-blue-500">⚡</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">EnergyFlow</h2>
            <p className="text-sm text-gray-500 mb-8">Monitor. Analyze. Decide.</p>

            <form onSubmit={handleSubmit}>
                <div className="mb-5 text-left">
                    <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        placeholder="Enter your username"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-6 text-left">
                    <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="login-button" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Login'}
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
                <a href="#" className="secondary-link">Forgot Password?</a>
                <a href="#" className="secondary-link">Create an Account</a>
            </div>
        </div>
    );
}

export default LoginPage;