// Define la función reportWebVitals, que recibe un callback llamado onPerfEntry
const reportWebVitals = onPerfEntry => {
  // Verifica si se ha proporcionado una función válida como parámetro
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Importación dinámica del paquete 'web-vitals', que mide métricas clave de rendimiento web
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Cada función mide una métrica específica y pasa los resultados al callback

      // CLS: Cumulative Layout Shift (mide estabilidad visual)
      getCLS(onPerfEntry);

      // FID: First Input Delay (mide capacidad de respuesta)
      getFID(onPerfEntry);

      // FCP: First Contentful Paint (mide tiempo de renderizado inicial)
      getFCP(onPerfEntry);

      // LCP: Largest Contentful Paint (mide tiempo hasta renderizado principal)
      getLCP(onPerfEntry);

      // TTFB: Time To First Byte (mide tiempo hasta primer byte de respuesta del servidor)
      getTTFB(onPerfEntry);
    });
  }
};

// Exporta la función como módulo por defecto
export default reportWebVitals;