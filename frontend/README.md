# Frontend - MteLumen App

## Funcionalidades de Gráficos

### Maximización de Gráficos
Los gráficos en la aplicación ahora incluyen funcionalidad completa de maximización:

- **Botón de Maximizar**: Hover sobre cualquier gráfico para ver el botón de maximizar (icono de expansión)
- **Vista Pantalla Completa**: Al hacer clic, el gráfico se expande a pantalla completa
- **Sincronización de Zoom**: El estado del zoom se mantiene sincronizado entre la vista normal y maximizada
- **Altura Configurable**: Cada gráfico puede tener su altura personalizada tanto en vista normal como maximizada

### Controles de Zoom
Cada gráfico incluye controles avanzados de zoom:

- **Zoom con Rueda del Mouse**: Hacer zoom en el eje X
- **Arrastrar para Mover**: Mantener Ctrl + arrastrar para mover la vista
- **Zoom con Arrastre**: Arrastrar para hacer zoom en una área específica

### Reset del Zoom
- **Botón de Reset**: Aparece cuando hay zoom activo (indicador azul)
- **Estado Visual**: El botón cambia de color y muestra un indicador cuando el zoom está activo
- **Funcionalidad Dual**: Funciona tanto en vista normal como maximizada

### Características Técnicas
- **Plugin de Zoom**: Utiliza `chartjs-plugin-zoom` para funcionalidad avanzada
- **Referencias Múltiples**: Mantiene referencias separadas para vista normal y maximizada
- **Sincronización Automática**: El zoom se sincroniza automáticamente entre vistas
- **Detección de Estado**: Detecta automáticamente cuando el zoom está activo
- **Altura Dinámica**: Control total sobre la altura de los gráficos

## Uso de los Gráficos

### Interacción Básica
1. **Hover** sobre un gráfico para ver los controles
2. **Hacer zoom** con la rueda del mouse
3. **Mover la vista** manteniendo Ctrl + arrastrar
4. **Maximizar** para vista pantalla completa

### Reset del Zoom
1. **Usar zoom** en cualquier gráfico
2. **Ver indicador azul** en el botón de reset
3. **Hacer clic** en reset para volver a la vista original
4. **Funciona** en ambas vistas (normal y maximizada)

## Componentes

### ChartCard
Componente principal para renderizar gráficos con funcionalidad completa:

#### Props Disponibles:
- `title`: Título del gráfico
- `description`: Descripción del gráfico
- `type`: Tipo de gráfico ("line" o "bar")
- `data`: Datos del gráfico
- `options`: Opciones de configuración de Chart.js
- `height`: Altura del gráfico en vista normal (ej: "300px", "20rem")
- `fullscreenHeight`: Altura del gráfico maximizado (ej: "700px", "80vh")
- `maxFullscreenHeight`: Altura máxima en vista maximizada (ej: "90vh")

#### Ejemplo de Uso:
```jsx
<ChartCard
  title="Consumo de Electricidad"
  description="Análisis del consumo energético diario"
  type="line"
  data={chartData}
  options={chartOptions}
  height="300px"
  fullscreenHeight="700px"
  maxFullscreenHeight="80vh"
/>
```

#### Características:
- Soporte para gráficos de línea y barras
- Maximización automática con altura configurable
- Controles de zoom integrados
- Reset del zoom inteligente
- Sincronización entre vistas
- Altura personalizable para cada gráfico

## Dependencias

- `chart.js`: ^4.5.0
- `chartjs-plugin-zoom`: ^2.2.0
- `react-chartjs-2`: ^5.3.0

## Notas de Implementación

- Los gráficos mantienen estado de zoom independiente
- La sincronización se realiza automáticamente
- El reset del zoom funciona con múltiples métodos de fallback
- La detección de zoom se actualiza cada 500ms
- Las animaciones incluyen transiciones suaves
- La altura es completamente configurable via props
- Soporte para unidades CSS estándar (px, rem, vh, vw, etc.)

## Ejemplos de Configuración de Altura

### Alturas Fijas:
```jsx
height="300px"
fullscreenHeight="700px"
```

### Alturas Responsivas:
```jsx
height="25vh"
fullscreenHeight="80vh"
maxFullscreenHeight="90vh"
```

### Alturas en Rem:
```jsx
height="20rem"
fullscreenHeight="50rem"
```

### Alturas Mixtas:
```jsx
height="300px"
fullscreenHeight="80vh"
maxFullscreenHeight="90vh"
```
