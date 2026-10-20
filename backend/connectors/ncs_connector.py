"""National Career Service connector. Live contract remains unverified pending DGE approval."""
from adapters.ncs_adapter import NCSAdapter
from connectors.base import BaseConnector


class NCSConnector(BaseConnector):
    def __init__(self):
        self.adapter = NCSAdapter()

    def get_status(self) -> dict:
        status = self.adapter.get_status()
        return {**status, "adapter_name": "ncs_adapter",
                "provenance_type": status["provenance"], "real_connector_ready": status["configured"]}

    def get_metadata(self) -> dict:
        return {
            "source": "National Career Service (NCS)",
            "geography": "As returned by the DGE-approved endpoint",
            "granularity": "As approved by DGE",
            "unit": "Job vacancies or postings; endpoint schema unverified",
            "access": "Formal DGE approval required",
            "schema_status": "UNVERIFIED until real access is granted",
            "limitations": ["Job postings are not guaranteed vacancies.",
                            "Do not treat NCS as live until endpoint and schema are verified."],
        }

    def fetch_data(self, **kwargs) -> list[dict]:
        result = self.adapter.fetch_data(kwargs or None)
        return result.get("data") or []
