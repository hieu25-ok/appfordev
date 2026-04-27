import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDbPath = path.resolve(__dirname, '../../data/db.json');

export class DataStore {
  constructor(dbPath = process.env.DB_PATH || defaultDbPath) {
    this.dbPath = dbPath;
  }

  async read() {
    const contents = await fs.readFile(this.dbPath, 'utf8');
    const parsed = JSON.parse(contents);

    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : []
    };
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, `${JSON.stringify(data, null, 2)}\n`);
  }

  createId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}

export const store = new DataStore();
