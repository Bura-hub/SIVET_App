#!/usr/bin/env python
"""
Script para probar la API de estaciones meteorológicas
Verifica si el endpoint está funcionando correctamente
"""

import os
import sys
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

def test_weather_api():
    print("=== PRUEBA DE API DE ESTACIONES METEOROLÓGICAS ===\n")
    
    # 1. Crear o obtener un token de autenticación
    print("1. CREANDO TOKEN DE AUTENTICACIÓN:")
    try:
        # Crear usuario de prueba si no existe
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com'}
        )
        if created:
            user.set_password('testpass123')
            user.save()
            print("   ✅ Usuario de prueba creado")
        else:
            print("   ✅ Usuario de prueba ya existe")
        
        # Obtener o crear token
        token, created = Token.objects.get_or_create(user=user)
        if created:
            print("   ✅ Token creado")
        else:
            print("   ✅ Token ya existe")
        
        print(f"   Token: {token.key}")
        
    except Exception as e:
        print(f"   ❌ Error creando token: {e}")
        return
    
    # 2. Probar endpoint sin filtros
    print(f"\n2. PROBANDO ENDPOINT SIN FILTROS:")
    try:
        url = "http://localhost:8000/api/weather-stations/list/"
        headers = {
            'Authorization': f'Token {token.key}',
            'Content-Type': 'application/json'
        }
        
        print(f"   URL: {url}")
        print(f"   Headers: {headers}")
        
        response = requests.get(url, headers=headers)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Respuesta exitosa:")
            print(f"      Count: {data.get('count', 'N/A')}")
            print(f"      Results: {len(data.get('results', []))} elementos")
            
            if data.get('results'):
                print(f"   Primeros resultados:")
                for i, result in enumerate(data['results'][:3]):
                    print(f"      {i+1}. ID: {result.get('id')}, Nombre: {result.get('name')}, Institución: {result.get('institution', {}).get('name', 'N/A')}")
        else:
            print(f"   ❌ Error en la respuesta:")
            print(f"      Response: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error probando endpoint: {e}")
    
    # 3. Probar endpoint con filtro de institución
    print(f"\n3. PROBANDO ENDPOINT CON FILTRO DE INSTITUCIÓN:")
    try:
        # Probar con la primera institución (Udenar, ID=1)
        url = "http://localhost:8000/api/weather-stations/list/?institution_id=1"
        
        print(f"   URL: {url}")
        
        response = requests.get(url, headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Respuesta exitosa con filtro:")
            print(f"      Count: {data.get('count', 'N/A')}")
            print(f"      Results: {len(data.get('results', []))} elementos")
            
            if data.get('results'):
                print(f"   Resultados filtrados por Udenar:")
                for result in data['results']:
                    print(f"      - ID: {result.get('id')}, Nombre: {result.get('name')}, Institución: {result.get('institution', {}).get('name', 'N/A')}")
            else:
                print(f"   ⚠️ No hay resultados para Udenar")
        else:
            print(f"   ❌ Error en la respuesta con filtro:")
            print(f"      Response: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error probando endpoint con filtro: {e}")
    
    # 4. Verificar configuración de la API
    print(f"\n4. VERIFICANDO CONFIGURACIÓN:")
    try:
        from django.conf import settings
        print(f"   DEBUG: {settings.DEBUG}")
        print(f"   ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        print(f"   CORS_ORIGIN_WHITELIST: {getattr(settings, 'CORS_ORIGIN_WHITELIST', 'No configurado')}")
        
    except Exception as e:
        print(f"   ❌ Error verificando configuración: {e}")
    
    print(f"\n=== FIN DE LA PRUEBA ===")

if __name__ == "__main__":
    test_weather_api()
