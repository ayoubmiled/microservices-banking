const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const customerDB = require('../database/customerDB');
const { publishCustomerEvent } = require('../kafka/producer');

const PROTO_PATH = path.join(__dirname, '../../proto/customer.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const customerProto = grpc.loadPackageDefinition(packageDefinition).customer;

function createCustomer(call, callback) {
  try {
    const customer = customerDB.createCustomer(call.request);
    publishCustomerEvent('CUSTOMER_CREATED', customer);
    callback(null, { customer });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      callback({
        code: grpc.status.ALREADY_EXISTS,
        message: 'A customer with this email already exists'
      });
    } else {
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  }
}

function getCustomer(call, callback) {
  try {
    const customer = customerDB.getCustomerById(call.request.id);
    if (!customer) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Customer with id ${call.request.id} not found`
      });
      return;
    }
    callback(null, { customer });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function updateCustomer(call, callback) {
  try {
    const { id, ...fields } = call.request;
    const customer = customerDB.updateCustomer(id, fields);
    if (!customer) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Customer with id ${id} not found`
      });
      return;
    }
    publishCustomerEvent('CUSTOMER_UPDATED', customer);
    callback(null, { customer });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function deleteCustomer(call, callback) {
  try {
    const success = customerDB.deleteCustomer(call.request.id);
    if (!success) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Customer with id ${call.request.id} not found`
      });
      return;
    }
    publishCustomerEvent('CUSTOMER_DELETED', { id: call.request.id });
    callback(null, { success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function listCustomers(call, callback) {
  try {
    const result = customerDB.listCustomers({
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

function searchCustomers(call, callback) {
  try {
    const result = customerDB.searchCustomers(call.request.query);
    callback(null, result);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

function startServer() {
  const server = new grpc.Server();
  server.addService(customerProto.CustomerService.service, {
    createCustomer,
    getCustomer,
    updateCustomer,
    deleteCustomer,
    listCustomers,
    searchCustomers
  });

  const PORT = process.env.GRPC_PORT || 50051;
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[CustomerService] Failed to start gRPC server:', err);
      return;
    }
    console.log(`[CustomerService] gRPC server running on port ${port}`);
    server.start();
  });

  return server;
}

module.exports = { startServer };
