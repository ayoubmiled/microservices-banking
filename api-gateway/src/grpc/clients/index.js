const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto files
const CUSTOMER_PROTO = path.join(__dirname, '../../../proto/customer.proto');
const ACCOUNT_PROTO = path.join(__dirname, '../../../proto/account.proto');
const NOTIFICATION_PROTO = path.join(__dirname, '../../../proto/notification.proto');

const protoOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

// ========================
// Customer Service gRPC Client
// ========================

const customerPackageDef = protoLoader.loadSync(CUSTOMER_PROTO, protoOptions);
const customerProto = grpc.loadPackageDefinition(customerPackageDef).customer;

const CUSTOMER_SERVICE_HOST = process.env.CUSTOMER_SERVICE_HOST || 'localhost:50051';
const customerClient = new customerProto.CustomerService(
  CUSTOMER_SERVICE_HOST,
  grpc.credentials.createInsecure()
);

console.log(`[APIGateway] Customer gRPC client connected to ${CUSTOMER_SERVICE_HOST}`);

// ========================
// Account Service gRPC Client
// ========================

const accountPackageDef = protoLoader.loadSync(ACCOUNT_PROTO, protoOptions);
const accountProto = grpc.loadPackageDefinition(accountPackageDef).account;

const ACCOUNT_SERVICE_HOST = process.env.ACCOUNT_SERVICE_HOST || 'localhost:50052';
const accountClient = new accountProto.AccountService(
  ACCOUNT_SERVICE_HOST,
  grpc.credentials.createInsecure()
);

console.log(`[APIGateway] Account gRPC client connected to ${ACCOUNT_SERVICE_HOST}`);

// ========================
// Notification Service gRPC Client
// ========================

const notificationPackageDef = protoLoader.loadSync(NOTIFICATION_PROTO, protoOptions);
const notificationProto = grpc.loadPackageDefinition(notificationPackageDef).notification;

const NOTIFICATION_SERVICE_HOST = process.env.NOTIFICATION_SERVICE_HOST || 'localhost:50053';
const notificationClient = new notificationProto.NotificationService(
  NOTIFICATION_SERVICE_HOST,
  grpc.credentials.createInsecure()
);

console.log(`[APIGateway] Notification gRPC client connected to ${NOTIFICATION_SERVICE_HOST}`);

// ========================
// Helper: promisify gRPC calls
// ========================

function promisify(client, method) {
  return (request) => {
    return new Promise((resolve, reject) => {
      client[method](request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  };
}

// ========================
// Exported client methods
// ========================

const CustomerService = {
  createCustomer: promisify(customerClient, 'createCustomer'),
  getCustomer: promisify(customerClient, 'getCustomer'),
  updateCustomer: promisify(customerClient, 'updateCustomer'),
  deleteCustomer: promisify(customerClient, 'deleteCustomer'),
  listCustomers: promisify(customerClient, 'listCustomers'),
  searchCustomers: promisify(customerClient, 'searchCustomers')
};

const AccountService = {
  createAccount: promisify(accountClient, 'createAccount'),
  getAccount: promisify(accountClient, 'getAccount'),
  listAccounts: promisify(accountClient, 'listAccounts'),
  createTransaction: promisify(accountClient, 'createTransaction'),
  listTransactions: promisify(accountClient, 'listTransactions'),
  getBalance: promisify(accountClient, 'getBalance')
};

const NotificationService = {
  createNotification: promisify(notificationClient, 'createNotification'),
  getNotification: promisify(notificationClient, 'getNotification'),
  listNotifications: promisify(notificationClient, 'listNotifications'),
  markAsRead: promisify(notificationClient, 'markAsRead'),
  deleteNotification: promisify(notificationClient, 'deleteNotification')
};

module.exports = {
  CustomerService,
  AccountService,
  NotificationService
};
