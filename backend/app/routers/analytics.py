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
    programa: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if programa:
        from app.models import File
        query = query.join(Student.enrollments).join(EnrollmentRecord.file).filter(File.programa == programa).distinct()

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

@router.get("/programs", response_model=List[str])
def get_programs(db: Session = Depends(get_db)):
    from app.models import File
    res = db.query(File.programa).distinct().order_by(File.programa).all()
    return [row[0] for row in res if row[0]]

def get_semester_label(p):
    if not p or len(p) < 4: return p
    # ABC is year/group, D is sub-period
    # S1: 1, 2, 3; S2: 4, 5
    sem = 'S1' if p[3] in ['1', '2', '3'] else 'S2'
    return f"{p[:3]}-{sem}"

@router.get("/retention", response_model=RetentionResponse)
def get_retention_analytics(
    period: str = Query(..., description="Period or Semester label to analyze"),
    db: Session = Depends(get_db)
):
    # Normalize input: if a period code is passed, get its semester label
    target_label = get_semester_label(period) if len(period) == 4 else period
    
    # 1. Get all periods and define blocks
    all_periods = [row[0] for row in db.query(EnrollmentRecord.periodo).distinct().order_by(EnrollmentRecord.periodo).all()]
    all_periods = [p for p in all_periods if p != 'MAESTRO']
    
    blocks = []
    for p in all_periods:
        lbl = get_semester_label(p)
        if not blocks or blocks[-1]['label'] != lbl:
            blocks.append({'label': lbl, 'periods': [p]})
        else:
            blocks[-1]['periods'].append(p)
            
    # 2. Find target block
    block_idx = -1
    for i, b in enumerate(blocks):
        if b['label'] == target_label:
            block_idx = i
            break
            
    if block_idx == -1:
        raise HTTPException(status_code=404, detail=f"Semester block {target_label} not found")

    target_block = blocks[block_idx]
    next_periods = blocks[block_idx + 1]['periods'] if block_idx + 1 < len(blocks) else []
    future_periods = []
    for i in range(block_idx + 2, len(blocks)):
        future_periods.extend(blocks[i]['periods'])
        
    target_set = set(next_periods)
    future_set = set(future_periods)

    # 3. Calculate for each period in the block and sum
    student_min_periods = db.query(
        EnrollmentRecord.student_id, 
        func.min(EnrollmentRecord.periodo).label("min_period")
    ).group_by(EnrollmentRecord.student_id).subquery()

    total_cohort = 0
    total_retained = 0
    total_returned = 0
    total_dropped = 0

    for p in target_block['periods']:
        # Students whose FIRST enrollment was THIS period
        cohort_ids = [
            row[0] for row in db.query(student_min_periods.c.student_id)
            .filter(student_min_periods.c.min_period == p)
            .all()
        ]
        if not cohort_ids: continue
        
        total_cohort += len(cohort_ids)
        
        # Get all future enrollments for this cohort
        enrollments = db.query(EnrollmentRecord.student_id, EnrollmentRecord.periodo).filter(
            EnrollmentRecord.student_id.in_(cohort_ids),
            EnrollmentRecord.periodo > p
        ).all()
        
        st_history = {s_id: set() for s_id in cohort_ids}
        for s_id, ep in enrollments:
            st_history[s_id].add(ep)
            
        for s_id, p_set in st_history.items():
            if p_set.intersection(target_set):
                total_retained += 1
            elif p_set.intersection(future_set):
                total_returned += 1
            else:
                total_dropped += 1

    if total_cohort == 0:
        return {
            "base_period": target_label,
            "cohort_size": 0, "retained": 0, "retained_percentage": 0.0,
            "returned_later": 0, "returned_later_percentage": 0.0,
            "dropped_out": 0, "dropped_out_percentage": 0.0
        }

    return {
        "base_period": target_label,
        "cohort_size": total_cohort,
        "retained": total_retained,
        "retained_percentage": round((total_retained / total_cohort) * 100, 2),
        "returned_later": total_returned,
        "returned_later_percentage": round((total_returned / total_cohort) * 100, 2),
        "dropped_out": total_dropped,
        "dropped_out_percentage": round((total_dropped / total_cohort) * 100, 2)
    }

@router.get("/retention/history", response_model=List[RetentionResponse])
def get_retention_history(db: Session = Depends(get_db)):
    all_periods = [row[0] for row in db.query(EnrollmentRecord.periodo).distinct().order_by(EnrollmentRecord.periodo).all()]
    all_periods = [p for p in all_periods if p != 'MAESTRO']
    
    blocks = []
    for p in all_periods:
        lbl = get_semester_label(p)
        if not blocks or blocks[-1]['label'] != lbl:
            blocks.append({'label': lbl, 'periods': [p]})
        else:
            blocks[-1]['periods'].append(p)
            
    student_min_periods = db.query(
        EnrollmentRecord.student_id, 
        func.min(EnrollmentRecord.periodo).label("min_period")
    ).group_by(EnrollmentRecord.student_id).all()
    
    cohort_map = {}
    for s_id, mp in student_min_periods:
        if mp not in cohort_map: cohort_map[mp] = []
        cohort_map[mp].append(s_id)
        
    results = []
    for i, block in enumerate(blocks):
        target_set = set(blocks[i+1]['periods']) if i+1 < len(blocks) else set()
        future_set = set()
        for j in range(i+2, len(blocks)):
            future_set.update(blocks[j]['periods'])
            
        b_cohort = 0
        b_retained = 0
        b_returned = 0
        b_dropped = 0
        
        for p in block['periods']:
            c_ids = cohort_map.get(p, [])
            if not c_ids: continue
            
            b_cohort += len(c_ids)
            
            # Fetch all future enrollments for this specific period's cohort
            enrollments = db.query(EnrollmentRecord.student_id, EnrollmentRecord.periodo).filter(
                EnrollmentRecord.student_id.in_(c_ids),
                EnrollmentRecord.periodo > p
            ).all()
            
            st_paths = {s_id: set() for s_id in c_ids}
            for s_id, ep in enrollments:
                st_paths[s_id].add(ep)
                
            for s_id, p_set in st_paths.items():
                if p_set.intersection(target_set):
                    b_retained += 1
                elif p_set.intersection(future_set):
                    b_returned += 1
                else:
                    b_dropped += 1
        
        if b_cohort > 0:
            results.append({
                "base_period": block['label'],
                "cohort_size": b_cohort,
                "retained": b_retained,
                "retained_percentage": round((b_retained / b_cohort) * 100, 2),
                "returned_later": b_returned,
                "returned_later_percentage": round((b_returned / b_cohort) * 100, 2),
                "dropped_out": b_dropped,
                "dropped_out_percentage": round((b_dropped / b_cohort) * 100, 2)
            })
            
    return results

@router.get("/retention/periods", response_model=List[str])
def get_retention_periods(db: Session = Depends(get_db)):
    all_periods = [row[0] for row in db.query(EnrollmentRecord.periodo).distinct().order_by(EnrollmentRecord.periodo).all()]
    all_periods = [p for p in all_periods if p != 'MAESTRO']
    
    labels = []
    seen = set()
    for p in all_periods:
        lbl = get_semester_label(p)
        if lbl not in seen:
            labels.append(lbl)
            seen.add(lbl)
    return labels
