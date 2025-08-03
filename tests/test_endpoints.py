#!/usr/bin/env python
"""
Script para probar los nuevos endpoints de indicators
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

def test_endpoints():
    print("=== PRUEBA DE ENDPOINTS DE INDICATORS ===\n")
    
    # Crear un usuario de prueba y token
    try:
        user = User.objects.get(username='testuser')
    except User.DoesNotExist:
        user = User.objects.create_user(username='testuser', password='testpassword')
        print("Usuario 'testuser' creado.")
    
    # Crear token para el usuario
    token, created = Token.objects.get_or_create(user=user)
    if created:
        print(f"Token creado: {token.key}")
    else:
        print(f"Token existente: {token.key}")
    
    # Configurar cliente API
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    
    print("\n--- Probando endpoint de cálculo de KPIs ---")
    try:
        response = client.post('/api/indicators/calculate-kpis/')
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.data}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n--- Probando endpoint de cálculo de datos diarios ---")
    try:
        response = client.post('/api/indicators/calculate-daily-data/', {
            'days_back': 3
        })
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.data}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== PRUEBA COMPLETADA ===")

if __name__ == "__main__":
    test_endpoints() 