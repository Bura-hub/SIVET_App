# Cálculo de Indicadores Energéticos Detallado

Este informe presenta la metodología para calcular los indicadores energéticos a partir de datos recopilados cada dos minutos de medidores inteligentes, inversores y estaciones meteorológicas en las sedes de Udenar, Unimar, HUDN, Cesmag y UCC.

---

### **1. Medidores Inteligentes (electricMeter)**

Los cálculos se basan en las variables del archivo `Medidores_electricos.csv`.

#### **Indicadores y Fórmulas de Cálculo:**

* **Energía Consumida Acumulada ($E_{kWh}$):**
    Se calcula integrando la potencia activa (kW) a lo largo del tiempo. Con datos cada 2 minutos, se puede aproximar como la suma de la potencia en cada intervalo ($P_{kW}$) multiplicada por el tiempo del intervalo ($Δt$).
    
    $E_{kWh} = \sum_{i=1}^{n} (P_{kW, i} \cdot Δt)$
    
    Donde $Δt = \frac{2}{60}$ horas. Para un día, `n` es el número de mediciones (720).

* **Demanda Pico ($P_{pico}$):**
    Es el valor máximo de la potencia promedio en un intervalo de 15 minutos durante un día. Se agrupan las mediciones de 2 minutos en bloques de 15 y se toma el valor máximo de esos promedios.
    
    $P_{pico} = \max(\text{Promedio de } P_{kW} \text{ en intervalos de 15 minutos})$

* **Factor de Carga (FC):**
    Indica la eficiencia en el uso de la energía. Es la relación entre la demanda promedio diaria y la demanda pico diaria.
    
    $FC = \left( \frac{\text{Demanda promedio diaria}}{\text{Demanda pico diaria}} \right) \cdot 100\%$

* **Factor de Potencia Promedio (FP):**
    Se calcula como la relación entre la energía activa total y la energía aparente total durante el período.
    
    $FP = \frac{\sum P_{kW}}{\sqrt{(\sum P_{kW})^2 + (\sum Q_{kVAR})^2}}$
    
    Donde $P$ es la potencia activa y $Q$ es la potencia reactiva.

* **Desbalance de Fases ($\text{DU}$):**
    Mide el desequilibrio de voltaje o corriente entre las fases. Se calcula a partir de los valores por fase ($V_{fase}$ o $I_{fase}$) y el promedio de las tres.
    
    $\text{DU} = \left( \frac{\max(|X_{fase} - X_{promedio}|)}{X_{promedio}} \right) \cdot 100\%$
    
    Donde $X$ es la corriente o el voltaje, y $X_{promedio} = \frac{X_A + X_B + X_C}{3}$.

* **Distorsión Armónica Total (THD):**
    La fórmula del THD se basa en la relación entre los valores RMS de los armónicos y el valor fundamental.
    
    $\text{THD} = \left( \frac{\sqrt{\sum_{h=2}^{\infty} V_{h,RMS}^2}}{V_{1,RMS}} \right) \cdot 100\%$
    
    Los dispositivos suelen proporcionar este valor directamente (`voltageTHDPhaseA/B/C`, `currentTHDPhaseA/B/C`).

* **Demanda de Distorsión Total (TDD):**
    Similar al THD, pero compara las armónicas de la corriente con la corriente nominal de la carga.
    
    $\text{TDD} = \left( \frac{\sqrt{\sum_{h=2}^{\infty} I_{h,RMS}^2}}{I_{carga\_nominal}} \right) \cdot 100\%$
    
    El archivo `Medidores_electricos.csv` ya contiene las variables `currentTDDPhaseA/B/C`.

* **Exportación/Importación Neta ($E_{neta}$):**
    Se calcula como la diferencia entre la energía exportada y la energía importada.
    
    $E_{neta} = \text{Energía Exportada} - \text{Energía Importada}$

---

### **2. Inversores Eléctricos (inverter)**

Los cálculos se basan en las variables del archivo `Inversores.csv`.

