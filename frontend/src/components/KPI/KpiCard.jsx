// Diccionario que asigna clases de color de texto según el estado del KPI
const statusColors = {
  positivo: "text-green-500",   // Verde para estados positivos
  negativo: "text-red-500",     // Rojo para estados negativos
  critico: "text-orange-500",   // Naranja para estados críticos
  estable: "text-gray-500",     // Gris para estados estables
  normal: "text-green-500",     // Verde también para estado normal
  optimo: "text-green-500",     // Verde para estado óptimo
  moderado: "text-yellow-500",  // Amarillo para estado moderado
};

// Diccionario que asigna clases de color de fondo al círculo indicador del estado
const dotColors = {
  positivo: "bg-green-500",     // Fondo verde para estado positivo
  negativo: "bg-red-500",       // Fondo rojo para estado negativo
  critico: "bg-orange-500",     // Fondo naranja para estado crítico
  estable: "bg-green-500",      // Fondo verde para estado estable (posible inconsistencia)
  normal: "text-green-500",     // Esto parece un error: debería ser `bg-` en vez de `text-`
  optimo: "text-green-500",     // Lo mismo: clase incorrecta para fondo
  moderado: "bg-yellow-500",    // Fondo amarillo para estado moderado
};

// Componente funcional que representa una tarjeta KPI con título, valor, unidad, variación y estado
export const KpiCard = ({ title, value, unit, change, status, description }) => {
  return (
    <div className="bg-gray-100 p-5 rounded-xl shadow-md flex flex-col justify-between">
      {/* Título del KPI */}
      <h3 className="text-gray-600 text-sm mb-3">{title}</h3>

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