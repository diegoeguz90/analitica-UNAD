from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.services.etl_service import process_excel_upload
from typing import List

router = APIRouter()

@router.post("/upload", response_model=schemas.FileUploadResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
    
    content = await file.read()
    result = process_excel_upload(db, content, file.filename)
    
    return schemas.FileUploadResponse(
        filename=result["filename"],
        status=result["status"],
        message="File processed and data overwritten successfully" if result["records"] > 0 else "File processed but no data found",
        periodo=result["periodo"],
        programa=result["programa"],
        records_processed=result["records"]
    )

from app.services.etl_service import process_enrichment_file

@router.post("/upload_enrichment")
async def upload_enrichment_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
    
    content = await file.read()
    result = process_enrichment_file(db, content, file.filename)
    
    return {
        "status": "success",
        "message": f"Archivo de enriquecimiento procesado. {result['updated']} estudiantes actualizados.",
        "filename": file.filename,
        "records_updated": result["updated"]
    }

@router.get("/", response_model=List[schemas.FileMetadataResponse])
def get_files(db: Session = Depends(get_db)):
    files = db.query(models.FileMetadata).all()
    response = []
    for f in files:
        count = db.query(models.EnrollmentRecord).filter(models.EnrollmentRecord.file_id == f.id).count()
        response.append({
            "id": f.id,
            "filename": f.filename,
            "periodo": f.periodo,
            "programa": f.programa,
            "uploaded_at": f.uploaded_at,
            "record_count": count
        })
    return response

@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    file_metadata = db.query(models.FileMetadata).filter(models.FileMetadata.id == file_id).first()
    if not file_metadata:
        raise HTTPException(status_code=404, detail="File not found")
    
    # If it's the master enrichment file, clear the student fields
    if file_metadata.periodo == "MAESTRO" and file_metadata.programa == "ESTADO":
        db.query(models.Student).update({
            models.Student.estado: None,
            models.Student.fecha_matricula_inicial: None,
            models.Student.periodo_matricula_inicial: None,
            models.Student.semestre_relativo: None
        })

    db.delete(file_metadata)
    db.commit()
    return {"status": "success", "message": "File and its associated records deleted"}
