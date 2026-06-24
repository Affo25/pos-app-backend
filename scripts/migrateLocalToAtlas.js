/**
 * Copies all collections from local MongoDB to Atlas (or any remote URI in MONGO_URI).
 * Upserts by _id so existing documents on the server are updated, new ones inserted.
 *
 * Usage (from backend/): node scripts/migrateLocalToAtlas.js
 *
 * Optional .env:
 *   LOCAL_MONGO_URI=mongodb://localhost:27017/inventory_db
 *   MONGO_URI=<atlas connection string>  (required for destination)
 *   LOCAL_DB_NAME / REMOTE_DB_NAME — override DB names parsed from URIs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { MongoClient } = require('mongodb');

const LOCAL_URI =
  process.env.LOCAL_MONGO_URI || 'mongodb://localhost:27017/inventory_db';
const REMOTE_URI = process.env.MONGO_URI;

function dbNameFromUri(uri) {
  const noQuery = uri.split('?')[0];
  const segments = noQuery.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || last.includes('@') || last.includes(':')) return null;
  return last;
}

function getLocalDbName() {
  return process.env.LOCAL_DB_NAME || dbNameFromUri(LOCAL_URI) || 'inventory_db';
}

function getRemoteDbName() {
  return process.env.REMOTE_DB_NAME || dbNameFromUri(REMOTE_URI) || 'POS';
}

async function copyCollection(localColl, remoteColl, name) {
  const cursor = localColl.find({});
  let total = 0;
  const batch = [];
  const BATCH = 500;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    });
    if (batch.length >= BATCH) {
      await remoteColl.bulkWrite(batch, { ordered: false });
      total += batch.length;
      batch.length = 0;
    }
  }
  if (batch.length) {
    await remoteColl.bulkWrite(batch, { ordered: false });
    total += batch.length;
  }
  console.log(`  ${name}: ${total} document(s)`);
}

async function main() {
  if (!REMOTE_URI) {
    console.error('Set MONGO_URI in backend/.env (Atlas connection string).');
    process.exit(1);
  }

  const localDbName = getLocalDbName();
  const remoteDbName = getRemoteDbName();

  console.log(`Source: ${LOCAL_URI.replace(/:[^:@]+@/, ':****@')} → db "${localDbName}"`);
  console.log(`Target: ${REMOTE_URI.replace(/:[^:@]+@/, ':****@')} → db "${remoteDbName}"\n`);

  const localClient = new MongoClient(LOCAL_URI);
  const remoteClient = new MongoClient(REMOTE_URI);

  await localClient.connect();
  await remoteClient.connect();

  const localDb = localClient.db(localDbName);
  const remoteDb = remoteClient.db(remoteDbName);

  const collections = await localDb.listCollections().toArray();
  const names = collections
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'));

  if (!names.length) {
    console.log('No user collections found in local database.');
    await localClient.close();
    await remoteClient.close();
    return;
  }

  for (const name of names) {
    await copyCollection(localDb.collection(name), remoteDb.collection(name), name);
  }

  console.log('\nDone.');
  await localClient.close();
  await remoteClient.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
