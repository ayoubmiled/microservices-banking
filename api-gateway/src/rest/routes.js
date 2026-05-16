const express = require('express');
const router = express.Router();
const { CustomerService, AccountService, NotificationService } = require('../grpc/clients');

// ========================
// Customer REST Endpoints
// ========================

// Create a customer
router.post('/customers', async (req, res) => {
  try {
    const response = await CustomerService.createCustomer(req.body);
    res.status(201).json(response.customer);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// Get a customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const response = await CustomerService.getCustomer({ id: req.params.id });
    res.json(response.customer);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// List customers
router.get('/customers', async (req, res) => {
  try {
    const response = await CustomerService.listCustomers({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update a customer
router.put('/customers/:id', async (req, res) => {
  try {
    const response = await CustomerService.updateCustomer({
      id: req.params.id,
      ...req.body
    });
    res.json(response.customer);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a customer
router.delete('/customers/:id', async (req, res) => {
  try {
    const response = await CustomerService.deleteCustomer({ id: req.params.id });
    res.json(response);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// Search customers
router.get('/customers/search/:query', async (req, res) => {
  try {
    const response = await CustomerService.searchCustomers({ query: req.params.query });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ========================
// Account REST Endpoints
// ========================

// Create an account
router.post('/accounts', async (req, res) => {
  try {
    const response = await AccountService.createAccount(req.body);
    res.status(201).json(response.account);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get an account by ID
router.get('/accounts/:id', async (req, res) => {
  try {
    const response = await AccountService.getAccount({ id: req.params.id });
    res.json(response.account);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// List accounts (optionally filter by customer_id)
router.get('/accounts', async (req, res) => {
  try {
    const response = await AccountService.listAccounts({
      customer_id: req.query.customer_id || '',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get account balance
router.get('/accounts/:id/balance', async (req, res) => {
  try {
    const response = await AccountService.getBalance({ account_id: req.params.id });
    res.json(response);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// ========================
// Transaction REST Endpoints
// ========================

// Create a transaction
router.post('/transactions', async (req, res) => {
  try {
    const response = await AccountService.createTransaction(req.body);
    res.status(201).json(response.transaction);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// List transactions for an account
router.get('/accounts/:accountId/transactions', async (req, res) => {
  try {
    const response = await AccountService.listTransactions({
      account_id: req.params.accountId,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ========================
// Notification REST Endpoints
// ========================

// List notifications
router.get('/notifications', async (req, res) => {
  try {
    const response = await NotificationService.listNotifications({
      customer_id: req.query.customer_id || '',
      unread_only: req.query.unread_only === 'true',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get a notification by ID
router.get('/notifications/:id', async (req, res) => {
  try {
    const response = await NotificationService.getNotification({ id: req.params.id });
    res.json(response.notification);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const response = await NotificationService.markAsRead({ id: req.params.id });
    res.json(response.notification);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a notification
router.delete('/notifications/:id', async (req, res) => {
  try {
    const response = await NotificationService.deleteNotification({ id: req.params.id });
    res.json(response);
  } catch (error) {
    const status = error.code || 500;
    res.status(mapGrpcStatus(status)).json({ error: error.message || 'Internal server error' });
  }
});

// ========================
// Health check
// ========================

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      customer: process.env.CUSTOMER_SERVICE_HOST || 'localhost:50051',
      account: process.env.ACCOUNT_SERVICE_HOST || 'localhost:50052',
      notification: process.env.NOTIFICATION_SERVICE_HOST || 'localhost:50053'
    },
    timestamp: new Date().toISOString()
  });
});

// Helper: Map gRPC status codes to HTTP status codes
function mapGrpcStatus(grpcCode) {
  const map = {
    1: 499,    // CANCELLED
    2: 500,    // UNKNOWN
    3: 400,    // INVALID_ARGUMENT
    4: 504,    // DEADLINE_EXCEEDED
    5: 404,    // NOT_FOUND
    6: 409,    // ALREADY_EXISTS
    7: 403,    // PERMISSION_DENIED
    8: 429,    // RESOURCE_EXHAUSTED
    12: 501,   // UNIMPLEMENTED
    13: 500,   // INTERNAL
    14: 503,   // UNAVAILABLE
    16: 401    // UNAUTHENTICATED
  };
  return map[grpcCode] || 500;
}

module.exports = router;
