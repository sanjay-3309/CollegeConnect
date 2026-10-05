"""Database connection helper for CollegeConnect."""

import os
from pathlib import Path
import pymysql
from dotenv import load_dotenv

# Load configuration from .env in the project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def get_db_connection():
    """
    Establish and return a MySQL connection using PyMySQL.
    Configuration parameters are read from environment variables (.env).
    """
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", 3306))
    database = os.getenv("MYSQL_DATABASE", "collegeconnect")
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")

    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4"
    )
