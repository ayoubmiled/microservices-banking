const { startServer } = require('./grpc/server');
const { connectProducer, connectConsumer, disconnect } = require('./kafka');

async function main() {
  console.log('[AccountService] Starting Account Microservice...');

  // Connect Kafka producer and consumer
  await connectProducer();
  await connectConsumer();

  // Start gRPC server
  const server = startServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[AccountService] Shutting down gracefully...');
    server.tryShutdown(async () => {
      await disconnect();
      console.log('[AccountService] Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[AccountService] Fatal error:', err);
  process.exit(1);
});
