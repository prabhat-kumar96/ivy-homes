const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const L = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'listings.json'), 'utf8')).results;
const R = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rentals.json'), 'utf8')).results;
const P = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf8')).results;
const answers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'final_answers.json'), 'utf8'));

// Evidence gathering
const c_price = L.filter(l => l.price < 0).map(l => l.listing_id);
const c_carpet = L.filter(l => l.carpet_area > 0 && l.super_built_up_area > 0 && l.carpet_area > l.super_built_up_area).map(l => l.listing_id);
const c_floor = L.filter(l => l.floor > 0 && l.total_floors > 0 && l.floor > l.total_floors).map(l => l.listing_id);
const c_geo = L.filter(l => l.latitude > 50).map(l => l.listing_id);
const c_bed = L.filter(l => l.bedroom === 0 && l.property_type !== 'plot').map(l => l.listing_id);

const fraud_ids = L.filter(l => l.price > 0 && l.price < 100000).map(l => l.listing_id).sort();

const activeCounts = new Map();
L.filter(l => l.is_live).forEach(l => {
  if (l.project_id) activeCounts.set(l.project_id, (activeCounts.get(l.project_id) || 0) + 1);
});
const projMismatch = [];
P.forEach(p => {
  const act = activeCounts.get(p.project_id) || 0;
  if (p.total_listings !== act) projMismatch.push(p.project_id);
});

const magSqm = L.filter(l => l.website === 'magichomes' && l.carpet_area < 100).map(l => l.listing_id).slice(0, 10);

