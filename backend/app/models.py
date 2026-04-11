from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    periodo = Column(String, index=True)
    programa = Column(String, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship("EnrollmentRecord", back_populates="file", cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    documento = Column(String, primary_key=True, index=True) # Unique ID (Column C in regular, B in enrichment)
    nombre = Column(String)
    correo_institucional = Column(String)
    
    # Enrichment Fields
    estado = Column(String, nullable=True)
    fecha_matricula_inicial = Column(String, nullable=True)
    periodo_matricula_inicial = Column(String, nullable=True)
    semestre_relativo = Column(Integer, nullable=True)

    enrollments = relationship("EnrollmentRecord", back_populates="student")

class EnrollmentRecord(Base):
    __tablename__ = "enrollment_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.documento"), index=True)
    file_id = Column(Integer, ForeignKey("file_metadata.id"), index=True)
    periodo = Column(String, index=True)
    zona = Column(String)
    centro = Column(String)
    condicion = Column(String)
    creditos_totales = Column(Integer)

    file = relationship("FileMetadata", back_populates="enrollments")
    student = relationship("Student", back_populates="enrollments")
