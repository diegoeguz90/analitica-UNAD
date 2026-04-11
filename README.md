# Analítica UNAD

Sistema de análisis de datos de matrícula estudiantil para la UNAD.

## Descripción
Este proyecto es una plataforma web para procesar, almacenar y visualizar datos históricos de matrícula provenientes de archivos Excel. Permite realizar un seguimiento detallado de la evolución de la población estudiantil, distribuciones geográficas y académicas.

## Arquitectura
- **Frontend**: React + Vite (Aesthetics-driven UI)
- **Backend**: Python (FastAPI/Flask) - Procesamiento ETL
- **Base de Datos**: PostgreSQL / SQLite (según configuración)
- **Contenedores**: Docker & Docker Compose

## Requisitos
- Docker y Docker Compose
- Node.js (para desarrollo frontend)
- Python 3.9+ (para desarrollo backend)

## Inicio Rápido
1. Clonar el repositorio.
2. Ejecutar `docker-compose up --build`.
3. Acceder a `http://localhost:8080`.

## Autor
Diego Guzman
