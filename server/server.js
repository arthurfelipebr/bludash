require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('./database'); // SQLite database connection
const { GoogleGenAI } = require('@google/genai');

const app =express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-jwt-secret-key'; // Fallback only, set in .env
const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY; // Ou process.env.API_KEY, conforme seu .env
const CORREIOS_API_KEY = process.env.CORREIOS_API_KEY;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderId = req.params.orderId || 'misc';
    const now = new Date();
    const dir = path.join(
      UPLOADS_DIR,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      orderId
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  },
});
const upload = multer({ storage });

let correiosToken = null;
let correiosTokenExpiry = 0; // epoch milliseconds

async function getCorreiosToken() {
    if (!CORREIOS_API_KEY) {
        throw new Error('CORREIOS_API_KEY not configured.');
    }
    const now = Date.now();
    if (correiosToken && now < correiosTokenExpiry - 5 * 60 * 1000) {
        return correiosToken;
    }
    const credentials = Buffer.from(CORREIOS_API_KEY).toString('base64');
    const response = await fetch('https://api.correios.com.br/token/v1/autentica', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`
        }
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.message || 'Correios token request failed');
    }
    correiosToken = data.token || data.access_token || data.accessToken;
    // expiraEm can be string date or epoch seconds
    if (data.expiraEm) {
        const expiry = new Date(data.expiraEm).getTime();
        if (!isNaN(expiry)) {
            correiosTokenExpiry = expiry;
        }
    }
    return correiosToken;
}

let genAI;
if (GEMINI_API_KEY) {

  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  console.log('Cliente Gemini AI inicializado no backend.');
} else {
  console.warn('Chave da API do Gemini não encontrada. Funcionalidades de IA estarão desabilitadas.');
}


app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

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

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.sendStatus(403);
};

// --- Authentication Routes ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, organizationName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (!organizationName) {
    return res.status(400).json({ message: 'Organization name is required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const userId = uuidv4();
  const registrationDate = new Date().toISOString();
  const displayName = name && name.trim() !== '' ? name.trim() : email;
  const role = 'user';

  const organizationId = uuidv4();
  db.run('INSERT INTO organizations (id, name) VALUES ($1, $2)', [organizationId, organizationName], (errOrg) => {
    if (errOrg) {
      console.error('Error creating organization:', errOrg.message);
      return res.status(500).json({ message: 'Falha ao criar organização.' });
    }

    db.run('INSERT INTO users (id, email, password, name, role, "registrationDate", "organizationId") VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [userId, email, hashedPassword, displayName, role, registrationDate, organizationId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }
        console.error('Registration error:', err.message);
        return res.status(500).json({ message: 'Falha ao registrar usuário.' });
      }
    const user = { id: userId, email: email, name: displayName, role, registrationDate: registrationDate, organizationId };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, organizationId }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user });
  });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT id, email, password, name, role, "registrationDate", "organizationId" FROM users WHERE email = $1', [email], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error during login.' });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado ou senha incorreta.' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ message: 'Usuário não encontrado ou senha incorreta.' });
    
    const userPayload = { id: user.id, email: user.email, name: user.name, role: user.role, registrationDate: user.registrationDate, organizationId: user.organizationId };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, organizationId: user.organizationId }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user: userPayload });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, email, name, role, "registrationDate", "organizationId" FROM users WHERE id = $1', [req.user.id], (err, userRow) => {
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

// --- User Management (Admin Only) ---
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  db.all('SELECT id, email, name, role, "registrationDate", "organizationId" FROM users WHERE "organizationId" = $1 ORDER BY email ASC', [req.user.organizationId], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ message: 'Failed to fetch users.' });
    }
    res.json(rows);
  });
});

app.post('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password and role are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }
  const hashedPassword = bcrypt.hashSync(password, 8);
  const userId = uuidv4();
  const registrationDate = new Date().toISOString();
  const displayName = name && name.trim() !== '' ? name.trim() : email;
  db.run('INSERT INTO users (id, email, password, name, role, "registrationDate", "organizationId") VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [userId, email, hashedPassword, displayName, role, registrationDate, req.user.organizationId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }
        console.error('Error inviting user:', err.message);
        return res.status(500).json({ message: 'Failed to invite user.' });
      }
      db.get('SELECT id, email, name, role, "registrationDate", "organizationId" FROM users WHERE id = $1', [userId], (err2, row) => {
        if (err2 || !row) {
          return res.status(500).json({ message: 'User created, but failed to retrieve.' });
        }
        res.status(201).json(row);
      });
    });
});

app.put('/api/users/:id/role', authenticateToken, authorizeAdmin, (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;
  if (!role) return res.status(400).json({ message: 'Role is required.' });
  db.run('UPDATE users SET role = $1 WHERE id = $2', [role, userId], function(err) {
    if (err) {
      console.error('Error updating user role:', err.message);
      return res.status(500).json({ message: 'Failed to update user role.' });
    }
    db.get('SELECT id, email, name, role, "registrationDate", "organizationId" FROM users WHERE id = $1', [userId], (err2, row) => {
      if (err2 || !row) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.json(row);
    });
  });
});


// --- Placeholder API Routes (Protected) ---
// These should be expanded to implement full CRUD for each resource.

// Orders
app.get('/api/orders', authenticateToken, (req, res) => {
  db.all('SELECT * FROM orders WHERE "organizationId" = $1 ORDER BY "orderDate" DESC', [req.user.organizationId], (err, rows) => {
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
      id, "userId", "organizationId", "customerName", "clientId", "productName", model, capacity, watchSize, color, condition,
      "supplierId", "supplierName", "purchasePrice", "sellingPrice", status, "estimatedDeliveryDate", 
      "orderDate", notes, "paymentMethod", "downPayment", installments, "financedAmount", 
      "totalWithInterest", "installmentValue", "bluFacilitaContractStatus", "imeiBlocked", 
      "arrivalDate", imei, "arrivalNotes", threeuToolsReport, "batteryHealth", "readyForDelivery",
      "shippingCostSupplierToBlu", "shippingCostBluToClient", "whatsAppHistorySummary",
      trackingCode,
      "bluFacilitaUsesSpecialRate", "bluFacilitaSpecialAnnualRate",
      documents, "trackingHistory", "bluFacilitaInstallments", "internalNotes", "arrivalPhotos"
  ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
      $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
      $42, $43, $44
  )`;

  const params = [
      orderId, req.user.id, req.user.organizationId, orderData.customerName, orderData.clientId, orderData.productName,
      orderData.model, orderData.capacity, orderData.watchSize, orderData.color, orderData.condition,
      orderData.supplierId, orderData.supplierName, purchasePrice, sellingPrice, orderData.status,
      orderData.estimatedDeliveryDate, orderData.orderDate || new Date().toISOString(),
      orderData.notes, orderData.paymentMethod, downPayment, installments,
      orderData.financedAmount, orderData.totalWithInterest, orderData.installmentValue,
      orderData.bluFacilitaContractStatus, orderData.imeiBlocked ? 1 : 0,
      orderData.arrivalDate, orderData.imei, orderData.arrivalNotes, orderData.threeuToolsReport, orderData.batteryHealth,
      orderData.readyForDelivery ? 1 : 0, orderData.shippingCostSupplierToBlu,
      orderData.shippingCostBluToClient, orderData.whatsAppHistorySummary,
      orderData.trackingCode,
      orderData.bluFacilitaUsesSpecialRate ? 1 : 0, orderData.bluFacilitaSpecialAnnualRate,
      documentsJSON, trackingHistoryJSON, bluFacilitaInstallmentsJSON, internalNotesJSON, arrivalPhotosJSON
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error("Error saving order:", err.message);
      return res.status(500).json({ message: 'Failed to save order.' });
    }
    // Fetch and return the newly created/updated order to ensure client has the DB version
     db.get('SELECT * FROM orders WHERE id = $1 AND "organizationId" = $2', [orderId, req.user.organizationId], (err, row) => {
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
// --- Individual Order Routes ---
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  db.get('SELECT * FROM orders WHERE id = $1 AND "organizationId" = $2', [orderId, req.user.organizationId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch order.' });
    if (!row) return res.status(404).json({ message: 'Order not found.' });
    res.json({
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

app.put('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const orderData = req.body;

  const purchasePrice = parseFloat(orderData.purchasePrice) || 0;
  const sellingPrice = orderData.sellingPrice !== undefined ? parseFloat(orderData.sellingPrice) : null;
  const downPayment = orderData.downPayment !== undefined ? parseFloat(orderData.downPayment) : null;
  const installments = orderData.installments !== undefined ? parseInt(orderData.installments, 10) : null;

  const documentsJSON = JSON.stringify(orderData.documents || []);
  const trackingHistoryJSON = JSON.stringify(orderData.trackingHistory || []);
  const bluFacilitaInstallmentsJSON = JSON.stringify(orderData.bluFacilitaInstallments || []);
  const internalNotesJSON = JSON.stringify(orderData.internalNotes || []);
  const arrivalPhotosJSON = JSON.stringify(orderData.arrivalPhotos || []);

  const sql = `UPDATE orders SET
      "customerName"=$1, "clientId"=$2, "productName"=$3, model=$4, capacity=$5,
      watchSize=$6, color=$7, condition=$8, "supplierId"=$9, "supplierName"=$10, "purchasePrice"=$11,
      "sellingPrice"=$12, status=$13, "estimatedDeliveryDate"=$14, "orderDate"=$15,
      notes=$16, "paymentMethod"=$17, "downPayment"=$18, installments=$19,
      "financedAmount"=$20, "totalWithInterest"=$21, "installmentValue"=$22,
      "bluFacilitaContractStatus"=$23, "imeiBlocked"=$24, "arrivalDate"=$25, imei=$26,
      "arrivalNotes"=$27, threeuToolsReport=$28, "batteryHealth"=$29, "readyForDelivery"=$30,
      "shippingCostSupplierToBlu"=$31, "shippingCostBluToClient"=$32,
      "whatsAppHistorySummary"=$33, trackingCode=$34, "bluFacilitaUsesSpecialRate"=$35,
      "bluFacilitaSpecialAnnualRate"=$36, documents=$37, "trackingHistory"=$38,
      "bluFacilitaInstallments"=$39, "internalNotes"=$40, "arrivalPhotos"=$41
      WHERE id=$42 AND "organizationId"=$43`;

  const params = [
      orderData.customerName, orderData.clientId, orderData.productName,
      orderData.model, orderData.capacity, orderData.watchSize, orderData.color, orderData.condition,
      orderData.supplierId, orderData.supplierName, purchasePrice, sellingPrice,
      orderData.status, orderData.estimatedDeliveryDate,
      orderData.orderDate || new Date().toISOString(), orderData.notes,
      orderData.paymentMethod, downPayment, installments,
      orderData.financedAmount, orderData.totalWithInterest, orderData.installmentValue,
      orderData.bluFacilitaContractStatus, orderData.imeiBlocked ? 1 : 0,
      orderData.arrivalDate, orderData.imei, orderData.arrivalNotes, orderData.threeuToolsReport, orderData.batteryHealth,
      orderData.readyForDelivery ? 1 : 0, orderData.shippingCostSupplierToBlu,
      orderData.shippingCostBluToClient, orderData.whatsAppHistorySummary,
      orderData.trackingCode,
      orderData.bluFacilitaUsesSpecialRate ? 1 : 0, orderData.bluFacilitaSpecialAnnualRate,
      documentsJSON, trackingHistoryJSON, bluFacilitaInstallmentsJSON,
      internalNotesJSON, arrivalPhotosJSON,
      orderId, req.user.organizationId
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating order:', err.message);
      return res.status(500).json({ message: 'Failed to update order.' });
    }
    db.get('SELECT * FROM orders WHERE id = $1 AND "organizationId" = $2', [orderId, req.user.organizationId], (err, row) => {
      if (err || !row) {
        console.error('Error fetching order after update:', err ? err.message : 'Row not found');
        return res.status(500).json({ message: 'Order updated, but failed to retrieve record.' });
      }
      res.json({
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

app.post('/api/orders/:orderId/arrival-photos', authenticateToken, upload.single('photo'), (req, res) => {
  const file = req.file;
  const orderId = req.params.orderId;
  if (!file) return res.status(400).json({ message: 'No file uploaded.' });
  db.get('SELECT arrivalPhotos FROM orders WHERE id = $1 AND "organizationId" = $2', [orderId, req.user.organizationId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const existing = JSON.parse(row.arrivalPhotos || '[]');
    const relative = path.relative(UPLOADS_DIR, file.path).replace(/\\/g, '/');
    const doc = {
      id: uuidv4(),
      name: file.originalname,
      url: `/uploads/${relative}`,
      uploadedAt: new Date().toISOString(),
      type: file.mimetype,
      size: file.size,
    };
    const updated = [...existing, doc];
    db.run('UPDATE orders SET "arrivalPhotos" = $1 WHERE id = $2 AND "organizationId" = $3', [JSON.stringify(updated), orderId, req.user.organizationId], err2 => {
      if (err2) {
        console.error('Error saving arrival photo:', err2.message);
        return res.status(500).json({ message: 'Failed to save photo.' });
      }
      res.json(doc);
    });
  });
});

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  db.run('DELETE FROM orders WHERE id = $1 AND "organizationId" = $2', [orderId, req.user.organizationId], function(err) {
    if (err) {
      console.error('Error deleting order:', err.message);
      return res.status(500).json({ message: 'Failed to delete order.' });
    }
    res.sendStatus(204);
  });
});

// Clients
// CORREÇÃO: SQL query para renomear colunas para camelCase
const CLIENTS_SELECT_QUERY = `
  SELECT
    id,
    "userId",
    "fullName",
    "cpfOrCnpj",
    email,
    phone,
    address,
    cep,
    city,
    state,
    "clientType",
    "registrationDate",
    notes,
    "isDefaulter",
    "defaulterNotes"
  FROM clients
`;

app.get('/api/clients', authenticateToken, (req, res) => {
    const search = req.query.search ? String(req.query.search) : null;
    let query = `${CLIENTS_SELECT_QUERY} WHERE "organizationId" = $1`;
    const params = [req.user.organizationId];

    if (search) {
        query += ` AND ("fullName" LIKE $2 OR "cpfOrCnpj" LIKE $2)`;
        params.push(`%${search}%`);
    }

    query += ' ORDER BY "fullName" ASC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Error fetching clients:", err.message);
        return res.status(500).json({ message: 'Failed to fetch clients.' });
      }
      res.json(rows.map(c => ({...c, isDefaulter: Boolean(c.isDefaulter)})));
    });
});
app.get('/api/clients/:id', authenticateToken, (req, res) => {
    const clientId = req.params.id;
    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "organizationId" = $2`;
    db.get(query, [clientId, req.user.organizationId], (err, row) => {
        if (err) {
          console.error(`Error fetching client ${clientId}:`, err.message);
          return res.status(500).json({ message: 'Failed to fetch client.' });
        }
        if (!row) return res.status(404).json({ message: 'Client not found.' });
        res.json({ ...row, isDefaulter: Boolean(row.isDefaulter) });
    });
});

app.post('/api/clients', authenticateToken, (req, res) => {
  const data = req.body;
  const clientId = data.id || uuidv4();
  const registrationDate = data.registrationDate || new Date().toISOString();
  
  const sql = `INSERT INTO clients (
      id, "userId", "organizationId", "fullName", "cpfOrCnpj", email, phone, address, cep, city, state, "clientType",
      "registrationDate", notes, "isDefaulter", "defaulterNotes"
  ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
  )`;

  const params = [
      clientId, req.user.id, req.user.organizationId, data.fullName, data.cpfOrCnpj, data.email, data.phone,
      data.address, data.cep, data.city, data.state, data.clientType, registrationDate, data.notes,
      data.isDefaulter ? 1 : 0, data.defaulterNotes
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error saving client:', err.message);
      return res.status(500).json({ message: 'Failed to save client.' });
    }
    
    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "organizationId" = $2`;
    db.get(query, [clientId, req.user.organizationId], (err, row) => {
        if (err || !row) {
            console.error("Error fetching client after save:", err ? err.message : "Row not found");
            return res.status(500).json({ message: 'Client saved, but failed to retrieve updated record.' });
        }
        res.status(201).json({ ...row, isDefaulter: Boolean(row.isDefaulter) });
    });
  });
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  const clientId = req.params.id;
  const data = req.body;
  
  const sql = `UPDATE clients SET
      "fullName"=$1, "cpfOrCnpj"=$2, email=$3, phone=$4, address=$5, cep=$6, city=$7, state=$8,
      "clientType"=$9, notes=$10, "isDefaulter"=$11, "defaulterNotes"=$12
      WHERE id=$13 AND "organizationId"=$14`;

  const params = [
      data.fullName, data.cpfOrCnpj, data.email, data.phone, data.address, data.cep, data.city, data.state,
      data.clientType, data.notes, data.isDefaulter ? 1 : 0, data.defaulterNotes,
      clientId, req.user.organizationId
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating client:', err.message);
      return res.status(500).json({ message: 'Failed to update client.' });
    }

    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "organizationId" = $2`;
    db.get(query, [clientId, req.user.organizationId], (err, row) => {
        if (err || !row) {
            console.error('Error fetching client after update:', err ? err.message : 'Row not found');
            return res.status(404).json({ message: 'Client not found after update.' });
        }
        res.json({ ...row, isDefaulter: Boolean(row.isDefaulter) });
    });
  });
});


app.delete('/api/clients/:id', authenticateToken, (req, res) => {
    const clientId = req.params.id;
    db.run('DELETE FROM clients WHERE id = $1 AND "organizationId" = $2', [clientId, req.user.organizationId], function(err) {
        if (err) {
            console.error('Error deleting client:', err.message);
            return res.status(500).json({ message: 'Failed to delete client.' });
        }
        res.sendStatus(204);
    });
});

// Suppliers
app.get('/api/suppliers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM suppliers WHERE "organizationId" = $1 ORDER BY name ASC', [req.user.organizationId], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch suppliers.' });
      res.json(rows);
    });
});
app.get('/api/suppliers/:id', authenticateToken, (req, res) => {
    const supplierId = req.params.id;
    db.get('SELECT * FROM suppliers WHERE id = $1 AND "organizationId" = $2', [supplierId, req.user.organizationId], (err, row) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch supplier.' });
        if (!row) return res.status(404).json({ message: 'Supplier not found.' });
        res.json(row);
    });
});

app.post('/api/suppliers', authenticateToken, (req, res) => {
    const data = req.body;
    const supplierId = data.id || uuidv4();
    const registrationDate = data.registrationDate || new Date().toISOString();
    const sql = `INSERT INTO suppliers (
        id, "userId", "organizationId", name, "contactPerson", phone, email, notes, "registrationDate"
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
    )`;
    const params = [
        supplierId, req.user.id, req.user.organizationId, data.name, data.contactPerson, data.phone,
        data.email, data.notes, registrationDate
    ];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving supplier:', err.message);
            return res.status(500).json({ message: 'Failed to save supplier.' });
        }
        db.get('SELECT * FROM suppliers WHERE id = $1 AND "organizationId" = $2', [supplierId, req.user.organizationId], (err2, row) => {
            if (err2 || !row) {
                console.error('Error fetching supplier after save:', err2 ? err2.message : 'Row not found');
                return res.status(500).json({ message: 'Supplier saved, but failed to retrieve record.' });
            }
            res.status(201).json(row);
        });
    });
});

app.put('/api/suppliers/:id', authenticateToken, (req, res) => {
    const supplierId = req.params.id;
    const data = req.body;
    const sql = `UPDATE suppliers SET
        name=$1, "contactPerson"=$2, phone=$3, email=$4, notes=$5
        WHERE id=$6 AND "organizationId"=$7`;
    const params = [data.name, data.contactPerson, data.phone, data.email, data.notes, supplierId, req.user.organizationId];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating supplier:', err.message);
            return res.status(500).json({ message: 'Failed to update supplier.' });
        }
        db.get('SELECT * FROM suppliers WHERE id = $1 AND "organizationId" = $2', [supplierId, req.user.organizationId], (err2, row) => {
            if (err2 || !row) {
                return res.status(404).json({ message: 'Supplier not found.' });
            }
            res.json(row);
        });
    });
});

app.delete('/api/suppliers/:id', authenticateToken, (req, res) => {
    const supplierId = req.params.id;
    db.run('DELETE FROM suppliers WHERE id = $1 AND "organizationId" = $2', [supplierId, req.user.organizationId], function(err) {
        if (err) {
            console.error('Error deleting supplier:', err.message);
            return res.status(500).json({ message: 'Failed to delete supplier.' });
        }
        res.sendStatus(204);
    });
});

// Historical Supplier Prices
app.post('/api/suppliers/prices/historical', authenticateToken, (req, res) => {
    const products = Array.isArray(req.body) ? req.body : [];
    if (products.length === 0) {
        return res.status(400).json({ message: 'Lista de produtos inválida.' });
    }

    const insertSql = `INSERT INTO historicalPrices (
        id, userId, supplierId, listId, productName, model, capacity,
        color, characteristics, chip, originCountry,
        condition, priceBRL, dateRecorded
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Use the underlying sqlite3 database instance for transactional inserts
    db.db.serialize(() => {
        const stmt = db.db.prepare(insertSql);
        products.forEach(p => {
            stmt.run([
                p.id || uuidv4(),
                req.user.id,
                p.supplierId,
                p.listId || null,
                p.productName,
                p.model,
                p.capacity,
                p.color || null,
                p.characteristics || null,
                p.chip || null,
                p.originCountry || null,
                p.condition,
                p.priceBRL !== undefined && p.priceBRL !== null ? parseFloat(p.priceBRL) : null,
                p.dateRecorded || new Date().toISOString(),
            ]);
        });
        stmt.finalize(err => {
            if (err) {
                console.error('Error saving historical prices:', err.message);
                return res.status(500).json({ message: 'Failed to save historical prices.' });
            }
            res.sendStatus(201);
        });
    });
});

app.get('/api/suppliers/prices/historical', authenticateToken, (req, res) => {
    const supplierId = req.query.supplierId;
    const baseSql = 'SELECT * FROM historicalPrices WHERE userId = $1';
    const sql = supplierId ? `${baseSql} AND supplierId = $2 ORDER BY dateRecorded DESC` : `${baseSql} ORDER BY dateRecorded DESC`;
    const params = supplierId ? [req.user.id, supplierId] : [req.user.id];
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching historical prices:', err.message);
            return res.status(500).json({ message: 'Failed to fetch historical prices.' });
        }
        res.json(rows);
    });
});

app.delete('/api/suppliers/prices/historical', authenticateToken, (req, res) => {
    const supplierId = req.query.supplierId;
    const baseSql = 'DELETE FROM historicalPrices WHERE userId = $1';
    const sql = supplierId ? `${baseSql} AND supplierId = $2` : baseSql;
    const params = supplierId ? [req.user.id, supplierId] : [req.user.id];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error deleting historical prices:', err.message);
            return res.status(500).json({ message: 'Failed to delete historical prices.' });
        }
        res.sendStatus(204);
    });
});

// Client Payments
app.get('/api/client-payments', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clientPayments WHERE "userId" = $1 ORDER BY "paymentDate" DESC', [req.user.id], (err, rows) => {
        if (err) {
            console.error('Error fetching client payments:', err.message);
            return res.status(500).json({ message: 'Failed to fetch client payments.' });
        }
        res.json(rows);
    });
});

