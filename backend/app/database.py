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

def init_db():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            columns = [
                ("estado", "VARCHAR"),
                ("fecha_matricula_inicial", "VARCHAR"),
                ("periodo_matricula_inicial", "VARCHAR"),
                ("semestre_relativo", "INTEGER")
            ]
            for col, col_type in columns:
                try:
                    conn.execute(text(f"ALTER TABLE students ADD COLUMN {col} {col_type}"))
                except Exception:
                    pass
            conn.commit()
    except Exception:
        pass

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
