from django.contrib import admin
from .models import (
    EnergyPrice, 
    EnergySavings, 
    EnergyPriceForecast, 
    EnergyMarketData, 
    EnergyAlert
)


@admin.register(EnergyPrice)
class EnergyPriceAdmin(admin.ModelAdmin):
    list_display = ['date', 'price_per_kwh', 'source', 'region', 'created_at']
    list_filter = ['source', 'region', 'date']
    search_fields = ['date', 'source']
    ordering = ['-date']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('date', 'price_per_kwh', 'source', 'region')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EnergySavings)
class EnergySavingsAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_consumed_kwh', 'total_generated_kwh', 
        'total_savings_cop', 'savings_percentage', 'self_consumption_percentage'
    ]
    list_filter = ['date']
    search_fields = ['date']
    ordering = ['-date']
    readonly_fields = [
        'total_savings_cop', 'savings_percentage', 
        'self_consumption_percentage', 'excess_energy_kwh',
        'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Datos de Energía', {
            'fields': ('date', 'total_consumed_kwh', 'total_generated_kwh', 'average_price_kwh')
        }),
        ('Cálculos Automáticos', {
            'fields': (
                'total_savings_cop', 'savings_percentage', 
                'self_consumption_percentage', 'excess_energy_kwh'
            ),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EnergyPriceForecast)
class EnergyPriceForecastAdmin(admin.ModelAdmin):
    list_display = ['date', 'predicted_price_kwh', 'confidence_level', 'source', 'algorithm']
    list_filter = ['source', 'algorithm', 'date']
    search_fields = ['date', 'source']
    ordering = ['date']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Pronóstico', {
            'fields': ('date', 'predicted_price_kwh', 'confidence_level')
        }),
        ('Metadatos', {
            'fields': ('source', 'algorithm', 'created_at')
        }),
    )


@admin.register(EnergyMarketData)
class EnergyMarketDataAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'demand_mw', 'supply_mw', 'renewable_percentage', 
        'market_price_cop_mwh'
    ]
    list_filter = ['date']
    search_fields = ['date']
    ordering = ['-date']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Datos del Mercado', {
            'fields': ('date', 'demand_mw', 'supply_mw')
        }),
        ('Composición de Generación', {
            'fields': ('hydro_percentage', 'thermal_percentage', 'renewable_percentage')
        }),
        ('Precios', {
            'fields': ('market_price_cop_mwh',)
        }),
        ('Metadatos', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(EnergyAlert)
class EnergyAlertAdmin(admin.ModelAdmin):
    list_display = [
        'alert_type', 'severity', 'title', 'affected_date', 
        'is_active', 'created_at'
    ]
    list_filter = ['alert_type', 'severity', 'is_active', 'affected_date']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Información de la Alerta', {
            'fields': ('alert_type', 'severity', 'title', 'description')
        }),
        ('Fechas', {
            'fields': ('affected_date', 'resolved_at')
        }),
        ('Estado', {
            'fields': ('is_active',)
        }),
        ('Metadatos', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_resolved', 'deactivate_alerts']
    
    def mark_as_resolved(self, request, queryset):
        """Marca las alertas seleccionadas como resueltas"""
        from django.utils import timezone
        updated = queryset.update(
            is_active=False, 
            resolved_at=timezone.now()
        )
        self.message_user(
            request, 
            f'{updated} alerta(s) marcada(s) como resuelta(s).'
        )
    mark_as_resolved.short_description = "Marcar como resuelta"
    
    def deactivate_alerts(self, request, queryset):
        """Desactiva las alertas seleccionadas"""
        updated = queryset.update(is_active=False)
        self.message_user(
            request, 
            f'{updated} alerta(s) desactivada(s).'
        )
    deactivate_alerts.short_description = "Desactivar alertas"
