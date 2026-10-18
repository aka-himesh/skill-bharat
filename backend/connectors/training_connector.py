"""
training_connector.py — Skill India / PMKVY training data adapter.

CURRENT STATUS: MOCK (synthetic demonstration data)

REAL_INTEGRATION_NOTE:
  To connect real PMKVY/Skill India training data:
  1. Download official reports from skillindiadatabank.com or SDMS portal
  2. Use the CSV import endpoint (POST /api/imports) to load training data
  3. Verify sanctioned seat counts, enrolment, certification and placement figures
     against official NSDC/MSDE published aggregates
  4. Do not fabricate district-level breakdowns from state totals
  5. Change status to 'active' and provenance_type to 'official' after import
  6. This connector will be superseded by the CSV import once real data is loaded

NOTE: No public API for PMKVY training data has been identified.
Access requires official SDMS portal credentials or authorized data downloads.
"""
import random
from connectors.base import BaseConnector


class TrainingConnector(BaseConnector):

    def get_status(self) -> dict:
        return {
            "name": "Skill India / PMKVY Training Data",
            "adapter_name": "training_connector",
            "status": "mock",
            "provenance_type": "synthetic",
            "message": (
                "Using synthetic training centre and enrolment data. "
                "Real data requires official SDMS portal access or authorised CSV import."
            ),
            "last_updated": None,
            "real_connector_ready": False,
        }

    def get_metadata(self) -> dict:
        return {
            "source": "Skill Development Management System (SDMS) / PMKVY",
            "geography": "Training centre level (district aggregable)",
            "granularity": "Monthly enrolment and certification batches",
            "unit": "Trainees / Certified candidates / Placed candidates",
            "access": "SDMS portal credentials or Ministry-authorized data export",
            "indicators": [
                "sanctioned_seats", "enrolled", "certified", "placed",
                "training_centres_active"
            ],
            "limitations": [
                "No public API identified",
                "Placement data may undercount informal placements",
                "Certification ≠ placement; separate tracking required",
            ],
        }

    def fetch_data(self, district_id: int = None, occupation_id: int = None,
                   month: str = None, **kwargs) -> list[dict]:
        """Returns synthetic training capacity data for the given filters."""
        rng = random.Random(hash((district_id, occupation_id, month, 42)) % (2**31))
        seats = rng.randint(20, 200)
        enroll_rate = rng.uniform(0.6, 0.95)
        cert_rate = rng.uniform(0.5, 0.85)
        place_rate = rng.uniform(0.4, 0.75)
        return [
            {
                "source_name": "training",
                "district_id": district_id,
                "occupation_id": occupation_id,
                "month": month or "2024-01",
                "sanctioned_seats": seats,
                "enrolled": int(seats * enroll_rate),
                "certified": int(seats * enroll_rate * cert_rate),
                "placed": int(seats * enroll_rate * cert_rate * place_rate),
                "is_synthetic": True,
                "provenance_type": "synthetic",
                "reference_period": month or "2024-01",
            }
        ]