app.get('/api/orders/:orderId/payments', authenticateToken, (req, res) => {
    const orderId = req.params.orderId;
    db.all('SELECT * FROM clientPayments WHERE "orderId" = $1 AND "userId" = $2 ORDER BY "paymentDate" DESC', [orderId, req.user.id], (err, rows) => {
        if (err) {
            console.error('Error fetching payments for order:', err.message);
            return res.status(500).json({ message: 'Failed to fetch payments for order.' });
        }
        res.json(rows);
    });
});

app.post('/api/orders/:orderId/payments', authenticateToken, (req, res) => {
    const orderId = req.params.orderId;
    const { paymentDate, amountPaid, paymentMethodUsed, installments, notes } = req.body;
    const paymentId = uuidv4();
    const sql = `INSERT INTO clientPayments (id, "userId", "orderId", "paymentDate", "amountPaid", "paymentMethodUsed", installments, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    const params = [paymentId, req.user.id, orderId, paymentDate || new Date().toISOString(), amountPaid, paymentMethodUsed, installments, notes];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving client payment:', err.message);
            return res.status(500).json({ message: 'Failed to save client payment.' });
        }
        db.get('SELECT * FROM clientPayments WHERE id = $1', [paymentId], (err2, row) => {
            if (err2 || !row) {
                console.error('Error fetching client payment after insert:', err2 ? err2.message : 'Row not found');
                return res.status(500).json({ message: 'Payment saved, but failed to retrieve record.' });
            }
            res.status(201).json(row);
        });
    });
});

// Order Costs
app.get('/api/order-costs', authenticateToken, (req, res) => {
    db.all('SELECT * FROM orderCosts WHERE "userId" = $1 ORDER BY date DESC', [req.user.id], (err, rows) => {
        if (err) {
            console.error('Error fetching order costs:', err.message);
            return res.status(500).json({ message: 'Failed to fetch order costs.' });
        }
        res.json(rows);
    });
});

app.get('/api/orders/:orderId/costs', authenticateToken, (req, res) => {
    const orderId = req.params.orderId;
    db.all('SELECT * FROM orderCosts WHERE "orderId" = $1 AND "userId" = $2 ORDER BY date DESC', [orderId, req.user.id], (err, rows) => {
        if (err) {
            console.error('Error fetching costs for order:', err.message);
            return res.status(500).json({ message: 'Failed to fetch costs for order.' });
        }
        res.json(rows);
    });
});

app.post('/api/orders/:orderId/costs', authenticateToken, (req, res) => {
    const orderId = req.params.orderId;
    const { type, description, amount, date } = req.body;
    const costId = uuidv4();
    const sql = `INSERT INTO orderCosts (id, "userId", "orderId", type, description, amount, date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const params = [costId, req.user.id, orderId, type, description, amount, date || new Date().toISOString()];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving order cost:', err.message);
            return res.status(500).json({ message: 'Failed to save order cost.' });
        }
        db.get('SELECT * FROM orderCosts WHERE id = $1', [costId], (err2, row) => {
            if (err2 || !row) {
                console.error('Error fetching order cost after insert:', err2 ? err2.message : 'Row not found');
                return res.status(500).json({ message: 'Cost saved, but failed to retrieve record.' });
            }
            res.status(201).json(row);
        });
    });
});

