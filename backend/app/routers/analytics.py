from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc
import pandas as pd
import io
from app.database import get_db
from app.models import EnrollmentRecord, Student
from app.schemas import AnalyticsSummaryResponse, RetentionResponse
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
        
    # Get maximum semester to inform the frontend filter
    max_semester = db.query(func.max(Student.semestre_relativo)).scalar() or 10

    return {
        "items": data,
        "total": total,
        "skip": skip,
        "limit": limit,
        "max_semester": int(max_semester)
    }

@router.get("/retention", response_model=RetentionResponse)
def get_retention_analytics(
    period: str = Query(..., description="Base period to analyze retention for"),
    db: Session = Depends(get_db)
):
    # 1. Get all unique periods and sort them
    all_periods = [row[0] for row in db.query(EnrollmentRecord.periodo).distinct().order_by(EnrollmentRecord.periodo).all()]
    if period not in all_periods:
        raise HTTPException(status_code=404, detail="Period not found")

    # 2. Group into semester blocks
    def get_semester_type(p):
        return 'S1' if p[-1] in ['1', '2', '3'] else 'S2'

    blocks = []
    current_type = None
    current_block = []

    for p in all_periods:
        t = get_semester_type(p)
        if t != current_type:
            if current_block:
                blocks.append({'type': current_type, 'periods': current_block})
            current_type = t
            current_block = [p]
        else:
            current_block.append(p)
    if current_block:
        blocks.append({'type': current_type, 'periods': current_block})

    # 3. Find target block and future blocks
    block_index = -1
    for i, b in enumerate(blocks):
        if period in b['periods']:
            block_index = i
            break
            
    target_periods = blocks[block_index + 1]['periods'] if block_index + 1 < len(blocks) else []
    future_periods = []
    for i in range(block_index + 2, len(blocks)):
        future_periods.extend(blocks[i]['periods'])

    # 4. Identify base cohort (students whose absolute FIRST enrollment is the selected period)
    # Get the minimum period for each student
    student_min_periods = (
        db.query(
            EnrollmentRecord.student_id, 
            func.min(EnrollmentRecord.periodo).label("min_period")
        )
        .group_by(EnrollmentRecord.student_id)
        .subquery()
    )

    cohort_student_ids = [
        row[0] for row in db.query(student_min_periods.c.student_id)
        .filter(student_min_periods.c.min_period == period)
        .all()
    ]

    cohort_size = len(cohort_student_ids)
    if cohort_size == 0:
        return {
            "base_period": period,
            "cohort_size": 0,
            "retained": 0,
            "retained_percentage": 0.0,
            "returned_later": 0,
            "returned_later_percentage": 0.0,
            "dropped_out": 0,
            "dropped_out_percentage": 0.0
        }

    # 5. Categorize students
    retained = 0
    returned_later = 0
    dropped_out = 0

    # Get all future enrollments for the cohort (periods > period)
    cohort_enrollments = (
        db.query(EnrollmentRecord.student_id, EnrollmentRecord.periodo)
        .filter(EnrollmentRecord.student_id.in_(cohort_student_ids))
        .filter(EnrollmentRecord.periodo > period)
        .all()
    )

    # Map student to their future periods
    student_future_periods = {s_id: set() for s_id in cohort_student_ids}
    for s_id, p in cohort_enrollments:
        student_future_periods[s_id].add(p)

    target_set = set(target_periods)
    future_set = set(future_periods)

    for s_id, periods_enrolled in student_future_periods.items():
        if periods_enrolled.intersection(target_set):
            retained += 1
        elif periods_enrolled.intersection(future_set):
            returned_later += 1
        else:
            dropped_out += 1

    return {
        "base_period": period,
        "cohort_size": cohort_size,
        "retained": retained,
        "retained_percentage": round((retained / cohort_size) * 100, 2) if cohort_size > 0 else 0.0,
        "returned_later": returned_later,
        "returned_later_percentage": round((returned_later / cohort_size) * 100, 2) if cohort_size > 0 else 0.0,
        "dropped_out": dropped_out,
        "dropped_out_percentage": round((dropped_out / cohort_size) * 100, 2) if cohort_size > 0 else 0.0
    }

@router.get("/retention/history", response_model=List[RetentionResponse])
def get_retention_history(db: Session = Depends(get_db)):
    # 1. Get all unique periods and sort them
    all_periods = [row[0] for row in db.query(EnrollmentRecord.periodo).distinct().order_by(EnrollmentRecord.periodo).all()]
    all_periods = [p for p in all_periods if p != 'MAESTRO']
    
    # 2. Group into semester blocks
    def get_semester_type(p):
        return 'S1' if p[-1] in ['1', '2', '3'] else 'S2'

    blocks = []
    current_type = None
    current_block = []
    for p in all_periods:
        t = get_semester_type(p)
        if t != current_type:
            if current_block: blocks.append({'type': current_type, 'periods': current_block})
            current_type = t
            current_block = [p]
        else:
            current_block.append(p)
    if current_block: blocks.append({'type': current_type, 'periods': current_block})

    # 3. Pre-calculate min period for each student to define cohorts
    student_min_periods = db.query(
        EnrollmentRecord.student_id, 
        func.min(EnrollmentRecord.periodo).label("min_period")
    ).group_by(EnrollmentRecord.student_id).all()
    
    cohort_map = {}
    for s_id, min_p in student_min_periods:
        if min_p not in cohort_map: cohort_map[min_p] = []
        cohort_map[min_p].append(s_id)
        
    results = []
    for period in all_periods:
        if period not in cohort_map: continue
        
        cohort_student_ids = cohort_map[period]
        cohort_size = len(cohort_student_ids)
        
        # Identify target and future blocks relative to this period
        block_idx = -1
        for i, b in enumerate(blocks):
            if period in b['periods']:
                block_idx = i
                break
        
        target_periods = blocks[block_idx + 1]['periods'] if block_idx + 1 < len(blocks) else []
        future_periods = []
        for i in range(block_idx + 2, len(blocks)):
            future_periods.extend(blocks[i]['periods'])
            
        # Get enrollments for this cohort > current period
        cohort_enrollments = db.query(EnrollmentRecord.student_id, EnrollmentRecord.periodo).filter(
            EnrollmentRecord.student_id.in_(cohort_student_ids),
            EnrollmentRecord.periodo > period
        ).all()
        
        student_future = {s_id: set() for s_id in cohort_student_ids}
        for s_id, p in cohort_enrollments:
            student_future[s_id].add(p)
            
        retained = 0
        returned_later = 0
        dropped_out = 0
        
        target_set = set(target_periods)
        future_set = set(future_periods)
        
        for s_id, p_set in student_future.items():
            if p_set.intersection(target_set): retained += 1
            elif p_set.intersection(future_set): returned_later += 1
            else: dropped_out += 1
            
        results.append({
            "base_period": period,
            "cohort_size": cohort_size,
            "retained": retained,
            "retained_percentage": round((retained / cohort_size) * 100, 2) if cohort_size > 0 else 0.0,
            "returned_later": returned_later,
            "returned_later_percentage": round((returned_later / cohort_size) * 100, 2) if cohort_size > 0 else 0.0,
            "dropped_out": dropped_out,
            "dropped_out_percentage": round((dropped_out / cohort_size) * 100, 2) if cohort_size > 0 else 0.0
        })
        
    return results
