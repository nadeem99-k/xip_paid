-- Create daily_usage table to track image generations per user per day
CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    generation_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, usage_date)
);

-- Trigger for updated_at
CREATE TRIGGER update_daily_usage_updated_at BEFORE UPDATE ON daily_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
