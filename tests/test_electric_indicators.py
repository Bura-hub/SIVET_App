import pytest
from django.test import TestCase
from django.utils import timezone
from datetime import datetime, timedelta
from indicators.models import ElectricMeterIndicators
from indicators.tasks import calculate_electric_meter_indicators
from scada_proxy.models import Device, Institution, DeviceCategory
from unittest.mock import patch, MagicMock

class ElectricMeterIndicatorsTestCase(TestCase):
    def setUp(self):
        """Configuración inicial para las pruebas"""
        # Crear categoría de medidor eléctrico
        self.category = DeviceCategory.objects.create(
            name='electricmeter',
            description='Medidor Eléctrico'
        )
        
        # Crear institución
        self.institution = Institution.objects.create(
            name='Test Institution',
            code='TEST'
        )
        
        # Crear dispositivo (medidor eléctrico)
        self.device = Device.objects.create(
            name='Test Electric Meter',
            scada_id='TEST_METER_001',
            category=self.category,
            institution=self.institution
        )
        
        # Fecha de prueba
        self.test_date = timezone.now().date()

    def test_electric_meter_indicators_creation(self):
        """Prueba la creación de indicadores eléctricos"""
        indicators = ElectricMeterIndicators.objects.create(
            device=self.device,
            institution=self.institution,
            date=self.test_date,
            time_range='daily',
            imported_energy_kwh=100.5,
            exported_energy_kwh=25.3,
            net_energy_consumption_kwh=75.2,
            peak_demand_kw=150.0,
            avg_demand_kw=75.0,
            load_factor_pct=50.0,
            avg_power_factor=0.95,
            max_voltage_unbalance_pct=2.1,
            max_current_unbalance_pct=1.8,
            max_voltage_thd_pct=3.2,
            max_current_thd_pct=2.9,
            max_current_tdd_pct=2.5
        )
        
        self.assertEqual(indicators.device, self.device)
        self.assertEqual(indicators.institution, self.institution)
        self.assertEqual(indicators.imported_energy_kwh, 100.5)
        self.assertEqual(indicators.peak_demand_kw, 150.0)
        self.assertEqual(indicators.load_factor_pct, 50.0)

    def test_electric_meter_indicators_str_representation(self):
        """Prueba la representación en string del modelo"""
        indicators = ElectricMeterIndicators.objects.create(
            device=self.device,
            institution=self.institution,
            date=self.test_date,
            time_range='daily',
            imported_energy_kwh=100.0,
            exported_energy_kwh=25.0,
            net_energy_consumption_kwh=75.0,
            peak_demand_kw=150.0,
            avg_demand_kw=75.0,
            load_factor_pct=50.0,
            avg_power_factor=0.95
        )
        
        expected_str = f"{self.device.name} - {self.institution.name} - {self.test_date} - Diario"
        self.assertEqual(str(indicators), expected_str)

    @patch('indicators.tasks.Measurement.objects.filter')
    def test_calculate_electric_meter_indicators_task(self, mock_measurements):
        """Prueba la tarea de cálculo de indicadores eléctricos"""
        # Mock de mediciones simuladas
        mock_measurement1 = MagicMock()
        mock_measurement1.importedActivePowerLow = 100.0
        mock_measurement1.importedActivePowerHigh = 0.5  # MWh
        mock_measurement1.exportedActivePowerLow = 25.0
        mock_measurement1.exportedActivePowerHigh = 0.1  # MWh
        mock_measurement1.instantaneousPower = 150.0
        mock_measurement1.powerFactor = 0.95
        mock_measurement1.voltageUnbalance = 2.1
        mock_measurement1.currentUnbalance = 1.8
        mock_measurement1.voltageTHD = 3.2
        mock_measurement1.currentTHD = 2.9
        mock_measurement1.currentTDD = 2.5
        mock_measurement1.timestamp = timezone.now()
        
        mock_measurement2 = MagicMock()
        mock_measurement2.importedActivePowerLow = 200.0
        mock_measurement2.importedActivePowerHigh = 1.0  # MWh
        mock_measurement2.exportedActivePowerLow = 50.0
        mock_measurement2.exportedActivePowerHigh = 0.2  # MWh
        mock_measurement2.instantaneousPower = 300.0
        mock_measurement2.powerFactor = 0.98
        mock_measurement2.voltageUnbalance = 1.5
        mock_measurement2.currentUnbalance = 1.2
        mock_measurement2.voltageTHD = 2.8
        mock_measurement2.currentTHD = 2.5
        mock_measurement2.currentTDD = 2.1
        mock_measurement2.timestamp = timezone.now() + timedelta(hours=1)
        
        mock_measurements.return_value = [mock_measurement1, mock_measurement2]
        
        # Ejecutar la tarea
        result = calculate_electric_meter_indicators(
            self.device.id,
            self.test_date.strftime('%Y-%m-%d'),
            'daily'
        )
        
        # Verificar que se creó el indicador
        indicators = ElectricMeterIndicators.objects.filter(
            device=self.device,
            date=self.test_date,
            time_range='daily'
        )
        
        self.assertTrue(indicators.exists())
        indicator = indicators.first()
        
        # Verificar cálculos básicos
        self.assertIsNotNone(indicator.imported_energy_kwh)
        self.assertIsNotNone(indicator.exported_energy_kwh)
        self.assertIsNotNone(indicator.net_energy_consumption_kwh)
        self.assertIsNotNone(indicator.peak_demand_kw)
        self.assertIsNotNone(indicator.avg_demand_kw)
        self.assertIsNotNone(indicator.load_factor_pct)

    def test_electric_meter_indicators_validation(self):
        """Prueba la validación de campos del modelo"""
        # Crear indicadores con valores válidos
        indicators = ElectricMeterIndicators(
            device=self.device,
            institution=self.institution,
            date=self.test_date,
            time_range='daily',
            imported_energy_kwh=100.0,
            exported_energy_kwh=25.0,
            net_energy_consumption_kwh=75.0,
            peak_demand_kw=150.0,
            avg_demand_kw=75.0,
            load_factor_pct=50.0,
            avg_power_factor=0.95
        )
        
        # Verificar que el modelo es válido
        self.assertTrue(indicators.full_clean())

    def test_electric_meter_indicators_time_range_choices(self):
        """Prueba las opciones de rango de tiempo"""
        indicators = ElectricMeterIndicators.objects.create(
            device=self.device,
            institution=self.institution,
            date=self.test_date,
            time_range='monthly',
            imported_energy_kwh=100.0,
            exported_energy_kwh=25.0,
            net_energy_consumption_kwh=75.0,
            peak_demand_kw=150.0,
            avg_demand_kw=75.0,
            load_factor_pct=50.0,
            avg_power_factor=0.95
        )
        
        # Verificar que se puede obtener el display del rango de tiempo
        self.assertEqual(indicators.get_time_range_display(), 'Mensual')

if __name__ == '__main__':
    pytest.main([__file__])
