/**
 * audit_section4.js
 * Hostile Audit — Section 4: Audit submission package itself
 */

const fs = require('fs');
const path = require('path');

const submissionPath = path.join(__dirname, '..', 'submission.json');
const readmePath = path.join(__dirname, '..', 'README.md');

const submission = JSON.parse(fs.readFileSync(submissionPath, 'utf8'));
const readme = fs.readFileSync(readmePath, 'utf8');

console.log('================================================================');
console.log('       HOSTILE AUDIT — SECTION 4: SUBMISSION PACKAGE AUDIT      ');
console.log('================================================================\n');

let issues = 0;

// 1. Schema key diff
const expectedTopKeys = ['api_key', 'candidate', 'answers', 'findings'];
const actualTopKeys = Object.keys(submission);
console.log('1. Checking top-level keys:');
expectedTopKeys.forEach(k => {
  if (!actualTopKeys.includes(k)) {
    console.error(`  [FAIL] Missing top-level key: ${k}`);
    issues++;
  } else {
    console.log(`  [PASS] Top-level key "${k}" present`);
  }
});
actualTopKeys.forEach(k => {
  if (!expectedTopKeys.includes(k)) {
    console.error(`  [FAIL] Extra unexpected top-level key: ${k}`);
    issues++;
  }
});

// Candidate keys
const expectedCandidateKeys = ['name', 'email', 'repo_url', 'demo_url'];
const actualCandidateKeys = Object.keys(submission.candidate);
console.log('\n2. Checking candidate keys:');
expectedCandidateKeys.forEach(k => {
  if (!actualCandidateKeys.includes(k)) {
    console.error(`  [FAIL] Missing candidate key: ${k}`);
    issues++;
  } else {
    const val = submission.candidate[k];
    if (!val || val.trim() === '') {
      console.error(`  [FAIL] Empty value for candidate.${k}`);
      issues++;
    } else {
      console.log(`  [PASS] candidate.${k} = "${val}"`);
    }
  }
});

// Answers keys
const expectedAnswerKeys = [
  'total_listing_records',
  'unique_properties',
  'active_listings',
  'corrupt_listing_ids',
  'total_monthly_rent',
  'avg_price_per_sqft_2bhk',
  'costliest_project',
  'listings_last_7_days',
  'fake_listing_ids',
  'projects_with_wrong_listing_count'
];
const actualAnswerKeys = Object.keys(submission.answers);
console.log('\n3. Checking answers keys:');
expectedAnswerKeys.forEach(k => {
  if (!actualAnswerKeys.includes(k)) {
    console.error(`  [FAIL] Missing answer key: ${k}`);
    issues++;
  } else {
    console.log(`  [PASS] Answer key "${k}" present`);
  }
});

// Checking placeholders
console.log('\n4. Checking for placeholder values:');
if (submission.api_key.includes('XXXXXXXXXXXX')) {
  console.error('  [FAIL] api_key still has placeholder!');
  issues++;
} else {
  console.log(`  [PASS] api_key is populated: ${submission.api_key}`);
}

// 5. Checking README content requirements
console.log('\n5. Checking README.md required sections:');
const requiredReadmePatterns = [
  { name: 'How to run it', pattern: /how to run/i },
  { name: 'How decided what to distrust', pattern: /distrust|interrogat|hypothesis/i },
  { name: 'Named, real example that turned out fine', pattern: /turned out fine|proved genuine|checked and verified genuine/i },
  { name: 'What with two more days', pattern: /two more days/i },
  { name: 'LLM / tool disclosure', pattern: /ai disclosure|llm disclosure|tools used/i }
];

requiredReadmePatterns.forEach(req => {
  if (req.pattern.test(readme)) {
    console.log(`  [PASS] README contains "${req.name}"`);
  } else {
    console.error(`  [FAIL] README missing "${req.name}"!`);
    issues++;
  }
});

console.log('\n================================================================');
console.log(`SECTION 4 AUDIT COMPLETE: ${issues === 0 ? 'ALL PACKAGE CHECKS PASSED (0 ISSUES)' : issues + ' ISSUES FOUND'}`);
console.log('================================================================');