#### **Indicadores y Fórmulas de Cálculo:**

* **Eficiencia de Conversión DC-AC ($η_{conv}$):**
    Relaciona la potencia de CA generada ($P_{AC}$) con la potencia de CC disponible ($P_{DC}$).
    
    $η_{conv} = \left( \frac{P_{AC}}{P_{DC}} \right) \cdot 100\%$
    
    Las variables a utilizar son `acPower` y `dcPower`.

* **Energía Total Generada ($E_{gen}$):**
    Se calcula sumando la potencia activa de CA generada en cada intervalo de 2 minutos.
    
    $E_{gen} = \sum_{i=1}^{n} (P_{AC, i} \cdot Δt)$
    
    Donde $P_{AC}$ es la variable `acPower` y $Δt = \frac{2}{60}$ horas.

* **Performance Ratio (PR):**
    Mide la eficiencia global del sistema. Compara la energía real generada con la energía teórica posible.
    
    $\text{PR} = \frac{\text{Energía real generada (de Inverter)}}{\text{Irradiancia acumulada (de WeatherStation)} \cdot \text{Potencia nominal del sistema (kW)}}$
    
    La potencia nominal del sistema (`PnomPV`) es un valor fijo de los paneles, no de los datos del CSV.

* **Curva de Generación vs Irradiancia/Temperatura:**
    Esta es una visualización. Se grafica la potencia de generación del inversor (`acPower`) contra la irradiancia (`irradiance`) y la temperatura (`temperature`) de la estación meteorológica en el mismo período de tiempo.

* **Factor de Potencia y Calidad de Inyección:**
    El Factor de Potencia se calcula de manera similar al del medidor. La calidad de inyección se evalúa con el THD de la corriente de inyección (`acCurrentTHDPhaseA/B/C`).

* **Desbalance de Fases en Inyección:**
    Se calcula de la misma forma que para los medidores, pero usando los valores de corriente inyectada por el inversor en cada una de las fases (`acCurrentPhaseA/B/C`).

---

### **3. Estaciones Meteorológicas (weatherStation)**

Los cálculos se basan en las variables del archivo `estaciones.csv`.

#### **Indicadores y Fórmulas de Cálculo:**

* **Irradiancia Acumulada Diaria ($G_{acum}$):**
    Se integra la irradiancia instantánea ($G_{i}$) a lo largo del día.
    
    $G_{acum} = \sum_{i=1}^{n} (G_{i} \cdot Δt)$
    
    Donde $G_{i}$ es la variable `irradiance` en $W/m^2$ y $Δt = \frac{2}{60}$ horas.

* **Horas Solares Pico (HSP):**
    Se obtiene dividiendo la irradiancia acumulada diaria por la irradiancia de referencia (1000 $W/m^2$).
    
    $\text{HSP} = \frac{G_{acum}}{1000 \ W/m^2}$

* **Viento: Velocidad Media y Rosa de los Vientos:**
    La **velocidad media** es el promedio de todas las mediciones de `windSpeed` en el período. La **rosa de los vientos** es una gráfica que muestra la frecuencia de las direcciones del viento (`windDirection`).

* **Precipitación Acumulada:**
    Se suman los valores de precipitación (`precipitation`) a lo largo del período. La variable en el archivo está etiquetada como `cm/día`, lo que puede indicar que ya es un valor acumulado. Si es así, se toma el valor final del día.

---

### **Estrategia de Agregación y Visualización**

* **Agregación Diaria y Mensual:**
    * **Diaria:** Se calcula un solo valor por día (suma, promedio o máximo) para cada indicador.
    * **Mensual:** Se utiliza la serie de datos diarios para generar un resumen y una gráfica mensual.
* **Consolidación por Sede y Total:**
    * **Por Sede:** Se consolidan los datos de todos los medidores, inversores o estaciones de una misma institución (Udenar, Unimar, etc.) para obtener indicadores consolidados (sumas o promedios).
    * **Total:** Se consolidan los datos de todas las sedes para obtener un resumen global.