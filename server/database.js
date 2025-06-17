const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbPath = process.env.DB_FILE || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      "registrationDate" TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "cpfOrCnpj" TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      cep TEXT,
      city TEXT,
      state TEXT,
      "clientType" TEXT NOT NULL,
      "registrationDate" TEXT NOT NULL,
      notes TEXT,
      "isDefaulter" INTEGER DEFAULT 0,
      "defaulterNotes" TEXT,
      FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    // Ensure legacy databases have the new columns
    db.run('ALTER TABLE clients ADD COLUMN address TEXT', [], () => {});
    db.run('ALTER TABLE clients ADD COLUMN cep TEXT', [], () => {});
    db.run('ALTER TABLE orders ADD COLUMN watchSize TEXT', [], () => {});
    db.run('ALTER TABLE orders ADD COLUMN trackingCode TEXT', [], () => {});
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", [], () => {});
    db.run('ALTER TABLE historicalPrices ADD COLUMN color TEXT', [], () => {});
    db.run('ALTER TABLE historicalPrices ADD COLUMN characteristics TEXT', [], () => {});
    db.run('ALTER TABLE historicalPrices ADD COLUMN originCountry TEXT', [], () => {});
    db.run('ALTER TABLE historicalPrices ADD COLUMN chip TEXT', [], () => {});
    db.run('ALTER TABLE clientPayments ADD COLUMN installments INTEGER', [], () => {});

    db.run(`CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      name TEXT NOT NULL,
      "contactPerson" TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      "registrationDate" TEXT NOT NULL,
      FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS historicalPrices (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        supplierId TEXT NOT NULL,
        listId TEXT,
        productName TEXT NOT NULL,
        model TEXT NOT NULL,
        capacity TEXT,
        color TEXT,
        characteristics TEXT,
        chip TEXT,
        originCountry TEXT,
        condition TEXT,
        priceBRL REAL,
        dateRecorded TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "customerName" TEXT NOT NULL,
      "clientId" TEXT,
      "productName" TEXT NOT NULL,
      model TEXT NOT NULL,
      capacity TEXT,
      watchSize TEXT,
      color TEXT,
      condition TEXT NOT NULL,
      "supplierId" TEXT,
      "supplierName" TEXT,
      "purchasePrice" REAL NOT NULL,
      "sellingPrice" REAL,
      status TEXT NOT NULL,
      "estimatedDeliveryDate" TEXT,
      "orderDate" TEXT NOT NULL,
      notes TEXT,
      "paymentMethod" TEXT,
      "downPayment" REAL,
      installments INTEGER,
      "financedAmount" REAL,
      "totalWithInterest" REAL,
      "installmentValue" REAL,
      "bluFacilitaContractStatus" TEXT,
      "imeiBlocked" INTEGER DEFAULT 0,
      "arrivalDate" TEXT,
      imei TEXT,
      "arrivalNotes" TEXT,
      "batteryHealth" INTEGER,
      "readyForDelivery" INTEGER DEFAULT 0,
      "shippingCostSupplierToBlu" REAL,
      "shippingCostBluToClient" REAL,
      trackingCode TEXT,
      "whatsAppHistorySummary" TEXT,
      "bluFacilitaUsesSpecialRate" INTEGER DEFAULT 0,
      "bluFacilitaSpecialAnnualRate" REAL,
      documents TEXT,
      "trackingHistory" TEXT,
      "bluFacilitaInstallments" TEXT,
      "internalNotes" TEXT,
      "arrivalPhotos" TEXT,
      FOREIGN KEY ("userId") REFERENCES users(id),
      FOREIGN KEY ("clientId") REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY ("supplierId") REFERENCES suppliers(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orderTrackingHistory (
        id TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bluFacilitaInstallments (
        id TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "installmentNumber" INTEGER NOT NULL,
        "dueDate" TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        "amountPaid" REAL,
        "paymentDate" TEXT,
        "paymentMethodUsed" TEXT,
        notes TEXT,
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS internalNotes (
        id TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        "userId" TEXT,
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS documentFiles (
        id TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        "uploadedAt" TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orderCosts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id),
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clientPayments (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "paymentDate" TEXT NOT NULL,
        "amountPaid" REAL NOT NULL,
        "paymentMethodUsed" TEXT NOT NULL,
        installments INTEGER,
        notes TEXT,
        FOREIGN KEY ("userId") REFERENCES users(id),
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customTable (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "Data" TEXT,
        "Descrição" TEXT,
        "Categoria" TEXT,
        "Moeda" TEXT,
        "Valor" TEXT,
        "Câmbio" TEXT,
        "Valor_em_BRL" TEXT,
        "Metodo_de_Pagamento" TEXT,
        "Status_do_Pagamento" TEXT,
        "Fornecedor" TEXT,
        "Cliente" TEXT,
        "Nota_Fiscal" TEXT,
        "Data_de_Vencimento" TEXT,
        "Data_de_Pagamento" TEXT,
        "Juros_Multa" TEXT,
        "Descontos" TEXT,
        "Observacoes" TEXT,
        FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customTableHistory (
        id TEXT PRIMARY KEY,
        rowId TEXT NOT NULL,
        data TEXT NOT NULL,
        changedAt TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        is_cpo BOOLEAN,
        categoryId INTEGER,
        FOREIGN KEY(categoryId) REFERENCES categories(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS productPricing (
        id TEXT PRIMARY KEY,
        productId INTEGER NOT NULL,
        "userId" TEXT NOT NULL,
        custoBRL REAL,
        custoOperacional REAL,
        frete REAL,
        nfPercent REAL,
        lucroPercent REAL,
        valorTabela REAL,
        updatedAt TEXT,
        FOREIGN KEY(productId) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS productPricingHistory (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        productId INTEGER NOT NULL,
        price REAL NOT NULL,
        recordedAt TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id),
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS productPricingGlobals (
        "userId" TEXT PRIMARY KEY,
        nfPercent REAL NOT NULL,
        nfProduto REAL NOT NULL,
        frete REAL NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id)
    )`);

    console.log('Database schema initialized/verified.');
  });
}

initializeDatabase();

function convertPlaceholders(sql) {
  return sql.replace(/\$\d+/g, '?');
}

module.exports = {
  run: (sql, params, cb) => {
    db.run(convertPlaceholders(sql), params, function(err) {
      cb(err, { lastID: this.lastID, changes: this.changes });
    });
  },
  get: (sql, params, cb) => {
    db.get(convertPlaceholders(sql), params, cb);
  },
  all: (sql, params, cb) => {
    db.all(convertPlaceholders(sql), params, cb);
  },
  db
};
