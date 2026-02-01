#!/usr/bin/env node

/**
 * Script to check Netlify Blobs configuration for local development
 * Run: node scripts/check-blob-config.js
 */

require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Checking Netlify Blobs Configuration for Local Development\n');
console.log('='.repeat(60));

const siteId = process.env.NETLIFY_BLOBS_SITE_ID;
const token = process.env.NETLIFY_BLOBS_TOKEN;

let allGood = true;

// Check Site ID
console.log('\n📍 Site ID (NETLIFY_BLOBS_SITE_ID):');
if (siteId) {
  console.log(`   ✅ Configured: ${siteId.substring(0, 8)}...${siteId.substring(siteId.length - 4)}`);
} else {
  console.log('   ❌ NOT configured');
  console.log('   → Get it from: Netlify Dashboard > Site settings > Site details');
  allGood = false;
}

// Check Token
console.log('\n🔑 Access Token (NETLIFY_BLOBS_TOKEN):');
if (token) {
  console.log(`   ✅ Configured: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`);
} else {
  console.log('   ❌ NOT configured');
  console.log('   → Create at: Netlify Dashboard > User Settings > Applications > Personal Access Tokens');
  console.log('   → Required scope: "Read and write access to Netlify Blobs"');
  allGood = false;
}

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('\n✅ All configured! Your local development will use production Netlify Blobs.');
  console.log('⚠️  WARNING: Changes you make locally will affect production data!\n');
} else {
  console.log('\n📋 To use production blobs in local development:');
  console.log('   1. Copy .env.example to .env.local (if you haven\'t already)');
  console.log('   2. Add NETLIFY_BLOBS_SITE_ID from Netlify Dashboard');
  console.log('   3. Create and add NETLIFY_BLOBS_TOKEN from Netlify User Settings');
  console.log('   4. Restart your dev server\n');
  console.log('💡 Without these credentials, local development uses .local-data/ files\n');
}

process.exit(allGood ? 0 : 1);
