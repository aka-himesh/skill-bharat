"""test_filter_endpoints.py — Verifies that all filter parameters work properly."""
import httpx
import sys

base = "http://localhost:8000"

def test_filters():
    # 1. Login
    r = httpx.post(f"{base}/api/auth/login", json={"pin": "26246", "password": "zeroone"}, timeout=5)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    # 2. States
    r_states = httpx.get(f"{base}/api/geo/states", headers=h, timeout=5)
    assert r_states.status_code == 200
    states = r_states.json()
    assert len(states) >= 4, f"Expected at least 4 pilot states, got {len(states)}"
    state_id = states[0]["id"]
    state_name = states[0]["name"]
    print(f"[OK] States loaded: {len(states)} states. Selected: {state_name} (ID: {state_id})")

    # 3. Districts for this state
    r_districts = httpx.get(f"{base}/api/geo/districts?state_id={state_id}", headers=h, timeout=5)
    assert r_districts.status_code == 200
    districts = r_districts.json()
    assert len(districts) > 0, "Expected districts for state"
    district_id = districts[0]["id"]
    district_name = districts[0]["name"]
    print(f"[OK] Districts for {state_name}: {len(districts)} districts. Selected: {district_name} (ID: {district_id})")

    # 4. Gaps with state filter
    r_gaps_state = httpx.get(f"{base}/api/gaps?state_id={state_id}", headers=h, timeout=5)
    assert r_gaps_state.status_code == 200
    gaps_st = r_gaps_state.json()["gaps"]
    for g in gaps_st:
        assert g["state_id"] == state_id or g["state_name"] == state_name
        assert "nsqf_level" in g
        assert "is_aspirational" in g
    print(f"[OK] Gaps for {state_name}: {len(gaps_st)} records, all verified state_id and attributes.")

    # 5. Gaps with district filter
    r_gaps_dist = httpx.get(f"{base}/api/gaps?district_id={district_id}", headers=h, timeout=5)
    assert r_gaps_dist.status_code == 200
    gaps_dist = r_gaps_dist.json()["gaps"]
    for g in gaps_dist:
        assert g["district_id"] == district_id
    print(f"[OK] Gaps for district {district_name}: {len(gaps_dist)} records.")

    # 6. Summary with state filter
    r_sum_nat = httpx.get(f"{base}/api/summary", headers=h, timeout=5).json()
    r_sum_st = httpx.get(f"{base}/api/summary?state_id={state_id}", headers=h, timeout=5).json()
    assert r_sum_st["states"] == 1
    assert r_sum_st["districts"] == len(districts)
    print(f"[OK] Summary: National districts={r_sum_nat['districts']}, State districts={r_sum_st['districts']}")

    # 7. Alerts with state filter
    r_alerts_st = httpx.get(f"{base}/api/alerts?state_id={state_id}", headers=h, timeout=5)
    assert r_alerts_st.status_code == 200
    print(f"[OK] Alerts for {state_name}: {r_alerts_st.json()['count']} alerts.")

    # 8. Recommendations with state filter
    r_recs_st = httpx.get(f"{base}/api/recommendations?state_id={state_id}", headers=h, timeout=5)
    assert r_recs_st.status_code == 200
    print(f"[OK] Recommendations for {state_name}: {r_recs_st.json()['count']} recommendations.")

    # 9. Ranking with state filter
    r_rank_st = httpx.get(f"{base}/api/ranking?state_id={state_id}", headers=h, timeout=5)
    assert r_rank_st.status_code == 200
    print(f"[OK] Ranking for {state_name}: {r_rank_st.json()['count']} items.")

    print("\n>>> ALL FILTER ENDPOINTS WORKING PERFECTLY! <<<")

if __name__ == "__main__":
    test_filters()
