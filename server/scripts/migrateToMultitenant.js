const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const DEFAULT_TENANT_NAME = 'Default Tenant';

function updateTable(table, orgId, cb) {
  db.run(`UPDATE ${table} SET "organizationId" = ? WHERE ("organizationId" IS NULL OR "organizationId" = '')`, [orgId], function(err){
    if (err) console.error(`Error updating ${table}:`, err.message);
    else console.log(`Updated ${table}: ${this.changes}`);
    cb();
  });
}

db.serialize(() => {
  db.get('SELECT id FROM organizations WHERE name = ?', [DEFAULT_TENANT_NAME], (err, row) => {
    if (err) {
      console.error('Error querying organizations:', err.message);
      return db.close();
    }
    const orgId = row ? row.id : uuidv4();

    function continueUpdate(){
      db.run('UPDATE users SET "organizationId" = ? WHERE "organizationId" IS NULL OR "organizationId" = ""', [orgId], function(err){
        if (err) console.error('Error updating users:', err.message);
        else console.log(`Updated users: ${this.changes}`);
        const tables = ['clients','suppliers','orders'];
        function next(){
          const table = tables.shift();
          if(!table) return db.close();
          if(table === 'orders') {
            const sql = 'UPDATE orders SET "organizationId" = (SELECT "organizationId" FROM users WHERE users.id = orders."userId") WHERE "organizationId" IS NULL OR "organizationId" = ""';
            db.run(sql, [], function(err2){
              if(err2) console.error('Error updating orders:', err2.message);
              else console.log(`Updated orders: ${this.changes}`);
              next();
            });
          } else {
            updateTable(table, orgId, next);
          }
        }
        next();
      });
    }

    if (row) {
      console.log('Organization already exists with id:', orgId);
      continueUpdate();
    } else {
      db.run('INSERT INTO organizations (id, name) VALUES (?, ?)', [orgId, DEFAULT_TENANT_NAME], errOrg => {
        if (errOrg) {
          console.error('Error creating organization:', errOrg.message);
          db.close();
        } else {
          console.log('Organization created with id:', orgId);
          continueUpdate();
        }
      });
    }
  });
});
