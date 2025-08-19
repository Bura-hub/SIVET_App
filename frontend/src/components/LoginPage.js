import React, { useState, useEffect } from 'react';
import sivetLogo from './sivet-logo.svg';
import background from './bg.png';
import TransitionOverlay from './TransitionOverlay';
import { fetchWithAuth, handleApiResponse } from '../utils/apiConfig';

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState('');
    
    // Estados para la animación de transición
    const [showTransition, setShowTransition] = useState(false);
    const [transitionType, setTransitionType] = useState('info');
    const [transitionMessage, setTransitionMessage] = useState('');

    // Animación de entrada
    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });
        setLoading(true);
        setShowTransition(true);
        setTransitionType('info');
        setTransitionMessage('Iniciando sesión...');

        try {
            // Usar fetchWithAuth para manejo automático de errores
            const data = await fetchWithAuth('/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            }, (authError) => {
                // Callback para errores de autenticación
                setMessage({ text: authError, type: 'error' });
                setShowTransition(false);
            });

            // Si llegamos aquí, el login fue exitoso
            console.log('Login exitoso, datos recibidos:', data);
            setMessage({ text: 'Inicio exitoso. Redireccionando...', type: 'success' });
            setTransitionType('success');
            setTransitionMessage('Inicio exitoso. Redireccionando...');
            
            setTimeout(() => {
                setShowTransition(false);
                console.log('Llamando a onLoginSuccess con:', data.access_token, data.username, data.is_superuser);
                onLoginSuccess(data.access_token, data.username, data.is_superuser);
            }, 1500);

        } catch (error) {
            // Manejar errores específicos del nuevo sistema de autenticación
            let errorMessage = 'Error de red. Inténtalo de nuevo más tarde.';
            
            if (error.message.includes('Cuenta bloqueada')) {
                errorMessage = 'Tu cuenta está temporalmente bloqueada. Intenta más tarde.';
            } else if (error.message.includes('Cambio de contraseña requerido')) {
                errorMessage = 'Debes cambiar tu contraseña antes de continuar.';
            } else if (error.message.includes('Credenciales inválidas')) {
                errorMessage = 'Usuario o contraseña incorrectos.';
            } else if (error.message.includes('Usuario inactivo')) {
                errorMessage = 'Tu cuenta ha sido desactivada. Contacta al administrador.';
            }
            
            setMessage({ text: errorMessage, type: 'error' });
            setShowTransition(false);
            console.error('Error de login:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4 font-inter relative overflow-hidden"
            style={{ backgroundImage: `url(${background})` }}
        >
            {/* Partículas flotantes animadas */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-20 animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Card de login mejorado */}
            <div className={`login-card-enhanced transform transition-all duration-1000 ease-out ${
                isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
            }`}>
                {/* Logo con animación */}
                <div className="flex justify-center mb-6">
                    <div className="logo-container">
                        <img
                            src={sivetLogo}
                            alt="SIVET Logo"
                            className="w-50 h-auto mx-auto transition-transform duration-300 hover:scale-105"
                        />
                    </div>
                </div>

                {/* Título y lema mejorados */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido</h1>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Transparencia energética para un futuro descentralizado
                    </p>
                </div>

                {/* Formulario mejorado */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Campo de usuario */}
                    <div className="input-group">
                        <label htmlFor="username" className="input-label">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Usuario
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                id="username"
                                name="username"
                                placeholder="Introduce tu usuario"
                                className={`enhanced-input ${focusedField === 'username' ? 'focused' : ''}`}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onFocus={() => setFocusedField('username')}
                                onBlur={() => setFocusedField('')}
                                required
                            />
                        </div>
                    </div>

                    {/* Campo de contraseña */}
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Contraseña
                        </label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                placeholder="Introduce tu contraseña"
                                className={`enhanced-input pr-12 ${focusedField === 'password' ? 'focused' : ''}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField('')}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Botón de login mejorado */}
                    <button 
                        type="submit" 
                        className={`enhanced-login-button ${loading ? 'loading' : ''}`} 
                        disabled={loading}
                    >
                        <span className="button-content">
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Iniciando sesión...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Iniciar sesión
                                </>
                            )}
                        </span>
                    </button>
                </form>

                {/* Mensaje de estado mejorado */}
                {message.text && (
                    <div className={`message-container ${message.type}`}>
                        <div className="message-icon">
                            {message.type === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Enlaces secundarios mejorados */}
                <div className="secondary-links">
                    <a href="#" className="enhanced-secondary-link">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                        ¿Olvidó su contraseña?
                    </a>
                    <a href="#" className="enhanced-secondary-link">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Crear una cuenta
                    </a>
                </div>
            </div>

            {/* Overlay de transición */}
            <TransitionOverlay 
                show={showTransition}
                type={transitionType}
                message={transitionMessage}
            />
        </div>
    );
}

export default LoginPage;