const { Kafka } = require('kafkajs');
const { createNotification } = require('../database/notificationDB');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: KAFKA_BROKERS
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const TOPICS = {
  CUSTOMER_EVENTS: 'customer-events',
  ACCOUNT_EVENTS: 'account-events',
  TRANSACTION_EVENTS: 'transaction-events'
};

async function connectConsumer() {
  try {
    await consumer.connect();

    await consumer.subscribe({ topic: TOPICS.CUSTOMER_EVENTS, fromBeginning: true });
    await consumer.subscribe({ topic: TOPICS.ACCOUNT_EVENTS, fromBeginning: true });
    await consumer.subscribe({ topic: TOPICS.TRANSACTION_EVENTS, fromBeginning: true });

    console.log('[NotificationService] Kafka consumer subscribed to all event topics');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`[NotificationService] Received event from ${topic}: ${event.eventType}`);
          await handleEvent(topic, event);
        } catch (error) {
          console.error('[NotificationService] Error processing message:', error.message);
        }
      }
    });
  } catch (error) {
    console.error('[NotificationService] Failed to connect Kafka consumer:', error.message);
  }
}

async function handleEvent(topic, event) {
  const { eventType, data } = event;

  if (topic === TOPICS.CUSTOMER_EVENTS) {
    if (eventType === 'CUSTOMER_CREATED') {
      await createNotification({
        customer_id: data.id,
        type: 'CUSTOMER',
        title: 'Welcome to OurBank!',
        message: `Dear ${data.first_name} ${data.last_name}, your account has been created successfully. Welcome to OurBank!`,
        priority: 'MEDIUM'
      });
    } else if (eventType === 'CUSTOMER_UPDATED') {
      await createNotification({
        customer_id: data.id,
        type: 'CUSTOMER',
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully.',
        priority: 'LOW'
      });
    } else if (eventType === 'CUSTOMER_DELETED') {
      await createNotification({
        customer_id: data.id,
        type: 'CUSTOMER',
        title: 'Account Closed',
        message: 'Your account has been closed. We are sorry to see you go.',
        priority: 'HIGH'
      });
    }
  } else if (topic === TOPICS.ACCOUNT_EVENTS) {
    if (eventType === 'ACCOUNT_CREATED') {
      await createNotification({
        customer_id: data.customer_id,
        type: 'ACCOUNT',
        title: 'New Bank Account Opened',
        message: `A new ${data.account_type} account has been opened. Account ID: ${data.id}`,
        priority: 'MEDIUM'
      });
    }
  } else if (topic === TOPICS.TRANSACTION_EVENTS) {
    if (eventType === 'TRANSACTION_COMPLETED') {
      let title = '';
      let message = '';
      let priority = 'MEDIUM';

      if (data.transaction_type === 'DEPOSIT') {
        title = 'Deposit Received';
        message = `A deposit of ${data.amount} ${data.currency} has been credited to your account.`;
        priority = 'LOW';
      } else if (data.transaction_type === 'WITHDRAWAL') {
        title = 'Withdrawal Processed';
        message = `A withdrawal of ${data.amount} ${data.currency} has been debited from your account.`;
        priority = 'MEDIUM';
      } else if (data.transaction_type === 'TRANSFER') {
        title = 'Transfer Completed';
        message = `A transfer of ${data.amount} ${data.currency} has been processed. ${data.description || ''}`;
        priority = 'HIGH';
      }

      if (title) {
        await createNotification({
          customer_id: data.account_id,
          type: 'TRANSACTION',
          title,
          message,
          priority
        });
      }
    }
  }
}

async function disconnect() {
  try {
    await consumer.disconnect();
    console.log('[NotificationService] Kafka consumer disconnected');
  } catch (error) {
    console.error('[NotificationService] Error disconnecting Kafka:', error.message);
  }
}

module.exports = {
  connectConsumer,
  disconnect,
  TOPICS
};
