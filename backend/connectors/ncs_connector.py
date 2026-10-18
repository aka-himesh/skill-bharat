"""
ncs_connector.py — National Career Service (NCS) source adapter.

CURRENT STATUS: STUB (documented real-integration interface, mock data)

REAL_INTEGRATION_NOTE:
  To connect real NCS job-demand data:
  1. Apply for NCS API access via NIC / Ministry of Labour portal
  2. Set NCS_API_KEY in .env
  3. Replace fetch_data() with authenticated API calls to NCS endpoints
  4. Map NCS job category codes to NCO taxonomy in the occupation master table
  5. Change status to 'active' and provenance_type to 'official'

NCS provides job postings, candidate registrations, and placement data.
Treat postings as demand signals (not guaranteed vacancies).
"""
import random
from datetime import datetime
from connectors.base import BaseConnector
from config import settings


class NCSConnector(BaseConnector):

    def get_status(self) -> dict:
        return {
            "name": "National Career Service (NCS)",
            "adapter_name": "ncs_connector",
            "status": "stub",
            "provenance_type": "synthetic",
            "message": (
                "Real integration requires NCS API authorization from NIC/Ministry of Labour. "
                "Stub connector in place. Using synthetic job-demand signals for demo."
            ),
            "last_updated": None,
            "real_connector_ready": bool(settings.NCS_API_KEY),
        }

    def get_metadata(self) -> dict:
        return {
            "source": "National Career Service Portal (NCS)",
            "geography": "District-level (when API access granted)",
            "granularity": "Monthly job postings and registrations",
            "unit": "Job postings / candidate registrations",
            "access": "Requires NCS API key from NIC/Ministry of Labour",
            "indicators": ["job_postings", "candidate_registrations", "placements"],
            "limitations": [
                "Job postings are not guaranteed vacancies",
                "Self-reported data may have coverage gaps",
                "Formal sector bias — informal labour market underrepresented",
            ],
        }

    def fetch_data(self, district: str = None, occupation: str = None,
                   month: str = None, **kwargs) -> list[dict]:
        """
        STUB: Returns synthetic NCS-style job posting signals.
        Replace with real API call when NCS_API_KEY is configured.
        """
        if settings.NCS_API_KEY:
            raise NotImplementedError(
                "Real NCS integration not yet implemented. "
                "Add fetch logic using NCS_API_KEY from settings."
            )
        # Return synthetic placeholder
        rng = random.Random(42)
        return [
            {
                "source_name": "ncs",
                "district": district or "All",
                "occupation": occupation or "All",
                "month": month or "2024-01",
                "job_postings": rng.randint(50, 500),
                "is_synthetic": True,
                "provenance_type": "synthetic",
                "reference_period": month or "2024-01",
            }
        ]
