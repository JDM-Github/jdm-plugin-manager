"""API blueprints package."""
from .auth import AuthBlueprint
from .client import SupabaseBlueprint
from .health import HealthBlueprint
from .manage import ManageBlueprint
from .plugin import PluginBlueprint

__all__ = ["AuthBlueprint", "SupabaseBlueprint", "HealthBlueprint", "ManageBlueprint", "PluginBlueprint"]