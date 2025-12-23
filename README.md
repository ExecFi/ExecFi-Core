
# ExecFi Core - AI-Powered Web3 Execution Engine

  ![enter image description here](https://olive-chemical-haddock-701.mypinata.cloud/ipfs/bafkreiambkstzoj63ndyjxws3m2dz7m5y6u5fgarhj3dblwfnud5b666na)

AI-powered conversational interface for autonomous blockchain transactions. Execute swaps, transfers, and trading strategies through natural language on Solana, Ethereum, Base, and Polygon.

  

## 🏗️ Architecture

 ![enter image description here](https://olive-chemical-haddock-701.mypinata.cloud/ipfs/bafybeickrm3mway4bipsojd6wb2e6iowsmwcag7meukfuqkaeuvjcc2dz4)


  

## 📊 Data Flow

  

### 1. Authentication Flow

```

User Wallet → Generate Nonce → Sign Message → Verify Signature → JWT Token → Store Session

```

  

### 2. Chat & Execution Flow

```

User Message

↓

Socket.IO Receives

↓

Message Classifier (Analyze intent)

↓

Select System Prompt (Based on intent)

↓

AI Provider (Generate plan)

↓

Executor Selection (Send/Swap/Analyze/Signal)

↓

Blockchain Interaction (RPC calls)

↓

Transaction Simulation & Safety Check

↓

User Confirmation Required (Critical actions)

↓

Execute on Blockchain

↓

Store Transaction + Audit Log

↓

Real-time Update to Client via Socket.IO

```

  

### 3. Trading Signal Flow

```

Monitor On-Chain Data

↓

Analyze Metrics (Price, Volume, Activity)

↓

Calculate Signal Score

↓

Generate Confidence Level

↓

Assess Risk Level

↓

Store in Database

↓

Broadcast to Subscribed Clients

```

  

## 📁 Project Structure

  

```

src/

├── app.ts # Express app initialization

├── server.ts # HTTP & Socket.IO server setup

│

├── config/ # Configuration management

│ ├── env.ts # Environment variable schema

│ ├── database.ts # PostgreSQL connection

│ ├── redis.ts # Redis client setup

│ └── logger.ts # Pino logger configuration

│

├── types/ # TypeScript type definitions

│ └── index.ts # Global types & interfaces

│

├── middlewares/ # Express middleware

│ ├── auth.ts # JWT authentication

│ ├── rate-limit.ts # Rate limiting by wallet

│ └── error-handler.ts # Global error handler

│

├── routes/ # API route definitions

│ ├── auth.ts # Authentication endpoints

│ └── chat.ts # Chat endpoints

│

├── controllers/ # Request handlers

│ ├── auth-controller.ts # Auth logic

│ └── chat-controller.ts # Chat logic

│

├── services/ # Business logic layer

│ ├── auth-service.ts # Wallet auth & session management

│ ├── chat-service.ts # Conversation management

│ ├── signal-service.ts # Trading signal generation

│ ├── prompt-router.ts # Intent classification & routing

│ ├── blockchain-service.ts # RPC & chain interactions

│ │

│ └── executors/ # Modular execution engines

│ ├── analyze-executor.ts # Wallet analysis

│ ├── send-executor.ts # Token transfers

│ ├── swap-executor.ts # DEX swaps

│ └── signal-executor.ts # Trading signals

│

├── ai/ # AI integration

│ ├── provider.ts # AI provider setup (OpenAI/Gemini)

│ ├── system-prompts.ts # Context-specific prompts

│ ├── message-classifier.ts # Intent detection

│ └── response-generator.ts # AI response formatting

│

├── sockets/ # Socket.IO event handlers

│ └── chat-socket.ts # Real-time chat events

│

└── db/ # Database utilities

└── migrations.ts # Migration runner

```

  

## 🔄 Component Responsibilities

  

| Component | Purpose |

|-----------|---------|

| **Auth Service** | Manages wallet sign-in, JWT tokens, multi-wallet support |

| **Chat Service** | Handles conversations, message history, context retrieval |

| **Prompt Router** | Classifies user intent and selects appropriate system prompt |

| **Message Classifier** | AI-powered intent detection (analyze/send/swap/signal) |

| **Blockchain Service** | RPC interactions, transaction simulation, gas estimation |

| **Executors** | Specialized handlers for each operation type |

| **Signal Service** | Generates trading signals with confidence scoring |

| **Socket Handler** | Real-time bidirectional communication with clients |

  

## 🔐 Security Architecture

  
![enter image description here](https://olive-chemical-haddock-701.mypinata.cloud/ipfs/bafybeifjivfducmw3dsor5qr4fmzf2ucgfru557si5767d7qttlexmjp4e)

  

## Features

  

### 🔐 Authentication

- Wallet-based Sign-In With Wallet (SIWW)

- Support for Phantom, Backpack, Solflare, MetaMask

- JWT session tokens with role-based access

- Multi-chain wallet support (Solana, Ethereum, Base, Polygon)

  

### 💬 Chat System

- Conversation management with message history

- Message classification (analysis, send, swap, signal, balance)

- Context-aware responses using conversation history

- Real-time updates via Socket.IO

- Automatic message persistence

  

### 🤖 AI Integration

- OpenAI & Gemini support (pluggable providers)

- System prompts for different intents

- Automatic message classification

- Safety layer for transaction requests

  

### ⚙️ Execution Engines

-  **Analyze**: Wallet analysis and on-chain data retrieval

-  **Send**: Token transfers with transaction simulation

-  **Swap**: DEX swaps with route optimization

-  **Signal**: AI-powered trading signals with confidence scoring

  

### 📊 Trading Signals

- Price and volume analysis

- On-chain metrics (transfer volume, holder count)

- Confidence scoring (0-100)

- Risk assessment (low/medium/high)

- Real-time signal alerts via Socket.IO

- Signal history and tracking

  

### 🛡️ Security

- Rate limiting per wallet address

- Action confirmation layer for critical operations

- Contract allowlist/denylist

- Comprehensive audit logging

- Signature verification per blockchain

- Transaction simulation before execution

  

## 🚀 Setup

  

### Prerequisites

- Node.js 18+

- PostgreSQL 14+

- Redis 6+

- Environment variables (see `.env.example`)

  

### Installation

  

```bash

npm  install

npm  run  migrate  # Run database migrations

npm  run  seed  # Seed test data

npm  run  dev  # Start development server

```

  

### Database Setup

  

```bash

# Run migrations

npm  run  migrate

  

# Seed test data

npm  run  seed

```

  

## 📡 API Endpoints

  

### Authentication Endpoints

| Method | Endpoint | Purpose |

|--------|----------|---------|

| POST | `/api/auth/nonce` | Generate sign-in nonce |

| POST | `/api/auth/verify` | Verify signature and get JWT token |

| POST | `/api/auth/wallet/add` | Add additional wallet |

| GET | `/api/auth/wallets` | List user's connected wallets |

| POST | `/api/auth/logout` | Logout session |

  

### Chat Endpoints

| Method | Endpoint | Purpose |

|--------|----------|---------|

| POST | `/api/chat/conversations` | Create conversation |

| GET | `/api/chat/conversations` | List conversations |

| GET | `/api/chat/conversations/:id` | Get conversation details |

| POST | `/api/chat/conversations/:id/messages` | Send message |

| DELETE | `/api/chat/conversations/:id` | Delete conversation |

  

## 🔌 Socket.IO Events

  

### Authentication

-  `authenticate` - Authenticate socket connection with JWT

-  `authenticated` - Authentication successful response

  

### Chat Events

-  `message` - Send chat message to conversation

-  `join-conversation` - Join conversation room for real-time updates

-  `leave-conversation` - Leave conversation room

-  `message-received` - Receive incoming message

  

### Transaction Events

-  `subscribe-transaction` - Subscribe to transaction status updates

-  `transaction-update` - Transaction status change notification

-  `transaction-error` - Transaction execution error

  

### Signal Events

-  `signal-alert` - New trading signal generated

-  `signal-update` - Signal status or confidence update

  

## 💬 Example Prompts

  

```

# Wallet Analysis

"What's in my wallet?"

"Analyze my portfolio on Solana"

"Show me my assets on Ethereum"

  

# Token Transfer

"Send 5 SOL to 9B5X3f7L2w8q..."

"Transfer 100 USDC to this address"

"Pay 10 ETH to address 0x742d..."

  

# Token Swaps

"Swap 1 SOL for USDC"

"Exchange 100 USDT for ETH on Base"

"Trade 5 MATIC for USDC on Polygon"

  

# Trading Signals

"Should I buy SOL?"

"What tokens are trending on Base?"

"Generate trading signals for Bitcoin"

"Is this a good time to trade ETH?"

  

# Balance Check

"What's my balance?"

"How much ETH do I have?"

"Show me all my balances"

```

  

## 🛠️ Development

  

```bash

# Start development server with hot reload

npm  run  dev

  

# Run tests

npm  run  test

  

# Build for production

npm  run  build

  

# Start production server

npm  start

  

# Run database migrations only

npm  run  migrate

  

# Seed database with test data

npm  run  seed

```

  

## 🔑 Environment Variables

  

Key configuration variables (see `.env.example` for complete list):

  

```

# Database

DATABASE_URL=postgresql://user:password@localhost:5432/execfi

  

# Cache & Queue

REDIS_URL=redis://localhost:6379

  

# Authentication

JWT_SECRET=your-super-secret-key-min-32-chars

  

# AI Provider

AI_PROVIDER=openai # or gemini

OPENAI_API_KEY=sk-...

GEMINI_API_KEY=...

  

# Blockchain RPC URLs

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...

BASE_RPC_URL=https://mainnet.base.org

POLYGON_RPC_URL=https://polygon-rpc.com

  

# Server

PORT=3000

NODE_ENV=development

LOG_LEVEL=debug

```

  

## 🔐 Security Considerations

  

1.  **Signature Verification**: Implement proper signature verification for each blockchain

2.  **Rate Limiting**: Configured per wallet address to prevent abuse

3.  **Contract Safety**: Maintain allowlist/denylist of trusted contracts

4.  **Audit Logging**: All security-relevant actions logged to database

5.  **Transaction Confirmation**: User confirmation required for sends/swaps

6.  **Environment Secrets**: All secrets stored in environment variables

7.  **SQL Injection Prevention**: Parameterized queries throughout

8.  **CORS Configuration**: Restrict to trusted frontend domains

  

## 🧪 Testing Wallets

  

For development and testing:

  

-  **Solana**: `GKPLxmjVRfyvWFuiLEhjMpAxJ4F5L7h4X9eDJqU2Dwbb`

-  **Ethereum**: `0x742d35Cc6634C0532925a3b844Bc59e4bC2eE36`

  

## 📦 Deployment

  

### Production Checklist

  

- [ ] Set production environment variables

- [ ] Run database migrations

- [ ] Configure CORS for frontend domains

- [ ] Set up SSL/TLS certificates

- [ ] Configure rate limiting thresholds

- [ ] Set up monitoring and alerting

- [ ] Implement contract allowlist

- [ ] Configure backup strategies

- [ ] Set up CI/CD pipeline

- [ ] Enable database transaction logs

  

### Deployment Steps

  

```bash

# Build production bundle

npm  run  build

  

# Run migrations in production

npm  run  migrate  --  --prod

  

# Start production server

NODE_ENV=production  npm  start

```

  

## 📄 License

  

MIT

  

## 💬 Support

  

For issues or questions, open a GitHub issue or contact the development team.