#!/usr/bin/env node
/**
 * fetch_all.js — Pull every record from /v1/listings, /v1/rentals, /v1/projects
 *
 * FINDING 1: API key must be sent as X-API-Key header, NOT ?api_key= query param
 * FINDING 2: Token expires in 900s (15min), NOT 86400s (24h) as documented
 * FINDING 3: /health server_time uses +05:30 offset, not UTC Z
 * FINDING 4: /auth/login user object has no "name" field (doc shows it)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'IVY26-93596A43F3FA';
const BASE_URL = 'https://solve.ivy.homes';
const EMAIL = 'demo1@ivy.homes';
const PASSWORD = 'fc3a4005e1';
const PAGE_SIZE = 200;
const DATA_DIR = path.join(__dirname, '..', 'data');

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function request(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = urlPath.startsWith('http') ? new URL(urlPath) : new URL(urlPath, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const options = {
      hostname: fullUrl.hostname,
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _token = null;
let _tokenExpiry = 0;
let _refreshToken = null;

async function getToken() {
  const now = Date.now();
  if (_token && now < _tokenExpiry - 60000) return _token; // 60s buffer

  // Try refresh if we have a refresh token
  if (_refreshToken) {
    try {
      console.log('[auth] Refreshing token...');
      const res = await request('POST', '/auth/refresh', { refresh_token: _refreshToken });
      if (res.status === 200) {
        _token = res.body.access_token;
        _tokenExpiry = now + (res.body.expires_in || 900) * 1000;
        console.log(`[auth] Token refreshed. expires_in=${res.body.expires_in}s`);
        return _token;
      }
    } catch (e) {
      console.log('[auth] Refresh failed, re-logging in...');
    }
  }

  console.log('[auth] Logging in...');
  const res = await request('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed ${res.status}: ${JSON.stringify(res.body)}`);

  // FINDING: response field is "access_token", not "token" as documented
  _token = res.body.access_token;
  _refreshToken = res.body.refresh_token; // FINDING: undocumented refresh_token
  const expiresIn = res.body.expires_in;
  _tokenExpiry = now + expiresIn * 1000;
  console.log(`[auth] Token obtained. expires_in=${expiresIn}s. user=${JSON.stringify(res.body.user)}`);
  console.log(`[auth] refresh_url: ${res.body.refresh_url} (undocumented)`);
  fs.writeFileSync(path.join(DATA_DIR, 'auth_response.json'), JSON.stringify(res.body, null, 2));
  return _token;
}


// ─── Health ──────────────────────────────────────────────────────────────────

async function checkHealth() {
  console.log('\n[health] GET /health');
  const res = await request('GET', '/health');
  console.log(`  status=${res.status} body=${JSON.stringify(res.body)}`);
  fs.writeFileSync(path.join(DATA_DIR, 'health.json'), JSON.stringify(res.body, null, 2));
  return res.body;
}

// ─── Paginated fetch ──────────────────────────────────────────────────────────

async function fetchAll(endpoint, extraParams = {}) {
  const allResults = [];
  let offset = 0;
  const limit = 50;
  let totalReported = null;

  while (true) {
    const tok = await getToken(); // auto-refresh if near expiry
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit), ...extraParams });
    const res = await request('GET', `${endpoint}?${params}`, null, tok);

    if (res.status !== 200) {
      console.error(`  [ERROR] ${res.status}: ${JSON.stringify(res.body)}`);
      break;
    }

    const { total, results, has_more } = res.body;
    if (totalReported === null) {
      totalReported = total;
      console.log(`  total_reported=${total}`);
    }

    allResults.push(...results);
    process.stdout.write(`  offset ${offset}: +${results.length} = ${allResults.length}/${total}\r`);

    if (has_more === false || results.length === 0) break;
    offset += results.length;
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`\n  Done: reported=${totalReported} retrieved=${allResults.length} ${allResults.length !== totalReported ? '⚠ MISMATCH' : '✓'}`);
  return { total: totalReported, retrieved: allResults.length, results: allResults };
}

// ─── Filter/sort tests ────────────────────────────────────────────────────────

async function testFilters(baseTotal) {
  console.log('\n[filters] Testing listing filter params...');
  const tok = await getToken();
  const results = { baseTotal };

  const tests = [
    ['locality=mulund+west', { locality: 'mulund west' }],
    ['locality=andheri+east', { locality: 'andheri east' }],
    ['bhk=1', { bhk: 1 }],
    ['bhk=2', { bhk: 2 }],
    ['bhk=3', { bhk: 3 }],
    ['bhk=4', { bhk: 4 }],
    ['property_type=apartment', { property_type: 'apartment' }],
    ['property_type=villa', { property_type: 'villa' }],
    ['furnishing=unfurnished', { furnishing: 'unfurnished' }],
    ['furnishing=semi-furnished', { furnishing: 'semi-furnished' }],
    ['furnishing=fully-furnished', { furnishing: 'fully-furnished' }],
    ['min_price=50000000', { min_price: 50000000 }],
    ['max_price=5000000', { max_price: 5000000 }],
    ['min_price=10000000&max_price=20000000', { min_price: 10000000, max_price: 20000000 }],
  ];

  for (const [label, params] of tests) {
    const p = new URLSearchParams({ limit: 1, ...params });
    const res = await request('GET', `/v1/listings?${p}`, null, tok);
    const filtered = res.body.total !== baseTotal;
    results[label] = { total: res.body.total, filtered, status: res.status };
    console.log(`  ${label} → total=${res.body.total} (changed=${filtered})`);
    await new Promise(r => setTimeout(r, 30));
  }

  // Sort tests
  console.log('\n[filters] Testing sort params...');
  for (const [sort_by, order] of [['price','asc'],['price','desc'],['carpet_area','asc'],['posted_at','desc'],['bedroom','asc']]) {
    const p = new URLSearchParams({ limit: 10, sort_by, order });
    const res = await request('GET', `/v1/listings?${p}`, null, tok);
    const vals = res.body.results?.map(r => sort_by === 'posted_at' ? r.posted_at : r[sort_by]);
    const isSorted = vals && vals.every((v,i) => {
      if (i === 0) return true;
      return order === 'asc' ? v >= vals[i-1] : v <= vals[i-1];
    });
    results[`sort_${sort_by}_${order}`] = { values: vals, is_sorted: isSorted };
    console.log(`  sort_by=${sort_by} order=${order} → is_sorted=${isSorted} values=${JSON.stringify(vals?.slice(0,5))}`);
    await new Promise(r => setTimeout(r, 30));
  }

  fs.writeFileSync(path.join(DATA_DIR, 'filter_tests.json'), JSON.stringify(results, null, 2));
  return results;
}

// ─── Endpoint existence ───────────────────────────────────────────────────────

async function testEndpoints(sampleListing, sampleRental, sampleProject) {
  console.log('\n[endpoints] Probing documented and undocumented endpoints...');
  const tok = await getToken();
  const results = {};

  const probes = [
    // Documented endpoints, checking actual paths
    ['GET', `/v1/listing/${sampleListing}`, 'listing_singular_path'],
    ['GET', `/v1/listings/${sampleListing}`, 'listings_plural_path'],
    ['GET', `/v1/listings/${sampleListing}/similar`, 'listings_similar'],
    ['GET', `/v1/rentals/${sampleRental}`, 'rental_single'],
    ['GET', `/v1/projects/${sampleProject}`, 'project_single'],
    ['GET', '/v1/favourites', 'favourites_get'],
    ['POST', '/v1/favourites', 'favourites_post'],
    ['GET', '/v1/analytics/summary', 'analytics_summary'],
    ['POST', '/auth/logout', 'auth_logout'],
  ];

  for (const [method, urlPath, name] of probes) {
    const body = name === 'favourites_post' ? { id: sampleListing } : null;
    const res = await request(method, urlPath, body, tok);
    results[name] = {
      method, path: urlPath, status: res.status,
      bodyKeys: typeof res.body === 'object' ? Object.keys(res.body) : null,
      bodySnippet: JSON.stringify(res.body).slice(0, 300),
    };
    console.log(`  ${method} ${urlPath} → ${res.status} keys=${results[name].bodyKeys?.join(',')}`);

    // Save important bodies
    if (name === 'analytics_summary' && res.status === 200) {
      fs.writeFileSync(path.join(DATA_DIR, 'analytics.json'), JSON.stringify(res.body, null, 2));
    }
    if (name === 'listings_plural_path' && res.status === 200) {
      fs.writeFileSync(path.join(DATA_DIR, 'single_listing_sample.json'), JSON.stringify(res.body, null, 2));
      console.log(`  is_live field present: ${'is_live' in res.body}`);
      console.log(`  all fields: ${Object.keys(res.body).join(', ')}`);
    }
    if (name === 'listings_similar' && res.status === 200) {
      fs.writeFileSync(path.join(DATA_DIR, 'similar_sample.json'), JSON.stringify(res.body, null, 2));
    }
    await new Promise(r => setTimeout(r, 50));
  }

  // Clean up favourites if we added
  if (results.favourites_post?.status === 200 || results.favourites_post?.status === 201) {
    await request('DELETE', `/v1/favourites/${sampleListing}`, null, tok);
    console.log(`  [cleanup] Deleted test favourite`);
  }

  fs.writeFileSync(path.join(DATA_DIR, 'endpoint_tests.json'), JSON.stringify(results, null, 2));
  return results;
}

// ─── Favourites CRUD ──────────────────────────────────────────────────────────

async function testFavourites(sampleListingId) {
  console.log('\n[favourites] Testing full CRUD...');
  const tok = await getToken();
  const results = {};

  const add = await request('POST', '/v1/favourites', { id: sampleListingId }, tok);
  results.post = { status: add.status, body: add.body };
  console.log(`  POST → ${add.status}: ${JSON.stringify(add.body).slice(0,100)}`);

  await new Promise(r => setTimeout(r, 200));

  const list = await request('GET', '/v1/favourites', null, tok);
  results.get = { status: list.status, count: list.body?.count, keys: Object.keys(list.body || {}) };
  console.log(`  GET → ${list.status}: count=${list.body?.count} keys=${results.get.keys?.join(',')}`);

  const del = await request('DELETE', `/v1/favourites/${sampleListingId}`, null, tok);
  results.delete = { status: del.status, body: del.body };
  console.log(`  DELETE → ${del.status}: ${JSON.stringify(del.body).slice(0,100)}`);

  const listAfter = await request('GET', '/v1/favourites', null, tok);
  results.get_after_delete = { status: listAfter.status, count: listAfter.body?.count };
  console.log(`  GET after delete → count=${listAfter.body?.count}`);

  fs.writeFileSync(path.join(DATA_DIR, 'favourites_test.json'), JSON.stringify(results, null, 2));
  return results;
}

// ─── Project listing count cross-check ───────────────────────────────────────

async function checkProjectCounts(projects) {
  console.log(`\n[projects] Cross-checking total_listings for ${projects.length} projects...`);
  const mismatches = [];
  const checks = [];

  for (const proj of projects) {
    const tok = await getToken();
    const res = await request('GET', `/v1/listings?project_id=${proj.project_id}&limit=1`, null, tok);
    const liveTotal = res.body.total;
    const docTotal = proj.total_listings;
    const ok = liveTotal === docTotal;
    checks.push({ project_id: proj.project_id, doc: docTotal, live: liveTotal, ok });
    if (!ok) {
      mismatches.push({ project_id: proj.project_id, doc: docTotal, live: liveTotal });
      console.log(`  MISMATCH ${proj.project_id}: doc=${docTotal} live=${liveTotal}`);
    }
    await new Promise(r => setTimeout(r, 30));
  }

  console.log(`  Result: ${mismatches.length} mismatches out of ${checks.length} projects`);
  fs.writeFileSync(path.join(DATA_DIR, 'project_listing_counts.json'), JSON.stringify({ total: checks.length, mismatches: mismatches.length, checks, mismatch_list: mismatches }, null, 2));
  return mismatches;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Ivy Homes Data Pull ===');
  console.log(`Started: ${new Date().toISOString()} (IST: ${new Date().toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})})`);

  await checkHealth();

  // Login once upfront
  await getToken();

  // Pull all data
  console.log('\n[pull] GET /v1/listings (all pages)');
  const listings = await fetchAll('/v1/listings');
  fs.writeFileSync(path.join(DATA_DIR, 'listings.json'), JSON.stringify(listings, null, 2));

  console.log('\n[pull] GET /v1/rentals (all pages)');
  const rentals = await fetchAll('/v1/rentals');
  fs.writeFileSync(path.join(DATA_DIR, 'rentals.json'), JSON.stringify(rentals, null, 2));

  console.log('\n[pull] GET /v1/projects (all pages)');
  const projects = await fetchAll('/v1/projects');
  fs.writeFileSync(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2));

  const sampleListing = listings.results[0]?.listing_id;
  const sampleRental = rentals.results[0]?.listing_id;
  const sampleProject = projects.results[0]?.project_id;

  console.log(`\n[schema] First listing fields: ${Object.keys(listings.results[0] || {}).join(', ')}`);
  console.log(`[schema] is_live present: ${'is_live' in (listings.results[0] || {})}`);
  console.log(`[schema] First listing: ${JSON.stringify(listings.results[0], null, 2)}`);

  // Filter tests
  await testFilters(listings.total);

  // Endpoint probes
  await testEndpoints(sampleListing, sampleRental, sampleProject);

  // Favourites
  await testFavourites(sampleListing);

  // Project count cross-check
  await checkProjectCounts(projects.results);

  console.log('\n=== DONE ===');
  console.log(`listings=${listings.retrieved}, rentals=${rentals.retrieved}, projects=${projects.retrieved}`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
