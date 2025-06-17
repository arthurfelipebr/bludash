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
  'iPads Lacrados': 'iPad',
  'MacBooks Lacrados': 'MacBook Air',
  'Apple Watch Lacrados': 'Apple Watch',
  'AirPods Lacrados': 'AirPods',
  'Apple Pencils Lacrados': 'Outros',
  'Teclados Lacrados': 'Outros',
  'Mouses Lacrados': 'Outros',
  'AirTag Lacrados': 'Outros',
  'Acessórios e Outros Produtos Adicionais (Lacrados e Originais Apple, se especificado)': 'Outros'
};

function parseProducts(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let currentCategory = '';
  const products = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const catMatch = line.match(/^[IVX]+\.\s*(.*)$/);
    if (catMatch) { currentCategory = catMatch[1]; continue; }
    if (line.startsWith('•')) {
      const name = line.slice(1).trim();
      const avgLine = lines[i+2] && lines[i+1].includes('Média de Valores') ? lines[i+1] : null;
      const highLine = lines[i+2] && lines[i+2].includes('Preço mais alto') ? lines[i+2] : null;
      if (avgLine) {
        const avgPriceMatch = avgLine.match(/R\$([\d.,]+)/);
        const highPriceMatch = highLine ? highLine.match(/R\$([\d.,]+)/) : null;
        const highInfo = highLine ? highLine.split(/R\$[\d.,]+\s*/)[1] || '' : '';
        products.push({
          name,
          category: categoryMap[currentCategory] || 'Outros',
          avgPrice: avgPriceMatch ? parseFloat(avgPriceMatch[1].replace('.', '').replace(',', '.')) : null,
          highPrice: highPriceMatch ? parseFloat(highPriceMatch[1].replace('.', '').replace(',', '.')) : null,
          highInfo: highInfo.trim()
        });
      }
    }
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