app.delete('/api/costs/:costItemId', authenticateToken, (req, res) => {
    const costItemId = req.params.costItemId;
    db.run('DELETE FROM orderCosts WHERE id = $1 AND "userId" = $2', [costItemId, req.user.id], function(err) {
        if (err) {
            console.error('Error deleting order cost:', err.message);
            return res.status(500).json({ message: 'Failed to delete order cost.' });
        }
        res.sendStatus(204);
    });
});

// Custom Table CRUD
app.get('/api/custom-table', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customTable WHERE "userId" = $1 ORDER BY "Data" DESC', [req.user.id], (err, rows) => {
        if (err) {
            console.error('Error fetching custom table:', err.message);
            return res.status(500).json({ message: 'Failed to fetch table.' });
        }
        res.json(rows);
    });
});

app.post('/api/custom-table', authenticateToken, (req, res) => {
    const data = req.body;
    const rowId = uuidv4();
    const sql = `INSERT INTO customTable (
        id, "userId", "Data", "Descrição", "Categoria", "Moeda", "Valor",
        "Câmbio", "Valor_em_BRL", "Metodo_de_Pagamento", "Status_do_Pagamento",
        "Fornecedor", "Cliente", "Nota_Fiscal", "Data_de_Vencimento",
        "Data_de_Pagamento", "Juros_Multa", "Descontos", "Observacoes"
    ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )`;
    const params = [rowId, req.user.id, data.Data, data.Descrição, data.Categoria,
        data.Moeda, data.Valor, data.Câmbio, data.Valor_em_BRL,
        data.Metodo_de_Pagamento, data.Status_do_Pagamento, data.Fornecedor,
        data.Cliente, data.Nota_Fiscal, data.Data_de_Vencimento,
        data.Data_de_Pagamento, data.Juros_Multa, data.Descontos, data.Observacoes];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving custom table row:', err.message);
            return res.status(500).json({ message: 'Failed to save row.' });
        }
        db.get('SELECT * FROM customTable WHERE id = $1', [rowId], (err2, row) => {
            if (err2 || !row) {
                return res.status(500).json({ message: 'Row saved, but retrieval failed.' });
            }
            res.status(201).json(row);
        });
    });
});

