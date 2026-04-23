from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class FileMetadataBase(BaseModel):
    filename: str
    periodo: str
    programa: str

class FileMetadataResponse(FileMetadataBase):
    id: int
    uploaded_at: datetime
    record_count: int = 0

    class Config:
        from_attributes = True

class FileUploadResponse(BaseModel):
    filename: str
    status: str
    message: str
    periodo: Optional[str] = None
    programa: Optional[str] = None
    records_processed: int = 0

class AnalyticsSummaryResponse(BaseModel):
    total_enrollments: int
    unique_students_total: int
    unique_students_per_period: list[dict]
    total_credits_per_period: list[dict]
    distribution_by_zone: list[dict]
    top_zones: list[dict]
    top_centers: list[dict]

class DegreeWorkFileResponse(BaseModel):
    id: int
    filename: str
    periodo: str
    curso: str
    uploaded_at: datetime
    record_count: int = 0

    class Config:
        from_attributes = True

class DegreeWorkUploadResponse(BaseModel):
    filename: str
    status: str
    message: str
    periodo: Optional[str] = None
    curso: Optional[str] = None
    records_processed: int = 0

class DegreeWorkAnalyticsResponse(BaseModel):
    periodo: str
    programa_origen: str
    student_count: int

class DegreeWorkRecordResponse(BaseModel):
    documento: str
    estudiante: str
    correo: str
    zona: str
    centro: str
    programa_origen: str
    periodo: str
    curso: str
    continuidad: bool = False

    class Config:
        from_attributes = True
