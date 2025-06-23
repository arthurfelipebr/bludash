const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const ORG_NAME = 'Blu Imports';

db.serialize(() => {
  db.get('SELECT id FROM organizations WHERE name = ?', [ORG_NAME], (err, row) => {
    if (err) {
      console.error('Error querying organizations:', err.message);
      return db.close();
    }

    const orgId = row ? row.id : uuidv4();

    function updateTables() {
      db.run('UPDATE users SET "organizationId" = ? WHERE "organizationId" IS NULL OR "organizationId" = ""', [orgId], function(err) {
        if (err) console.error('Error updating users:', err.message);
        else console.log(`Updated users: ${this.changes}`);

        db.run('UPDATE clients SET "organizationId" = ? WHERE "organizationId" IS NULL OR "organizationId" = ""', [orgId], function(err) {
          if (err) console.error('Error updating clients:', err.message);
          else console.log(`Updated clients: ${this.changes}`);

          db.run('UPDATE suppliers SET "organizationId" = ? WHERE "organizationId" IS NULL OR "organizationId" = ""', [orgId], function(err) {
            if (err) console.error('Error updating suppliers:', err.message);
            else console.log(`Updated suppliers: ${this.changes}`);

            const orderSql = 'UPDATE orders SET "organizationId" = (SELECT "organizationId" FROM users WHERE users.id = orders."userId") WHERE "organizationId" IS NULL OR "organizationId" = ""';
            db.run(orderSql, [], function(err) {
              if (err) console.error('Error updating orders:', err.message);
              else console.log(`Updated orders: ${this.changes}`);
              db.close();
            });
          });
        });
      });
    }

    if (row) {
      console.log('Organization already exists with id:', orgId);
      updateTables();
    } else {
      db.run('INSERT INTO organizations (id, name) VALUES (?, ?)', [orgId, ORG_NAME], err => {
        if (err) {
          console.error('Error creating organization:', err.message);
          db.close();
        } else {
          console.log('Organization created with id:', orgId);
          updateTables();
        }
      });
    }
  });
});
