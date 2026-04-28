#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHOP = process.env.SHOPIFY_SHOP || 'scent-gallery-5.myshopify.com';
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
const PROFILE_ID_OVERRIDE = process.env.SHOPIFY_CHECKOUT_PROFILE_ID;

if (!TOKEN) {
  console.error('Missing SHOPIFY_ADMIN_TOKEN. Add it to .env or export it.');
  console.error('Token needs the write_checkout_branding_settings scope.');
  process.exit(1);
}

const spec = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'branding-spec.json'), 'utf8'),
);

async function gql(query, variables = {}) {
  const res = await fetch(
    `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:');
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

async function getPublishedProfileId() {
  if (PROFILE_ID_OVERRIDE) return PROFILE_ID_OVERRIDE;
  const data = await gql(`
    query {
      checkoutProfiles(first: 10) {
        edges { node { id name isPublished } }
      }
    }
  `);
  const published = data.checkoutProfiles.edges
    .map((e) => e.node)
    .find((n) => n.isPublished);
  if (!published) {
    console.error('No published checkout profile found. Available profiles:');
    console.error(JSON.stringify(data.checkoutProfiles.edges.map((e) => e.node), null, 2));
    process.exit(1);
  }
  console.log(`Using published profile: ${published.name} (${published.id})`);
  return published.id;
}

async function applyBranding() {
  const profileId = await getPublishedProfileId();
  const mutation = `
    mutation upsert($input: CheckoutBrandingInput!, $profileId: ID!) {
      checkoutBrandingUpsert(
        checkoutBrandingInput: $input
        checkoutProfileId: $profileId
      ) {
        checkoutBranding {
          designSystem {
            colors { global { accent brand } }
          }
        }
        userErrors { field message code }
      }
    }
  `;
  const data = await gql(mutation, { input: spec, profileId });
  const result = data.checkoutBrandingUpsert;
  if (result.userErrors && result.userErrors.length) {
    console.error('Branding upsert returned user errors:');
    console.error(JSON.stringify(result.userErrors, null, 2));
    process.exit(1);
  }
  console.log('Branding applied successfully.');
  console.log(`Accent now: ${result.checkoutBranding.designSystem.colors.global.accent}`);
}

applyBranding().catch((err) => {
  console.error(err);
  process.exit(1);
});
