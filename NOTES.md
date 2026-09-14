# Ivy Homes — Working Notes (scratch log, not submitted)

## Credentials
- API Key: IVY26-93596A43F3FA
- Base URL: https://solve.ivy.homes
- City: Mumbai
- Assigned locality: Mulund West
- Demo password: fc3a4005e1
- Users: demo1@ivy.homes, demo2@ivy.homes, demo3@ivy.homes

## Reference moment
REFERENCE = 2026-09-10T00:00:00+05:30 (IST)
= 2026-09-09T18:30:00Z (UTC equivalent)

## Timeline
- Started: 2026-09-14 ~15:12 IST
- Deadline: 2026-09-14 23:59 IST
- ~8.8 hours remaining

## Phase Log
- [ ] Phase 0: Setup + git init
- [ ] Phase 1: Full data pull
- [ ] Phase 2: Hypothesis testing
- [ ] Phase 3: Derive answers
- [ ] Phase 4: Frontend
- [ ] Phase 5: Findings + submission.json
- [ ] Phase 6: README + git hygiene

## Hypotheses to test
1. Duplicates: same physical unit multiple times — cluster by (lat/lng rounded + bedroom + area) and by phone number
2. Corrupt: carpet_area > super_built_up_area, zero/negative areas, absurd floor/bathroom counts
3. Fake/fraud: price/sqft outliers, phone number reused many times, templated descriptions
4. Filter params silently ignored?
5. is_live field — not in docs but referenced in Q3
6. Timestamps: UTC claim vs. actual data
7. project.total_listings vs. live count from /v1/listings?project_id=...
8. Endpoint existence: /v1/listing/{id} vs /v1/listings/{id}, /similar, /favourites, etc.

## Dead-end hypotheses (to document in README)
- TBD as I test

## Findings
- TBD
