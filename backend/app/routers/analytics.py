from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from app.database import get_db
from app.models import EnrollmentRecord
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

from fastapi.responses import StreamingResponse
import io

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
    # For SQLite, we can get the list of students and then their latest period record
    from sqlalchemy import desc
    from app.models import Student
    
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
