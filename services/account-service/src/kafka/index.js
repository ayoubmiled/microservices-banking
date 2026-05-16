const { Kafka } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'account-service',
  brokers: KAFKA_BROKERS
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'account-service-group' });

const TOPICS = {
  ACCOUNT_EVENTS: 'account-events',
  TRANSACTION_EVENTS: 'transaction-events',
  CUSTOMER_EVENTS: 'customer-events'
};

// ========================
// Producer
// ========================

async function connectProducer() {
  try {
    await producer.connect();
    console.log('[AccountService] Kafka producer connected');
  } catch (error) {
    console.error('[AccountService] Failed to connect Kafka producer:', error.message);
  }
}

async function publishAccountEvent(eventType, accountData) {
  try {
    await producer.send({
      topic: TOPICS.ACCOUNT_EVENTS,
      messages: [
        {
          key: accountData.id,
          value: JSON.stringify({
            eventType,
            data: accountData,
            timestamp: new Date().toISOString(),
            source: 'account-service'
          })
        }
      ]
    });
    console.log(`[AccountService] Published ${eventType} event for account ${accountData.id}`);
  } catch (error) {
    console.error(`[AccountService] Failed to publish ${eventType} event:`, error.message);
  }
}

async function publishTransactionEvent(eventType, transactionData) {
  try {
    await producer.send({
      topic: TOPICS.TRANSACTION_EVENTS,
      messages: [
        {
          key: transactionData.id,
          value: JSON.stringify({
            eventType,
            data: transactionData,
            timestamp: new Date().toISOString(),
            source: 'account-service'
          })
        }
      ]
    });
    console.log(`[AccountService] Published ${eventType} event for transaction ${transactionData.id}`);
  } catch (error) {
    console.error(`[AccountService] Failed to publish ${eventType} event:`, error.message);
  }
}

// ========================
// Consumer - Listen for customer events
// ========================

async function connectConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.CUSTOMER_EVENTS, fromBeginning: true });
    console.log('[AccountService] Kafka consumer subscribed to customer-events');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`[AccountService] Received event: ${event.eventType} from ${event.source}`);

          if (event.eventType === 'CUSTOMER_CREATED') {
            console.log(`[AccountService] New customer created: ${event.data.id} - ${event.data.first_name} ${event.data.last_name}`);
          }
        } catch (error) {
          console.error('[AccountService] Error processing message:', error.message);
        }
      }
    });
  } catch (error) {
    console.error('[AccountService] Failed to connect Kafka consumer:', error.message);
  }
}

async function disconnect() {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('[AccountService] Kafka disconnected');
  } catch (error) {
    console.error('[AccountService] Error disconnecting Kafka:', error.message);
  }
}

module.exports = {
  connectProducer,
  connectConsumer,
  disconnect,
  publishAccountEvent,
  publishTransactionEvent,
  TOPICS
};
