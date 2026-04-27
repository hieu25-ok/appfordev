import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meal-finder-'));
const dbPath = path.join(tempDir, 'db.json');

process.env.DB_PATH = dbPath;

await fs.copyFile(new URL('../data/db.json', import.meta.url), dbPath);

const { createApp } = await import('../src/app.js');

let server;
let baseUrl;

test.before(() => {
  server = createApp().listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await fs.rm(tempDir, { recursive: true, force: true });
});

test('GET /health returns ok status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('GET /api/ingredients lists seed ingredients', async () => {
  const response = await fetch(`${baseUrl}/api/ingredients`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 4);
  assert.equal(body[0].name, 'salt');
});

test('POST /api/ingredients creates an ingredient', async () => {
  const response = await fetch(`${baseUrl}/api/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'tomato' })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.name, 'tomato');
  assert.match(body.id, /^ing-/);
});

test('GET /api/recipes filters recipes by ingredients', async () => {
  const response = await fetch(`${baseUrl}/api/recipes?ingredientIds=ing-salt,ing-pepper`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].name, 'Pepper Beef');
});

test('POST /api/recipes rejects missing ingredient ids', async () => {
  const response = await fetch(`${baseUrl}/api/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unknown Soup',
      description: 'Cannot be saved because the ingredient is missing.',
      instructions: ['Cook everything.'],
      ingredients: [
        {
          ingredientId: 'ing-does-not-exist',
          quantity: 1,
          unit: 'cup'
        }
      ]
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Ingredient ing-does-not-exist does not exist');
});
