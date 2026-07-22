-- Core AgriOS business tables. All tenant-scoped (tenant_id, nullable for
-- single-tenant deployments) with standard created_at/updated_at columns
-- so they work with the generic base repository.

CREATE TABLE IF NOT EXISTS branches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    name        VARCHAR(150) NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'branch' CHECK (type IN ('branch', 'warehouse')),
    employees   INTEGER NOT NULL DEFAULT 0,
    status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'near-capacity')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches (tenant_id);

CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    name        VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories (tenant_id);

CREATE TABLE IF NOT EXISTS suppliers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    name        VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers (tenant_id);

CREATE TABLE IF NOT EXISTS inventory (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    sku           VARCHAR(60) NOT NULL,
    name          VARCHAR(200) NOT NULL,
    category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    stock         NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit          VARCHAR(30) NOT NULL DEFAULT 'unit',
    unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
    stock_status  VARCHAR(20) NOT NULL DEFAULT 'healthy'
                    CHECK (stock_status IN ('healthy', 'medium', 'low', 'out')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, sku)
);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory (supplier_id);

CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID,
    invoice_no      VARCHAR(60) NOT NULL,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('sale', 'purchase')),
    party           VARCHAR(200) NOT NULL,
    party_type      VARCHAR(20) NOT NULL CHECK (party_type IN ('farmer', 'supplier')),
    location        VARCHAR(150),
    items           TEXT,
    branch          VARCHAR(150),
    payment_method  VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'credit')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
    amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
    date            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, invoice_no)
);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

CREATE TABLE IF NOT EXISTS farmers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID,
    name                VARCHAR(150) NOT NULL,
    phone               VARCHAR(20),
    location            VARCHAR(150),
    land_acres          NUMERIC(10,2) DEFAULT 0,
    crop                VARCHAR(100),
    stage               VARCHAR(100),
    stage_progress_pct  NUMERIC(5,2) DEFAULT 0,
    dues_amount         NUMERIC(14,2) DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_farmers_tenant ON farmers (tenant_id);

CREATE TABLE IF NOT EXISTS employees (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID,
    name             VARCHAR(150) NOT NULL,
    role             VARCHAR(100),
    role_group       VARCHAR(100),
    branch           VARCHAR(150),
    -- named attendance30d (no underscore before "30d") so it round-trips
    -- correctly through the camelCase<->snake_case mapper: "attendance30d"
    -- has no uppercase letter for the mapper to split on, so "attendance_30d"
    -- would never match what camelToSnake produces from the API field.
    attendance30d    NUMERIC(5,2) DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
    open_tasks       INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees (tenant_id);

CREATE TABLE IF NOT EXISTS attendance (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in      VARCHAR(20),
    status        VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance (tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance (employee_id);

CREATE TABLE IF NOT EXISTS warehouses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID,
    name              VARCHAR(150) NOT NULL,
    capacity_sqft     NUMERIC(12,2) DEFAULT 0,
    utilization_pct   NUMERIC(5,2) DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses (tenant_id);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    transfer_no    VARCHAR(60) NOT NULL,
    item           VARCHAR(200) NOT NULL,
    from_location  VARCHAR(150) NOT NULL,
    to_location    VARCHAR(150) NOT NULL,
    qty            VARCHAR(50) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'in-transit'
                     CHECK (status IN ('in-transit', 'delivered', 'delayed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, transfer_no)
);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers (tenant_id);

CREATE TABLE IF NOT EXISTS expenses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    description   VARCHAR(255) NOT NULL,
    category      VARCHAR(100),
    branch        VARCHAR(150),
    amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);

CREATE TABLE IF NOT EXISTS knowledge_docs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    title         VARCHAR(255) NOT NULL,
    category      VARCHAR(100),
    pages         INTEGER DEFAULT 0,
    status        VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('ready', 'processing')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tenant ON knowledge_docs (tenant_id);

CREATE TABLE IF NOT EXISTS notification_settings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    label         VARCHAR(150) NOT NULL,
    description   VARCHAR(255),
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON notification_settings (tenant_id);

CREATE TABLE IF NOT EXISTS reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    name          VARCHAR(200) NOT NULL,
    description   VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports (tenant_id);

CREATE TABLE IF NOT EXISTS ai_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID,
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    sender        VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'bot')),
    text          TEXT NOT NULL,
    lang          VARCHAR(10),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_tenant ON ai_messages (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages (user_id);
