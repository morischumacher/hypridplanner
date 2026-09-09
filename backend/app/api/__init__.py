"""HTTP surface. Handlers validate input and call one service; status codes are
decided only in `errors.py`."""
from fastapi import APIRouter

from .auth import router as auth_router
from .catalog import router as catalog_router
from .curriculum import router as curriculum_router
from .planner_state import router as planner_state_router
from .profile_settings import router as profile_settings_router
from .recommendations import router as recommendations_router
from .rulecheck import router as rulecheck_router
from .user_study import router as user_study_router

router = APIRouter()

for included in (
    catalog_router,
    curriculum_router,
    rulecheck_router,
    auth_router,
    planner_state_router,
    profile_settings_router,
    recommendations_router,
    user_study_router,
):
    router.include_router(included)

__all__ = ["router"]
