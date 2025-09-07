"""
Vistas de health check para el sistema.
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    Endpoint de health check para verificar el estado del sistema.
    """
    try:
        # Verificar que el sistema está funcionando
        health_data = {
            "status": "healthy",
            "message": "Sistema funcionando correctamente",
            "timestamp": None
        }
        
        # Agregar timestamp si es posible
        from django.utils import timezone
        health_data["timestamp"] = timezone.now().isoformat()
        
        return JsonResponse(health_data, status=200)
    
    except Exception as e:
        error_data = {
            "status": "unhealthy",
            "message": f"Error en el sistema: {str(e)}",
            "timestamp": None
        }
        
        try:
            from django.utils import timezone
            error_data["timestamp"] = timezone.now().isoformat()
        except:
            pass
            
        return JsonResponse(error_data, status=500)
