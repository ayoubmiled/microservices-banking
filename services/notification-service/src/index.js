const { startServer } = require('./grpc/server');
const { connectConsumer, disconnect } = require('./kafka/consumer');
const { initDatabase } = require('./database/notificationDB');

async function main() {
  console.log('[NotificationService] Starting Notification Microservice...');

  // Initialize RxDB database
  await initDatabase();

  // Connect Kafka consumer
  await connectConsumer();

  // Start gRPC server
  const server = startServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[NotificationService] Shutting down gracefully...');
    server.tryShutdown(async () => {
      await disconnect();
      console.log('[NotificationService] Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[NotificationService] Fatal error:', err);
  process.exit(1);
});
