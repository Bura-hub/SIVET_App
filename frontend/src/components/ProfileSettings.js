import React, { useState, useEffect } from 'react';
import { buildApiUrl, getEndpoint } from '../config';

function ProfileSettings({ username, isSuperuser, onClose }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    
    // Estados para información del perfil
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        bio: '',
        date_of_birth: '',
        theme_preference: 'light',
        language: 'es',
        notification_preferences: {
            email_notifications: true,
            security_alerts: true,
            system_updates: false
        }
    });
    
    // Estados para cambio de contraseña
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    
    // Estados para seguridad
    const [securitySettings, setSecuritySettings] = useState({
        two_factor_enabled: false,
        backup_codes: [],
        session_timeout: 30,
        require_password_change: false
    });
    
    // Estados para sesiones activas
    const [activeSessions, setActiveSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    
    // Estados para tokens de acceso
    const [accessTokens, setAccessTokens] = useState([]);
    const [loadingTokens, setLoadingTokens] = useState(false);

    useEffect(() => {
        loadProfileData();
        loadSecuritySettings();
        loadActiveSessions();
        loadAccessTokens();
    }, []);

    const loadProfileData = async () => {
        try {
            const response = await fetch(buildApiUrl(getEndpoint('USER_PROFILE')), {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setProfileData(data);
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    };

    const loadSecuritySettings = async () => {
        try {
            const response = await fetch(buildApiUrl(getEndpoint('USER_PROFILE')), {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSecuritySettings({
                    two_factor_enabled: data.two_factor_enabled || false,
                    backup_codes: data.backup_codes || [],
                    session_timeout: data.session_timeout || 30,
                    require_password_change: data.require_password_change || false
                });
            }
        } catch (error) {
            console.error('Error cargando configuración de seguridad:', error);
        }
    };

    const loadActiveSessions = async () => {
        setLoadingSessions(true);
        try {
            const response = await fetch(buildApiUrl(getEndpoint('SESSIONS')), {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setActiveSessions(data.active_devices || []);
            }
        } catch (error) {
            console.error('Error cargando sesiones:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadAccessTokens = async () => {
        setLoadingTokens(true);
        try {
            const response = await fetch(buildApiUrl(getEndpoint('USER_PROFILE')), {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setAccessTokens(data.active_tokens || []);
            }
        } catch (error) {
            console.error('Error cargando tokens:', error);
        } finally {
            setLoadingTokens(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const response = await fetch(buildApiUrl(getEndpoint('USER_PROFILE')), {
                method: 'PUT',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                setMessage({ text: 'Perfil actualizado exitosamente', type: 'success' });
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } else {
                const errorData = await response.json();
                setMessage({ text: errorData.error || 'Error al actualizar perfil', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error de conexión', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        if (passwordData.new_password !== passwordData.confirm_password) {
            setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(buildApiUrl(getEndpoint('CHANGE_PASSWORD')), {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password,
                    confirm_password: passwordData.confirm_password
                })
            });

            if (response.ok) {
                setMessage({ text: 'Contraseña cambiada exitosamente', type: 'success' });
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } else {
                const errorData = await response.json();
                setMessage({ text: errorData.error || 'Error al cambiar contraseña', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error de conexión', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutDevice = async (tokenId) => {
        try {
            const response = await fetch(buildApiUrl(getEndpoint('LOGOUT')), {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token_id: tokenId })
            });

            if (response.ok) {
                setMessage({ text: 'Dispositivo cerrado exitosamente', type: 'success' });
                loadActiveSessions();
                loadAccessTokens();
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            }
        } catch (error) {
            setMessage({ text: 'Error al cerrar dispositivo', type: 'error' });
        }
    };

    const handleLogoutAllDevices = async () => {
        if (!window.confirm('¿Estás seguro de que quieres cerrar sesión en todos los dispositivos? Esto cerrará tu sesión actual.')) {
            return;
        }

        try {
            const response = await fetch(buildApiUrl(getEndpoint('LOGOUT_ALL')), {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setMessage({ text: 'Sesión cerrada en todos los dispositivos', type: 'success' });
                setTimeout(() => {
                    localStorage.clear();
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            setMessage({ text: 'Error al cerrar todas las sesiones', type: 'error' });
        }
    };

    const generateBackupCodes = async () => {
        try {
            const response = await fetch(buildApiUrl(getEndpoint('USER_PROFILE')), {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'generate_backup_codes' })
            });

            if (response.ok) {
                const data = await response.json();
                setSecuritySettings(prev => ({
                    ...prev,
                    backup_codes: data.backup_codes || []
                }));
                setMessage({ text: 'Códigos de respaldo generados exitosamente', type: 'success' });
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            }
        } catch (error) {
            setMessage({ text: 'Error al generar códigos de respaldo', type: 'error' });
        }
    };

    const tabs = [
        { id: 'profile', name: 'Perfil', icon: '👤' },
        { id: 'security', name: 'Seguridad', icon: '🔒' },
        { id: 'sessions', name: 'Sesiones', icon: '💻' },
        { id: 'notifications', name: 'Notificaciones', icon: '🔔' },
        { id: 'preferences', name: 'Preferencias', icon: '⚙️' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Configuración del Perfil</h2>
                        <p className="text-gray-600">Gestiona tu cuenta y preferencias de seguridad</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Mensaje de estado */}
                {message.text && (
                    <div className={`mx-6 mt-4 p-4 rounded-lg ${
                        message.type === 'success' 
                            ? 'bg-green-50 border border-green-200 text-green-800' 
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center">
                            {message.type === 'success' ? (
                                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    </div>
                )}

                <div className="flex h-[calc(90vh-200px)]">
                    {/* Sidebar de navegación */}
                    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                        <nav className="space-y-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                    }`}
                                >
                                    <span className="text-xl mr-3">{tab.icon}</span>
                                    <span className="font-medium">{tab.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* Pestaña: Perfil */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold text-gray-800">Información Personal</h3>
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={profileData.first_name}
                                                onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Apellido *
                                            </label>
                                            <input
                                                type="text"
                                                value={profileData.last_name}
                                                onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Número de Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            value={profileData.phone_number}
                                            onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Biografía
                                        </label>
                                        <textarea
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Cuéntanos sobre ti..."
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Fecha de Nacimiento
                                        </label>
                                        <input
                                            type="date"
                                            value={profileData.date_of_birth}
                                            onChange={(e) => setProfileData({...profileData, date_of_birth: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                            loading
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
                                        }`}
                                    >
                                        {loading ? 'Actualizando...' : 'Actualizar Perfil'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Pestaña: Seguridad */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold text-gray-800">Configuración de Seguridad</h3>
                                
                                {/* Cambio de Contraseña */}
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h4 className="text-lg font-medium text-gray-800 mb-4">Cambiar Contraseña</h4>
                                    <form onSubmit={handlePasswordChange} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contraseña Actual
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.current ? "text" : "password"}
                                                    value={passwordData.current_password}
                                                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                                    className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPasswords.current ? (
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
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Nueva Contraseña
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.new ? "text" : "password"}
                                                        value={passwordData.new_password}
                                                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPasswords.new ? (
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
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Confirmar Contraseña
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords.confirm ? "text" : "password"}
                                                        value={passwordData.confirm_password}
                                                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                                        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPasswords.confirm ? (
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
                                        </div>
                                        
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                                loading
                                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                    : 'bg-green-600 text-white hover:bg-green-700 focus:ring-4 focus:ring-green-200'
                                            }`}
                                        >
                                            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                                        </button>
                                    </form>
                                </div>
                                
                                {/* Códigos de Respaldo */}
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h4 className="text-lg font-medium text-gray-800 mb-4">Códigos de Respaldo 2FA</h4>
                                    <p className="text-gray-600 mb-4">
                                        Los códigos de respaldo te permiten acceder a tu cuenta si pierdes tu dispositivo 2FA.
                                    </p>
                                    
                                    {securitySettings.backup_codes.length > 0 ? (
                                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                {securitySettings.backup_codes.map((code, index) => (
                                                    <div key={index} className="bg-gray-100 p-2 rounded text-center font-mono text-sm">
                                                        {code}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Guarda estos códigos en un lugar seguro. Cada código solo se puede usar una vez.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No hay códigos de respaldo generados.</p>
                                    )}
                                    
                                    <button
                                        onClick={generateBackupCodes}
                                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Generar Nuevos Códigos
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Pestaña: Sesiones */}
                        {activeTab === 'sessions' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-gray-800">Sesiones Activas</h3>
                                    <button
                                        onClick={handleLogoutAllDevices}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Cerrar Todas las Sesiones
                                    </button>
                                </div>
                                
                                {loadingSessions ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-4 text-gray-600">Cargando sesiones...</p>
                                    </div>
                                ) : activeSessions.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeSessions.map((session, index) => (
                                            <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{session.name || 'Dispositivo'}</p>
                                                            <p className="text-sm text-gray-600">{session.ip_address}</p>
                                                            <p className="text-xs text-gray-500">
                                                                Último uso: {new Date(session.last_used).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLogoutDevice(session.id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No hay sesiones activas</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pestaña: Notificaciones */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold text-gray-800">Preferencias de Notificación</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <h4 className="font-medium text-gray-800">Notificaciones por Email</h4>
                                            <p className="text-sm text-gray-600">Recibe actualizaciones importantes por correo electrónico</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileData.notification_preferences.email_notifications}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    notification_preferences: {
                                                        ...profileData.notification_preferences,
                                                        email_notifications: e.target.checked
                                                    }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <h4 className="font-medium text-gray-800">Alertas de Seguridad</h4>
                                            <p className="text-sm text-gray-600">Notificaciones sobre intentos de acceso y cambios de seguridad</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileData.notification_preferences.security_alerts}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    notification_preferences: {
                                                        ...profileData.notification_preferences,
                                                        security_alerts: e.target.checked
                                                    }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <h4 className="font-medium text-gray-800">Actualizaciones del Sistema</h4>
                                            <p className="text-sm text-gray-600">Información sobre nuevas características y mejoras</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileData.notification_preferences.system_updates}
                                                onChange={(e) => setProfileData({
                                                    ...profileData,
                                                    notification_preferences: {
                                                        ...profileData.notification_preferences,
                                                        system_updates: e.target.checked
                                                    }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pestaña: Preferencias */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-semibold text-gray-800">Preferencias de la Aplicación</h3>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tema de Interfaz
                                        </label>
                                        <select
                                            value={profileData.theme_preference}
                                            onChange={(e) => setProfileData({...profileData, theme_preference: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="light">Claro</option>
                                            <option value="dark">Oscuro</option>
                                            <option value="auto">Automático</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Idioma
                                        </label>
                                        <select
                                            value={profileData.language}
                                            onChange={(e) => setProfileData({...profileData, language: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="es">Español</option>
                                            <option value="en">English</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <h4 className="font-medium text-blue-800">Información de la Cuenta</h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Usuario: <span className="font-mono">{username}</span> | 
                                                Rol: <span className="font-medium">{isSuperuser ? 'Administrador' : 'Usuario'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileSettings;
