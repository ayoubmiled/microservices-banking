const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLFloat, GraphQLInt, GraphQLBoolean, GraphQLList, GraphQLInputObjectType, GraphQLNonNull } = require('graphql');
const { CustomerService, AccountService, NotificationService } = require('../grpc/clients');

// ========================
// GraphQL Types
// ========================

const CustomerType = new GraphQLObjectType({
  name: 'Customer',
  fields: () => ({
    id: { type: GraphQLString },
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    email: { type: GraphQLString },
    phone: { type: GraphQLString },
    address: { type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString }
  })
});

const AccountType = new GraphQLObjectType({
  name: 'Account',
  fields: () => ({
    id: { type: GraphQLString },
    customer_id: { type: GraphQLString },
    account_type: { type: GraphQLString },
    balance: { type: GraphQLFloat },
    currency: { type: GraphQLString },
    status: { type: GraphQLString },
    created_at: { type: GraphQLString },
    updated_at: { type: GraphQLString },
    // Nested: fetch customer for this account
    customer: {
      type: CustomerType,
      resolve: async (parent) => {
        try {
          const response = await CustomerService.getCustomer({ id: parent.customer_id });
          return response.customer;
        } catch {
          return null;
        }
      }
    }
  })
});

const TransactionType = new GraphQLObjectType({
  name: 'Transaction',
  fields: () => ({
    id: { type: GraphQLString },
    account_id: { type: GraphQLString },
    transaction_type: { type: GraphQLString },
    amount: { type: GraphQLFloat },
    currency: { type: GraphQLString },
    description: { type: GraphQLString },
    reference_id: { type: GraphQLString },
    status: { type: GraphQLString },
    created_at: { type: GraphQLString },
    // Nested: fetch account for this transaction
    account: {
      type: AccountType,
      resolve: async (parent) => {
        try {
          const response = await AccountService.getAccount({ id: parent.account_id });
          return response.account;
        } catch {
          return null;
        }
      }
    }
  })
});

const NotificationType = new GraphQLObjectType({
  name: 'Notification',
  fields: () => ({
    id: { type: GraphQLString },
    customer_id: { type: GraphQLString },
    type: { type: GraphQLString },
    title: { type: GraphQLString },
    message: { type: GraphQLString },
    read: { type: GraphQLBoolean },
    priority: { type: GraphQLString },
    created_at: { type: GraphQLString }
  })
});

const CustomerListType = new GraphQLObjectType({
  name: 'CustomerList',
  fields: () => ({
    customers: { type: new GraphQLList(CustomerType) },
    total: { type: GraphQLInt }
  })
});

const AccountListType = new GraphQLObjectType({
  name: 'AccountList',
  fields: () => ({
    accounts: { type: new GraphQLList(AccountType) },
    total: { type: GraphQLInt }
  })
});

const TransactionListType = new GraphQLObjectType({
  name: 'TransactionList',
  fields: () => ({
    transactions: { type: new GraphQLList(TransactionType) },
    total: { type: GraphQLInt }
  })
});

const NotificationListType = new GraphQLObjectType({
  name: 'NotificationList',
  fields: () => ({
    notifications: { type: new GraphQLList(NotificationType) },
    total: { type: GraphQLInt }
  })
});

const BalanceType = new GraphQLObjectType({
  name: 'Balance',
  fields: () => ({
    account_id: { type: GraphQLString },
    balance: { type: GraphQLFloat },
    currency: { type: GraphQLString }
  })
});

// Extended customer with accounts (demonstrates GraphQL flexibility)
const CustomerWithAccountsType = new GraphQLObjectType({
  name: 'CustomerWithAccounts',
  fields: () => ({
    customer: { type: CustomerType },
    accounts: {
      type: new GraphQLList(AccountType),
      resolve: async (parent) => {
        try {
          const response = await AccountService.listAccounts({ customer_id: parent.customer.id });
          return response.accounts;
        } catch {
          return [];
        }
      }
    },
    notifications: {
      type: new GraphQLList(NotificationType),
      resolve: async (parent) => {
        try {
          const response = await NotificationService.listNotifications({ customer_id: parent.customer.id });
          return response.notifications;
        } catch {
          return [];
        }
      }
    }
  })
});

// ========================
// Input Types
// ========================

const CreateCustomerInput = new GraphQLInputObjectType({
  name: 'CreateCustomerInput',
  fields: () => ({
    first_name: { type: new GraphQLNonNull(GraphQLString) },
    last_name: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: GraphQLString },
    address: { type: GraphQLString }
  })
});

const UpdateCustomerInput = new GraphQLInputObjectType({
  name: 'UpdateCustomerInput',
  fields: () => ({
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    email: { type: GraphQLString },
    phone: { type: GraphQLString },
    address: { type: GraphQLString }
  })
});

