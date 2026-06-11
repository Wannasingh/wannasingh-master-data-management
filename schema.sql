-- Precision MDM Production Database Schema

-- 1. System Settings Table (Key-Value configuration store)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default System Configuration Settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
('fuzzy_threshold', '75', 'Similarity threshold (%) for matching engine deduplication (50-100)'),
('golden_quality_threshold', '80', 'Minimum score required to promote a master record to Golden status (0-100)'),
('auto_merge', 'true', 'Enable auto-merge of records matching with high confidence (>=95% similarity)'),
('redis_cache_ttl', '60', 'Redis Cache Time To Live (TTL) in seconds for Master Data query responses')
ON CONFLICT (key) DO NOTHING;

-- 2. Audit Logs Table (For tracking schema changes, manual reviews, settings updates)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    actor VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial audit trail record
INSERT INTO public.audit_logs (action, details, actor)
VALUES ('SYSTEM_INIT', 'MDM enterprise database schema initialized successfully.', 'System')
ON CONFLICT DO NOTHING;

-- 3. Data Sources Table (To monitor CRM/ERP connection status)
CREATE TABLE IF NOT EXISTS public.data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL, -- 'API', 'CSV', 'Database'
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Inactive', 'Error'
    records_count INT DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system data sources
INSERT INTO public.data_sources (name, type, status, records_count)
VALUES 
('CRM API (JSONPlaceholder)', 'API', 'Active', 10),
('ERP API (DummyJSON)', 'API', 'Active', 10),
('CSV Ingestion Service', 'CSV', 'Active', 0),
('Manual Ingest Terminal', 'Database', 'Active', 0)
ON CONFLICT (name) DO NOTHING;

-- 4. Governance Policies Table (For compliance reporting)
CREATE TABLE IF NOT EXISTS public.governance_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    rules JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sample governance policies
INSERT INTO public.governance_policies (name, category, rules, is_active)
VALUES
('GDPR Compliance Policy', 'Privacy', '{"consent_required": true, "retention_years": 7, "anonymize_on_delete": true}', true),
('HIPAA Data Alignment', 'Security', '{"encrypted_fields": ["ssn", "phone", "email"], "auto_flag_phi": true}', true),
('Duplicate Ingestion Guard', 'Quality', '{"prevent_exact_matches": true, "similarity_match_threshold": 95}', true)
ON CONFLICT (name) DO NOTHING;
