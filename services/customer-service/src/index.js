const { startServer } = require('./grpc/server');
const { connectProducer, disconnectProducer } = require('./kafka/producer');

async function main() {
  console.log('[CustomerService] Starting Customer Microservice...');

  // Connect Kafka producer
  await connectProducer();

  // Start gRPC server
  const server = startServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[CustomerService] Shutting down gracefully...');
    server.tryShutdown(async () => {
      await disconnectProducer();
      console.log('[CustomerService] Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[CustomerService] Fatal error:', err);
  process.exit(1);
});
