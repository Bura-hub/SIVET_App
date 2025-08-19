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
    
    // Estados para rate limiting y seguridad
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockUntil, setBlockUntil] = useState(null);
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaValue, setCaptchaValue] = useState('');
    const [generatedCaptcha, setGeneratedCaptcha] = useState('');

    // Animación de entrada
    useEffect(() => {
        setIsVisible(true);
    }, []);
    
    // Efecto para rate limiting y bloqueo
    useEffect(() => {
        const savedAttempts = localStorage.getItem('loginFailedAttempts');
        const savedBlockUntil = localStorage.getItem('loginBlockUntil');
        
        if (savedAttempts) {
            setFailedAttempts(parseInt(savedAttempts));
        }
        
        if (savedBlockUntil) {
            const blockTime = new Date(savedBlockUntil);
            if (blockTime > new Date()) {
                setIsBlocked(true);
                setBlockUntil(blockTime);
            } else {
                // Limpiar bloqueo expirado
                localStorage.removeItem('loginFailedAttempts');
                localStorage.removeItem('loginBlockUntil');
                setFailedAttempts(0);
                setIsBlocked(false);
                setBlockUntil(null);
            }
        }
    }, []);
    
    // Generar captcha cuando se necesite
    useEffect(() => {
        if (showCaptcha) {
            generateCaptcha();
        }
    }, [showCaptcha]);
    
    // Función para generar captcha simple
    const generateCaptcha = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setGeneratedCaptcha(result);
    };
    
    // Función para verificar si debe mostrar captcha
    const shouldShowCaptcha = () => {
        return failedAttempts >= 3;
    };
    
    // Función para bloquear temporalmente
    const blockTemporarily = () => {
        const blockDuration = Math.min(30 * Math.pow(2, failedAttempts - 5), 300); // Máximo 5 minutos
        const blockUntil = new Date(Date.now() + blockDuration * 1000);
        
        setIsBlocked(true);
        setBlockUntil(blockUntil);
        localStorage.setItem('loginBlockUntil', blockUntil.toISOString());
    };

    // Función para validar contraseña
    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (password.length < minLength) {
            return { isValid: false, message: `La contraseña debe tener al menos ${minLength} caracteres` };
        }
        if (!hasUpperCase) {
            return { isValid: false, message: 'La contraseña debe contener al menos una mayúscula' };
        }
        if (!hasLowerCase) {
            return { isValid: false, message: 'La contraseña debe contener al menos una minúscula' };
        }
        if (!hasNumbers) {
            return { isValid: false, message: 'La contraseña debe contener al menos un número' };
        }
        if (!hasSpecialChar) {
            return { isValid: false, message: 'La contraseña debe contener al menos un carácter especial' };
        }
        
        return { isValid: true, message: 'Contraseña válida' };
    };
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Verificar si está bloqueado
        if (isBlocked) {
            const remainingTime = Math.ceil((blockUntil - new Date()) / 1000);
            setMessage({ 
                text: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(remainingTime / 60)} minutos`, 
                type: 'error' 
            });
            return;
        }
        
        // Validar contraseña
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setMessage({ text: passwordValidation.message, type: 'error' });
            return;
        }
        
        // Verificar captcha si es necesario
        if (showCaptcha && captchaValue !== generatedCaptcha) {
            setMessage({ text: 'Código de verificación incorrecto', type: 'error' });
            setCaptchaValue('');
            generateCaptcha();
            return;
        }
        
        setMessage({ text: '', type: '' });
        setLoading(true);
        setShowTransition(true);
        setTransitionType('info');
        setTransitionMessage('Iniciando sesión...');

        try {
            // Usar fetch directo para manejar errores de autenticación manualmente
            const response = await fetch('/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                // No logging por seguridad
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Si llegamos aquí, el login fue exitoso
            // No logging por seguridad
            
            // Resetear intentos fallidos y bloqueos
            setFailedAttempts(0);
            setIsBlocked(false);
            setBlockUntil(null);
            setShowCaptcha(false);
            setCaptchaValue('');
            localStorage.removeItem('loginFailedAttempts');
            localStorage.removeItem('loginBlockUntil');
            
            setMessage({ text: 'Inicio exitoso. Redireccionando...', type: 'success' });
            setTransitionType('success');
            setTransitionMessage('Inicio exitoso. Redireccionando...');
            
            setTimeout(() => {
                setShowTransition(false);
                // No logging por seguridad
                onLoginSuccess(data.access_token, data.username, data.is_superuser);
            }, 1500);

        } catch (error) {
            // No logging por seguridad
            
            // Manejar errores específicos del nuevo sistema de autenticación
            let errorMessage = 'Error de red. Inténtalo de nuevo más tarde.';
            let shouldIncrementAttempts = true;
            
            if (error.message.includes('Cuenta bloqueada')) {
                errorMessage = 'Tu cuenta está temporalmente bloqueada. Intenta más tarde.';
                shouldIncrementAttempts = false; // No incrementar si la cuenta ya está bloqueada
            } else if (error.message.includes('Cambio de contraseña requerido')) {
                errorMessage = 'Debes cambiar tu contraseña antes de continuar.';
                shouldIncrementAttempts = false; // No incrementar si requiere cambio de contraseña
            } else if (error.message.includes('Credenciales inválidas') || error.message.includes('Usuario o contraseña incorrectos')) {
                errorMessage = 'Usuario o contraseña incorrectos.';
                shouldIncrementAttempts = true;
            } else if (error.message.includes('Datos de entrada inválidos')) {
                errorMessage = 'Usuario o contraseña incorrectos.';
                shouldIncrementAttempts = true;
            } else if (error.message.includes('Usuario inactivo')) {
                errorMessage = 'Tu cuenta ha sido desactivada. Contacta al administrador.';
                shouldIncrementAttempts = false;
            }
            
            // Incrementar intentos fallidos si corresponde
            if (shouldIncrementAttempts) {
                const newFailedAttempts = failedAttempts + 1;
                setFailedAttempts(newFailedAttempts);
                localStorage.setItem('loginFailedAttempts', newFailedAttempts.toString());
                
                // Mostrar captcha después de 3 intentos
                if (newFailedAttempts >= 3 && !showCaptcha) {
                    setShowCaptcha(true);
                }
                
                // Bloquear después de 5 intentos
                if (newFailedAttempts >= 5) {
                    blockTemporarily();
                }
            }
            
            setMessage({ text: errorMessage, type: 'error' });
            setShowTransition(false);
            // No logging por seguridad
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

                    {/* Campo de captcha (se muestra después de 3 intentos fallidos) */}
                    {showCaptcha && (
                        <div className="input-group">
                            <label htmlFor="captcha" className="input-label">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Código de Verificación
                            </label>
                            <div className="captcha-container bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="captcha-display flex items-center justify-between mb-3">
                                    <div className="bg-white px-4 py-2 rounded-lg border-2 border-dashed border-gray-300">
                                        <span className="captcha-text text-2xl font-mono font-bold text-gray-800 tracking-widest select-none">
                                            {generatedCaptcha}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={generateCaptcha}
                                        className="captcha-refresh p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                                        title="Generar nuevo código"
                                    >
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    id="captcha"
                                    name="captcha"
                                    placeholder="Ingresa el código de arriba"
                                    className="enhanced-input text-center text-lg font-mono tracking-widest"
                                    value={captchaValue}
                                    onChange={(e) => setCaptchaValue(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>
                    )}

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

                {/* Indicadores de seguridad */}
                {failedAttempts > 0 && (
                    <div className="security-indicator bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${failedAttempts >= 5 ? 'bg-red-500' : failedAttempts >= 3 ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                                <span className="text-orange-700 font-medium">
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    Intentos fallidos: {failedAttempts}/5
                                </span>
                            </div>
                            {failedAttempts >= 3 && (
                                <span className="text-red-600 font-medium bg-red-100 px-3 py-1 rounded-full text-sm">
                                    Captcha requerido
                                </span>
                            )}
                            {failedAttempts >= 5 && (
                                <span className="text-red-600 font-medium bg-red-100 px-3 py-1 rounded-full text-sm">
                                    Cuenta bloqueada
                                </span>
                            )}
                        </div>
                        {isBlocked && blockUntil && (
                            <div className="mt-2 text-sm text-red-600">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Bloqueado hasta: {blockUntil.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                )}

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