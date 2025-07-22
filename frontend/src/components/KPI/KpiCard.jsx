const statusColors = {
  positivo: "text-green-500",
  negativo: "text-red-500",
  critico: "text-orange-500",
  estable: "text-gray-500",
  normal: "text-green-500",
  optimo: "text-green-500",
  moderado: "text-yellow-500",
};

const dotColors = {
  positivo: "bg-green-500",
  negativo: "bg-red-500",
  critico: "bg-orange-500",
  estable: "bg-green-500",
  normal: "text-green-500",
  optimo: "text-green-500",
  moderado: "text-yellow-500",
};

export const KpiCard = ({ title, value, unit, change, status, description }) => {
  return (
    <div className="bg-gray-100 p-5 rounded-xl shadow-md flex flex-col justify-between">
      <h3 className="text-gray-600 text-sm mb-3">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">
        {value} <span className="text-lg font-normal text-gray-600">{unit}</span>
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-xs ${statusColors[status] || "text-gray-600"}`}>
          {change || description}
        </p>
        <span
          className={`w-3 h-3 rounded-full ${dotColors[status] || "bg-gray-400"}`}
        ></span>
      </div>
    </div>
  );
};