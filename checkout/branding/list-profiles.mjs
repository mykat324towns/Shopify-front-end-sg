#!/usr/bin/env node
const SHOP = process.env.SHOPIFY_SHOP || 'scent-gallery-5.myshopify.com';
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

if (!TOKEN) {
  console.error('Missing SHOPIFY_ADMIN_TOKEN.');
  process.exit(1);
}

const res = await fetch(
  `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({
      query: `
        query {
          checkoutProfiles(first: 20) {
            edges { node { id name isPublished editedAt } }
          }
        }
      `,
    }),
  },
);
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
