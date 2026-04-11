import pandas as pd
import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import FileMetadata, Student, EnrollmentRecord
from fastapi import HTTPException

# Excel Columns
# A: Periodo (0)
# C: Documento (2)
# D: Nombre (3)
# G: Zona (6)
# H: Centro (7)
# I: Condicion (8)
# AA: Creditos totales matriculados (26)
# AB: Correo Institucional (27)

def extract_metadata_from_filename(filename: str):
    # ActasDeMatricula_p1704_pr20301.xlsx
    match = re.search(r'_p(\d+)_pr(\d+)', filename)
    if not match:
        raise ValueError("Filename does not match expected nomenclature: ActasDeMatricula_pPERIODO_prPROGRAMA.xlsx")
    return match.group(1), match.group(2)

def process_excel_upload(db: Session, file_content: bytes, filename: str):
    try:
        periodo, programa = extract_metadata_from_filename(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        # Read excel from bytes
        import io
        # Use columns 0, 2, 3, 6, 7, 8, 26, 27
        # Note: pandas usecols can take integers for column indices or letters
        # but letters is safer. "A,C,D,G,H,I,AA,AB"
        df = pd.read_excel(io.BytesIO(file_content), header=13, usecols="A,C,D,G,H,I,AA,AB")
        
        # Rename columns to ensure consistency in code
        df.columns = ['Periodo', 'Documento', 'Nombre', 'Zona', 'Centro', 'Condicion', 'Creditos_totales', 'Correo_Institucional']
        
        # Drop rows where Documento is NaN (safety)
        df = df.dropna(subset=['Documento'])

        # Check if file/period already exists, if so, delete it to OVERWRITE
        existing_file = db.query(FileMetadata).filter(FileMetadata.periodo == periodo, FileMetadata.programa == programa).first()
        if existing_file:
            db.delete(existing_file)
            db.commit()

        # Create new FileMetadata
        new_file = FileMetadata(filename=filename, periodo=periodo, programa=programa)
        db.add(new_file)
        db.commit()
        db.refresh(new_file)

        # Upsert Students and Bulk Insert Enrollments
        students_to_add = {}
        enrollment_records = []

        # Get existing students mapping
        unique_docs = df['Documento'].astype(str).unique().tolist()
        existing_students = db.query(Student).filter(Student.documento.in_(unique_docs)).all()
        student_set = {s.documento: s for s in existing_students}

        for _, row in df.iterrows():
            documento = str(row['Documento']).strip()
            # If completely new student
            if documento not in student_set and documento not in students_to_add:
                students_to_add[documento] = Student(
                    documento=documento,
                    nombre=str(row['Nombre']).strip() if pd.notnull(row['Nombre']) else "",
                    correo_institucional=str(row['Correo_Institucional']).strip() if pd.notnull(row['Correo_Institucional']) else ""
                )

            # Create Enrollment Record
            # Ensure credits is int
            creditos = 0
            try:
                creditos = int(row['Creditos_totales'])
            except:
                pass

            enrollment_records.append(
                EnrollmentRecord(
                    student_id=documento,
                    file_id=new_file.id,
                    periodo=periodo,
                    zona=str(row['Zona']).strip() if pd.notnull(row['Zona']) else "",
                    centro=str(row['Centro']).strip() if pd.notnull(row['Centro']) else "",
                    condicion=str(row['Condicion']).strip() if pd.notnull(row['Condicion']) else "",
                    creditos_totales=creditos
                )
            )

        # Bulk save students
        if students_to_add:
            db.bulk_save_objects(list(students_to_add.values()))
            db.commit()

        # Bulk save enrollments
        db.bulk_save_objects(enrollment_records)
        db.commit()

        return {"filename": filename, "status": "success", "periodo": periodo, "programa": programa, "records": len(enrollment_records)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
