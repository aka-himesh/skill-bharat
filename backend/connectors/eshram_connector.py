"""
eshram_connector.py — e-Shram worker registration source adapter.

CURRENT STATUS: MOCK (contextual indicator only)

REAL_INTEGRATION_NOTE:
  To connect real e-Shram data:
  1. Obtain authorized data-sharing agreement from Ministry of Labour & Employment
  2. Set ESHRAM_API_KEY in .env
  3. Replace fetch_data() with authorized API/bulk-export calls
  4. Treat data as CONTEXTUAL INDICATOR only:
     - e-Shram registrations = unorganised workforce count, NOT vacancy count
     - Use for workforce composition context, not demand signal
  5. Change status to 'active' and provenance_type to 'official'

IMPORTANT: e-Shram worker registrations indicate where the unorganised workforce
is located, not where job vacancies exist. Do not interpret registration counts
as unfilled demand.
"""
import random
from connectors.base import BaseConnector
from config import settings


class EShramConnector(BaseConnector):

    def get_status(self) -> dict:
        return {
            "name": "e-Shram (Unorganised Worker Registry)",
            "adapter_name": "eshram_connector",
            "status": "mock",
            "provenance_type": "synthetic",
            "message": (
                "Real integration requires authorized data-sharing agreement with "
                "Ministry of Labour & Employment. e-Shram registrations are a "
                "CONTEXTUAL indicator (workforce composition), not a vacancy count."
            ),
            "last_updated": None,
            "real_connector_ready": bool(settings.ESHRAM_API_KEY),
        }

    def get_metadata(self) -> dict:
        return {
            "source": "e-Shram National Database of Unorganised Workers",
            "geography": "State / District level",
            "granularity": "Cumulative registrations (monthly updates)",
            "unit": "Worker registrations (not vacancies)",
            "access": "Requires Ministry of Labour & Employment authorization",
            "indicators": ["worker_registrations", "sector_distribution", "age_distribution"],
            "limitations": [
                "Registrations are self-reported by workers",
                "Counts workforce presence, not employer demand",
                "Informal sector coverage may be incomplete",
                "Should NOT be used as a demand signal without further calibration",
            ],
        }

    def fetch_data(self, district: str = None, sector: str = None, **kwargs) -> list[dict]:
        """
        Returns synthetic e-Shram-style worker registration counts.
        Contextual indicator only — not a vacancy count.
        """
        if settings.ESHRAM_API_KEY:
            raise NotImplementedError(
                "Real e-Shram integration not yet implemented. "
                "Add fetch logic using ESHRAM_API_KEY from settings."
            )
        rng = random.Random(42)
        return [
            {
                "source_name": "eshram",
                "district": district or "All",
                "sector": sector or "All",
                "worker_registrations": rng.randint(5000, 50000),
                "is_synthetic": True,
                "provenance_type": "synthetic",
                "reference_period": "2024-01",
                "context_note": "Contextual indicator — not a vacancy count",
            }
        ]
