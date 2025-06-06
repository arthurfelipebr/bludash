const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'bludb'
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      registrationDate TEXT NOT NULL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      fullName TEXT NOT NULL,
      cpfOrCnpj TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT,
      state TEXT,
      clientType TEXT NOT NULL,
      registrationDate TEXT NOT NULL,
      notes TEXT,
      isDefaulter INTEGER DEFAULT 0,
      defaulterNotes TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      contactPerson TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      registrationDate TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS historicalPrices (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        supplierId TEXT NOT NULL,
        listId TEXT,
        productName TEXT NOT NULL,
        model TEXT NOT NULL,
        capacity TEXT,
        condition TEXT,
        priceBRL DOUBLE PRECISION,
        dateRecorded TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      customerName TEXT NOT NULL,
      clientId TEXT,
      productName TEXT NOT NULL,
      model TEXT NOT NULL,
      capacity TEXT,
      color TEXT,
      condition TEXT NOT NULL,
      supplierId TEXT,
      supplierName TEXT,
      purchasePrice DOUBLE PRECISION NOT NULL,
      sellingPrice DOUBLE PRECISION,
      status TEXT NOT NULL,
      estimatedDeliveryDate TEXT,
      orderDate TEXT NOT NULL,
      notes TEXT,
      paymentMethod TEXT,
      downPayment DOUBLE PRECISION,
      installments INTEGER,
      financedAmount DOUBLE PRECISION,
      totalWithInterest DOUBLE PRECISION,
      installmentValue DOUBLE PRECISION,
      bluFacilitaContractStatus TEXT,
      imeiBlocked INTEGER DEFAULT 0,
      arrivalDate TEXT,
      imei TEXT,
      arrivalNotes TEXT,
      batteryHealth INTEGER,
      readyForDelivery INTEGER DEFAULT 0,
      shippingCostSupplierToBlu DOUBLE PRECISION,
      shippingCostBluToClient DOUBLE PRECISION,
      whatsAppHistorySummary TEXT,
      bluFacilitaUsesSpecialRate INTEGER DEFAULT 0,
      bluFacilitaSpecialAnnualRate DOUBLE PRECISION,
      documents TEXT,
      trackingHistory TEXT,
      bluFacilitaInstallments TEXT,
      internalNotes TEXT,
      arrivalPhotos TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE SET NULL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS orderTrackingHistory (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS bluFacilitaInstallments (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        installmentNumber INTEGER NOT NULL,
        dueDate TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL,
        amountPaid DOUBLE PRECISION,
        paymentDate TEXT,
        paymentMethodUsed TEXT,
        notes TEXT,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS internalNotes (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        userId TEXT,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS documentFiles (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        uploadedAt TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS orderCosts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS clientPayments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        paymentDate TEXT NOT NULL,
        amountPaid DOUBLE PRECISION NOT NULL,
        paymentMethodUsed TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`);

    console.log('Database schema initialized/verified.');
  } finally {
    client.release();
  }
}

initializeDatabase().catch(err => console.error('Error initializing database', err));

module.exports = {
  run: (sql, params, cb) => {
    pool.query(sql, params)
      .then(res => cb(null, res))
      .catch(err => cb(err));
  },
  get: (sql, params, cb) => {
    pool.query(sql, params)
      .then(res => cb(null, res.rows[0]))
      .catch(err => cb(err));
  },
  all: (sql, params, cb) => {
    pool.query(sql, params)
      .then(res => cb(null, res.rows))
      .catch(err => cb(err));
  },
  pool
};
