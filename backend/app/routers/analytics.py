from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc
import pandas as pd
import io
from app.database import get_db
from app.models import EnrollmentRecord, Student
from app.schemas import AnalyticsSummaryResponse
from typing import List, Optional

router = APIRouter()

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
        periods: Optional[List[str]] = Query(None),
        db: Session = Depends(get_db)
    ):
    # Base filter
    filter_expr = EnrollmentRecord.periodo.in_(periods) if periods else True

    # 1. Total records (Historical enrollments)
    total_enrollments = db.query(EnrollmentRecord).filter(filter_expr).count()

    # 2. UNIQUE STUDENTS (Across the entire selection)
    unique_students_total = db.query(func.count(func.distinct(EnrollmentRecord.student_id))).filter(filter_expr).scalar()

    # 3. Unique students per period
    res_students = (
        db.query(EnrollmentRecord.periodo, func.count(func.distinct(EnrollmentRecord.student_id)).label("unique_students"))
        .filter(filter_expr)
        .group_by(EnrollmentRecord.periodo)
        .order_by(EnrollmentRecord.periodo)
        .all()
    )
    
    # 4. Total credits per period
    res_credits = (
        db.query(EnrollmentRecord.periodo, func.sum(EnrollmentRecord.creditos_totales).label("total_credits"))
        .filter(filter_expr)
        .group_by(EnrollmentRecord.periodo)
        .order_by(EnrollmentRecord.periodo)
        .all()
    )

    # 5. Distribution by Zone (Initial view)
    res_zones = (
        db.query(EnrollmentRecord.zona, func.count(func.distinct(EnrollmentRecord.student_id)).label("count"))
        .filter(filter_expr)
        .group_by(EnrollmentRecord.zona)
        .order_by(func.count(func.distinct(EnrollmentRecord.student_id)).desc())
        .all()
    )

    # 6. Top Centers
    res_centers = (
        db.query(EnrollmentRecord.centro, func.count(func.distinct(EnrollmentRecord.student_id)).label("count"))
        .filter(filter_expr)
        .group_by(EnrollmentRecord.centro)
        .order_by(func.count(func.distinct(EnrollmentRecord.student_id)).desc())
        .all()
    )

    return {
        "total_enrollments": total_enrollments,
        "unique_students_total": unique_students_total or 0,
        "unique_students_per_period": [{"periodo": row[0], "value": row[1]} for row in res_students],
        "total_credits_per_period": [{"periodo": row[0], "value": row[1] or 0} for row in res_credits],
        "distribution_by_zone": [{"label": row[0], "value": row[1]} for row in res_zones],
        "top_zones": [{"label": row[0], "value": row[1]} for row in res_zones],
        "top_centers": [{"label": row[0], "value": row[1]} for row in res_centers]
    }

@router.get("/zones", response_model=List[dict])
def get_zone_distribution(
    periods: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    filter_expr = EnrollmentRecord.periodo.in_(periods) if periods else True
    res = (
        db.query(EnrollmentRecord.zona, func.count(func.distinct(EnrollmentRecord.student_id)).label("count"))
        .filter(filter_expr)
        .group_by(EnrollmentRecord.zona)
        .order_by(func.count(func.distinct(EnrollmentRecord.student_id)).desc())
        .all()
    )
    return [{"label": row[0], "value": row[1]} for row in res]

@router.get("/export_students")
def export_students(db: Session = Depends(get_db)):
    # Query unique students with their most recent enrollment info
    students = db.query(Student).all()
    data = []
    
    for s in students:
        # Get the latest enrollment record for this student to show their current zone/center
        latest_enrollment = db.query(EnrollmentRecord).filter(EnrollmentRecord.student_id == s.documento).order_by(desc(EnrollmentRecord.periodo)).first()
        
        data.append({
            "Documento": s.documento,
            "Nombre": s.nombre,
            "Correo": s.correo_institucional,
            "Ultima_Zona": latest_enrollment.zona if latest_enrollment else "N/A",
            "Ultimo_Centro": latest_enrollment.centro if latest_enrollment else "N/A",
            "Ultimo_Periodo": latest_enrollment.periodo if latest_enrollment else "N/A"
        })
    
    df = pd.DataFrame(data)
    
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig') # utf-8-sig for Excel compatibility
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=directorio_estudiantes_unicos.csv"
    
    return response

@router.get("/students")
def get_paginated_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    semestre: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if q:
        search = f"%{q}%"
        query = query.filter(or_(
            Student.nombre.ilike(search),
            Student.documento.ilike(search)
        ))
        
    if estado:
        query = query.filter(Student.estado == estado)
        
    if semestre is not None:
        query = query.filter(Student.semestre_relativo == semestre)

    total = query.count()
    students_query = (
        query
        .options(
            joinedload(Student.enrollments).joinedload(EnrollmentRecord.file)
        )
        .order_by(Student.nombre)
        .offset(skip).limit(limit).all()
    )
    
    data = []
    for s in students_query:
        sorted_enrollments = sorted(s.enrollments, key=lambda e: e.periodo, reverse=True)
        latest = sorted_enrollments[0] if sorted_enrollments else None
        
        history = [
            {
                "periodo": e.periodo,
                "programa": e.file.programa if e.file else "N/A",
                "creditos_totales": e.creditos_totales
            }
            for e in sorted_enrollments
        ]
        
        data.append({
            "documento": s.documento,
            "nombre": s.nombre,
            "correo": s.correo_institucional,
            "ultima_zona": latest.zona if latest else "N/A",
            "ultimo_centro": latest.centro if latest else "N/A",
            "estado": s.estado or "Indeterminado",
            "fecha_matricula_inicial": s.fecha_matricula_inicial or "N/A",
            "periodo_matricula_inicial": s.periodo_matricula_inicial or "N/A",
            "semestre_relativo": s.semestre_relativo,
            "historial": history
        })
        
    return {
        "items": data,
        "total": total,
        "skip": skip,
        "limit": limit
    }
