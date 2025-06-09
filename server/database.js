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
        notes TEXT,
        FOREIGN KEY ("userId") REFERENCES users(id),
        FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
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
