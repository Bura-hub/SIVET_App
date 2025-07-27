// Importación de React, la biblioteca principal para construir interfaces de usuario
import React from 'react';
// Importación del método ReactDOM para renderizar componentes en el DOM
import ReactDOM from 'react-dom/client';
// Importación del archivo de estilos globales
import './index.css';
// Importación del componente principal de la aplicación
import App from './App';
// Importación del módulo para medir el rendimiento de la aplicación
import reportWebVitals from './reportWebVitals';

// Crear el punto de entrada raíz de React vinculándolo al elemento con id 'root' en el HTML
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderiza el componente App dentro de <React.StrictMode>,
// lo que activa comprobaciones adicionales en desarrollo
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Opcional: mide el rendimiento de la app.
// Puedes pasar una función personalizada para registrar métricas
// o enviarlas a un sistema de analítica. Más información:
// https://bit.ly/CRA-vitals
reportWebVitals();