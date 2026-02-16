-- Migration: Create API Keys Management Tables
-- Created: 2026-02-15
-- Description: Creates tables for managing API keys and tracking usage statistics

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- 'deapi', 'gradio', etc.
    key_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'invalid', 'rate_limited'
    daily_limit INTEGER, -- max requests per day (NULL = unlimited)
    total_limit INTEGER, -- total requests allowed (NULL = unlimited)
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'invalid', 'rate_limited', 'disabled'))
);

-- Create api_key_usage table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    rate_limit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_key_id, request_date) -- One row per key per day
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_enabled ON api_keys(is_enabled);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_date ON api_key_usage(request_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist (to allow re-running migration)
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_api_key_usage_updated_at ON api_key_usage;

-- Create triggers for automatic updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_key_usage_updated_at BEFORE UPDATE ON api_key_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert comment for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for various providers (DeAPI, Gradio, etc.) with usage limits and status tracking';
COMMENT ON TABLE api_key_usage IS 'Tracks daily usage statistics for each API key';
