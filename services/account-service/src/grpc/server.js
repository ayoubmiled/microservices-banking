const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const accountDB = require('../database/accountDB');
const { publishAccountEvent, publishTransactionEvent } = require('../kafka');

const PROTO_PATH = path.join(__dirname, '../../proto/account.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const accountProto = grpc.loadPackageDefinition(packageDefinition).account;

function createAccount(call, callback) {
  try {
    const account = accountDB.createAccount(call.request);
    publishAccountEvent('ACCOUNT_CREATED', account);
    callback(null, { account });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function getAccount(call, callback) {
  try {
    const account = accountDB.getAccountById(call.request.id);
    if (!account) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Account with id ${call.request.id} not found`
      });
      return;
    }
    callback(null, { account });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function listAccounts(call, callback) {
  try {
    const result = accountDB.listAccounts({
      customer_id: call.request.customer_id || null,
      page: call.request.page || 1,
      limit: call.request.limit || 10
    });
    callback(null, result);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function createTransaction(call, callback) {
  try {
    const transaction = accountDB.createTransaction(call.request);
    publishTransactionEvent('TRANSACTION_COMPLETED', transaction);
    callback(null, { transaction });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function listTransactions(call, callback) {
  try {
    const result = accountDB.listTransactions({
      account_id: call.request.account_id || null,
      page: call.request.page || 1,
      limit: call.request.limit || 10
    });
    callback(null, result);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function getBalance(call, callback) {
  try {
    const balance = accountDB.getBalance(call.request.account_id);
    if (!balance) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Account with id ${call.request.account_id} not found`
      });
      return;
    }
    callback(null, balance);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function startServer() {
  const server = new grpc.Server();
  server.addService(accountProto.AccountService.service, {
    createAccount,
    getAccount,
    listAccounts,
    createTransaction,
    listTransactions,
    getBalance
  });

  const PORT = process.env.GRPC_PORT || 50052;
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[AccountService] Failed to start gRPC server:', err);
      return;
    }
    console.log(`[AccountService] gRPC server running on port ${port}`);
    server.start();
  });

  return server;
}

module.exports = { startServer };
