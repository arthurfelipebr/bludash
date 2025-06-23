const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const EMAIL = 'arthur@centralmaker.com';
const PASSWORD = 'admin123';
const NAME = 'Admin';
const ORG_NAME = 'Admin Org';

const hashedPassword = bcrypt.hashSync(PASSWORD, 8);
const userId = uuidv4();
const orgId = uuidv4();

function close() {
  db.close();
}

db.serialize(() => {
  db.get('SELECT id FROM organizations WHERE name = ?', [ORG_NAME], (err, row) => {
    if (err) {
      console.error('Error checking organization:', err.message);
      return close();
    }
    const existingOrgId = row ? row.id : orgId;
    const createUser = () => {
      db.get('SELECT id FROM users WHERE email = ?', [EMAIL], (err2, userRow) => {
        if (err2) {
          console.error('Error checking existing admin:', err2.message);
          return close();
        }
        if (userRow) {
          console.log('Admin user already exists.');
          return close();
        }
        const sql = 'INSERT INTO users (id, email, password, name, role, "registrationDate", "organizationId") VALUES (?,?,?,?,?,?,?)';
        db.run(sql, [userId, EMAIL, hashedPassword, NAME, 'admin', new Date().toISOString(), existingOrgId], err3 => {
          if (err3) {
            console.error('Error inserting admin user:', err3.message);
          } else {
            console.log('Admin user created with id:', userId);
          }
          close();
        });
      });
    };

    if (row) {
      createUser();
    } else {
      db.run('INSERT INTO organizations (id, name) VALUES (?,?)', [existingOrgId, ORG_NAME], err4 => {
        if (err4) {
          console.error('Error creating admin organization:', err4.message);
          return close();
        }
        console.log('Organization created with id:', existingOrgId);
        createUser();
      });
    }
  });
});
