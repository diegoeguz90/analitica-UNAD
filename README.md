# Analítica UNAD

Sistema de análisis de datos de matrícula estudiantil para la UNAD.

## Descripción
Este proyecto es una plataforma web para procesar, almacenar y visualizar datos históricos de matrícula provenientes de archivos Excel. Permite realizar un seguimiento detallado de la evolución de la población estudiantil, distribuciones geográficas y académicas.

## Arquitectura
- **Frontend**: React + Vite (Aesthetics-driven UI)
- **Backend**: Python (FastAPI) - Procesamiento ETL con Pandas & SQLAlchemy
- **Base de Datos**: SQLite (Persistence layer)
- **Contenedores**: Docker & Docker Compose

## Módulos Principales

### 1. Análisis de Matrícula (Directorio Principal)
Procesamiento de reportes de matrícula general para análisis de población, zona, centro y programas académicos.

### 2. Estudiantes por Opción de Trabajo de Grado
Módulo especializado para el seguimiento de estudiantes que seleccionan cursos como opción de trabajo de grado.
- **Carga de Datos**: Procesamiento de reportes Excel de cursos como opción de trabajo de grado.
- **KPIs Dinámicos**: Seguimiento en tiempo real de estudiantes únicos, periodos y programas.
- **Análisis de Continuidad**: Identificación automática de estudiantes que han continuado hacia el programa analizado.
- **Filtros Avanzados**: Filtrado persistente por programa, periodo y estado de continuidad.
- **Directorio & Exportación**: Tabla detallada de estudiantes con opción de descarga en formato CSV para gestión administrativa.

### 3. Módulo de Retención Estudiantil (Nuevo)
Análisis avanzado de permanencia y deserción mediante cohortes.
- **Análisis de Cohortes**: Visualización del comportamiento de grupos de estudiantes a través del tiempo.
- **Gráficos de Retención**: Representación visual de la tasa de retención por periodo.
- **Métricas de Impacto**: Identificación de factores que influyen en la permanencia estudiantil.
- **Dashboards Interactivos**: Filtros por zona, centro y programa para análisis segmentado.

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
