"""MoSPI PLFS connector backed by the live e-Sankhyiki adapter.

PLFS employment indicators are state-level context, not vacancy counts.
"""
from adapters.mospi_adapter import MospiAdapter
from connectors.base import BaseConnector


class PLFSConnector(BaseConnector):
    def __init__(self):
        self.adapter = MospiAdapter()

    def get_status(self) -> dict:
        status = self.adapter.get_status()
        return {**status, "name": "PLFS / MoSPI e-Sankhyiki", "adapter_name": "mospi_adapter",
                "provenance_type": status["provenance"], "real_connector_ready": status["configured"]}

    def get_metadata(self) -> dict:
        return {
            "source": "Periodic Labour Force Survey (PLFS), MoSPI",
            "geography": "State-level", "granularity": "Annual / Quarterly / Monthly",
            "unit": "LFPR, WPR, UR rates; not vacancy counts",
            "indicators": ["LFPR", "WPR", "UR"],
            "discovery_workflow": "get_indicators -> get_metadata -> get_data",
            "limitations": ["No district disaggregation is inferred from state values.",
                            "PLFS measures employment context, not job vacancies."],
        }

    def fetch_data(self, **kwargs) -> list[dict]:
        result = self.adapter.fetch_data(**kwargs)
        return result.get("data") or []
