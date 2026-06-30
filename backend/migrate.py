import sqlite3
import os

db_path = "/app/data/analytics.db"

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}, checking local fallback")
    db_path = "./local_analytics.db"

print(f"Using DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Try adding columns. If they exist, it throws an OperationalError, which is fine.
    columns = [
        ("estado", "TEXT"),
        ("fecha_matricula_inicial", "TEXT"),
        ("periodo_matricula_inicial", "TEXT"),
        ("semestre_relativo", "INTEGER")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE students ADD COLUMN {col_name} {col_type};")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} probably already exists: {e}")
            
    conn.commit()
    conn.close()
    print("Migration finished successfully.")
except Exception as e:
    print(f"Error during migration: {e}")
