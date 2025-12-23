-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'agent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_role (role)
);

-- Wallets table (user can have multiple wallets across chains)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL CHECK (chain IN ('solana', 'ethereum', 'base', 'polygon')),
  label VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  public_key VARCHAR(255),
  nonce VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_address, chain),
  INDEX idx_wallets_user_id (user_id),
  INDEX idx_wallets_wallet_address (wallet_address),
  INDEX idx_wallets_chain (chain)
);

-- Sessions table for JWT-based sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_wallet_id (wallet_id),
  INDEX idx_sessions_expires_at (expires_at)
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversations_user_id (user_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'unknown' CHECK (type IN ('analysis', 'send', 'swap', 'signal', 'balance', 'unknown')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_conversation_id (conversation_id),
  INDEX idx_messages_user_id (user_id),
  INDEX idx_messages_type (type),
  INDEX idx_messages_created_at (created_at)
);

-- Transactions table (tracks on-chain transactions)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  tx_hash VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('send', 'swap', 'analysis')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  details JSONB,
  gas_used NUMERIC,
  gas_fee NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tx_hash, chain),
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_wallet_id (wallet_id),
  INDEX idx_transactions_status (status),
  INDEX idx_transactions_chain (chain),
  INDEX idx_transactions_tx_hash (tx_hash),
  INDEX idx_transactions_created_at (created_at)
);

-- Swaps table (detailed swap records)
CREATE TABLE swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain VARCHAR(50) NOT NULL,
  input_token_address VARCHAR(255) NOT NULL,
  output_token_address VARCHAR(255) NOT NULL,
  input_amount NUMERIC NOT NULL,
  output_amount NUMERIC NOT NULL,
  slippage NUMERIC DEFAULT 1.0,
  route JSONB,
  provider VARCHAR(100) CHECK (provider IN ('jupiter', 'uniswap', '1inch')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_swaps_transaction_id (transaction_id),
  INDEX idx_swaps_user_id (user_id),
  INDEX idx_swaps_chain (chain),
  INDEX idx_swaps_input_token_address (input_token_address),
  INDEX idx_swaps_output_token_address (output_token_address)
);

-- Signals table (AI trading signals)
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(20),
  chain VARCHAR(50) NOT NULL,
  signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold')),
  confidence SMALLINT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  reasoning TEXT,
  price_at_signal NUMERIC,
  volume_24h NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_signals_user_id (user_id),
  INDEX idx_signals_token_address (token_address),
  INDEX idx_signals_chain (chain),
  INDEX idx_signals_signal_type (signal_type),
  INDEX idx_signals_confidence (confidence),
  INDEX idx_signals_created_at (created_at)
);

-- Usage limits tracking (rate limiting per wallet)
CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  requests_count INT DEFAULT 0,
  transactions_count INT DEFAULT 0,
  swaps_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(wallet_id, day),
  INDEX idx_usage_limits_wallet_id (wallet_id),
  INDEX idx_usage_limits_day (day)
);

-- Audit logs (security & compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_wallet_id (wallet_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
);

-- Contract allowlist/denylist
CREATE TABLE contract_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(255) NOT NULL,
  chain VARCHAR(50) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('allow', 'block')),
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contract_address, chain),
  INDEX idx_contract_rules_contract_address (contract_address),
  INDEX idx_contract_rules_chain (chain),
  INDEX idx_contract_rules_rule_type (rule_type)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
