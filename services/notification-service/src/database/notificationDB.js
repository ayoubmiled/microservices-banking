const rxdb = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { v4: uuidv4 } = require('uuid');

// RxDB NoSQL database for notifications
let db = null;

const notificationSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    customer_id: {
      type: 'string'
    },
    type: {
      type: 'string',
      enum: ['TRANSACTION', 'ACCOUNT', 'CUSTOMER', 'ALERT']
    },
    title: {
      type: 'string'
    },
    message: {
      type: 'string'
    },
    read: {
      type: 'boolean',
      default: false
    },
    priority: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    created_at: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: ['id', 'customer_id', 'type', 'title', 'message'],
  indexes: ['customer_id', 'type', 'created_at']
};

async function initDatabase() {
  if (db) return db;

  try {
    db = await rxdb.createRxDatabase({
      name: 'notifications_db',
      storage: getRxStorageMemory()
    });

    await db.addCollections({
      notifications: {
        schema: notificationSchema
      }
    });

    console.log('[NotificationService] RxDB database initialized (NoSQL - in-memory storage)');
    return db;
  } catch (error) {
    console.error('[NotificationService] Failed to initialize RxDB:', error.message);
    throw error;
  }
}

async function createNotification({ customer_id, type, title, message, priority }) {
  if (!db) await initDatabase();

  const notification = {
    id: uuidv4(),
    customer_id,
    type,
    title,
    message,
    read: false,
    priority: priority || 'MEDIUM',
    created_at: new Date().toISOString()
  };

  const doc = await db.notifications.insert(notification);
  return doc.toMutableJSON();
}

async function getNotificationById(id) {
  if (!db) await initDatabase();

  const doc = await db.notifications.findOne(id).exec();
  return doc ? doc.toMutableJSON() : null;
}

async function listNotifications({ customer_id, unread_only, page = 1, limit = 10 } = {}) {
  if (!db) await initDatabase();

  let query = db.notifications.find();

  if (customer_id) {
    query = db.notifications.find({ selector: { customer_id } });
  }

  if (unread_only) {
    query = db.notifications.find({
      selector: {
        ...(customer_id ? { customer_id } : {}),
        read: false
      }
    });
  }

  const allDocs = await query.exec();
  const allNotifications = allDocs.map(doc => doc.toMutableJSON());

  allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = allNotifications.length;
  const offset = (page - 1) * limit;
  const paginated = allNotifications.slice(offset, offset + limit);

  return { notifications: paginated, total };
}

async function markAsRead(id) {
  if (!db) await initDatabase();

  const doc = await db.notifications.findOne(id).exec();
  if (!doc) return null;

  await doc.incrementalPatch({ read: true });
  return doc.toMutableJSON();
}

async function deleteNotification(id) {
  if (!db) await initDatabase();

  const doc = await db.notifications.findOne(id).exec();
  if (!doc) return false;

  await doc.remove();
  return true;
}

async function getDatabase() {
  if (!db) await initDatabase();
  return db;
}

module.exports = {
  initDatabase,
  createNotification,
  getNotificationById,
  listNotifications,
  markAsRead,
  deleteNotification,
  getDatabase
};
