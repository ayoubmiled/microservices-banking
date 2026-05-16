# OurBank — Application Bancaire Simplifiée (Microservices)

> Mini-projet : Architecture Microservices — Dr. Salah Gontara — A.U. 2025-26

## 📋 Table des matières

1. [Description du projet](#description-du-projet)
2. [Architecture](#architecture)
3. [Technologies utilisées](#technologies-utilisées)
4. [Structure du projet](#structure-du-projet)
5. [Communication gRPC](#communication-grpc)
6. [Endpoints REST](#endpoints-rest)
7. [Schéma GraphQL](#schéma-graphql)
8. [Topics Kafka](#topics-kafka)
9. [Bases de données](#bases-de-données)
10. [Installation et exécution](#installation-et-exécution)
11. [Tests](#tests)
12. [Conteneurisation Docker](#conteneurisation-docker)

---

## Description du projet

OurBank est une application bancaire simplifiée basée sur une architecture microservices. L'application permet de gérer des clients, des comptes bancaires, des transactions et des notifications. Chaque microservice est indépendant, possède sa propre base de données et communique avec les autres services via des protocoles bien définis.

### Fonctionnalités principales

- **Gestion des clients** : Création, consultation, modification, suppression et recherche de clients
- **Gestion des comptes** : Ouverture de comptes (courant, épargne, professionnel), consultation du solde
- **Gestion des transactions** : Dépôts, retraits et virements entre comptes
- **Système de notifications** : Alertes automatiques pour les événements importants (création de compte, transactions, etc.)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT / TESTER                         │
│                  (REST + GraphQL Requests)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       API GATEWAY                           │
│                    (Port 3000 - HTTP)                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  REST API   │  │  GraphQL    │  │   gRPC Clients      │ │
│  │  /api/*     │  │  /graphql   │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──┬─────┬─────┬─────┘ │
└─────────┼────────────────┼────────────┼─────┼─────┼────────┘
          │                │            │     │     │
          └────────────────┼────────────┘     │     │
                           │       gRPC       │     │
          ┌────────────────┼──────────────────┼─────┼────────┐
          │                ▼                  ▼     ▼        │
          │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐│
          │  │  Customer    │ │   Account    │ │ Notification││
          │  │  Service     │ │   Service    │ │  Service    ││
          │  │  :50051      │ │   :50052     │ │  :50053     ││
          │  ├──────────────┤ ├──────────────┤ ├────────────┤│
          │  │  SQLite3     │ │  SQLite3     │ │  RxDB      ││
          │  └──────┬───────┘ └──────┬───────┘ └─────┬──────┘│
          │         │                │               │       │
          │         │    Kafka       │               │       │
          │         ├───────────────►│               │       │
          │         │ customer-     │ account-      │       │
          │         │ events        │ events        │       │
          │         │               │ transaction-  │       │
          │         │               │ events        │       │
          │         │               ├──────────────►│       │
          └─────────┼───────────────┼───────────────┼───────┘
                    │               │               │
                    ▼               ▼               ▼
              ┌─────────────────────────────────────────────┐
              │              KAFKA BROKER                    │
              │              (Port 9092)                     │
              └─────────────────────────────────────────────┘
```

### Flux de communication

1. **Client → API Gateway** : Le client envoie des requêtes HTTP (REST ou GraphQL)
2. **API Gateway → Microservices** : L'API Gateway communique avec les microservices via gRPC
3. **Microservices → Kafka** : Les microservices publient des événements métier sur Kafka
4. **Kafka → Microservices** : Les microservices consomment des événements depuis Kafka pour la communication asynchrone

---

## Technologies utilisées

| Technologie | Rôle | Version |
|------------|------|---------|
| **Node.js** | Runtime JavaScript | 20+ |
| **gRPC** | Communication synchrone entre API Gateway et microservices | @grpc/grpc-js ^1.12.0 |
| **Protobuf** | Sérialisation des messages gRPC | @grpc/proto-loader ^0.7.13 |
| **Express** | Serveur HTTP pour l'API Gateway | ^4.21.0 |
| **GraphQL** | Requêtes flexibles côté client | graphql ^16.9.0 |
| **Kafka** | Communication asynchrone entre microservices | kafkajs ^2.2.4 |
| **SQLite3** | Base de données SQL (Customer & Account services) | better-sqlite3 ^11.6.0 |
| **RxDB** | Base de données NoSQL (Notification service) | rxdb ^15.35.0 |
| **Docker** | Conteneurisation (bonus) | Docker Compose v3.8 |

---

## Structure du projet

```
microservices-banking/
├── api-gateway/                     # API Gateway (REST + GraphQL + gRPC clients)
│   ├── proto/
│   │   ├── customer.proto
│   │   ├── account.proto
│   │   └── notification.proto
│   ├── src/
│   │   ├── index.js                 # Point d'entrée Express
│   │   ├── grpc/clients/
│   │   │   └── index.js             # Clients gRPC pour les 3 microservices
│   │   ├── rest/
│   │   │   └── routes.js            # Routes REST
│   │   └── graphql/
│   │       └── schema.js            # Schéma GraphQL complet
│   ├── Dockerfile
│   └── package.json
│
├── services/
│   ├── customer-service/            # Microservice Client
│   │   ├── proto/
│   │   │   └── customer.proto       # Contrat gRPC
│   │   ├── src/
│   │   │   ├── index.js             # Point d'entrée
│   │   │   ├── grpc/
│   │   │   │   └── server.js        # Serveur gRPC
│   │   │   ├── database/
│   │   │   │   └── customerDB.js    # Accès SQLite3
│   │   │   └── kafka/
│   │   │       └── producer.js      # Producteur Kafka
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── account-service/             # Microservice Compte & Transaction
│   │   ├── proto/
│   │   │   └── account.proto        # Contrat gRPC
│   │   ├── src/
│   │   │   ├── index.js             # Point d'entrée
│   │   │   ├── grpc/
│   │   │   │   └── server.js        # Serveur gRPC
│   │   │   ├── database/
│   │   │   │   └── accountDB.js     # Accès SQLite3
│   │   │   └── kafka/
│   │   │       └── index.js         # Producteur + Consommateur Kafka
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── notification-service/        # Microservice Notification
│       ├── proto/
│       │   └── notification.proto    # Contrat gRPC
│       ├── src/
│       │   ├── index.js             # Point d'entrée
│       │   ├── grpc/
│       │   │   └── server.js        # Serveur gRPC
│       │   ├── database/
│       │   │   └── notificationDB.js # Accès RxDB (NoSQL)
│       │   └── kafka/
│       │       └── consumer.js      # Consommateur Kafka
│       ├── Dockerfile
│       └── package.json
│
├── client/                          # Client de test
│   ├── index.js                     # Tests REST + GraphQL
│   └── package.json
│
├── docker-compose.yml               # Orchestration Docker
├── package.json                     # Scripts racine
├── .gitignore
└── README.md                        # Documentation
```

---

## Communication gRPC

### Fichiers .proto

#### customer.proto

```protobuf
syntax = "proto3";
package customer;

service CustomerService {
  rpc CreateCustomer (CreateCustomerRequest) returns (CustomerResponse);
  rpc GetCustomer (GetCustomerRequest) returns (CustomerResponse);
  rpc UpdateCustomer (UpdateCustomerRequest) returns (CustomerResponse);
  rpc DeleteCustomer (DeleteCustomerRequest) returns (DeleteCustomerResponse);
  rpc ListCustomers (ListCustomersRequest) returns (CustomerListResponse);
  rpc SearchCustomers (SearchCustomersRequest) returns (CustomerListResponse);
}
```

#### account.proto

```protobuf
syntax = "proto3";
package account;

service AccountService {
  rpc CreateAccount (CreateAccountRequest) returns (AccountResponse);
  rpc GetAccount (GetAccountRequest) returns (AccountResponse);
  rpc ListAccounts (ListAccountsRequest) returns (AccountListResponse);
  rpc CreateTransaction (CreateTransactionRequest) returns (TransactionResponse);
  rpc ListTransactions (ListTransactionsRequest) returns (TransactionListResponse);
  rpc GetBalance (GetBalanceRequest) returns (BalanceResponse);
}
```

#### notification.proto

```protobuf
syntax = "proto3";
package notification;

service NotificationService {
  rpc CreateNotification (CreateNotificationRequest) returns (NotificationResponse);
  rpc GetNotification (GetNotificationRequest) returns (NotificationResponse);
  rpc ListNotifications (ListNotificationsRequest) returns (NotificationListResponse);
  rpc MarkAsRead (MarkAsReadRequest) returns (NotificationResponse);
  rpc DeleteNotification (DeleteNotificationRequest) returns (DeleteNotificationResponse);
}
```

---

## Endpoints REST

### Clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/customers` | Créer un client |
| `GET` | `/api/customers` | Lister les clients |
| `GET` | `/api/customers/:id` | Consulter un client |
| `PUT` | `/api/customers/:id` | Modifier un client |
| `DELETE` | `/api/customers/:id` | Supprimer un client |
| `GET` | `/api/customers/search/:query` | Rechercher des clients |

### Comptes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/accounts` | Créer un compte |
| `GET` | `/api/accounts` | Lister les comptes |
| `GET` | `/api/accounts/:id` | Consulter un compte |
| `GET` | `/api/accounts/:id/balance` | Consulter le solde |

### Transactions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/transactions` | Créer une transaction |
| `GET` | `/api/accounts/:accountId/transactions` | Lister les transactions |

### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/notifications` | Lister les notifications |
| `GET` | `/api/notifications/:id` | Consulter une notification |
| `PUT` | `/api/notifications/:id/read` | Marquer comme lu |
| `DELETE` | `/api/notifications/:id` | Supprimer une notification |

### Santé

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/health` | Vérification de l'état des services |

---

## Topics Kafka

| Topic | Producteur | Consommateurs |
|-------|-----------|---------------|
| `customer-events` | Customer Service | Account Service, Notification Service |
| `account-events` | Account Service | Notification Service |
| `transaction-events` | Account Service | Notification Service |

---

## Bases de données

- **Customer Service** — SQLite3 : table `customers`
- **Account Service** — SQLite3 : tables `accounts` + `transactions`
- **Notification Service** — RxDB (NoSQL in-memory) : collection `notifications`

---

## Installation et exécution

### Méthode 1 : Exécution locale

```bash
# Installer toutes les dépendances
npm run install:all

# Démarrer Kafka (Docker)
docker-compose up zookeeper kafka

# Démarrer les services (terminaux séparés)
npm run start:customer
npm run start:account
npm run start:notification
npm run start:gateway

# Lancer les tests
npm run start:client
```

### Méthode 2 : Docker Compose (recommandé)

```bash
docker-compose up --build
```

### Vérification

- **API Gateway** : http://localhost:3000
- **REST API** : http://localhost:3000/api
- **GraphQL IDE** : http://localhost:3000/graphql
- **Health Check** : http://localhost:3000/api/health
