import os
from jdm_electron_flask import JDMDevelopmentConfig, JDMProductionConfig, JDMDeployedConfig

class AppConfig:
    """Shared app-level fields across all environments."""
    MAX_WORKERS     = int(os.getenv("MAX_WORKERS", "2"))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))
    SUPABASE_URL    = os.environ.get("SUPABASE_URL", "").strip()
    SUPABASE_KEY    = os.environ.get("SUPABASE_KEY", "").strip()

class DevelopmentConfig(AppConfig, JDMDevelopmentConfig): pass
class ProductionConfig(AppConfig, JDMProductionConfig):   pass
class DeployedConfig(AppConfig, JDMDeployedConfig):       pass
