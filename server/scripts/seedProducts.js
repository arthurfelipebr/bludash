const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const dataPath = path.resolve(__dirname, 'products_data.txt');

const db = new sqlite3.Database(dbPath);

const rawText = fs.readFileSync(dataPath, 'utf8');

const categoryMap = {
  'iPhones Lacrados': 'iPhone',
  'iPhones Seminovos (Montana Celulares)': 'OpenBox iP',
  'iPads Lacrados': 'iPad',
  'Teclados Apple (para iPad)': 'Outros',
  'MacBooks Lacrados': 'MacBook',
  'Mac Mini Lacrados': 'Mac Mini',
  'iMacs Lacrados': 'iMac',
  'Apple Watch Lacrados': 'Apple Watch',
  'AirPods Lacrados': 'AirPods',
  'Pencils Lacrados': 'Outros',
  'AirTags Lacrados': 'Outros'
};

function parseProducts(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let currentCategory = '';
  const products = [];

  for (const line of lines) {
    if (!line.startsWith('•')) {
      currentCategory = line;
      continue;
    }

    const productLine = line.slice(1).trim();
    const m = productLine.match(/(.+?)\s*-\s*R\$\s*([\d.,]+)/);
    if (!m) continue;

    let name = m[1].trim();
    const price = parseFloat(m[2].replace('.', '').replace(',', '.'));

    let category = categoryMap[currentCategory] || currentCategory || 'Outros';

    if (category === 'MacBook') {
      if (/MacBook\s+Pro/i.test(name)) category = 'MacBook Pro';
      else category = 'MacBook Air';
    }

    products.push({ name, category, avgPrice: price, highPrice: null, highInfo: '' });
  }

  return products;
}

const products = parseProducts(rawText);

const userId = 'seed-user';
const now = new Date().toISOString();

console.log(`Parsed ${products.length} products.`);

db.serialize(() => {
  products.forEach(p => {
    const id = uuidv4();
    const data = JSON.stringify({ name: p.name, categoryId: p.category, valorTabela: p.avgPrice });
    db.run('INSERT INTO productPricing (id, "userId", data, updatedAt) VALUES (?,?,?,?)', [id, userId, data, now]);
  });
});

db.close();
