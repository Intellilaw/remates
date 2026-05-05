CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  UNIQUE (provider, provider_subject)
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  zone_label TEXT NOT NULL,
  estimated_value_mxn NUMERIC(14, 2) NOT NULL,
  legal_bid_mxn NUMERIC(14, 2) NOT NULL,
  discount_pct NUMERIC(5, 2) NOT NULL,
  auction_round TEXT NOT NULL DEFAULT 'PRIMERA',
  short_description TEXT NOT NULL,
  public_status TEXT NOT NULL DEFAULT 'DRAFT',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ
);

CREATE TABLE property_private_details (
  property_id TEXT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  full_address TEXT NOT NULL,
  court_name TEXT,
  file_number TEXT,
  auction_date DATE,
  auction_time TEXT,
  occupancy_status TEXT,
  legal_summary TEXT,
  risk_notes TEXT,
  internal_notes TEXT
);

CREATE TABLE property_media (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE service_stages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL,
  price_mxn NUMERIC(14, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NEW',
  current_stage TEXT NOT NULL DEFAULT 'LEAD',
  assigned_staff_user_id TEXT REFERENCES users(id),
  lead_source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE TABLE case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL REFERENCES service_stages(code),
  provider TEXT NOT NULL,
  amount_mxn NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider_preference_id TEXT,
  provider_payment_id TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_webhook_events (
  id TEXT PRIMARY KEY,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  last_message_at TIMESTAMPTZ
);

CREATE TABLE conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  attachments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE internal_notes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cms_content (
  id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  video_s3_key TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE visitor_sessions (
  id TEXT PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversion_events (
  id TEXT PRIMARY KEY,
  visitor_session_id TEXT,
  user_id TEXT REFERENCES users(id),
  case_id TEXT REFERENCES cases(id),
  property_id TEXT REFERENCES properties(id),
  event_type TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_stage ON cases(current_stage);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned_staff ON cases(assigned_staff_user_id);
CREATE INDEX idx_payments_case_id ON payments(case_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_conversion_events_type ON conversion_events(event_type, created_at);
