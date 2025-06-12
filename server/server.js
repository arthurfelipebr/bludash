require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const db = require('./database'); // SQLite database connection
const { GoogleGenAI } = require('@google/genai');

const app =express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-jwt-secret-key'; // Fallback only, set in .env
const AUTENTIQUE_TOKEN = process.env.AUTENTIQUE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY; // Ou process.env.API_KEY, conforme seu .env

let genAI;
if (GEMINI_API_KEY) {

  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  console.log('Cliente Gemini AI inicializado no backend.');
} else {
  console.warn('Chave da API do Gemini não encontrada. Funcionalidades de IA estarão desabilitadas.');
}


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

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.sendStatus(403);
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
  const role = 'user';

  db.run('INSERT INTO users (id, email, password, name, role, "registrationDate") VALUES ($1, $2, $3, $4, $5, $6)',
    [userId, email, hashedPassword, displayName, role, registrationDate],
    function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
      }
      console.error('Registration error:', err.message);
      return res.status(500).json({ message: 'Falha ao registrar usuário.' });
    }
    const user = { id: userId, email: email, name: displayName, role, registrationDate: registrationDate };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' }); // Longer expiry for new users
    res.status(201).json({ token, user });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT id, email, password, name, role, "registrationDate" FROM users WHERE email = $1', [email], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error during login.' });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado ou senha incorreta.' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ message: 'Usuário não encontrado ou senha incorreta.' });
    
    const userPayload = { id: user.id, email: user.email, name: user.name, role: user.role, registrationDate: user.registrationDate };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user: userPayload });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, email, name, role, "registrationDate" FROM users WHERE id = $1', [req.user.id], (err, userRow) => {
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
  db.all('SELECT id, email, name, role, "registrationDate" FROM users ORDER BY email ASC', [], (err, rows) => {
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
  db.run('INSERT INTO users (id, email, password, name, role, "registrationDate") VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, email, hashedPassword, displayName, role, registrationDate],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }
        console.error('Error inviting user:', err.message);
        return res.status(500).json({ message: 'Failed to invite user.' });
      }
      db.get('SELECT id, email, name, role, "registrationDate" FROM users WHERE id = $1', [userId], (err2, row) => {
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
    db.get('SELECT id, email, name, role, "registrationDate" FROM users WHERE id = $1', [userId], (err2, row) => {
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
  db.all('SELECT * FROM orders WHERE "userId" = $1 ORDER BY "orderDate" DESC', [req.user.id], (err, rows) => {
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
      id, "userId", "customerName", "clientId", "productName", model, capacity, watchSize, color, condition,
      "supplierId", "supplierName", "purchasePrice", "sellingPrice", status, "estimatedDeliveryDate", 
      "orderDate", notes, "paymentMethod", "downPayment", installments, "financedAmount", 
      "totalWithInterest", "installmentValue", "bluFacilitaContractStatus", "imeiBlocked", 
      "arrivalDate", imei, "arrivalNotes", "batteryHealth", "readyForDelivery", 
      "shippingCostSupplierToBlu", "shippingCostBluToClient", "whatsAppHistorySummary",
      "bluFacilitaUsesSpecialRate", "bluFacilitaSpecialAnnualRate",
      documents, "trackingHistory", "bluFacilitaInstallments", "internalNotes", "arrivalPhotos"
  ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41
  )`;

  const params = [
      orderId, req.user.id, orderData.customerName, orderData.clientId, orderData.productName,
      orderData.model, orderData.capacity, orderData.watchSize, orderData.color, orderData.condition,
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
     db.get('SELECT * FROM orders WHERE id = $1 AND "userId" = $2', [orderId, req.user.id], (err, row) => {
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
  db.get('SELECT * FROM orders WHERE id = $1 AND "userId" = $2', [orderId, req.user.id], (err, row) => {
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
      "arrivalNotes"=$27, "batteryHealth"=$28, "readyForDelivery"=$29,
      "shippingCostSupplierToBlu"=$30, "shippingCostBluToClient"=$31,
      "whatsAppHistorySummary"=$32, "bluFacilitaUsesSpecialRate"=$33,
      "bluFacilitaSpecialAnnualRate"=$34, documents=$35, "trackingHistory"=$36,
      "bluFacilitaInstallments"=$37, "internalNotes"=$38, "arrivalPhotos"=$39
      WHERE id=$40 AND "userId"=$41`;

  const params = [
      orderData.customerName, orderData.clientId, orderData.productName,
      orderData.model, orderData.capacity, orderData.watchSize, orderData.color, orderData.condition,
      orderData.supplierId, orderData.supplierName, purchasePrice, sellingPrice,
      orderData.status, orderData.estimatedDeliveryDate,
      orderData.orderDate || new Date().toISOString(), orderData.notes,
      orderData.paymentMethod, downPayment, installments,
      orderData.financedAmount, orderData.totalWithInterest, orderData.installmentValue,
      orderData.bluFacilitaContractStatus, orderData.imeiBlocked ? 1 : 0,
      orderData.arrivalDate, orderData.imei, orderData.arrivalNotes, orderData.batteryHealth,
      orderData.readyForDelivery ? 1 : 0, orderData.shippingCostSupplierToBlu,
      orderData.shippingCostBluToClient, orderData.whatsAppHistorySummary,
      orderData.bluFacilitaUsesSpecialRate ? 1 : 0, orderData.bluFacilitaSpecialAnnualRate,
      documentsJSON, trackingHistoryJSON, bluFacilitaInstallmentsJSON,
      internalNotesJSON, arrivalPhotosJSON,
      orderId, req.user.id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating order:', err.message);
      return res.status(500).json({ message: 'Failed to update order.' });
    }
    db.get('SELECT * FROM orders WHERE id = $1 AND "userId" = $2', [orderId, req.user.id], (err, row) => {
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

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  db.run('DELETE FROM orders WHERE id = $1 AND "userId" = $2', [orderId, req.user.id], function(err) {
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
    let query = `${CLIENTS_SELECT_QUERY} WHERE "userId" = $1`;
    const params = [req.user.id];

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
    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "userId" = $2`;
    db.get(query, [clientId, req.user.id], (err, row) => {
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
      id, "userId", "fullName", "cpfOrCnpj", email, phone, address, cep, city, state, "clientType",
      "registrationDate", notes, "isDefaulter", "defaulterNotes"
  ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
  )`;

  const params = [
      clientId, req.user.id, data.fullName, data.cpfOrCnpj, data.email, data.phone,
      data.address, data.cep, data.city, data.state, data.clientType, registrationDate, data.notes,
      data.isDefaulter ? 1 : 0, data.defaulterNotes
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error saving client:', err.message);
      return res.status(500).json({ message: 'Failed to save client.' });
    }
    
    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "userId" = $2`;
    db.get(query, [clientId, req.user.id], (err, row) => {
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
      WHERE id=$13 AND "userId"=$14`;

  const params = [
      data.fullName, data.cpfOrCnpj, data.email, data.phone, data.address, data.cep, data.city, data.state,
      data.clientType, data.notes, data.isDefaulter ? 1 : 0, data.defaulterNotes,
      clientId, req.user.id
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating client:', err.message);
      return res.status(500).json({ message: 'Failed to update client.' });
    }

    const query = `${CLIENTS_SELECT_QUERY} WHERE id = $1 AND "userId" = $2`;
    db.get(query, [clientId, req.user.id], (err, row) => {
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
    db.run('DELETE FROM clients WHERE id = $1 AND "userId" = $2', [clientId, req.user.id], function(err) {
        if (err) {
            console.error('Error deleting client:', err.message);
            return res.status(500).json({ message: 'Failed to delete client.' });
        }
        res.sendStatus(204);
    });
});

// Suppliers
app.get('/api/suppliers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM suppliers WHERE "userId" = $1 ORDER BY name ASC', [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch suppliers.' });
      res.json(rows);
    });
});
app.get('/api/suppliers/:id', authenticateToken, (req, res) => {
    const supplierId = req.params.id;
    db.get('SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2', [supplierId, req.user.id], (err, row) => {
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
        id, "userId", name, "contactPerson", phone, email, notes, "registrationDate"
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
    )`;
    const params = [
        supplierId, req.user.id, data.name, data.contactPerson, data.phone,
        data.email, data.notes, registrationDate
    ];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving supplier:', err.message);
            return res.status(500).json({ message: 'Failed to save supplier.' });
        }
        db.get('SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2', [supplierId, req.user.id], (err2, row) => {
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
        WHERE id=$6 AND "userId"=$7`;
    const params = [data.name, data.contactPerson, data.phone, data.email, data.notes, supplierId, req.user.id];
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating supplier:', err.message);
            return res.status(500).json({ message: 'Failed to update supplier.' });
        }
        db.get('SELECT * FROM suppliers WHERE id = $1 AND "userId" = $2', [supplierId, req.user.id], (err2, row) => {
            if (err2 || !row) {
                return res.status(404).json({ message: 'Supplier not found.' });
            }
            res.json(row);
        });
    });
});

app.delete('/api/suppliers/:id', authenticateToken, (req, res) => {
    const supplierId = req.params.id;
    db.run('DELETE FROM suppliers WHERE id = $1 AND "userId" = $2', [supplierId, req.user.id], function(err) {
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
    const { paymentDate, amountPaid, paymentMethodUsed, notes } = req.body;
    const paymentId = uuidv4();
    const sql = `INSERT INTO clientPayments (id, "userId", "orderId", "paymentDate", "amountPaid", "paymentMethodUsed", notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const params = [paymentId, req.user.id, orderId, paymentDate || new Date().toISOString(), amountPaid, paymentMethodUsed, notes];
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
      Você é um assistente especialista em extração de dados para a empresa Blu Imports.
      Sua tarefa é analisar a lista de preços de um fornecedor, fornecida em texto corrido, e extrair as informações dos produtos em um formato JSON estruturado.

      REGRAS IMPORTANTES:
      1.  Ignore completamente qualquer texto introdutório, saudações, avisos, informações de contato ou regras de frete. Foque apenas nas linhas que descrevem os produtos e seus preços.
      2.  Para cada produto, extraia: o nome do produto (produto), o modelo, a capacidade (capacidade), a condição (condicao), características como "e-sim" ou "chip físico" (caracteristicas), o país de fabricação (pais, ex: HN, CN, US) e o preço em BRL (precoBRL). Ignore completamente a cor do produto.
      3.  "Condicao" deve conter apenas o estado do aparelho (ex: "Lacrado", "Novo", "CPO", "Seminovo"). Informações como "e-sim" ou "chip físico" vão para "caracteristicas" e abreviações como "HN" ou "CN" vão para "pais".
      4.  O campo "precoBRL" DEVE SER um número (float), não uma string. Remova "R$", "$", ".", e substitua "," por "." antes de converter para número. Ex: "R$6.650,00" se torna 6650.00. "(8,900)" se torna 8900.00.
      5.  A saída DEVE ser um array JSON válido. Nada além do array.
      6.  Se o mesmo modelo e capacidade for listado com diferentes preços para cada cor, use somente o maior preço encontrado.
      7.  Para MacBook, Mac mini e iMac, registre em "caracteristicas" o processador seguido do tamanho da tela (quando houver), por exemplo "M4 13\"" ou "M3 24\"".

      Exemplo de Saída Esperada:
      [
        {
          "produto": "iPhone",
          "modelo": "16 Pro Max",
          "capacidade": "256GB",
          "condicao": "Lacrado",
          "caracteristicas": "E-SIM",
          "pais": "HN",
          "precoBRL": 6650.00
        },
        {
          "produto": "MacBook",
          "modelo": "Pro 14",
          "capacidade": "512GB",
          "condicao": "Lacrado",
          "caracteristicas": "M4 14\"",
          "pais": "US",
          "precoBRL": 13500.00
        },
        {
          "produto": "iMac",
          "modelo": "24\"",
          "capacidade": "256GB",
          "condicao": "Lacrado",
          "caracteristicas": "M3 24\"",
          "pais": "US",
          "precoBRL": 10500.00
        },
        {
          "produto": "Apple Watch",
          "modelo": "Series 9 45mm",
          "capacidade": "",
          "condicao": "Novo",
          "caracteristicas": "GPS",
          "pais": "CN",
          "precoBRL": 3500.00
        },
        {
          "produto": "AirPods",
          "modelo": "Pro 2",
          "capacidade": "",
          "condicao": "Novo",
          "caracteristicas": "",
          "pais": "HN",
          "precoBRL": 1200.00
        },
        {
          "produto": "Mac Mini",
          "modelo": "M2",
          "capacidade": "512GB",
          "condicao": "Lacrado",
          "caracteristicas": "M2",
          "pais": "US",
          "precoBRL": 6500.00
        },
        {
          "produto": "iPad",
          "modelo": "Air",
          "capacidade": "64GB",
          "condicao": "Lacrado",
          "caracteristicas": "Wi-Fi",
          "pais": "CN",
          "precoBRL": 4500.00
        },
        {
          "produto": "Apple Pencil",
          "modelo": "2ª Geração",
          "capacidade": "",
          "condicao": "Novo",
          "caracteristicas": "",
          "pais": "CN",
          "precoBRL": 950.00
        },
        {
          "produto": "Magic Mouse",
          "modelo": "2",
          "capacidade": "",
          "condicao": "Novo",
          "caracteristicas": "",
          "pais": "CN",
          "precoBRL": 650.00
        }
      ]

      Agora, analise o seguinte texto e retorne o array JSON:
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
