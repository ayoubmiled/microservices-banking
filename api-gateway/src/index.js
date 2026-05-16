const express = require('express');
const cors = require('cors');
const { createHandler } = require('graphql-http/lib/use/express');
const schema = require('./graphql/schema');
const restRoutes = require('./rest/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[APIGateway] ${req.method} ${req.url}`);
  next();
});

// ========================
// REST API
// ========================

app.use('/api', restRoutes);

// ========================
// GraphQL API
// ========================

// GraphiQL IDE (browser UI)
app.get('/graphql', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
  <head>
    <title>GraphiQL - OurBank</title>
    <link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css" />
  </head>
  <body style="margin:0">
    <div id="graphiql" style="height:100vh"></div>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/graphiql@3/graphiql.min.js"></script>
    <script>
      const root = ReactDOM.createRoot(document.getElementById('graphiql'));
      root.render(React.createElement(GraphiQL, {
        fetcher: GraphiQL.createFetcher({ url: '/graphql' })
      }));
    </script>
  </body>
</html>
  `);
});

// GraphQL endpoint
app.post('/graphql', createHandler({ schema }));

// ========================
// Root endpoint
// ========================

app.get('/', (req, res) => {
  res.json({
    name: 'OurBank API Gateway',
    version: '1.0.0',
    endpoints: {
      rest: '/api',
      graphql: '/graphql',
      health: '/api/health'
    },
    availableRestEndpoints: {
      customers: {
        create: 'POST /api/customers',
        list: 'GET /api/customers',
        get: 'GET /api/customers/:id',
        update: 'PUT /api/customers/:id',
        delete: 'DELETE /api/customers/:id',
        search: 'GET /api/customers/search/:query'
      },
      accounts: {
        create: 'POST /api/accounts',
        list: 'GET /api/accounts?customer_id=xxx',
        get: 'GET /api/accounts/:id',
        balance: 'GET /api/accounts/:id/balance'
      },
      transactions: {
        create: 'POST /api/transactions',
        list: 'GET /api/accounts/:accountId/transactions'
      },
      notifications: {
        list: 'GET /api/notifications?customer_id=xxx&unread_only=true',
        get: 'GET /api/notifications/:id',
        markRead: 'PUT /api/notifications/:id/read',
        delete: 'DELETE /api/notifications/:id'
      }
    }
  });
});

// ========================
// Start server
// ========================

app.listen(PORT, () => {
  console.log(`[APIGateway] Server running on http://localhost:${PORT}`);
  console.log(`[APIGateway] REST API available at http://localhost:${PORT}/api`);
  console.log(`[APIGateway] GraphQL IDE available at http://localhost:${PORT}/graphql`);
});

module.exports = app;