const submission = {
  api_key: 'IVY26-93596A43F3FA',
  candidate: {
    name: 'Prabhat Kumar',
    email: 'prabhatmathur9927@gmail.com',
    repo_url: 'https://github.com/prabhat-kumar96/ivy-homes',
    demo_url: 'https://ivy-homes-prabhat.vercel.app'
  },
  answers: answers,
  findings: [
    {
      endpoint: '*',
      category: 'auth',
      documented: 'API key should be sent as ?api_key= query parameter on all requests',
      actual: 'The API rejects query parameter authentication with an explicit error: "send your key in the X-API-Key request header, not as a query parameter". All requests require X-API-Key header.',
      how_found: 'First API request with ?api_key= failed with status 401 and an explicit error body detailing the required X-API-Key header.',
      impact: 'Any client built following the documentation fails on 100% of requests. The entire API is unreachable.',
      evidence: []
    },
    {
      endpoint: '/auth/login',
      category: 'auth',
      documented: 'Response contains a "token" field valid for 24 hours (expires_in: 86400)',
      actual: 'Response field is named "access_token" (not "token"), and expires in 900 seconds (15 minutes). It also includes undocumented fields "refresh_token" and "refresh_url" ("/auth/refresh").',
      how_found: 'Inspected JSON body returned by POST /auth/login; res.body.token was undefined while res.body.access_token contained the JWT.',
      impact: 'Applications reading res.token get undefined and fail authentication immediately. Unrefreshed sessions expire after 15 minutes instead of the documented 24 hours.',
      evidence: []
    },
    {
      endpoint: '/auth/refresh',
      category: 'undocumented_endpoint',
      documented: 'No refresh token endpoint or mechanism is mentioned in documentation',
      actual: 'POST /auth/refresh exists and accepts {"refresh_token": "..."} in request body to issue a new access_token without prompting user credentials.',
      how_found: 'Inspected POST /auth/login response which returned refresh_url: "/auth/refresh" and refresh_token; successfully called POST /auth/refresh with the token.',
      impact: 'Allows frontends to sustain active user sessions indefinitely in the background rather than forcing users to log in again every 15 minutes.',
      evidence: []
    },
    {
      endpoint: '/health',
      category: 'timestamps',
      documented: 'Timestamps are ISO 8601 UTC with Z suffix everywhere in the API',
      actual: 'GET /health returns server_time carrying an explicit +05:30 offset (e.g. "2026-09-14T15:55:34+05:30") and explicit fields "timezone": "Asia/Kolkata" and "reference_date": "2026-09-10T00:00:00+05:30".',
      how_found: 'Called /health directly and observed server_time offset and timezone payload.',
      impact: 'Establishes that the API server operates in Indian Standard Time (IST). Date math and reference comparisons must be computed in IST.',
      evidence: []
    },
    {
      endpoint: '/v1/listings',
      category: 'timestamps',
      documented: 'All timestamps use ISO 8601 UTC with Z suffix',
      actual: 'The posted_at field on listing and rental records lacks any timezone indicator (e.g. "2026-06-21T16:40:00"). In accordance with the IST server clock, these represent naive local IST times.',
      how_found: 'Inspected posted_at across listings; none contain Z or timezone offsets. Naive UTC parsing causes a 5.5 hour discrepancy.',
      impact: 'Date filtering (such as Question 8 for listings in the 7 days before REFERENCE) will misclassify boundary records if treated as UTC.',
      evidence: ['SQU-5004678', '100-5003908', 'DWE-5004326', 'MAG-5000195', 'ZER-5004068']
    },
    {
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: 'Collections are paginated using page and limit (default 20, max 200). Response reports { total, page, page_size, results }.',
      actual: 'The API uses offset and limit (capped at 50, not 200). Response payload returns { total, offset, limit, count, has_more, results }. The "page" parameter is silently ignored, causing any client passing page=2,3... to continually receive offset=0.',
      how_found: 'Sent page=1 vs page=2 and noticed identical results. Testing offset=50 returned the true second page and revealed the actual response structure.',
      impact: 'Any frontend or ingestion pipeline built following the documentation gets stuck on page 1 indefinitely, unable to page through results.',
      evidence: []
    },
    {
      endpoint: '/v1/listings',
      category: 'completeness',
      documented: 'Listing object schema in documentation does not mention an is_live field',
      actual: 'Every listing and rental record contains an is_live boolean field indicating active status. In the listings dataset, 4,017 records have is_live: true and 1,083 have is_live: false.',
      how_found: 'Observed is_live on live API payloads; Question 3 explicitly asks for the count of records with is_live true.',
      impact: 'Without discovering this undocumented field, clients cannot filter out inactive/withdrawn listings.',
      evidence: ['SQU-5004678', '100-5003908', 'ZER-5004068']
    },
    {
      endpoint: '/v1/listings',
      category: 'filters',
      documented: 'project_id is a supported filter parameter on /v1/listings',
      actual: 'GET /v1/listings?project_id=P50001 is accepted with 200 OK but silently ignored, returning total: 4755 and unfiltered listings from across all projects.',
      how_found: 'Queried /v1/listings with multiple project_id values; the returned total remained identical to the unfiltered baseline and records did not match the requested project.',
      impact: 'Project detail pages cannot fetch listings filtered by project_id server-side; client-side filtering is required.',
      evidence: []
    },
    {
      endpoint: '/v1/listings',
      category: 'sorting',
      documented: 'sort_by (price, carpet_area, posted_at, bedroom) and order (asc, desc) control result ordering',
      actual: 'sort_by and order parameters are accepted with 200 OK but silently ignored. Queries with sort_by=price&order=asc and sort_by=price&order=desc return identical ordering.',
      how_found: 'Compared response results across different sort_by and order arguments; elements remained in the exact same default order.',
      impact: 'Users cannot sort listings via API parameters; client-side sorting must be implemented as a workaround.',
      evidence: []
    },
    {
      endpoint: '/v1/projects',
      category: 'units',
      documented: 'Money is in Indian rupees integer everywhere in the API (price_min, price_max)',
      actual: 'Project price_min and price_max fields are decimal numbers in Crores (e.g. P50016 price_max: 12.44, representing ₹12.44 Cr = ₹124,400,000 INR), not rupees.',
      how_found: 'Observed price values such as 3.76, 12.44 in projects.json. Cross-matched project price ranges against prices of member listings (in INR) to confirm the 10,000,000 multiplier.',
      impact: 'Displaying raw project prices directly would show properties selling for ₹12 instead of ₹12.44 Crore. Question 7 requires converting to INR.',
      evidence: ['P50016', 'P50451', 'P50150', 'P50443', 'P50494']
    },
    {
      endpoint: '/v1/listings',
      category: 'units',
      documented: 'Area is always square feet, integer, everywhere in the API',
      actual: 'Listings from MagicHomes (website: "magichomes") report carpet_area in square meters (31 to 149 sq.m) for 412 records, while all other portals report in square feet (e.g. 400 to 2500+ sq.ft).',
      how_found: 'Found 412 listings with carpet_area < 150 sq.ft; 100% originated from magichomes with areas like 45-80 sq.m corresponding exactly to standard Indian 1BHK/2BHK dimensions.',
      impact: 'Calculating price per square foot directly for these listings yields inflated rates (~10.76x actual) unless square meter areas are converted to square feet.',
      evidence: magSqm
    },
    {
      endpoint: '/v1/listings',
      category: 'data_quality',
      documented: 'All listing records represent physically plausible, genuine property specifications',
      actual: '55 listing records describe physically impossible properties: 11 negative prices, 11 carpet_area > super_built_up_area, 11 floor > total_floors, 11 inverted coordinates (latitude > 50° outside India), and 11 residential properties with 0 bedrooms.',
      how_found: 'Systematic constraint audit across the 5,100 listings; each impossible condition identified a distinct, mutually exclusive set of exactly 11 injected records.',
      impact: 'These records corrupt aggregations, statistical summaries, and mapping views if not filtered out.',
      evidence: [
        c_price[0], c_price[1],
        c_carpet[0], c_carpet[1],
        c_floor[0], c_floor[1],
        c_geo[0], c_geo[1],
        c_bed[0], c_bed[1]
      ]
    },
    {
      endpoint: '/v1/listings',
      category: 'fraud',
      documented: 'All listings represent genuine sale offerings',
      actual: '11 listings are fake bait listings designed for lead generation, listing monthly rental rates (₹17,470 to ₹44,440) as the total sale purchase price for full apartments and houses in prime Mumbai locations.',
      how_found: 'Filtered for price > 0 and price < 100,000 INR; identified exactly 11 listings advertising full Mumbai residences at typical rental amounts.',
      impact: 'Misleads homebuyers and distorts price averages if not excluded from price/sqft calculations (Question 6).',
      evidence: fraud_ids
    },
    {
      endpoint: '/v1/listings',
      category: 'duplicates',
      documented: 'Every listing_id is globally unique and corresponds to one listing',
      actual: '33 pairs of listings (66 total records) represent the exact same physical property cross-posted across portals or agents with matching apartment name, locality, bedroom count, floor, and carpet area.',
      how_found: 'Clustered listings by normalized apartment name, locality, bedroom, floor, and carpet area; identified exactly 33 pairs of duplicates.',
      impact: 'Inflates property counts and inventory estimates unless deduplicated for Question 2.',
      evidence: [
        '100-5004838', 'DWE-5001365',
        'MAG-5005024', 'MAG-5002602',
        'MAG-5004203', 'MAG-5001415',
        'ZER-5001281', 'DWE-5004555',
        'MAG-5004165', 'MAG-5003353'
      ]
    },
    {
      endpoint: '/v1/listing/{id}',
      category: 'missing_endpoint',
      documented: 'GET /v1/listing/{id} returns a single listing (singular noun in path)',
      actual: 'GET /v1/listing/{id} returns 404 Not Found. The working endpoint uses the plural path GET /v1/listings/{id}.',
      how_found: 'Probed both documented singular /v1/listing/{id} (returned 404) and plural /v1/listings/{id} (returned 200 with listing payload).',
      impact: 'Any application implementing single listing lookups with the documented singular path fails.',
      evidence: []
    },
    {
      endpoint: '/v1/listings/{id}/similar',
      category: 'missing_endpoint',
      documented: 'GET /v1/listings/{id}/similar returns up to 10 comparable listings',
      actual: 'Endpoint returns 404 Not Found. It is not implemented on the API.',
      how_found: 'Sent GET request to /v1/listings/SQU-5004678/similar; received status 404.',
      impact: 'Comparable listing recommendations cannot be served from this endpoint.',
      evidence: []
    },
    {
      endpoint: '/v1/favourites',
      category: 'missing_endpoint',
      documented: 'GET /v1/favourites, POST /v1/favourites, and DELETE /v1/favourites/{id} provide user saved listing management',
      actual: 'All three HTTP methods return 404 Not Found. The server does not implement the favourites routes.',
      how_found: 'Sent GET, POST, and DELETE requests with valid Bearer token; all returned 404.',
      impact: 'Saved listings must be managed client-side or via fallback storage.',
      evidence: []
    },
    {
      endpoint: '/v1/analytics/summary',
      category: 'missing_endpoint',
      documented: 'GET /v1/analytics/summary returns pre-computed city statistics and aggregates',
      actual: 'Endpoint returns 404 Not Found. The server does not implement this analytics route.',
      how_found: 'Sent GET request with valid headers and Bearer token; received 404.',
      impact: 'Dashboard metrics must be aggregated directly from the raw listings dataset.',
      evidence: []
    },
    {
      endpoint: '/v1/projects',
      category: 'consistency',
      documented: 'total_listings is the number of listings currently available in the project, recomputed whenever added or withdrawn, always agreeing with GET /v1/listings?project_id=...',
      actual: 'The project_id filter on /v1/listings does not work, and comparing project.total_listings against actual ground-truth active listings in the project reveals 166 projects whose reported count is inaccurate.',
      how_found: 'Aggregated active listings by project_id across all 5,100 listings and compared against project.total_listings across all 590 projects.',
      impact: 'Project inventory counts displayed to users are inaccurate for 166 out of 590 projects.',
      evidence: projMismatch.slice(0, 15)
    }
  ]
};

fs.writeFileSync(path.join(ROOT_DIR, 'submission.json'), JSON.stringify(submission, null, 2), 'utf8');
console.log('Wrote submission.json successfully with', submission.findings.length, 'findings and all 10 answers.');
