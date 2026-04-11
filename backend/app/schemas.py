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
