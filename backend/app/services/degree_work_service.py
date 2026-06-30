import pandas as pd
import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import DegreeWorkFile, DegreeWorkRecord
from fastapi import HTTPException
import io

def extract_metadata(filename: str):
    # Reporte_Matricula_1704_203018207.xlsx
    match = re.search(r'Reporte_Matricula_(\d+)_(\d+)', filename)
    if not match:
        raise ValueError("Filename does not match expected nomenclature: Reporte_Matricula_PERIODO_CURSO.xlsx")
    return match.group(1), match.group(2)

def process_degree_work_excel(db: Session, file_content: bytes, filename: str):
    try:
        periodo, curso = extract_metadata(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        # Col B (1): Documento
        # Col C (2): Estudiante
        # Col D (3): Correo
        # Col E (4): Zona
        # Col F (5): Centro
        # Col H (7): Programa de origen
        # header=14 means row 15 in Excel
        df = pd.read_excel(io.BytesIO(file_content), header=14, usecols="B:F,H")
        
        df.columns = ['Documento', 'Estudiante', 'Correo', 'Zona', 'Centro', 'Programa_Origen']
        
        # Drop rows where Documento is NaN
        df = df.dropna(subset=['Documento'])

        # Check if file already exists, if so, delete it to OVERWRITE
        existing_file = db.query(DegreeWorkFile).filter(
            DegreeWorkFile.periodo == periodo, 
            DegreeWorkFile.curso == curso
        ).first()
        
        if existing_file:
            db.delete(existing_file)
            db.commit()

        # Create new DegreeWorkFile
        new_file = DegreeWorkFile(filename=filename, periodo=periodo, curso=curso)
        db.add(new_file)
        db.commit()
        db.refresh(new_file)

        records_to_insert = []
        
        for _, row in df.iterrows():
            doc = str(row['Documento']).strip()
            
            records_to_insert.append(
                DegreeWorkRecord(
                    file_id=new_file.id,
                    documento=doc,
                    estudiante=str(row['Estudiante']).strip() if pd.notnull(row['Estudiante']) else "",
                    correo=str(row['Correo']).strip() if pd.notnull(row['Correo']) else "",
                    zona=str(row['Zona']).strip() if pd.notnull(row['Zona']) else "",
                    centro=str(row['Centro']).strip() if pd.notnull(row['Centro']) else "",
                    programa_origen=str(row['Programa_Origen']).strip() if pd.notnull(row['Programa_Origen']) else ""
                )
            )

        # Bulk save
        if records_to_insert:
            db.bulk_save_objects(records_to_insert)
            db.commit()

        return {
            "filename": filename,
            "status": "success",
            "periodo": periodo,
            "curso": curso,
            "records": len(records_to_insert)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
