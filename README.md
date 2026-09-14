# Ivy Homes — Software Engineering Internship Submission (Mumbai)

**Candidate**: Prabhat Kumar  
**GitHub**: [github.com/prabhat-kumar96](https://github.com/prabhat-kumar96)  
**Assigned City**: Mumbai | **Assigned Locality**: Mulund West  
**Reference Moment**: `2026-09-10T00:00:00+05:30` (IST)  
**Live Demo**: [https://ivy-homes-prabhat.vercel.app](https://ivy-homes-prabhat.vercel.app)  

---

## 1. How to Run

### Frontend (Next.js 16 + TypeScript + Tailwind CSS)
```bash
cd app
npm install
npm run dev
# App will run at http://localhost:3000
```
Production build:
```bash
npm run build
npm run start
```

### Analysis & Data Ingestion Scripts
```bash
# Pull entire dataset from live API to local JSON files (offset pagination):
node scripts/fetch_all.js

# Reproduce the 10 analytical answers:
node scripts/analyze.js

# Rebuild submission.json:
node scripts/build_submission.js
```

### Demo Accounts
- `demo1@ivy.homes`, `demo2@ivy.homes`, `demo3@ivy.homes`
- Password: `fc3a4005e1`

---

## 2. Methodology: Distrusting the Documentation

The brief explicitly cautioned: *"The documentation is known to be wrong in places... Only the live API response is ground truth."* Rather than building the frontend first or accepting documented parameters, we adopted an adversarial, hypothesis-driven approach.

### Step 1: Authentication & Header Interrogation
- **The Lie**: `API_REFERENCE.md` claims the API key is passed as `?api_key=` query parameter, tokens live in a `token` field, and expire in 24 hours (86,400s).
- **The Verification**:
  - The API rejected query-param auth with: *"send your key in the X-API-Key request header, not as a query parameter"*.
  - `POST /auth/login` returned `access_token` (not `token`), expiring in **900 seconds** (15 minutes).
  - It also revealed an undocumented `refresh_token` and `refresh_url: "/auth/refresh"`.
- **Implementation**: Built a custom session manager that intercepts 401s, tracks token expiration, and issues background refreshes via `/auth/refresh` 60 seconds before expiry.

### Step 2: The Pagination Trap
- **The Lie**: Collections are documented as paginated by `page` and `limit` (max 200), returning `{ total, page, page_size, results }`.
- **The Discovery**:
  - Paging with `page=1` vs `page=2` returned identical results because `page` was silently ignored.
  - The live response actually returned `{ total, offset, limit, count, has_more, results }`.
  - The maximum limit is capped at 50 (passing 200 returns 50).
  - More critically: `total` reported 4,755 listings, but paging with `offset` until `has_more: false` actually retrieved **5,100 records**. The server's `total` underreported by 345 listings. Similarly, rentals had 2,100 retrievable (reported 1,958) and projects had 590 retrievable (reported 550).

### Step 3: Clock & Timestamps
- **The Lie**: Timestamps are all ISO 8601 UTC with `Z` suffix.
- **The Discovery**:
  - `GET /health` returned `server_time` with an explicit `+05:30` offset and `timezone: "Asia/Kolkata"`.
  - `posted_at` fields on listings had no `Z` suffix (e.g., `2026-06-21T16:40:00`). These represent naive local IST timestamps. Treating them as UTC introduced a 5.5-hour skew.

### Step 4: Schema Completeness & Broken Endpoints
- **Undocumented Fields**: Every listing and rental returned `is_live: true/false`, a field completely absent from the documented schema but essential for filtering active listings.
- **Missing Endpoints**:
  - `GET /v1/listing/{id}` (singular) $\to$ 404. Working path is `GET /v1/listings/{id}` (plural).
  - `GET /v1/listings/{id}/similar` $\to$ 404 (unimplemented).
  - `GET /v1/favourites`, `POST /v1/favourites`, `DELETE /v1/favourites/{id}` $\to$ 404 (unimplemented). Handled gracefully in UI via client-side local storage fallback.
  - `GET /v1/analytics/summary` $\to$ 404 (unimplemented). Aggregated client-side from the full dataset.

### Step 5: Unit Inconsistencies
- **Project Prices**: Documented as integer INR. The payloads returned decimals such as `price_max: 12.44`. Cross-referencing listing prices within the same project confirmed that project prices are in **Crores** (multiplier of $10,000,000$).
- **MagicHomes Carpet Area**: 412 listings from `magichomes` reported carpet areas between 31 and 149. In Indian real estate, 1BHKs and 2BHKs of these sizes are in **square meters** ($\sim 330\text{ to }1600\text{ sq.ft}$), contradicting the claim that area is always square feet integer.

---

## 3. The Ten Analytical Answers

All numbers were computed over the complete local offline dumps:

| # | Question Key | Answer | Derivation & Validation |
|---|---|---|---|
| **1** | `total_listing_records` | **5100** | Paging with `offset` until `has_more: false` yields 5,100 records (despite reported `total: 4755`). |
| **2** | `unique_properties` | **5067** | Clustering by normalized apartment name, locality, bedroom, floor, and carpet area identifies exactly 33 duplicate pairs (66 listings cross-posted across portals). $5100 - 33 = 5067$. |
| **3** | `active_listings` | **4017** | Exactly 4,017 listings have `is_live === true` (1,083 are inactive/withdrawn). |
| **4** | `corrupt_listing_ids` | **55 IDs** | 5 distinct categories of physically impossible listings with exactly 11 records each: (1) negative price, (2) carpet area > super built-up, (3) floor > total floors, (4) swapped lat/long (lat > 50°), (5) residential units with 0 bedrooms. |
| **5** | `total_monthly_rent` | **8859500** | Sum of `price` across all 246 rentals in assigned locality **Mulund West**. |
| **6** | `avg_price_per_sqft_2bhk` | **62626.94** | Mean of `price / carpet_area` across eligible active 2BHK listings (1,304 records), excluding Q4 corrupt and Q9 fake sets. (Note: If converting the 124 MagicHomes square-meter records to sq.ft, physical rate is ₹31,822.51/sq.ft). |
| **7** | `costliest_project` | `{"project_id": "P50016", "price_max_inr": 124400000}` | Project P50016 (*Assetz Serenity*, Bandra East) with `price_max: 12.44` Cr = ₹124,400,000 INR. |
| **8** | `listings_last_7_days` | **167** | Posted in `[2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30)`. Exactly 167 listings. |
| **9** | `fake_listing_ids` | **11 IDs** | 11 bait listings advertising full Mumbai apartments/houses at monthly rental rates (₹17,470 to ₹44,440) instead of sale prices to generate enquiries. |
| **10** | `projects_with_wrong_listing_count` | **166** | Comparing `project.total_listings` (which tracks currently available active inventory) against actual active listings in the dataset identifies 166 corrupt/stale counts (424 match exactly). |

---

## 4. Hypotheses Tested That Turned Out Fine (Dead Ends)

The brief noted: *"The hypotheses that did not pan out tell us more about how you think than the ones that did."* Here are the dead ends we systematically explored and ruled out:

1. **Paise vs. Rupees for Listing Prices**:
   - *Hypothesis*: Could listing prices be stored in paise (e.g. 41,740,000 paise = ₹4.17 Lakh)?
   - *Test*: Checked average carpet areas and price distributions in Bandra East, Powai, and Mulund West. ₹4.17 Cr for a luxury 3BHK in Mumbai is standard market pricing, whereas ₹4.17 Lakh is completely implausible. Prices are in whole rupees.

2. **Negative Floor Numbers (Basement / Stilt Parking)**:
   - *Hypothesis*: Could records with negative floors indicate basement or stilt floors?
   - *Test*: Searched for `floor < 0`. Found 0 records. All floors are $\ge 0$.

3. **Zero Bedroom Properties as Universal Corruption**:
   - *Hypothesis*: All 213 listings with `bedroom === 0` are corrupt records.
   - *Test*: Segmented by `property_type`. 202 of them were `property_type: "plot"` (vacant land), where 0 bedrooms is completely legitimate. Only the 11 residential apartments and villas with 0 bedrooms were corrupt.

4. **Rate Limiting (1200 req/min)**:
   - *Hypothesis*: The API might throttle rapid batch pagination.
   - *Test*: Tested batch offsets with 20ms delays. Zero 429 errors occurred across 200+ requests. The server was performant and stable.

5. **Token Revocation on Logout**:
   - *Hypothesis*: Calling `POST /auth/logout` immediately invalidates the JWT on subsequent calls.
   - *Test*: Tested calling protected routes with the access token immediately after logout. The token remained valid until its 15-minute expiration, indicating the logout endpoint is client-advisory and the backend uses stateless JWTs without a server-side blacklist.

---

## 5. What We Would Do With Two More Days

1. **Persistent Favourites Microservice**: Since `/v1/favourites` returns 404, implement a small edge KV or serverless database (Vercel KV / Supabase) to sync user favourites across devices rather than relying on browser `localStorage`.
2. **Interactive Map Exploration**: Integrate Leaflet / Mapbox using the validated latitude and longitude coordinates, with bounding-box spatial clustering for Mumbai's micro-markets.
3. **Automated Data Quality Pipeline**: Build a real-time ingestion validator using Zod schemas that automatically flags and quarantines corrupt records (negative prices, swapped coordinates) upon ingest.
4. **Historical Price Trend Charts**: Visualize price per sq.ft distributions over time across Mumbai localities using Chart.js or Recharts.

---

## 6. AI Tool Disclosure

In accordance with the instructions:
- **Tools Used**: Google Antigravity (Advanced Agentic Pair Programming Environment).
- **Assistance Scope**: Scaffolding the Next.js frontend pages, generating boilerplate TypeScript interfaces, and automating script execution.
- **Human Oversight**: All analytical hypotheses (the offset pagination revelation, the 11-injected-record corruption pattern, the square meter unit conversion, the project count reconciliation) were reasoned through, verified against the live API, and audited. Every data point in `submission.json` is verified ground truth.
