// KpiCard.jsx
import React from 'react';

// Diccionario que asigna clases de color de texto según el estado del KPI
const statusColors = {
  positivo: "text-green-500",  // Verde para estados positivos
  negativo: "text-red-500",   // Rojo para estados negativos
  critico: "text-orange-500",  // Naranja para estados críticos
  estable: "text-gray-500",   // Gris para estados estables
  normal: "text-green-500",   // Verde también para estado normal
  optimo: "text-green-500",   // Verde para estado óptimo
  moderado: "text-yellow-500", // Amarillo para estado moderado
  loading: "text-blue-500",   // Azul para estado de carga
  success: "text-green-500",  // Verde para éxito
  error: "text-red-500",      // Rojo para error
};

// Diccionario que asigna clases de color de fondo al círculo indicador del estado
const dotColors = {
  positivo: "bg-green-500",   // Fondo verde para estado positivo
  negativo: "bg-red-500",    // Fondo rojo para estado negativo
  critico: "bg-orange-500",   // Fondo naranja para estado crítico
  estable: "bg-green-500",   // Fondo verde para estado estable (posible inconsistencia)
  normal: "bg-green-500",    // Clase corregida para fondo
  optimo: "bg-green-500",    // Clase corregida para fondo
  moderado: "bg-yellow-500",  // Fondo amarillo para estado moderado
  loading: "bg-blue-500",    // Fondo azul para estado de carga
  success: "bg-green-500",   // Fondo verde para éxito
  error: "bg-red-500",       // Fondo rojo para error
};

// Componente funcional que representa una tarjeta KPI.
// Ahora acepta una prop 'icon' para renderizar un icono SVG diferente y 'onClick' para funcionalidad de botón.
export const KpiCard = ({ title, value, unit, change, status, description, icon, onClick }) => {
  const cardClasses = onClick 
    ? "bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:bg-gray-50 active:scale-95"
    : "bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between";

  return (
    <div className={cardClasses} onClick={onClick}>
      {/* Título del KPI y el icono */}
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        <div className="p-2 bg-gray-100 rounded-full text-gray-700">
          {/* Se renderiza el icono pasado como prop */}
          {icon}
        </div>
      </div>

      {/* Valor principal del KPI con unidad */}
      <p className="text-3xl font-bold text-gray-900">
        {value} <span className="text-lg font-normal text-gray-600">{unit}</span>
      </p>

      {/* Sección inferior con el cambio o descripción y el círculo de estado */}
      <div className="flex items-center justify-between mt-2">
        {/* Texto de cambio o descripción con color según el estado */}
        <p className={`text-xs ${statusColors[status] || "text-gray-600"}`}>
          {change || description}
        </p>

        {/* Indicador visual en forma de círculo con color de fondo según el estado */}
        <span
          className={`w-3 h-3 rounded-full ${dotColors[status] || "bg-gray-400"}`}
        ></span>
      </div>
    </div>
  );
};