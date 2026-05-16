const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/accounts.db');

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
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK(account_type IN ('CHECKING', 'SAVINGS', 'BUSINESS')),
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TND',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CLOSED', 'SUSPENDED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'TND',
      description TEXT,
      reference_id TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'PENDING', 'FAILED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
  `);
}

function createAccount({ customer_id, account_type, currency, initial_balance }) {
  const db = getDb();
  const id = require('uuid').v4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO accounts (id, customer_id, account_type, balance, currency, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  const balance = initial_balance || 0;
  stmt.run(id, customer_id, account_type, balance, currency || 'TND', now, now);

  if (balance > 0) {
    const txId = require('uuid').v4();
    db.prepare(`
      INSERT INTO transactions (id, account_id, transaction_type, amount, currency, description, status, created_at)
      VALUES (?, ?, 'DEPOSIT', ?, ?, 'Initial deposit', 'COMPLETED', ?)
    `).run(txId, id, balance, currency || 'TND', now);
  }

  return getAccountById(id);
}

function getAccountById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  return row ? rowToAccount(row) : null;
}

function listAccounts({ customer_id, page = 1, limit = 10 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;

  let rows, total;
  if (customer_id) {
    rows = db.prepare('SELECT * FROM accounts WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(customer_id, limit, offset);
    total = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE customer_id = ?').get(customer_id).count;
  } else {
    rows = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    total = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  }

  return { accounts: rows.map(rowToAccount), total };
}

function getBalance(accountId) {
  const db = getDb();
  const row = db.prepare('SELECT id, balance, currency FROM accounts WHERE id = ?').get(accountId);
  if (!row) return null;
  return { account_id: row.id, balance: row.balance, currency: row.currency };
}

function createTransaction({ account_id, transaction_type, amount, currency, description, reference_id }) {
  const db = getDb();

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id);
  if (!account) throw new Error('Account not found');
  if (account.status !== 'ACTIVE') throw new Error('Account is not active');
  if ((transaction_type === 'WITHDRAWAL' || transaction_type === 'TRANSFER') && account.balance < amount) {
    throw new Error('Insufficient balance');
  }

  const id = require('uuid').v4();
  const now = new Date().toISOString();
  const txCurrency = currency || 'TND';

  const insertTx = db.transaction(() => {
    let newBalance;
    if (transaction_type === 'DEPOSIT') {
      newBalance = account.balance + amount;
    } else if (transaction_type === 'WITHDRAWAL') {
      newBalance = account.balance - amount;
    } else if (transaction_type === 'TRANSFER') {
      newBalance = account.balance - amount;
      if (reference_id) {
        const destAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(reference_id);
        if (!destAccount) throw new Error('Destination account not found');
        if (destAccount.status !== 'ACTIVE') throw new Error('Destination account is not active');
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
          .run(amount, now, reference_id);
        const destTxId = require('uuid').v4();
        db.prepare(`
          INSERT INTO transactions (id, account_id, transaction_type, amount, currency, description, reference_id, status, created_at)
          VALUES (?, ?, 'DEPOSIT', ?, ?, ?, ?, 'COMPLETED', ?)
        `).run(destTxId, reference_id, amount, txCurrency, `Transfer received from ${account_id}`, account_id, now);
      }
    }

    db.prepare('UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?')
      .run(newBalance, now, account_id);

    db.prepare(`
      INSERT INTO transactions (id, account_id, transaction_type, amount, currency, description, reference_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run(id, account_id, transaction_type, amount, txCurrency, description || null, reference_id || null, now);
  });

  try {
    insertTx();
  } catch (error) {
    try {
      db.prepare(`
        INSERT INTO transactions (id, account_id, transaction_type, amount, currency, description, reference_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'FAILED', ?)
      `).run(id, account_id, transaction_type, amount, txCurrency, description || null, reference_id || null, now);
    } catch (e) { /* ignore */ }
    throw error;
  }

  return getTransactionById(id);
}

function getTransactionById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  return row ? rowToTransaction(row) : null;
}

function listTransactions({ account_id, page = 1, limit = 10 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;

  let rows, total;
  if (account_id) {
    rows = db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(account_id, limit, offset);
    total = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?').get(account_id).count;
  } else {
    rows = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    total = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  }

  return { transactions: rows.map(rowToTransaction), total };
}

function rowToAccount(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    account_type: row.account_type,
    balance: row.balance,
    currency: row.currency,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function rowToTransaction(row) {
  return {
    id: row.id,
    account_id: row.account_id,
    transaction_type: row.transaction_type,
    amount: row.amount,
    currency: row.currency,
    description: row.description || '',
    reference_id: row.reference_id || '',
    status: row.status,
    created_at: row.created_at
  };
}

module.exports = {
  getDb,
  createAccount,
  getAccountById,
  listAccounts,
  getBalance,
  createTransaction,
  getTransactionById,
  listTransactions
};
