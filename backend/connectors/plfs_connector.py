"""
plfs_connector.py — PLFS / MoSPI e-Sankhyiki source adapter.

CURRENT STATUS: MOCK (synthetic demonstration data)

REAL_INTEGRATION_NOTE:
  To connect real PLFS data:
  1. Obtain authorized access to MoSPI e-Sankhyiki portal (https://esankhyiki.mospi.gov.in/)
  2. Download PLFS Annual/Quarterly reports (state-level CSV/Excel)
  3. Set MOSPI_API_KEY in .env if an API becomes available
  4. Replace fetch_data() below with a real HTTP call or CSV parser
  5. Change status to 'active' and provenance_type to 'official'
  6. PLFS provides state-level aggregates — do NOT fabricate district-level breakdowns
     from state totals without statistical justification.

INDICATOR NOTES:
  PLFS measures Labour Force Participation Rate (LFPR), Worker Population Ratio (WPR),
  Unemployment Rate (UR) — these are CONTEXTUAL indicators, not vacancy counts.
  Use them only for calibration and context, not as direct demand signals.
"""
from datetime import datetime
from connectors.base import BaseConnector
from config import settings


class PLFSConnector(BaseConnector):

    def get_status(self) -> dict:
        return {
            "name": "PLFS / MoSPI e-Sankhyiki",
            "adapter_name": "plfs_connector",
            "status": "mock",
            "provenance_type": "synthetic",
            "message": (
                "Real integration requires authorized MoSPI e-Sankhyiki access. "
                "Using synthetic demonstration data. PLFS is a contextual indicator "
                "(LFPR/WPR/UR), not a direct vacancy count."
            ),
            "last_updated": None,
            "real_connector_ready": bool(settings.MOSPI_API_KEY),
        }

    def get_metadata(self) -> dict:
        return {
            "source": "Periodic Labour Force Survey (PLFS), MoSPI",
            "geography": "State-level (national and state aggregates only)",
            "granularity": "Annual / Quarterly",
            "unit": "Rate (LFPR, WPR, UR) — not vacancy counts",
            "reference_period": "2021-22 to 2023-24 (latest available)",
            "indicators": ["LFPR", "WPR", "UR"],
            "access": "Public reports available at mospi.gov.in; unit-level data requires authorization",
            "limitations": [
                "District-level PLFS data is not officially published",
                "Do not disaggregate state totals to districts without justification",
                "Contextual indicator only — not a demand signal",
            ],
        }

    def fetch_data(self, **kwargs) -> list[dict]:
        """
        Returns synthetic PLFS-style contextual indicators for pilot states.
        These are demonstration values, clearly labelled as synthetic.
        """
        synthetic_plfs = [
            {"state": "Uttar Pradesh",  "year": "2023-24", "lfpr": 46.2, "wpr": 43.1, "ur": 6.7},
            {"state": "Maharashtra",    "year": "2023-24", "lfpr": 49.8, "wpr": 47.2, "ur": 5.2},
            {"state": "Tamil Nadu",     "year": "2023-24", "lfpr": 51.3, "wpr": 49.1, "ur": 4.3},
            {"state": "Madhya Pradesh", "year": "2023-24", "lfpr": 47.5, "wpr": 44.9, "ur": 5.5},
        ]
        return [
            {**r, "is_synthetic": True, "source_name": "plfs",
             "reference_period": r["year"], "provenance_type": "synthetic"}
            for r in synthetic_plfs
        ]
