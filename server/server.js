require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database'); // PostgreSQL database connection
// const { GoogleGenAI } = require('@google/genai'); // For backend Gemini calls

const app =express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-jwt-secret-key'; // Fallback only, set in .env
// const GEMINI_API_KEY = process.env.API_KEY; // For backend Gemini calls

// if (GEMINI_API_KEY) {
//   const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
//   console.log("Gemini AI Service initialized on backend.");
// } else {
//   console.warn("Gemini API Key not found on backend. AI features will be disabled.");
// }


app.use(cors());
app.use(express.json());

// --- Middleware for Authentication ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err.message);
      return res.sendStatus(403); // invalid token
    }
    req.user = user; // Add user payload to request
    next(); // pass the execution off to whatever request the client intended
  });
};

// --- Authentication Routes ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const userId = uuidv4();
  const registrationDate = new Date().toISOString();
  const displayName = name && name.trim() !== '' ? name.trim() : email;

  db.run('INSERT INTO users (id, email, password, name, registrationDate) VALUES (?, ?, ?, ?, ?)', 
    [userId, email, hashedPassword, displayName, registrationDate], 
    function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
      }
      console.error('Registration error:', err.message);
      return res.status(500).json({ message: 'Falha ao registrar usuário.' });
    }
    const user = { id: userId, email: email, name: displayName, registrationDate: registrationDate };
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' }); // Longer expiry for new users
    res.status(201).json({ token, user });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error during login.' });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado ou senha incorreta.' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ message: 'Usuário não encontrado ou senha incorreta.' });
    
    const userPayload = { id: user.id, email: user.email, name: user.name, registrationDate: user.registrationDate };
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user: userPayload });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, email, name, registrationDate FROM users WHERE id = ?', [req.user.id], (err, userRow) => {
    if (err) {
      console.error('Error fetching user for /me:', err.message);
      return res.status(500).json({ message: 'Error fetching user details.' });
    }
    if (!userRow) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(userRow);
  });
});


// --- Placeholder API Routes (Protected) ---
// These should be expanded to implement full CRUD for each resource.

