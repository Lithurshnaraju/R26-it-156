"""
Database Setup
Uses SQLite — no installation needed. The database file (aquaguard.db)
is created automatically when you first run the server.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import DATABASE_URL

# Create the database engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Create a session factory
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Base class for all database models
class Base(DeclarativeBase):
    pass


# This function gives each API endpoint a database connection
async def get_db():
    async with async_session() as session:
        yield session


# This creates all the database tables on startup
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created!")
