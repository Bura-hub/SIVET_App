# Importación de funciones y clases necesarias del módulo de URL y vistas
from django.urls import path
from .views import ConsumptionSummaryView  # Se importa la vista basada en clase que manejará la lógica

# Definición de las rutas de URL asociadas a esta aplicación
urlpatterns = [
    # Ruta que expone el resumen de consumo en la URL '/dashboard/consumption-summary/'
    # La vista asociada es 'ConsumptionSummaryView', que se utiliza como vista basada en clase (CBV)
    # El nombre asignado 'consumption-summary' permite referenciar esta URL en otras partes del proyecto (por ejemplo, con {% url 'consumption-summary' %})
    path('dashboard/consumption-summary/', ConsumptionSummaryView.as_view(), name='consumption-summary'),
]