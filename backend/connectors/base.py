"""
base.py — Abstract connector interface for AI-LMIS source adapters.

All connectors must implement this interface so the pipeline and API
can treat them uniformly regardless of whether data is live or synthetic.
"""
from abc import ABC, abstractmethod
from typing import Any


class BaseConnector(ABC):
    """Base class for all source adapters."""

    @abstractmethod
    def get_status(self) -> dict:
        """
        Return the current operational status of this connector.
        Schema: {
            name: str,
            adapter_name: str,
            status: 'mock' | 'active' | 'unavailable' | 'stub',
            provenance_type: 'synthetic' | 'official' | 'stub',
            message: str,
            last_updated: str (ISO datetime or None)
        }
        """

    @abstractmethod
    def get_metadata(self) -> dict:
        """
        Return metadata describing this source: geography, granularity,
        reference period, unit, indicator definitions, access requirements.
        """

    @abstractmethod
    def fetch_data(self, **kwargs) -> list[dict[str, Any]]:
        """
        Fetch data records. Returns a list of dicts.
        Each dict must include 'is_synthetic', 'source_name', and 'reference_period'.
        Raises NotImplementedError if real integration stub is not yet activated.
        """