app.put('/api/custom-table/:id', authenticateToken, (req, res) => {
    const rowId = req.params.id;
    const data = req.body;
    db.get('SELECT * FROM customTable WHERE id = $1 AND "userId" = $2', [rowId, req.user.id], (err, existing) => {
        if (err || !existing) {
            return res.status(404).json({ message: 'Item not found.' });
        }
        db.run('INSERT INTO customTableHistory (id, rowId, data, changedAt, "userId") VALUES ($1,$2,$3,$4,$5)',
            [uuidv4(), rowId, JSON.stringify(existing), new Date().toISOString(), req.user.id], () => {});
        const sql = `UPDATE customTable SET
            "Data"=$1, "Descrição"=$2, "Categoria"=$3, "Moeda"=$4, "Valor"=$5,
            "Câmbio"=$6, "Valor_em_BRL"=$7, "Metodo_de_Pagamento"=$8,
            "Status_do_Pagamento"=$9, "Fornecedor"=$10, "Cliente"=$11, "Nota_Fiscal"=$12,
            "Data_de_Vencimento"=$13, "Data_de_Pagamento"=$14, "Juros_Multa"=$15,
            "Descontos"=$16, "Observacoes"=$17
            WHERE id=$18 AND "userId"=$19`;
        const params = [data.Data, data.Descrição, data.Categoria, data.Moeda,
            data.Valor, data.Câmbio, data.Valor_em_BRL, data.Metodo_de_Pagamento,
            data.Status_do_Pagamento, data.Fornecedor, data.Cliente, data.Nota_Fiscal,
            data.Data_de_Vencimento, data.Data_de_Pagamento, data.Juros_Multa,
            data.Descontos, data.Observacoes, rowId, req.user.id];
        db.run(sql, params, function(err2) {
            if (err2) {
                console.error('Error updating custom table row:', err2.message);
                return res.status(500).json({ message: 'Failed to update row.' });
            }
            db.get('SELECT * FROM customTable WHERE id = $1', [rowId], (err3, row) => {
                if (err3 || !row) {
                    return res.status(500).json({ message: 'Row updated, but retrieval failed.' });
                }
                res.json(row);
            });
        });
    });
});

