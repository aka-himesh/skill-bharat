"""
scripts/inspect_eshram.py — Inspect the real data.gov.in e-Shram API response.

Run ONCE with your real API key and resource ID to discover field names:
    cd <project_root>
    python backend/scripts/inspect_eshram.py

Prints:
  - HTTP status and response structure
  - All field names from the first record
  - Total record count
  - 5 sample records
  - Saves backend/data/samples/eshram_sample.json

Assumptions:
  - DATAGOV_API_KEY and ESHRAM_RESOURCE_ID are set in .env
  - The resource ID is for "District-wise Demographic Data of Unorganised
    Workers registered on eShram as on Previous Day"

If keys are not set, the script prints instructions and exits with code 1.
"""
import sys
import os
import json
from pathlib import Path

# Allow running from project root
_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_ROOT / "backend"))

from config import settings

def main():
    if not settings.DATAGOV_API_KEY:
        print("ERROR: DATAGOV_API_KEY is not set in .env")
        print("\nTo fix:")
        print("  1. Register at https://data.gov.in (free)")
        print("  2. Go to your profile → API Keys")
        print("  3. Copy your key and add to .env:")
        print("     DATAGOV_API_KEY=your_key_here")
        sys.exit(1)

    if not settings.ESHRAM_RESOURCE_ID:
        print("ERROR: ESHRAM_RESOURCE_ID is not set in .env")
        print("\nTo fix:")
        print("  1. Go to https://data.gov.in")
        print("  2. Search: 'eShram district demographic'")
        print("  3. Open the dataset: 'District-wise Demographic Data of Unorganised Workers...'")
        print("  4. Click the API tab → copy the resource ID (starts with 1d4d1c5a or similar)")
        print("  5. Add to .env:")
        print("     ESHRAM_RESOURCE_ID=your_resource_id_here")
        sys.exit(1)

    import httpx

    url = f"{settings.DATAGOV_BASE_URL}/{settings.ESHRAM_RESOURCE_ID}"
    params = {
        "api-key": settings.DATAGOV_API_KEY,
        "format": "json",
        "limit": 5,
        "offset": 0,
    }

    print(f"\n{'='*60}")
    print("AI-LMIS — e-Shram API Inspector")
    print(f"{'='*60}")
    print(f"URL: {url}")
    print(f"Params (key hidden): limit=5, offset=0, format=json")
    print(f"{'='*60}\n")

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(url, params=params)
        print(f"HTTP Status: {resp.status_code}")
        print(f"Content-Type: {resp.headers.get('content-type', 'unknown')}\n")

        if resp.status_code != 200:
            print(f"ERROR response body:\n{resp.text[:2000]}")
            sys.exit(1)

        data = resp.json()

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Print top-level structure
    print("Top-level keys:", list(data.keys()))
    total = data.get("total", data.get("count", "unknown"))
    print(f"Total records in dataset: {total}\n")

    # Records
    records = data.get("records", data.get("data", []))
    print(f"Records returned in this call: {len(records)}\n")

    if records:
        print("Field names in first record:")
        for i, (k, v) in enumerate(records[0].items()):
            print(f"  [{i:2d}] {k!r:40s} = {str(v)[:60]!r}")

        print(f"\n{'='*60}")
        print("5 Sample records:")
        print(f"{'='*60}")
        for i, rec in enumerate(records[:5]):
            print(f"\n--- Record {i+1} ---")
            for k, v in rec.items():
                print(f"  {k}: {v}")

        # Save sample
        sample_dir = _ROOT / "backend" / "data" / "samples"
        sample_dir.mkdir(parents=True, exist_ok=True)
        sample_path = sample_dir / "eshram_sample.json"
        with open(sample_path, "w", encoding="utf-8") as f:
            json.dump({
                "fetched_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                "url": url,
                "total_records": total,
                "sample_count": len(records),
                "field_names": list(records[0].keys()) if records else [],
                "sample": records,
            }, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Sample saved to: {sample_path}")
    else:
        print("WARNING: No records returned. Check that ESHRAM_RESOURCE_ID is correct.")
        print("Full response:")
        print(json.dumps(data, indent=2)[:3000])

    print(f"\n{'='*60}")
    print("NEXT STEPS:")
    print("  Update backend/connectors/eshram.py _normalise_record() with")
    print("  the real field names shown above, then run the full pipeline.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
