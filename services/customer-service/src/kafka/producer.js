const { Kafka } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'customer-service',
  brokers: KAFKA_BROKERS
});

const producer = kafka.producer();

const TOPICS = {
  CUSTOMER_CREATED: 'customer-events',
  CUSTOMER_UPDATED: 'customer-events',
  CUSTOMER_DELETED: 'customer-events'
};

async function connectProducer() {
  try {
    await producer.connect();
    console.log('[CustomerService] Kafka producer connected');
  } catch (error) {
    console.error('[CustomerService] Failed to connect Kafka producer:', error.message);
  }
}

async function publishCustomerEvent(eventType, customerData) {
  try {
    await producer.send({
      topic: TOPICS.CUSTOMER_CREATED,
      messages: [
        {
          key: customerData.id,
          value: JSON.stringify({
            eventType,
            data: customerData,
            timestamp: new Date().toISOString(),
            source: 'customer-service'
          })
        }
      ]
    });
    console.log(`[CustomerService] Published ${eventType} event for customer ${customerData.id}`);
  } catch (error) {
    console.error(`[CustomerService] Failed to publish ${eventType} event:`, error.message);
  }
}

async function disconnectProducer() {
  try {
    await producer.disconnect();
    console.log('[CustomerService] Kafka producer disconnected');
  } catch (error) {
    console.error('[CustomerService] Error disconnecting Kafka producer:', error.message);
  }
}

module.exports = {
  connectProducer,
  disconnectProducer,
  publishCustomerEvent,
  TOPICS
};