app.delete('/api/custom-table/:id', authenticateToken, (req, res) => {
    const rowId = req.params.id;
    db.get('SELECT * FROM customTable WHERE id = $1 AND "userId" = $2', [rowId, req.user.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ message: 'Item not found.' });
        }
        db.run('INSERT INTO customTableHistory (id, rowId, data, changedAt, "userId") VALUES ($1,$2,$3,$4,$5)',
            [uuidv4(), rowId, JSON.stringify(row), new Date().toISOString(), req.user.id], () => {});
        db.run('DELETE FROM customTable WHERE id = $1 AND "userId" = $2', [rowId, req.user.id], function(err2) {
            if (err2) {
                console.error('Error deleting custom table row:', err2.message);
                return res.status(500).json({ message: 'Failed to delete row.' });
            }
            res.sendStatus(204);
        });
    });
});

// Product Pricing CRUD
app.get('/api/product-pricing', authenticateToken, (req, res) => {
    const sql = `SELECT
        p.id AS productId,
        p.name AS productName,
        p.is_cpo,
        c.name AS categoryName,
        pp.custoBRL,
        pp.valorTabela,
        pp.lucroPercent,
        pp.usarLucroDaCategoria,
        pp.updatedAt
    FROM productPricing pp
    JOIN products p ON pp.productId = p.id
    JOIN categories c ON p.categoryId = c.id
    ORDER BY c.id, p.id`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching pricing products:', err.message);
            return res.status(500).json({ message: 'Failed to fetch products.' });
        }
        res.json(rows);
    });
});

app.post('/api/product-pricing', authenticateToken, (req, res) => {
    const {
        productId,
        custoBRL,
        custoOperacional,
        frete,
        nfPercent,
        lucroPercent,
        valorTabela
    } = req.body;
    if (!productId) {
        return res.status(400).json({ message: 'productId required' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const sql = `INSERT INTO productPricing (
        id, productId, "userId", custoBRL, custoOperacional, frete,
        nfPercent, lucroPercent, valorTabela, usarLucroDaCategoria, updatedAt
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
    const params = [
        id,
        productId,
        req.user.id,
        custoBRL,
        custoOperacional,
        frete,
        nfPercent,
        lucroPercent,
        valorTabela,
        req.body.usarLucroDaCategoria ?? 1,
        now
    ];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving pricing product:', err.message);
            return res.status(500).json({ message: 'Failed to save product.' });
        }
        if (valorTabela !== undefined) {
            db.run(
                'INSERT INTO productPricingHistory (id, "userId", productId, price, recordedAt) VALUES ($1,$2,$3,$4,$5)',
                [uuidv4(), req.user.id, productId, parseFloat(valorTabela), now],
                () => {}
            );
        }
        res.status(201).json({ id, productId, custoBRL, valorTabela, custoOperacional, frete, nfPercent, lucroPercent, usarLucroDaCategoria: req.body.usarLucroDaCategoria ?? 1, updatedAt: now });
    });
});

app.put('/api/product-pricing/:id', authenticateToken, (req, res) => {
    const productId = req.params.id;
    const data = req.body;
    const now = new Date().toISOString();
    const fields = [];
    const params = [];
    if (data.custoBRL !== undefined) { fields.push('custoBRL = ?'); params.push(data.custoBRL); }
    if (data.custoOperacional !== undefined) { fields.push('custoOperacional = ?'); params.push(data.custoOperacional); }
    if (data.frete !== undefined) { fields.push('frete = ?'); params.push(data.frete); }
    if (data.nfPercent !== undefined) { fields.push('nfPercent = ?'); params.push(data.nfPercent); }
    if (data.lucroPercent !== undefined) { fields.push('lucroPercent = ?'); params.push(data.lucroPercent); }
    if (data.valorTabela !== undefined) { fields.push('valorTabela = ?'); params.push(data.valorTabela); }
    if (data.usarLucroDaCategoria !== undefined) { fields.push('usarLucroDaCategoria = ?'); params.push(data.usarLucroDaCategoria ? 1 : 0); }
    fields.push('updatedAt = ?');
    params.push(now);
    params.push(productId, req.user.id);
    if (fields.length === 1) {
        return res.json({ id: productId, ...data });
    }
    const sql = `UPDATE productPricing SET ${fields.join(', ')} WHERE productId = ? AND "userId" = ?`;
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating pricing product:', err.message);
            return res.status(500).json({ message: 'Failed to update product.' });
        }
        if (data.valorTabela !== undefined) {
            db.run(
                'INSERT INTO productPricingHistory (id, "userId", productId, price, recordedAt) VALUES ($1,$2,$3,$4,$5)',
                [uuidv4(), req.user.id, productId, parseFloat(data.valorTabela), now],
                () => {}
            );
        }
        res.json({ id: productId, ...data });
    });
});

app.delete('/api/product-pricing/:id', authenticateToken, (req, res) => {
    const productId = req.params.id;
    db.run('DELETE FROM productPricing WHERE productId = $1 AND "userId" = $2', [productId, req.user.id], function(err) {
        if (err) {
            console.error('Error deleting pricing product:', err.message);
            return res.status(500).json({ message: 'Failed to delete product.' });
        }
        res.sendStatus(204);
    });
});

app.get('/api/product-pricing/history', authenticateToken, (req, res) => {
    const productId = req.query.productId;
    const base = 'SELECT * FROM productPricingHistory WHERE "userId" = $1';
    const sql = productId ? `${base} AND productId = $2 ORDER BY recordedAt DESC` : `${base} ORDER BY recordedAt DESC`;
    const params = productId ? [req.user.id, productId] : [req.user.id];
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching pricing history:', err.message);
            return res.status(500).json({ message: 'Failed to fetch history.' });
        }
        res.json(rows);
    });
});

// Product Category CRUD
app.get('/api/product-pricing/categories', authenticateToken, (_req, res) => {
    db.all('SELECT id, name, lucroPercent, dustBag, packaging FROM categories ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching categories:', err.message);
            return res.status(500).json({ message: 'Failed to fetch categories.' });
        }
        const formatted = rows.map(r => ({
            id: String(r.id),
            name: r.name,
            lucroPercent: r.lucroPercent || 0,
            dustBag: r.dustBag || 0,
            packaging: r.packaging || 0
        }));
        res.json(formatted);
    });
});

app.post('/api/product-pricing/categories', authenticateToken, (req, res) => {
    const { name, lucroPercent = 0, dustBag = 0, packaging = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    db.run('INSERT INTO categories (name, lucroPercent, dustBag, packaging) VALUES ($1,$2,$3,$4)', [name, lucroPercent, dustBag, packaging], function(err) {
        if (err) {
            console.error('Error saving category:', err.message);
            return res.status(500).json({ message: 'Failed to save category.' });
        }
        res.status(201).json({ id: String(this.lastID), name, lucroPercent, dustBag, packaging });
    });
});

app.put('/api/product-pricing/categories/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { name, lucroPercent = 0, dustBag = 0, packaging = 0 } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });
    db.run('UPDATE categories SET name=$1, lucroPercent=$2, dustBag=$3, packaging=$4 WHERE id=$5', [name, lucroPercent, dustBag, packaging, id], function(err) {
        if (err) {
            console.error('Error updating category:', err.message);
            return res.status(500).json({ message: 'Failed to update category.' });
        }
        res.json({ id, name, lucroPercent, dustBag, packaging });
    });
});

app.delete('/api/product-pricing/categories/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM categories WHERE id=$1', [id], function(err) {
        if (err) {
            console.error('Error deleting category:', err.message);
            return res.status(500).json({ message: 'Failed to delete category.' });
        }
        res.sendStatus(204);
    });
});

// Pricing Globals
app.get('/api/product-pricing/globals', authenticateToken, (req, res) => {
    db.get('SELECT nfPercent, nfProduto, frete, roundTo FROM productPricingGlobals WHERE "userId" = $1', [req.user.id], (err, row) => {
        if (err) {
            console.error('Error fetching globals:', err.message);
            return res.status(500).json({ message: 'Failed to fetch globals.' });
        }
        if (!row) {
            return res.json({ nfPercent: 0.02, nfProduto: 30, frete: 105, roundTo: 70 });
        }
        res.json({
            nfPercent: row.nfPercent,
            nfProduto: row.nfProduto,
            frete: row.frete,
            roundTo: row.roundTo ?? 70
        });
    });
});

app.put('/api/product-pricing/globals', authenticateToken, (req, res) => {
    const { nfPercent, nfProduto, frete, roundTo } = req.body;
    const sql = 'INSERT INTO productPricingGlobals ("userId", nfPercent, nfProduto, frete, roundTo) VALUES ($1,$2,$3,$4,$5) ON CONFLICT("userId") DO UPDATE SET nfPercent=$2, nfProduto=$3, frete=$4, roundTo=$5';
    db.run(sql, [req.user.id, nfPercent, nfProduto, frete, roundTo], function(err) {
        if (err) {
            console.error('Error saving globals:', err.message);
            return res.status(500).json({ message: 'Failed to save globals.' });
        }
        res.json({ nfPercent, nfProduto, frete, roundTo });
    });
});

app.post('/api/contracts/autentique', authenticateToken, (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId required' });

    db.get('SELECT * FROM orders WHERE id = $1 AND "userId" = $2', [orderId, req.user.id], (err, orderRow) => {
        if (err || !orderRow) {
            console.error('Error fetching order for contract:', err && err.message);
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (!orderRow.clientId) {
            return res.status(400).json({ message: 'Order missing client.' });
        }
        db.get('SELECT * FROM clients WHERE id = $1 AND "userId" = $2', [orderRow.clientId, req.user.id], async (err2, clientRow) => {
            if (err2 || !clientRow) {
                console.error('Error fetching client for contract:', err2 && err2.message);
                return res.status(404).json({ message: 'Client not found.' });
            }
            try {
                const templatePath = path.join(__dirname, 'contractTemplate.html');
                let html = fs.readFileSync(templatePath, 'utf8');
                html = html.replace('[Nome do Contratante]', clientRow.fullName)
                           .replace('[E-mail do Contratante]', clientRow.email)
                           .replace('[Celular do Contratante]', clientRow.phone)
                           .replace('[CPF do Contratante]', clientRow.cpfOrCnpj);

                const contentBase64 = Buffer.from(html).toString('base64');
                const mutation = `mutation CreateDocument($name: String!, $content: String!) {\n  createDocument(document: { name: $name, contentBase64: $content, contentType: \"text/html\" }) { id }\n}`;
                const variables = { name: `Contrato ${orderRow.id}`, content: contentBase64 };
                const response = await fetch('https://api.autentique.com.br/v2/graphql', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AUTENTIQUE_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query: mutation, variables })
                });
                const data = await response.json();
                res.json(data);
            } catch (error) {
                console.error('Autentique integration error:', error);
                res.status(500).json({ message: 'Failed to send contract.' });
            }
        });
    });
});

