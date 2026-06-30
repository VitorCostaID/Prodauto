"""
Global configurable limits.
To change search or review limits, edit the values here — nowhere else.

AI settings are read from the .env file via config.py.
"""
from app.core.config import get_settings

_settings = get_settings()

# ── Search limits ──────────────────────────────────────────────────────────
MAX_SEARCH_RESULTS: int = 20        # maximum results per search request
DEFAULT_SEARCH_RESULTS: int = 10    # default if user doesn't specify

# ── Review limits ─────────────────────────────────────────────────────────
REVIEWS_PER_STAR: int = 1           # how many reviews to collect per star rating
MAX_REVIEWS_PER_STAR: int = 20      # hard ceiling the frontend can't exceed
STAR_RATINGS: list[int] = [5, 4, 3, 2, 1]  # order to scrape

# ── Perfect Product limits ────────────────────────────────────────────────
DESCRIPTIONS_FOR_AI: int = 5       # how many product descriptions to send to AI
PERFECT_PRODUCT_DAILY_LIMIT: int = 1  # placeholder for subscription later

# ── AI integration (from .env) ─────────────────────────────────────────────
AI_API_KEY: str = _settings.AI_API_KEY
AI_MODEL: str = _settings.AI_MODEL
AI_BASE_URL: str = _settings.AI_BASE_URL
