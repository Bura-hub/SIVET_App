from django.contrib import admin
from .models import MonthlyConsumptionKPI, DailyChartData, ElectricMeterConsumption, ElectricMeterChartData, InverterIndicators, InverterChartData

@admin.register(MonthlyConsumptionKPI)
class MonthlyConsumptionKPIAdmin(admin.ModelAdmin):
    list_display = ['last_calculated']
    readonly_fields = ['last_calculated']
    
    def has_add_permission(self, request):
        # Solo permitir una instancia
        return not MonthlyConsumptionKPI.objects.exists()

@admin.register(DailyChartData)
class DailyChartDataAdmin(admin.ModelAdmin):
    list_display = ['date', 'daily_consumption', 'daily_generation', 'daily_balance', 'avg_daily_temp', 'avg_wind_speed', 'avg_irradiance']
    list_filter = ['date']
    search_fields = ['date']
    ordering = ['-date']

@admin.register(ElectricMeterConsumption)
class ElectricMeterConsumptionAdmin(admin.ModelAdmin):
    list_display = ['device', 'institution', 'date', 'time_range', 'total_active_power', 'peak_demand', 'calculated_at']
    list_filter = ['time_range', 'institution', 'date', 'calculated_at']
    search_fields = ['device__name', 'institution__name']
    ordering = ['-date', '-calculated_at']
    readonly_fields = ['calculated_at']

@admin.register(ElectricMeterChartData)
class ElectricMeterChartDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'institution', 'date', 'daily_consumption', 'peak_hour', 'calculated_at']
    list_filter = ['institution', 'date', 'calculated_at']
    search_fields = ['device__name', 'institution__name']
    ordering = ['-date', '-calculated_at']
    readonly_fields = ['calculated_at']

@admin.register(InverterIndicators)
class InverterIndicatorsAdmin(admin.ModelAdmin):
    list_display = ['device', 'institution', 'date', 'time_range', 'dc_ac_efficiency_pct', 'total_generated_energy_kwh', 'performance_ratio_pct', 'calculated_at']
    list_filter = ['time_range', 'institution', 'date', 'calculated_at']
    search_fields = ['device__name', 'institution__name']
    ordering = ['-date', '-calculated_at']
    readonly_fields = ['calculated_at']

@admin.register(InverterChartData)
class InverterChartDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'institution', 'date', 'calculated_at']
    list_filter = ['institution', 'date', 'calculated_at']
    search_fields = ['device__name', 'institution__name']
    ordering = ['-date', '-calculated_at']
    readonly_fields = ['calculated_at']