// Correios Token Generation
app.post('/api/correios/token', authenticateToken, async (req, res) => {
    try {
        const token = await getCorreiosToken();
        res.json({ token, expiresAt: correiosTokenExpiry });
    } catch (error) {
        console.error('Correios token error:', error);
        res.status(500).json({ message: 'Failed to obtain Correios token.' });
    }
});

const correiosArBase = 'https://apps3.correios.com.br/areletronico/v1/ars';

async function requestAREndpoint(endpoint, objetos) {
    const token = await getCorreiosToken();
    const response = await fetch(`${correiosArBase}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ objetos })
    });
    const data = await response.json();
    if (!response.ok) {
        const err = new Error('Correios AR request failed');
        err.details = data;
        throw err;
    }
    return data;
}

app.post('/api/correios/ar/eventos', authenticateToken, async (req, res) => {
    try {
        const objetos = req.body.objetos;
        if (!Array.isArray(objetos)) {
            return res.status(400).json({ message: 'objetos must be an array' });
        }
        const data = await requestAREndpoint('eventos', objetos);
        res.json(data);
    } catch (error) {
        console.error('Correios AR eventos error:', error);
        res.status(500).json({ message: 'Failed to fetch AR eventos.' });
    }
});

app.post('/api/correios/ar/primeiroevento', authenticateToken, async (req, res) => {
    try {
        const objetos = req.body.objetos;
        if (!Array.isArray(objetos)) {
            return res.status(400).json({ message: 'objetos must be an array' });
        }
        const data = await requestAREndpoint('primeiroevento', objetos);
        res.json(data);
    } catch (error) {
        console.error('Correios AR primeiro evento error:', error);
        res.status(500).json({ message: 'Failed to fetch AR primeiro evento.' });
    }
});

app.post('/api/correios/ar/ultimoevento', authenticateToken, async (req, res) => {
    try {
        const objetos = req.body.objetos;
        if (!Array.isArray(objetos)) {
            return res.status(400).json({ message: 'objetos must be an array' });
        }
        const data = await requestAREndpoint('ultimoevento', objetos);
        res.json(data);
    } catch (error) {
        console.error('Correios AR ultimo evento error:', error);
        res.status(500).json({ message: 'Failed to fetch AR ultimo evento.' });
    }
});

// Dashboard Statistics
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT
        (SELECT COUNT(*) FROM orders WHERE "userId" = $1 AND status NOT IN ('Entregue','Cancelado')) AS totalActiveOrders,
        (SELECT COUNT(*) FROM orders WHERE "userId" = $1 AND "paymentMethod" = 'BluFacilita' AND ("bluFacilitaContractStatus" IS NULL OR "bluFacilitaContractStatus" != 'Pago Integralmente')) AS totalOpenBluFacilita,
        (SELECT COUNT(*) FROM orders WHERE "userId" = $1 AND "paymentMethod" = 'BluFacilita' AND "bluFacilitaContractStatus" = 'Atrasado') AS overdueBluFacilitaContracts,
        (SELECT COUNT(*) FROM orders WHERE "userId" = $1 AND status = 'Entregue' AND strftime('%Y-%m', "arrivalDate") = strftime('%Y-%m', 'now')) AS productsDeliveredThisMonth,
        (SELECT COUNT(*) FROM clients WHERE "userId" = $1) AS totalClients,
        (SELECT COUNT(*) FROM suppliers WHERE "userId" = $1) AS totalSuppliers`;
    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('Error fetching dashboard stats:', err.message);
            return res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
        }
        res.json(row || {
            totalActiveOrders: 0,
            totalOpenBluFacilita: 0,
            overdueBluFacilitaContracts: 0,
            productsDeliveredThisMonth: 0,
            totalClients: 0,
            totalSuppliers: 0,
        });
    });
});

