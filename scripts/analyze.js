/**
 * analyze.js — Derive all 10 analytical answers from the full local JSON dumps.
 *
 * Requirements:
 * - City: Mumbai
 * - Assigned locality: Mulund West
 * - Reference moment: 2026-09-10T00:00:00+05:30 (IST)
 * - All date math in IST
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const listingsPath = path.join(DATA_DIR, 'listings.json');
const rentalsPath = path.join(DATA_DIR, 'rentals.json');
const projectsPath = path.join(DATA_DIR, 'projects.json');

const listingsData = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
const rentalsData = JSON.parse(fs.readFileSync(rentalsPath, 'utf8'));
const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

const listings = listingsData.results;
const rentals = rentalsData.results;
const projects = projectsData.results;

console.log('=== Ivy Homes Mumbai Dataset Analysis ===');
console.log(`Listings retrieved: ${listings.length} (reported total: ${listingsData.total})`);
console.log(`Rentals retrieved: ${rentals.length} (reported total: ${rentalsData.total})`);
console.log(`Projects retrieved: ${projects.length} (reported total: ${projectsData.total})`);

// ── Q1: total_listing_records ────────────────────────────────────────────────
// "How many listing records are retrievable from /v1/listings?
// 'Retrievable' means: every record your key can obtain from that endpoint with no
// filters applied, having paged all the way to the end."
const q1 = listings.length; // 5100

// ── Q2: unique_properties ────────────────────────────────────────────────────
// Deduplication: identifying physical units cross-posted under multiple listings.
// Clustering by (apartment_name normalized, locality, bedroom, floor, carpet_area)
// reveals exactly 33 duplicate pairs (66 listings) representing the same unit.
const unitMap = new Map();
listings.forEach(l => {
  const apt = (l.apartment_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const loc = (l.locality || '').toLowerCase().trim();
  const key = `${apt}|${loc}|${l.bedroom}|${l.floor}|${l.carpet_area}`;
  if (!unitMap.has(key)) unitMap.set(key, []);
  unitMap.get(key).push(l.listing_id);
});
let duplicateListingsCount = 0;
for (const [key, ids] of unitMap) {
  if (ids.length > 1) duplicateListingsCount += (ids.length - 1);
}
const q2 = listings.length - duplicateListingsCount; // 5067

// ── Q3: active_listings ──────────────────────────────────────────────────────
// "How many retrievable listing records have is_live true?"
const q3 = listings.filter(l => l.is_live === true).length; // 4017

// ── Q4: corrupt_listing_ids ──────────────────────────────────────────────────
// "A small number of listing records describe something that cannot exist. List their listing_ids, sorted."
// Five categories of physically impossible listings (each with exactly 11 records):
// 1. Negative price (price < 0)
// 2. Carpet area > super built-up area
// 3. Floor > total_floors in building
// 4. Inverted coordinates (latitude > 50, lat/lng swapped outside India)
// 5. Residential units with 0 bedrooms (apartments/villas/houses, excluding vacant land plots)
const c_price = listings.filter(l => l.price < 0).map(l => l.listing_id);
const c_carpet = listings.filter(l => l.carpet_area > 0 && l.super_built_up_area > 0 && l.carpet_area > l.super_built_up_area).map(l => l.listing_id);
const c_floor = listings.filter(l => l.floor > 0 && l.total_floors > 0 && l.floor > l.total_floors).map(l => l.listing_id);
const c_geo = listings.filter(l => l.latitude > 50).map(l => l.listing_id);
const c_bed = listings.filter(l => l.bedroom === 0 && l.property_type !== 'plot').map(l => l.listing_id);

const q4 = [...new Set([...c_price, ...c_carpet, ...c_floor, ...c_geo, ...c_bed])].sort();

// ── Q5: total_monthly_rent ───────────────────────────────────────────────────
// "Sum of monthly rent across all retrievable rental records in your assigned locality (Mulund West)"
const mwRentals = rentals.filter(r => (r.locality || '').toLowerCase().trim() === 'mulund west');
const q5 = mwRentals.reduce((sum, r) => sum + r.price, 0); // 8859500

// ── Q9: fake_listing_ids ─────────────────────────────────────────────────────
// "Some of these listings are not real. They exist to generate enquiries. List their listing_ids, sorted."
// 11 listings use bait pricing: monthly rental rates (< 100k, ₹17,470 - ₹44,440) listed as sale prices for full residential apartments.
const q9 = listings.filter(l => l.price > 0 && l.price < 100000).map(l => l.listing_id).sort();

// ── Q6: avg_price_per_sqft_2bhk ──────────────────────────────────────────────
// "Across retrievable listing records where is_live is true and bedroom is 2, leaving out
// records in 4 and 9: mean of price divided by carpet area, in rupees per square foot, to 2 decimals."
const corruptSet = new Set(q4);
const fakeSet = new Set(q9);
const eligible2bhk = listings.filter(l => l.is_live && l.bedroom === 2 && !corruptSet.has(l.listing_id) && !fakeSet.has(l.listing_id));
const meanRaw = eligible2bhk.reduce((s, l) => s + l.price / l.carpet_area, 0) / eligible2bhk.length;
const q6 = parseFloat(meanRaw.toFixed(2)); // 62626.94

// ── Q7: costliest_project ────────────────────────────────────────────────────
// "The project with the highest maximum price, as { project_id, price_max_inr }"
// Project price_max is in Crores (float). P50016 has price_max 12.44 Cr = 124,400,000 INR.
const maxProject = projects.reduce((best, p) => (p.price_max > (best?.price_max || 0) ? p : best), null);
const q7 = {
  project_id: maxProject.project_id,
  price_max_inr: Math.round(maxProject.price_max * 10000000),
};

// ── Q8: listings_last_7_days ─────────────────────────────────────────────────
// "How many retrievable listing records were posted in the seven days before REFERENCE [2026-09-03, 2026-09-10), in IST?"
const refTime = new Date('2026-09-10T00:00:00+05:30').getTime();
const startTime = new Date('2026-09-03T00:00:00+05:30').getTime();
const q8 = listings.filter(l => {
  if (!l.posted_at) return false;
  const t = new Date(l.posted_at + (l.posted_at.endsWith('Z') ? '' : '+05:30')).getTime();
  return t >= startTime && t < refTime;
}).length; // 167

// ── Q10: projects_with_wrong_listing_count ───────────────────────────────────
// "Every project reports how many listings it has. For how many projects is that number wrong?"
// In this schema, project.total_listings tracks currently available (is_live: true) listings.
// Comparing against actual active listings per project_id identifies the 166 corrupt counts.
const activeCounts = new Map();
listings.filter(l => l.is_live).forEach(l => {
  if (l.project_id) {
    activeCounts.set(l.project_id, (activeCounts.get(l.project_id) || 0) + 1);
  }
});
let q10 = 0;
projects.forEach(p => {
  const actual = activeCounts.get(p.project_id) || 0;
  if (p.total_listings !== actual) q10++;
});

console.log('\n=== ANSWERS ===');
console.log('1. total_listing_records:', q1);
console.log('2. unique_properties:', q2);
console.log('3. active_listings:', q3);
console.log(`4. corrupt_listing_ids: [${q4.length} IDs]`);
console.log('5. total_monthly_rent:', q5);
console.log('6. avg_price_per_sqft_2bhk:', q6);
console.log('7. costliest_project:', JSON.stringify(q7));
console.log('8. listings_last_7_days:', q8);
console.log(`9. fake_listing_ids: [${q9.length} IDs]`);
console.log('10. projects_with_wrong_listing_count:', q10);

const output = {
  total_listing_records: q1,
  unique_properties: q2,
  active_listings: q3,
  corrupt_listing_ids: q4,
  total_monthly_rent: q5,
  avg_price_per_sqft_2bhk: q6,
  costliest_project: q7,
  listings_last_7_days: q8,
  fake_listing_ids: q9,
  projects_with_wrong_listing_count: q10,
};

fs.writeFileSync(path.join(DATA_DIR, 'answers.json'), JSON.stringify(output, null, 2), 'utf8');
console.log('\nWrote answers to data/answers.json');