const CreateAccountInput = new GraphQLInputObjectType({
  name: 'CreateAccountInput',
  fields: () => ({
    customer_id: { type: new GraphQLNonNull(GraphQLString) },
    account_type: { type: new GraphQLNonNull(GraphQLString) },
    currency: { type: GraphQLString },
    initial_balance: { type: GraphQLFloat }
  })
});

const CreateTransactionInput = new GraphQLInputObjectType({
  name: 'CreateTransactionInput',
  fields: () => ({
    account_id: { type: new GraphQLNonNull(GraphQLString) },
    transaction_type: { type: new GraphQLNonNull(GraphQLString) },
    amount: { type: new GraphQLNonNull(GraphQLFloat) },
    currency: { type: GraphQLString },
    description: { type: GraphQLString },
    reference_id: { type: GraphQLString }
  })
});

// ========================
// Root Query
// ========================

const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    customer: {
      type: CustomerType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const response = await CustomerService.getCustomer({ id });
        return response.customer;
      }
    },
    customers: {
      type: CustomerListType,
      args: {
        page: { type: GraphQLInt, defaultValue: 1 },
        limit: { type: GraphQLInt, defaultValue: 10 }
      },
      resolve: async (_, { page, limit }) => {
        return await CustomerService.listCustomers({ page, limit });
      }
    },
    searchCustomers: {
      type: CustomerListType,
      args: { query: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { query }) => {
        return await CustomerService.searchCustomers({ query });
      }
    },
    customerWithDetails: {
      type: CustomerWithAccountsType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const response = await CustomerService.getCustomer({ id });
        return { customer: response.customer };
      }
    },
    account: {
      type: AccountType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const response = await AccountService.getAccount({ id });
        return response.account;
      }
    },
    accounts: {
      type: AccountListType,
      args: {
        customer_id: { type: GraphQLString },
        page: { type: GraphQLInt, defaultValue: 1 },
        limit: { type: GraphQLInt, defaultValue: 10 }
      },
      resolve: async (_, { customer_id, page, limit }) => {
        return await AccountService.listAccounts({ customer_id: customer_id || '', page, limit });
      }
    },
    balance: {
      type: BalanceType,
      args: { account_id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { account_id }) => {
        return await AccountService.getBalance({ account_id });
      }
    },
    transactions: {
      type: TransactionListType,
      args: {
        account_id: { type: new GraphQLNonNull(GraphQLString) },
        page: { type: GraphQLInt, defaultValue: 1 },
        limit: { type: GraphQLInt, defaultValue: 10 }
      },
      resolve: async (_, { account_id, page, limit }) => {
        return await AccountService.listTransactions({ account_id, page, limit });
      }
    },
    notifications: {
      type: NotificationListType,
      args: {
        customer_id: { type: GraphQLString },
        unread_only: { type: GraphQLBoolean, defaultValue: false },
        page: { type: GraphQLInt, defaultValue: 1 },
        limit: { type: GraphQLInt, defaultValue: 10 }
      },
      resolve: async (_, { customer_id, unread_only, page, limit }) => {
        return await NotificationService.listNotifications({
          customer_id: customer_id || '',
          unread_only,
          page,
          limit
        });
      }
    }
  }
});

// ========================
// Root Mutation
// ========================

const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createCustomer: {
      type: CustomerType,
      args: { input: { type: new GraphQLNonNull(CreateCustomerInput) } },
      resolve: async (_, { input }) => {
        const response = await CustomerService.createCustomer(input);
        return response.customer;
      }
    },
    updateCustomer: {
      type: CustomerType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        input: { type: new GraphQLNonNull(UpdateCustomerInput) }
      },
      resolve: async (_, { id, input }) => {
        const response = await CustomerService.updateCustomer({ id, ...input });
        return response.customer;
      }
    },
    deleteCustomer: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        await CustomerService.deleteCustomer({ id });
        return 'Customer deleted successfully';
      }
    },
    createAccount: {
      type: AccountType,
      args: { input: { type: new GraphQLNonNull(CreateAccountInput) } },
      resolve: async (_, { input }) => {
        const response = await AccountService.createAccount(input);
        return response.account;
      }
    },
    createTransaction: {
      type: TransactionType,
      args: { input: { type: new GraphQLNonNull(CreateTransactionInput) } },
      resolve: async (_, { input }) => {
        const response = await AccountService.createTransaction(input);
        return response.transaction;
      }
    },
    markNotificationRead: {
      type: NotificationType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const response = await NotificationService.markAsRead({ id });
        return response.notification;
      }
    }
  }
});

// ========================
// Schema
// ========================

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation
});

module.exports = schema;
