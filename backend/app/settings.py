from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    CORS_ORIGIN: str | None = None
    USE_CATALOG_MAT: int = 0
    MIGRATIONS_DIR: str = "sql"  # relative to project root

    model_config = SettingsConfigDict(env_file=".env", env_prefix="")

    def cors_origins(self) -> List[str]:
        # Browsers reject a wildcard origin when allow_credentials=True, so the
        # development default is an explicit list of local frontend origins.
        if not self.CORS_ORIGIN:
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "null",
            ]
        return [o.strip().rstrip("/") for o in self.CORS_ORIGIN.split(",") if o.strip()]

try:
    settings = Settings()
except ValidationError as error:
    missing = [str(e["loc"][0]) for e in error.errors() if e["type"] == "missing"]
    if "DATABASE_URL" not in missing:
        raise
    raise SystemExit(
        "DATABASE_URL is not set.\n"
        "Start the development database, which writes backend/.env:\n"
        "    ./scripts/dev-db.sh up\n"
        "Or set it in this shell:\n"
        '    export DATABASE_URL="$(./scripts/dev-db.sh url)"'
    ) from None
