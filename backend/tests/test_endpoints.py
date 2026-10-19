import httpx, sys

base = "http://localhost:8000"

print("HEALTH:", httpx.get(f"{base}/health", timeout=5).json())

r = httpx.post(f"{base}/api/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
print("AUTH:", r.status_code)
if r.status_code != 200:
    print("Login failed:", r.text[:300])
    sys.exit(1)

token = r.json().get("access_token", "")
print("Token OK:", token[:20])
h = {"Authorization": f"Bearer {token}"}

# News
r = httpx.get(f"{base}/api/news?limit=3", headers=h, timeout=10)
print("\nNEWS:", r.status_code)
d = r.json()
print("  source:", d.get("source"))
print("  provider:", d.get("provider"))
print("  items:", len(d.get("items", [])))
if d.get("items"):
    print("  first:", d["items"][0]["title"][:70])

# e-Shram summary
r = httpx.get(f"{base}/api/eshram/summary", headers=h, timeout=10)
print("\nESHRAM:", r.status_code)
d = r.json()
print("  source:", d.get("source"))
print("  national_total:", d.get("national_total"))
print("  states:", len(d.get("state_totals", [])))

# e-Shram districts
r = httpx.get(f"{base}/api/eshram/districts?state=Maharashtra", headers=h, timeout=10)
print("\nESHRAM DISTRICTS (MH):", r.status_code)
d = r.json()
print("  count:", d.get("count", 0), "source:", d.get("source"))

# Sources status
r = httpx.get(f"{base}/api/sources/status", headers=h, timeout=10)
print("\nSOURCES:", r.status_code, "total:", r.json().get("total"))
for s in r.json().get("sources", []):
    print(f"  {s.get('name','?')}: {s.get('status','?')}")

print("\nAll endpoints OK!")
