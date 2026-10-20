"""Adapters for optional external statistical and labour-market sources."""

from .mospi_adapter import MospiAdapter
from .ncs_adapter import NCSAdapter
from .data_gov_in_adapter import DataGovInAdapter

__all__ = ["MospiAdapter", "NCSAdapter", "DataGovInAdapter"]
