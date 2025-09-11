-- Script de inicialización de la base de datos
-- Este archivo se ejecuta automáticamente cuando se crea el contenedor de PostgreSQL

-- Crear la base de datos si no existe
SELECT 'CREATE DATABASE mte_sive_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mte_sive_db')\gexec

-- Conectar a la base de datos
\c mte_sive_db;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configurar encoding
SET client_encoding = 'UTF8';

-- Mensaje de confirmación
SELECT 'Base de datos MTE SIVE inicializada correctamente' as status;