// Orders
app.get('/api/orders', authenticateToken, (req, res) => {
  db.all('SELECT * FROM orders WHERE userId = ? ORDER BY orderDate DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch orders.' });
    // Parse JSON fields if stored as strings
    const orders = rows.map(order => ({
        ...order,
        documents: typeof order.documents === 'string' ? JSON.parse(order.documents || '[]') : order.documents || [],
        trackingHistory: typeof order.trackingHistory === 'string' ? JSON.parse(order.trackingHistory || '[]') : order.trackingHistory || [],
        bluFacilitaInstallments: typeof order.bluFacilitaInstallments === 'string' ? JSON.parse(order.bluFacilitaInstallments || '[]') : order.bluFacilitaInstallments || [],
        internalNotes: typeof order.internalNotes === 'string' ? JSON.parse(order.internalNotes || '[]') : order.internalNotes || [],
        arrivalPhotos: typeof order.arrivalPhotos === 'string' ? JSON.parse(order.arrivalPhotos || '[]') : order.arrivalPhotos || [],
        imeiBlocked: Boolean(order.imeiBlocked),
        readyForDelivery: Boolean(order.readyForDelivery),
        bluFacilitaUsesSpecialRate: Boolean(order.bluFacilitaUsesSpecialRate),
    }));
    res.json(orders);
  });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const orderData = req.body;
  const orderId = orderData.id || uuidv4(); // Use provided ID if exists (e.g. from frontend UUID generation)

  // Ensure numeric fields are numbers, text fields are text, boolean are 0/1
  const purchasePrice = parseFloat(orderData.purchasePrice) || 0;
  const sellingPrice = orderData.sellingPrice !== undefined ? parseFloat(orderData.sellingPrice) : null;
  // ... (add similar parsing for all numeric/boolean fields from orderData) ...
  const downPayment = orderData.downPayment !== undefined ? parseFloat(orderData.downPayment) : null;
  const installments = orderData.installments !== undefined ? parseInt(orderData.installments, 10) : null;

  // Serialize arrays to JSON strings
  const documentsJSON = JSON.stringify(orderData.documents || []);
  const trackingHistoryJSON = JSON.stringify(orderData.trackingHistory || []);
  const bluFacilitaInstallmentsJSON = JSON.stringify(orderData.bluFacilitaInstallments || []);
  const internalNotesJSON = JSON.stringify(orderData.internalNotes || []);
  const arrivalPhotosJSON = JSON.stringify(orderData.arrivalPhotos || []);
  
  const sql = `INSERT INTO orders (
      id, userId, customerName, clientId, productName, model, capacity, color, condition, 
      supplierId, supplierName, purchasePrice, sellingPrice, status, estimatedDeliveryDate, 
      orderDate, notes, paymentMethod, downPayment, installments, financedAmount, 
      totalWithInterest, installmentValue, bluFacilitaContractStatus, imeiBlocked, 
      arrivalDate, imei, arrivalNotes, batteryHealth, readyForDelivery, 
      shippingCostSupplierToBlu, shippingCostBluToClient, whatsAppHistorySummary,
      bluFacilitaUsesSpecialRate, bluFacilitaSpecialAnnualRate,
      documents, trackingHistory, bluFacilitaInstallments, internalNotes, arrivalPhotos
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
      orderId, req.user.id, orderData.customerName, orderData.clientId, orderData.productName, 
      orderData.model, orderData.capacity, orderData.color, orderData.condition,
      orderData.supplierId, orderData.supplierName, purchasePrice, sellingPrice, orderData.status,
      orderData.estimatedDeliveryDate, orderData.orderDate || new Date().toISOString(), 
      orderData.notes, orderData.paymentMethod, downPayment, installments,
      orderData.financedAmount, orderData.totalWithInterest, orderData.installmentValue,
      orderData.bluFacilitaContractStatus, orderData.imeiBlocked ? 1 : 0,
      orderData.arrivalDate, orderData.imei, orderData.arrivalNotes, orderData.batteryHealth,
      orderData.readyForDelivery ? 1 : 0, orderData.shippingCostSupplierToBlu,
      orderData.shippingCostBluToClient, orderData.whatsAppHistorySummary,
      orderData.bluFacilitaUsesSpecialRate ? 1 : 0, orderData.bluFacilitaSpecialAnnualRate,
      documentsJSON, trackingHistoryJSON, bluFacilitaInstallmentsJSON, internalNotesJSON, arrivalPhotosJSON
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error("Error saving order:", err.message);
      return res.status(500).json({ message: 'Failed to save order.' });
    }
    // Fetch and return the newly created/updated order to ensure client has the DB version
     db.get('SELECT * FROM orders WHERE id = ? AND userId = ?', [orderId, req.user.id], (err, row) => {
        if (err || !row) {
            console.error("Error fetching order after save:", err ? err.message : "Row not found");
            return res.status(500).json({ message: 'Order saved, but failed to retrieve updated record.' });
        }
        res.status(201).json({
            ...row,
            documents: JSON.parse(row.documents || '[]'),
            trackingHistory: JSON.parse(row.trackingHistory || '[]'),
            bluFacilitaInstallments: JSON.parse(row.bluFacilitaInstallments || '[]'),
            internalNotes: JSON.parse(row.internalNotes || '[]'),
            arrivalPhotos: JSON.parse(row.arrivalPhotos || '[]'),
            imeiBlocked: Boolean(row.imeiBlocked),
            readyForDelivery: Boolean(row.readyForDelivery),
            bluFacilitaUsesSpecialRate: Boolean(row.bluFacilitaUsesSpecialRate),
        });
    });
  });
});
// Add GET /api/orders/:id, PUT /api/orders/:id, DELETE /api/orders/:id

// Clients
app.get('/api/clients', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clients WHERE userId = ? ORDER BY fullName ASC', [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch clients.' });
      res.json(rows.map(c => ({...c, isDefaulter: Boolean(c.isDefaulter)})));
    });
});
// Add POST, PUT, DELETE for clients

// Suppliers
app.get('/api/suppliers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM suppliers WHERE userId = ? ORDER BY name ASC', [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch suppliers.' });
      res.json(rows);
    });
});
// Add POST, PUT, DELETE for suppliers


// Gemini AI Proxy (Placeholder)
app.post('/api/gemini/parse-supplier-list', authenticateToken, async (req, res) => {
  // const { textList, supplierId, supplierName } = req.body;
  // if (!GEMINI_API_KEY || !ai) {
  //   return res.status(500).json({ message: "Gemini AI Service not configured on backend." });
  // }
  // try {
  //   // Construct prompt, call ai.models.generateContent as shown in guidelines
  //   // Example (very basic, adapt from AppService.tsx):
  //   // const prompt = `Parse this for ${supplierName}: ${textList} ... return JSON array.`;
  //   // const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt, config: { responseMimeType: "application/json" }});
  //   // const parsedData = JSON.parse(response.text); // Simplified, add robust parsing
  //   // res.json(parsedData);
  //   res.status(501).json({ message: "Gemini parsing not fully implemented on backend." });
  // } catch (error) {
  //   console.error("Backend Gemini Error:", error);
  //   res.status(500).json({ message: "Error processing list with Gemini on backend." });
  // }
  console.warn("/api/gemini/parse-supplier-list called, but backend Gemini integration is a placeholder.");
  res.status(501).json({ message: "Backend Gemini parsing not fully implemented yet." });
});


// --- Serve Static Frontend ---
// In production, Nginx or Apache might serve static files directly.
// For development or simpler setups, Express can serve them.
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist'))); // Serve files from frontend build

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`JWT Secret is ${JWT_SECRET && JWT_SECRET !== 'your-fallback-jwt-secret-key' ? 'set (recommended)' : 'NOT SET (using fallback - NOT SECURE FOR PRODUCTION!)'}`);
  console.log(`PostgreSQL DB: ${process.env.PGDATABASE || ''} @ ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}`);
});