app.get('/api/dashboard/weekly-summary', authenticateToken, (req, res) => {
    const weekOffset = parseInt(req.query.offset) || 0;
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day) - weekOffset * 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startISO = startOfWeek.toISOString();
    const endISO = endOfWeek.toISOString();

    db.all('SELECT * FROM orders WHERE "userId" = $1', [req.user.id], (err, orders) => {
        if (err) {
            console.error('Error fetching orders for weekly summary:', err.message);
            return res.status(500).json({ message: 'Failed to load weekly summary.' });
        }

        let ordersArrived = 0;
        let ordersDelivered = 0;
        let newBluFacilitaContracts = 0;
        let totalAmountPaidToSuppliers = 0;
        let totalAmountReceivedFromClients = 0;
        let totalBluFacilitaFinanced = 0;

        orders.forEach(o => {
            const trackingHistory = typeof o.trackingHistory === 'string' ? JSON.parse(o.trackingHistory || '[]') : o.trackingHistory || [];

            if (o.arrivalDate) {
                const arrival = new Date(o.arrivalDate);
                if (arrival >= startOfWeek && arrival <= endOfWeek) {
                    ordersArrived += 1;
                    totalAmountPaidToSuppliers += o.purchasePrice || 0;
                }
            }

            const deliveryEntry = trackingHistory.find(h => (h.status === 'Entregue' || h.status === 'Enviado') && h.date);
            if (deliveryEntry) {
                const deliveryDate = new Date(deliveryEntry.date);
                if (deliveryDate >= startOfWeek && deliveryDate <= endOfWeek) {
                    ordersDelivered += 1;
                    totalAmountReceivedFromClients += o.sellingPrice || 0;
                }
            }

            if (o.paymentMethod === 'BluFacilita') {
                const orderDate = new Date(o.orderDate);
                if (orderDate >= startOfWeek && orderDate <= endOfWeek) {
                    newBluFacilitaContracts += 1;
                    totalBluFacilitaFinanced += o.financedAmount || 0;
                }
            }
        });

        res.json({
            startDate: startISO,
            endDate: endISO,
            ordersArrived,
            ordersDelivered,
            newBluFacilitaContracts,
            totalAmountPaidToSuppliers,
            totalAmountReceivedFromClients,
            totalBluFacilitaFinanced,
        });
    });
});

// --- Admin Summary ---
app.get('/api/admin/summary', authenticateToken, authorizeAdmin, (req, res) => {
  const summary = {
    activeOrganizations: 0,
    ongoingOrders: 0,
    totalRevenue: 0,
  };

  db.get('SELECT COUNT(*) as count FROM organizations', [], (err, row) => {
    if (err) {
      console.error('Error counting organizations:', err.message);
      return res.status(500).json({ message: 'Failed to fetch summary.' });
    }
    summary.activeOrganizations = row?.count || 0;
    db.get("SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('Entregue','Cancelado')", [], (err2, row2) => {
      if (err2) {
        console.error('Error counting orders:', err2.message);
        return res.status(500).json({ message: 'Failed to fetch summary.' });
      }
      summary.ongoingOrders = row2?.count || 0;
      db.get('SELECT IFNULL(SUM(sellingPrice),0) as total FROM orders', [], (err3, row3) => {
        if (err3) {
          console.error('Error calculating revenue:', err3.message);
          return res.status(500).json({ message: 'Failed to fetch summary.' });
        }
        summary.totalRevenue = row3?.total || 0;
        res.json(summary);
      });
    });
  });
});

// --- Admin Reports ---
app.get('/api/admin/report', authenticateToken, authorizeAdmin, (req, res) => {
  const report = {
    organizations: 0,
    users: 0,
    clients: 0,
    suppliers: 0,
    orders: 0,
    totalRevenue: 0,
  };

  db.get('SELECT COUNT(*) as count FROM organizations', [], (err, rowOrg) => {
    if (err) {
      console.error('Error counting organizations:', err.message);
      return res.status(500).json({ message: 'Failed to fetch report.' });
    }
    report.organizations = rowOrg?.count || 0;
    db.get('SELECT COUNT(*) as count FROM users', [], (err2, rowUsers) => {
      if (err2) {
        console.error('Error counting users:', err2.message);
        return res.status(500).json({ message: 'Failed to fetch report.' });
      }
      report.users = rowUsers?.count || 0;
      db.get('SELECT COUNT(*) as count FROM clients', [], (err3, rowClients) => {
        if (err3) {
          console.error('Error counting clients:', err3.message);
          return res.status(500).json({ message: 'Failed to fetch report.' });
        }
        report.clients = rowClients?.count || 0;
        db.get('SELECT COUNT(*) as count FROM suppliers', [], (err4, rowSup) => {
          if (err4) {
            console.error('Error counting suppliers:', err4.message);
            return res.status(500).json({ message: 'Failed to fetch report.' });
          }
          report.suppliers = rowSup?.count || 0;
          db.get('SELECT COUNT(*) as count, IFNULL(SUM(sellingPrice),0) as revenue FROM orders', [], (err5, rowOrders) => {
            if (err5) {
              console.error('Error counting orders:', err5.message);
              return res.status(500).json({ message: 'Failed to fetch report.' });
            }
            report.orders = rowOrders?.count || 0;
            report.totalRevenue = rowOrders?.revenue || 0;
            res.json(report);
          });
        });
      });
    });
  });
});

// --- SaaS Clients Management ---
app.get('/api/saas/clients', authenticateToken, authorizeAdmin, (req, res) => {
  db.all('SELECT * FROM saas_clients ORDER BY signupDate DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching SaaS clients:', err.message);
      return res.status(500).json({ message: 'Failed to fetch clients.' });
    }
    res.json(rows);
  });
});

app.post('/api/saas/clients', authenticateToken, authorizeAdmin, (req, res) => {
  const data = req.body || {};
  const clientId = data.id || uuidv4();
  const signupDate = data.signupDate || new Date().toISOString();
  db.run(
    'INSERT INTO saas_clients (id, organizationName, contactEmail, subscriptionPlan, subscriptionStatus, signupDate) VALUES ($1,$2,$3,$4,$5,$6)',
    [clientId, data.organizationName, data.contactEmail, data.subscriptionPlan, data.subscriptionStatus, signupDate],
    function(err) {
      if (err) {
        console.error('Error saving SaaS client:', err.message);
        return res.status(500).json({ message: 'Failed to save client.' });
      }
      db.get('SELECT * FROM saas_clients WHERE id = $1', [clientId], (err2, row) => {
        if (err2 || !row) {
          return res.status(500).json({ message: 'Client saved but retrieval failed.' });
        }
        res.status(201).json(row);
      });
    }
  );
});

app.put('/api/saas/clients/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const clientId = req.params.id;
  const data = req.body || {};
  db.run(
    'UPDATE saas_clients SET organizationName=$1, contactEmail=$2, subscriptionPlan=$3, subscriptionStatus=$4, signupDate=$5 WHERE id=$6',
    [data.organizationName, data.contactEmail, data.subscriptionPlan, data.subscriptionStatus, data.signupDate, clientId],
    function(err) {
      if (err) {
        console.error('Error updating SaaS client:', err.message);
        return res.status(500).json({ message: 'Failed to update client.' });
      }
      db.get('SELECT * FROM saas_clients WHERE id = $1', [clientId], (err2, row) => {
        if (err2 || !row) {
          return res.status(404).json({ message: 'Client not found.' });
        }
        res.json(row);
      });
    }
  );
});

