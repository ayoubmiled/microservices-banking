const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/customers.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    createTables();
  }
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);
  `);
}

function createCustomer({ first_name, last_name, email, phone, address }) {
  const db = getDb();
  const id = require('uuid').v4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO customers (id, first_name, last_name, email, phone, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, first_name, last_name, email, phone || null, address || null, now, now);
  return getCustomerById(id);
}

function getCustomerById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return row ? rowToCustomer(row) : null;
}

function updateCustomer(id, fields) {
  const db = getDb();
  const existing = getCustomerById(id);
  if (!existing) return null;

  const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'address'];
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) return existing;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getCustomerById(id);
}

function deleteCustomer(id) {
  const db = getDb();
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return result.changes > 0;
}

function listCustomers({ page = 1, limit = 10 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const rows = db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  return { customers: rows.map(rowToCustomer), total };
}

function searchCustomers(query) {
  const db = getDb();
  const pattern = `%${query}%`;
  const rows = db.prepare(`
    SELECT * FROM customers
    WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
    ORDER BY created_at DESC
  `).all(pattern, pattern, pattern);
  return { customers: rows.map(rowToCustomer), total: rows.length };
}

function rowToCustomer(row) {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone || '',
    address: row.address || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

module.exports = {
  getDb,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  listCustomers,
  searchCustomers
};
