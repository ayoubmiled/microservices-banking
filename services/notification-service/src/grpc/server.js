const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const notificationDB = require('../database/notificationDB');

const PROTO_PATH = path.join(__dirname, '../../proto/notification.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

function createNotification(call, callback) {
  try {
    notificationDB.createNotification(call.request).then((notification) => {
      callback(null, { notification });
    }).catch((error) => {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    });
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function getNotification(call, callback) {
  try {
    notificationDB.getNotificationById(call.request.id).then((notification) => {
      if (!notification) {
        callback({ code: grpc.status.NOT_FOUND, message: `Notification with id ${call.request.id} not found` });
        return;
      }
      callback(null, { notification });
    }).catch((error) => {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    });
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function listNotifications(call, callback) {
  try {
    notificationDB.listNotifications({
      customer_id: call.request.customer_id || null,
      unread_only: call.request.unread_only || false,
      page: call.request.page || 1,
      limit: call.request.limit || 10
    }).then((result) => {
      callback(null, result);
    }).catch((error) => {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    });
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function markAsRead(call, callback) {
  try {
    notificationDB.markAsRead(call.request.id).then((notification) => {
      if (!notification) {
        callback({ code: grpc.status.NOT_FOUND, message: `Notification with id ${call.request.id} not found` });
        return;
      }
      callback(null, { notification });
    }).catch((error) => {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    });
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function deleteNotification(call, callback) {
  try {
    notificationDB.deleteNotification(call.request.id).then((success) => {
      if (!success) {
        callback({ code: grpc.status.NOT_FOUND, message: `Notification with id ${call.request.id} not found` });
        return;
      }
      callback(null, { success: true, message: 'Notification deleted successfully' });
    }).catch((error) => {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    });
  } catch (error) {
    callback({ code: grpc.status.INTERNAL, message: error.message });
  }
}

function startServer() {
  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, {
    createNotification,
    getNotification,
    listNotifications,
    markAsRead,
    deleteNotification
  });

  const PORT = process.env.GRPC_PORT || 50053;
  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('[NotificationService] Failed to start gRPC server:', err);
      return;
    }
    console.log(`[NotificationService] gRPC server running on port ${port}`);
    server.start();
  });

  return server;
}

module.exports = { startServer };
