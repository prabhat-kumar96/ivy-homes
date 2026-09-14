'use client';

// Insights page — shows API analytics + data quality discoveries
// FINDING: /v1/analytics/summary returns 404 (endpoint doesn't exist despite being documented)
// We render our own insights derived from Phase 2 analysis

const FINDINGS = [
  {
    category: 'auth',
    icon: '🔑',
    title: 'API Key Must Be a Header',
    severity: 'high',
    detail: 'Documentation says to send the API key as ?api_key= query parameter. The API rejects this with an explicit error: "send your key in the X-API-Key request header". Every request must use the X-API-Key header instead.',
  },
  {
    category: 'auth',
    icon: '⏱️',
    title: 'Token Expires in 15 Minutes, Not 24 Hours',
    severity: 'high',
    detail: 'The documentation claims expires_in=86400 (24 hours). The actual API returns expires_in=900 (15 minutes). Frontends relying on the documented value will silently break after 15 minutes. The API does provide an undocumented refresh_token and /auth/refresh endpoint to mitigate this.',
  },
  {
    category: 'auth',
    icon: '🪙',
    title: 'Token Field Named access_token, Not token',
    severity: 'high',
    detail: 'Documentation shows the response field as "token". The actual response uses "access_token". Additionally, the response includes an undocumented "refresh_token" and "refresh_url" ("/auth/refresh").',
  },
  {
    category: 'missing_endpoint',
    icon: '❌',
    title: '/v1/analytics/summary Returns 404',
    severity: 'high',
    detail: 'Documented as a pre-computed aggregates endpoint. Actually returns 404 — it does not exist.',
  },
  {
    category: 'missing_endpoint',
    icon: '❌',
    title: '/v1/favourites Returns 404',
    severity: 'high',
    detail: 'The documented favourites endpoints (GET, POST, DELETE /v1/favourites) all return 404. The feature is entirely absent from the running API.',
  },
  {
    category: 'missing_endpoint',
    icon: '❌',
    title: '/v1/listings/{id}/similar Returns 404',
    severity: 'medium',
    detail: 'Documented as returning up to 10 comparable listings. Returns 404 — not implemented.',
  },
  {
    category: 'missing_endpoint',
    icon: '❌',
    title: '/v1/listing/{id} is the Wrong Path',
    severity: 'medium',
    detail: 'Documentation shows the single-listing path as /v1/listing/{id} (singular). The actual working path is /v1/listings/{id} (plural). The singular path returns 404.',
  },
  {
    category: 'completeness',
    icon: '📊',
    title: 'Undocumented is_live Field in Listings',
    severity: 'medium',
    detail: 'The is_live boolean field appears on every listing and rental record but is never mentioned in the API documentation. Q3 of the assignment explicitly asks about it, making this an important omission.',
  },
  {
    category: 'pagination',
    icon: '📄',
    title: 'Max Page Size is 50, Not 200',
    severity: 'medium',
    detail: 'Documentation states the maximum limit is 200. In practice, the API caps each page at 50 results regardless of the limit parameter. Requesting limit=200 returns 50 records. This also causes the retrieved total (4800) to exceed the reported total (4755) due to pagination boundary effects.',
  },
  {
    category: 'sorting',
    icon: '🔀',
    title: 'sort_by and order Parameters Are Ignored',
    severity: 'medium',
    detail: 'All sort_by values (price, carpet_area, posted_at, bedroom) with both asc and desc order return the same result set. The parameters are accepted without error but have no effect. Client-side sorting must be applied as a workaround.',
  },
  {
    category: 'timestamps',
    icon: '🕐',
    title: 'posted_at Has No Timezone Suffix',
    severity: 'medium',
    detail: 'Documentation claims all timestamps use ISO 8601 UTC with Z suffix. The actual posted_at values have no suffix (e.g. "2026-06-21T16:40:00"). The /health endpoint confirms the server operates in Asia/Kolkata (IST, +05:30), so these timestamps are IST. Date math for Q8 must treat them as IST.',
  },
  {
    category: 'timestamps',
    icon: '🌏',
    title: '/health Returns IST Time, Not UTC',
    severity: 'low',
    detail: 'The /health endpoint server_time field shows "+05:30" offset (IST) rather than "Z" (UTC). The response also includes an explicit "timezone": "Asia/Kolkata" field and "reference_date" confirming the reference moment.',
  },
  {
    category: 'data_quality',
    icon: '🔴',
    title: 'Listings with Negative Prices',
    severity: 'high',
    detail: 'Several listing records have negative price values (e.g. -64,640,000). These are physically impossible — a sale price cannot be negative. These records are flagged as corrupt in Q4.',
  },
  {
    category: 'data_quality',
    icon: '📐',
    title: 'Carpet Area Exceeds Super Built-up Area',
    severity: 'high',
    detail: 'Some listings have carpet_area > super_built_up_area, which is physically impossible (carpet area is always a subset of super built-up area). These are flagged as corrupt records.',
  },
  {
    category: 'consistency',
    icon: '🔢',
    title: 'project.total_listings Often Disagrees with Actual Count',
    severity: 'high',
    detail: 'The documentation states total_listings "is recomputed whenever a listing is added or withdrawn, so it always agrees with GET /v1/listings?project_id=...". In practice, many projects show discrepancies between their total_listings field and the actual count of listings with that project_id.',
  },
  {
    category: 'filters',
    icon: '🔍',
    title: 'project_id Filter on /v1/listings Is Ignored',
    severity: 'medium',
    detail: 'GET /v1/listings?project_id=P50001 returns the full unfiltered total (4755), not listings from that project. The parameter is silently ignored. Client-side filtering by project_id is required.',
  },
  {
    category: 'duplicates',
    icon: '👥',
    title: 'Duplicate Properties Listed Multiple Times',
    severity: 'medium',
    detail: 'The same physical property appears with multiple listing_ids from different websites (e.g. squarelane, magicbricks, 99acres). Deduplication by (latitude ≈ longitude ≈ bedroom count) reveals many such pairs. Each physical property that is described multiple times should count once for Q2.',
  },
];

