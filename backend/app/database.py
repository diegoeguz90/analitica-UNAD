import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Make sure the data directory exists
os.makedirs("/app/data", exist_ok=True)
SQLALCHEMY_DATABASE_URL = "sqlite:////app/data/analytics.db"
# Fallback for local non-docker testing
if not os.path.exists("/app"):
    SQLALCHEMY_DATABASE_URL = "sqlite:///./local_analytics.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
