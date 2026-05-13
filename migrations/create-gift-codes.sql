-- Migration: Create gift_codes table
-- Description: Stores single-use codes for free coins.

CREATE TABLE IF NOT EXISTS gift_codes (
    code TEXT PRIMARY KEY,
    coins INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_gift_codes_unused ON gift_codes(code) WHERE is_used = FALSE;