export default function InsightsPage() {
  const categoryCounts = FINDINGS.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = FINDINGS.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Insights & API Findings</h1>
        <p className="text-gray-500 mt-1">
          What we discovered during hypothesis-driven interrogation of the Mumbai dataset.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Findings" value={FINDINGS.length} color="blue" />
        <StatCard label="High Severity" value={severityCounts.high || 0} color="red" />
        <StatCard label="Medium Severity" value={severityCounts.medium || 0} color="amber" />
        <StatCard label="Low Severity" value={severityCounts.low || 0} color="green" />
      </div>

      {/* Data quality summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">📊 Mumbai Dataset Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-amber-700 font-medium">Total Listing Records</p>
            <p className="text-2xl font-bold text-amber-900">4,755</p>
            <p className="text-amber-600 text-xs">(4,800 retrieved due to pagination boundary)</p>
          </div>
          <div>
            <p className="text-amber-700 font-medium">Active Listings (is_live=true)</p>
            <p className="text-2xl font-bold text-amber-900">TBD</p>
            <p className="text-amber-600 text-xs">From analysis script</p>
          </div>
          <div>
            <p className="text-amber-700 font-medium">Rental Records</p>
            <p className="text-2xl font-bold text-amber-900">1,958</p>
            <p className="text-amber-600 text-xs">(2,000 retrieved)</p>
          </div>
          <div>
            <p className="text-amber-700 font-medium">Projects</p>
            <p className="text-2xl font-bold text-amber-900">550</p>
          </div>
          <div>
            <p className="text-amber-700 font-medium">Mulund West Rentals</p>
            <p className="text-2xl font-bold text-amber-900">~460</p>
            <p className="text-amber-600 text-xs">listings, rental count TBD</p>
          </div>
          <div>
            <p className="text-amber-700 font-medium">Sort Parameters</p>
            <p className="text-2xl font-bold text-red-700">Broken</p>
            <p className="text-amber-600 text-xs">Client-side sort applied</p>
          </div>
        </div>
      </div>

      {/* Note about analytics endpoint */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div>
          <p className="font-semibold text-red-800">Analytics Endpoint Missing</p>
          <p className="text-sm text-red-700 mt-1">
            The documented <code className="bg-red-100 px-1 rounded">/v1/analytics/summary</code> endpoint returns 404.
            The insights on this page are derived from our own full data pull and analysis.
          </p>
        </div>
      </div>

      {/* Findings list */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documentation vs Reality</h2>
        <div className="space-y-3">
          {FINDINGS.map((finding, i) => (
            <div key={i} className={`bg-white rounded-xl border shadow-sm p-5 ${
              finding.severity === 'high' ? 'border-red-200' :
              finding.severity === 'medium' ? 'border-amber-200' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{finding.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">{finding.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      finding.severity === 'high' ? 'bg-red-100 text-red-700' :
                      finding.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{finding.severity}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{finding.category}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{finding.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hypothesis dead ends */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔬 Hypotheses We Tested & Ruled Out</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold flex-shrink-0">✓ Checked:</span>
            <span><strong>Are prices in paise (not rupees)?</strong> No — the price distribution (₹4M–₹70M range) is consistent with Mumbai real estate in rupees. Confirmed units are rupees.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold flex-shrink-0">✓ Checked:</span>
            <span><strong>Is area in sq.m not sq.ft?</strong> No — values like 980–2340 sq.ft match reasonable Mumbai apartment sizes. Confirmed units are square feet.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold flex-shrink-0">✓ Checked:</span>
            <span><strong>Does the locality filter silently ignore case?</strong> Yes — "mulund west" works; "Mulund West" returns 0. This is documented behavior (lowercase convention) that actually works correctly.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold flex-shrink-0">✓ Checked:</span>
            <span><strong>Does bhk filter use bedroom field correctly?</strong> Yes — bhk=2 returns records where bedroom=2. The filter parameter name differs from the field name (bhk vs bedroom) but it works correctly.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold flex-shrink-0">✓ Checked:</span>
            <span><strong>Is the total field in pagination reliable?</strong> No — we retrieved 4800 records against a reported total of 4755, suggesting a pagination boundary issue (max page size is actually 50, not 200).</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    green: 'bg-green-50 border-green-200 text-green-900',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}
