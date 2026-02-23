import sqlite_vec
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# For SQLite, we need to allow multiple threads to access the connection
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

@event.listens_for(engine, "connect")
def load_extension(dbapi_connection, connection_record):
    dbapi_connection.enable_load_extension(True)
    sqlite_vec.load(dbapi_connection)
    dbapi_connection.enable_load_extension(False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_vec_table():
    from sqlalchemy import text
    with engine.connect() as conn:
        # Reset the table to apply dimension change (768)
        # conn.execute(text("DROP TABLE IF EXISTS vec_entries"))
        
        conn.execute(text(
            "CREATE VIRTUAL TABLE IF NOT EXISTS vec_entries USING vec0("
            "entry_id INTEGER PRIMARY KEY, "
            "embedding float[768]" # Finalized at 768 dimensions (normalized)
            ")"
        ))
        conn.commit()
