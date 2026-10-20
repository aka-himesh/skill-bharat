# External source adapters

The adapters live in `backend/adapters/` and use the backend's `backend/.env` configuration. Copy `backend/.env.example` to `backend/.env`; the root `.env` remains supported for existing deployments. Keep credentials server-side. The frontend only receives source readiness, status, timestamps and provenance.

## MoSPI e-Sankhyiki (PLFS)

MoSPI publishes open PLFS API endpoints at `https://api.mospi.gov.in`; the indicator discovery request was verified on 20 October 2026 and succeeded without an API key. `MOSPI_API_KEY` is optional and left empty by default. The currently verified open PLFS endpoint does not send this key. The adapter uses `getIndicatorListByFrequency`, then `getFilterByIndicatorId`, then `getData`, and supports frequency codes 1 (annual), 2 (quarterly) and 3 (monthly). Employment and unemployment rates are contextual labour-market indicators, not job vacancy counts. Missing state/period values are omitted; they are never zero-filled.

## National Career Service (NCS)

NCS access requires formal approval from DGE. Request the approved base URL, authentication method and response schema from DGE before setting `NCS_API_BASE_URL` and `NCS_API_KEY`. The adapter uses the exact configured URL and a provisional `X-API-Key` header. Its expected provisional response is `{ "data": [{ "state": "…", "sector": "…", "vacancy_share": 0.0 }] }` (or `records` instead of `data`). This schema and authentication are **UNVERIFIED until real access is granted**. With either setting empty, status is `NOT_CONFIGURED` and the adapter reads optional published aggregate shares from `backend/db/ncs-calibration.json`; the checked-in file has empty source/date and share fields, so it produces no calibration values and remains labelled `synthetic_demo`.

## data.gov.in

Register for a free API key at [data.gov.in](https://data.gov.in/user/register), then set `DATA_GOV_IN_API_KEY` in `backend/.env`. Select a dataset and pass its resource ID to `DataGovInAdapter.fetch_data`; the client paginates records and can be reused for ITI/training datasets. The e-Shram integration uses `ESHRAM_RESOURCE_ID` as its configured status resource. This setup does not claim connectivity until a request succeeds.

## Cache, health checks and provenance

Successful JSON responses are cached in SQLite (`external_cache`) for `EXTERNAL_CACHE_TTL_HOURS` (default 24). Requests have a timeout, bounded exponential retries and a per-source circuit breaker. A failed call can return the matching expired cache with `STALE` status; without cache it returns a structured error. Cache identities omit API-key query parameters. Provenance is source-specific (`live_mospi`, `live_ncs`, `live_datagov`, `calibrated_synthetic`, or `synthetic_demo`).

After setting configuration, restart the backend, log in, open **Data Sources**, and use **Test connection**. Or call `GET /api/v1/system/sources` and `POST /api/v1/admin/sources/{source}/test` with the normal application JWT. No endpoint returns credential values. NCS/data.gov.in are reported as unconfigured until the appropriate credentials and (for data.gov.in) resource ID exist.
