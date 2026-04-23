from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from app.services.degree_work_service import process_degree_work_excel
from typing import List

router = APIRouter()

@router.post("/upload", response_model=schemas.DegreeWorkUploadResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".xlsx") and not file.filename.endswith(".xls"):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xls files are supported")
    
    content = await file.read()
    result = process_degree_work_excel(db, content, file.filename)
    
    return schemas.DegreeWorkUploadResponse(
        filename=result["filename"],
        status=result["status"],
        message="File processed and data overwritten successfully" if result["records"] > 0 else "File processed but no data found",
        periodo=result["periodo"],
        curso=result["curso"],
        records_processed=result["records"]
    )

@router.get("/files", response_model=List[schemas.DegreeWorkFileResponse])
def get_files(db: Session = Depends(get_db)):
    files = db.query(models.DegreeWorkFile).all()
    response = []
    for f in files:
        count = db.query(models.DegreeWorkRecord).filter(models.DegreeWorkRecord.file_id == f.id).count()
        response.append({
            "id": f.id,
            "filename": f.filename,
            "periodo": f.periodo,
            "curso": f.curso,
            "uploaded_at": f.uploaded_at,
            "record_count": count
        })
    return response

@router.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    file_metadata = db.query(models.DegreeWorkFile).filter(models.DegreeWorkFile.id == file_id).first()
    if not file_metadata:
        raise HTTPException(status_code=404, detail="File not found")
    
    db.delete(file_metadata)
    db.commit()
    return {"status": "success", "message": "File and its associated records deleted"}

@router.get("/analytics", response_model=List[schemas.DegreeWorkAnalyticsResponse])
def get_analytics(db: Session = Depends(get_db)):
    # Group by periodo and programa_origen, count unique students
    results = db.query(
        models.DegreeWorkFile.periodo,
        models.DegreeWorkRecord.programa_origen,
        func.count(func.distinct(models.DegreeWorkRecord.documento)).label('student_count')
    ).join(
        models.DegreeWorkRecord, models.DegreeWorkFile.id == models.DegreeWorkRecord.file_id
    ).group_by(
        models.DegreeWorkFile.periodo,
        models.DegreeWorkRecord.programa_origen
    ).all()

    return [
        schemas.DegreeWorkAnalyticsResponse(
            periodo=r.periodo,
            programa_origen=r.programa_origen,
            student_count=r.student_count
        ) for r in results
    ]

@router.get("/records", response_model=List[schemas.DegreeWorkRecordResponse])
def get_records(db: Session = Depends(get_db)):
    # Subquery to check existence in students table
    records = db.query(
        models.DegreeWorkRecord.documento,
        models.DegreeWorkRecord.estudiante,
        models.DegreeWorkRecord.correo,
        models.DegreeWorkRecord.zona,
        models.DegreeWorkRecord.centro,
        models.DegreeWorkRecord.programa_origen,
        models.DegreeWorkFile.periodo,
        models.DegreeWorkFile.curso,
        models.Student.documento.label("student_exists")
    ).join(
        models.DegreeWorkFile, models.DegreeWorkFile.id == models.DegreeWorkRecord.file_id
    ).outerjoin(
        models.Student, models.Student.documento == models.DegreeWorkRecord.documento
    ).all()

    return [
        schemas.DegreeWorkRecordResponse(
            documento=r.documento,
            estudiante=r.estudiante,
            correo=r.correo,
            zona=r.zona,
            centro=r.centro,
            programa_origen=r.programa_origen,
            periodo=r.periodo,
            curso=r.curso,
            continuidad=r.student_exists is not None
        ) for r in records
    ]
