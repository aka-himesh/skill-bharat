"""
job_portal_connector.py — Aggregated job portal demand signal adapter.

CURRENT STATUS: MOCK (synthetic demonstration data)

REAL_INTEGRATION_NOTE:
  To connect real job portal data:
  1. Obtain data-sharing agreements with major Indian job portals
     (e.g. Naukri, Indeed India, Monster India) or use NCS job posting API
  2. Aggregate postings by NCO occupation code and district
  3. De-duplicate cross-posted listings before counting
  4. Set appropriate API keys in .env
  5. Note: Job postings count employer intent, not guaranteed vacancies
  6. Update status to 'active' and provenance_type to 'official'

INDICATOR NOTES:
  Job postings are a leading indicator of demand.
  They over-represent formal/urban sector and under-represent informal labour.
  Apply appropriate weighting accordingly.
"""
import random
from connectors.base import BaseConnector


class JobPortalConnector(BaseConnector):

    def get_status(self) -> dict:
        return {
            "name": "Job Portal Aggregated Signals",
            "adapter_name": "job_portal_connector",
            "status": "mock",
            "provenance_type": "synthetic",
            "message": (
                "Synthetic job posting signals. Real integration requires "
                "data-sharing agreements with job portals."
            ),
            "last_updated": None,
            "real_connector_ready": False,
        }

    def get_metadata(self) -> dict:
        return {
            "source": "Aggregated Indian Job Portals (simulated)",
            "geography": "District-level (when real data available)",
            "granularity": "Monthly posting counts",
            "unit": "Job postings (not guaranteed vacancies)",
            "access": "Data-sharing agreements required with each portal",
            "indicators": ["job_postings", "unique_employers", "avg_salary_range"],
            "limitations": [
                "Formal sector bias",
                "Urban/semi-urban over-representation",
                "Duplicate postings across portals possible",
                "Posted ≠ filled",
            ],
        }

    def fetch_data(self, district_id: int = None, occupation_id: int = None,
                   month: str = None, **kwargs) -> list[dict]:
        """Returns synthetic job portal posting signals."""
        rng = random.Random(hash((district_id, occupation_id, month, 99)) % (2**31))
        return [
            {
                "source_name": "job_portal",
                "district_id": district_id,
                "occupation_id": occupation_id,
                "month": month or "2024-01",
                "job_postings": rng.randint(10, 1000),
                "is_synthetic": True,
                "provenance_type": "synthetic",
                "reference_period": month or "2024-01",
            }
        ]
