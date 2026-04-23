-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    profile_id TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED', 'VIEWED', 'ORDER_STATUS_CHANGED', etc.
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Activity logs are viewable by owner" ON public.activity_logs
    FOR SELECT USING (auth.uid() = company_id);

CREATE POLICY "Activity logs are insertable by authenticated users" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_activity_logs_company_profiles ON public.activity_logs(company_id, profile_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