app.delete('/api/saas/clients/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const clientId = req.params.id;
  db.run('DELETE FROM saas_clients WHERE id = $1', [clientId], function(err) {
    if (err) {
      console.error('Error deleting SaaS client:', err.message);
      return res.status(500).json({ message: 'Failed to delete client.' });
    }
    res.sendStatus(204);
  });
});

// --- Plans ---
app.get('/api/plans', authenticateToken, authorizeAdmin, (req, res) => {
  db.all('SELECT * FROM plans ORDER BY monthlyPrice ASC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching plans:', err.message);
      return res.status(500).json({ message: 'Failed to fetch plans.' });
    }
    const formatted = rows.map(r => ({ ...r, features: r.features ? JSON.parse(r.features) : [] }));
    res.json(formatted);
  });
});

app.post('/api/plans', authenticateToken, authorizeAdmin, (req, res) => {
  const data = req.body || {};
  const id = data.id || uuidv4();
  const features = JSON.stringify(data.features || []);
  db.run(
    'INSERT INTO plans (id,name,orderLimit,userLimit,features,monthlyPrice) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, data.name, data.orderLimit, data.userLimit, features, data.monthlyPrice],
    function(err) {
      if (err) {
        console.error('Error saving plan:', err.message);
        return res.status(500).json({ message: 'Failed to save plan.' });
      }
      db.get('SELECT * FROM plans WHERE id = $1', [id], (err2, row) => {
        if (err2 || !row) return res.status(500).json({ message: 'Plan saved but retrieval failed.' });
        row.features = row.features ? JSON.parse(row.features) : [];
        res.status(201).json(row);
      });
    }
  );
});

app.put('/api/plans/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const id = req.params.id;
  const data = req.body || {};
  const features = JSON.stringify(data.features || []);
  db.run(
    'UPDATE plans SET name=$1, orderLimit=$2, userLimit=$3, features=$4, monthlyPrice=$5 WHERE id=$6',
    [data.name, data.orderLimit, data.userLimit, features, data.monthlyPrice, id],
    function(err) {
      if (err) {
        console.error('Error updating plan:', err.message);
        return res.status(500).json({ message: 'Failed to update plan.' });
      }
      db.get('SELECT * FROM plans WHERE id = $1', [id], (err2, row) => {
        if (err2 || !row) return res.status(404).json({ message: 'Plan not found.' });
        row.features = row.features ? JSON.parse(row.features) : [];
        res.json(row);
      });
    }
  );
});

app.delete('/api/plans/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM plans WHERE id = $1', [id], function(err) {
    if (err) {
      console.error('Error deleting plan:', err.message);
      return res.status(500).json({ message: 'Failed to delete plan.' });
    }
    res.sendStatus(204);
  });
});

// --- Billing Clients ---
app.get('/api/billing/clients', authenticateToken, authorizeAdmin, (req, res) => {
  db.all(
    'SELECT c.id as clientId, c.organizationName, b.planName, b.lastPaymentDate, b.nextDueDate, b.status FROM saas_clients c LEFT JOIN client_billing b ON b.clientId = c.id',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching billing data:', err.message);
        return res.status(500).json({ message: 'Failed to fetch billing data.' });
      }
      res.json(rows);
    }
  );
});

// --- Integrations ---
app.get('/api/integrations', authenticateToken, authorizeAdmin, (req, res) => {
  db.all('SELECT * FROM integrations', [], (err, rows) => {
    if (err) {
      console.error('Error fetching integrations:', err.message);
      return res.status(500).json({ message: 'Failed to fetch integrations.' });
    }
    res.json(rows);
  });
});


// Gemini AI Proxy
app.post('/api/gemini/parse-supplier-list', authenticateToken, async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ message: 'Serviço de IA não está disponível. Verifique a chave da API no servidor.' });
  }

  const { textList } = req.body;
  if (!textList) {
    return res.status(400).json({ message: 'A lista de texto não pode estar vazia.' });
  }

  try {
    const prompt = `
Você é um especialista em extração de dados de texto não estruturado de listas de preço de produtos Apple. Sua tarefa é analisar o texto e convertê-lo em um array JSON. O formato de cada objeto no array deve ser: { "produto": string, "modelo": string, "chip": string | null, "capacidade": string, "condicao": string, "precoBRL": number }.

Siga estas regras rigorosamente:

Ignore Linhas Irrelevantes: Ignore cabeçalhos, contatos, regras de garantia e qualquer linha que não seja um produto com preço.
Normalização de produto: Padronize os nomes: 'iPhone', 'MacBook', 'iMac', 'iPad', 'Apple Watch', 'AirPods'.
Extração de modelo e chip:
Para MacBooks: o campo modelo deve ser 'Air' ou 'Pro'. O campo chip deve ser 'M1', 'M2', 'M3', 'M4', 'M4 Pro', etc.
Para iPads: o modelo deve ser 'Pro', 'Air' ou 'Mini'. Se for um iPad padrão, extraia a geração (ex: '10ª Geração', '11ª Geração'). O chip deve ser 'M2', 'M3', 'M4', 'A16', etc.
Para Apple Watch: o modelo deve ser 'Ultra 2', 'SE 2', 'S9', 'S10', etc. O campo chip pode ser nulo.
Para iPhones: o modelo deve ser '16 Pro Max', '16 Pro', '16 Plus', '16', '16E', etc. O campo chip pode ser nulo.
Extração de capacidade e condicao:
capacidade: Encontre '64GB', '128GB', '256GB', '512GB', '1TB'.
condicao: Mapeie CPO para 'CPO (Certified Pre-Owned)', SEMINOVO para 'Seminovo', e ASIS para 'Novo (Caixa Aberta)'. Se nada for especificado, assuma 'Lacrado'.
Extração de precoBRL: Extraia o número do preço. Ignore R$, 💲, 💰, parênteses, pontos de milhar, e $R.
Regra de Agrupamento por Cor (IMPORTANTE): Se um mesmo item (produto, modelo, chip, capacidade e condição) for listado com várias cores e preços, encontre o preço mais alto entre eles e retorne apenas uma entrada para esse item com o preço mais alto.

Agora, analise o seguinte texto e retorne apenas o array JSON:
---
${textList}
---
    `;

    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
    });
    const rawText = result.text || '';
    const cleaned = rawText
      .replace(/```json\s*/i, '')
      .replace(/```/g, '')
      .trim();

    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error('Resposta da IA não continha um array JSON válido');
    }

    const jsonString = cleaned.slice(startIdx, endIdx + 1);
    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Falha ao parsear JSON da resposta da IA:', jsonString, parseError);
      throw new Error('Resposta da IA não continha um array JSON válido');
    }
    res.json(parsedData);

  } catch (error) {
    console.error('Erro no backend ao chamar a API do Gemini:', error);
    res.status(500).json({ message: 'Falha ao processar a lista com a IA. Verifique o log do servidor.', details: error.message });
  }
});


// --- Serve Static Frontend ---
// In production, Nginx or Apache might serve static files directly.
// For development or simpler setups, Express can serve them.
app.use(express.static(path.join(__dirname, '../dist'))); // Serve files from frontend build

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`JWT Secret is ${JWT_SECRET && JWT_SECRET !== 'your-fallback-jwt-secret-key' ? 'set (recommended)' : 'NOT SET (using fallback - NOT SECURE FOR PRODUCTION!)'}`);
  console.log(`SQLite DB file: ${process.env.DB_FILE || path.resolve(__dirname, 'database.sqlite')}`);
});
