-- ==============================================================================
-- SCHEMA OFICIAL SUPABASE - USE PEIXOTO (SEMIJOIAS)
-- Copie e cole este código completo no SQL Editor do seu projeto Supabase e clique em RUN
-- ==============================================================================

-- 1. Configurações da Loja
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Categorias de Semijoias
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Catálogo de Semijoias
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  promo_price NUMERIC(10, 2),
  promo_start TIMESTAMP WITH TIME ZONE,
  promo_end TIMESTAMP WITH TIME ZONE,
  cost_price NUMERIC(10, 2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 3,
  materials TEXT,
  care_instructions TEXT,
  weight TEXT,
  dimensions TEXT,
  published INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_promo INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Imagens dos Produtos
CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Despesas Operacionais (Controle de Gastos)
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  amount NUMERIC(10, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Pedidos WhatsApp
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'aguardando_contato',
  customer_name TEXT,
  customer_phone TEXT,
  customer_notes TEXT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Itens dos Pedidos
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  variation_type TEXT,
  variation_value TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ==============================================================================
-- DADOS INICIAIS (SEEDS)
-- ==============================================================================

-- Usuário Admin padrão (admin / admin123)
INSERT INTO admin_users (username, password_hash, name, role, active)
VALUES (
  'admin',
  '$2b$12$okUwDpH8OZyERrfx/UfJj./hLZUiu/QPe05ii5Fy5ytqmdhycnnOe',
  'Administrador Use Peixoto',
  'admin',
  1
) ON CONFLICT (username) DO NOTHING;

-- Configurações Padrão
INSERT INTO store_settings (key, value) VALUES
  ('store_name', 'Use Peixoto'),
  ('store_description', 'Catálogo exclusivo de semijoias finas banhadas a ouro 18k e prata 925 com garantia.'),
  ('whatsapp_number', '5511999999999'),
  ('instagram', '@usepeixoto'),
  ('warranty_info', 'Garantia de 6 meses no banho e peças hipoalergênicas.')
ON CONFLICT (key) DO NOTHING;

-- Categorias de Semijoias
INSERT INTO categories (name, slug, sort_order, active, featured) VALUES
  ('Brincos', 'brincos', 1, 1, 1),
  ('Colares', 'colares', 2, 1, 1),
  ('Anéis', 'aneis', 3, 1, 1),
  ('Pulseiras', 'pulseiras', 4, 1, 1),
  ('Conjuntos', 'conjuntos', 5, 1, 1)
ON CONFLICT (slug) DO NOTHING;

-- Produtos Iniciais de Demonstração
INSERT INTO products (name, slug, description, sku, category_id, price, cost_price, stock_quantity, materials, published, featured)
VALUES
  ('BRINCO GOTA ZIRCÔNIA LUXO', 'brinco-gota-zirconia-luxo', 'Brinco formato gota com micro zircônias e banho hipoalergênico.', 'PX-BRI-001', 1, 149.90, 45.00, 12, 'Banho Ouro 18k (10 milésimos)', 1, 1),
  ('COLAR PONTO DE LUZ VENEZIANA', 'colar-ponto-de-luz-veneziana', 'Colar com corrente veneziana e pingente ponto de luz.', 'PX-COL-002', 2, 149.90, 48.00, 15, 'Banho Ouro 18k (10 milésimos)', 1, 1),
  ('ANEL SOLITÁRIO CRAVEJADO', 'anel-solitario-cravejado', 'Anel solitário clássico com aro cravejado e pedra central lapidada.', 'PX-ANE-003', 3, 54.90, 18.00, 20, 'Banho Ródio Branco', 1, 1),
  ('PULSEIRA RIVIERA CRISTAIS', 'pulseira-riviera-cristais', 'Pulseira estilo riviera articulada com cristais cravejados individualmente.', 'PX-PUL-004', 4, 89.90, 28.00, 8, 'Prata 925 com Verniz Suíço', 1, 1)
ON CONFLICT (sku) DO NOTHING;

-- Imagens Iniciais
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT id, '/images/products/brinco-gota.jpg', name, 0, 1 FROM products WHERE sku = 'PX-BRI-001';
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT id, '/images/products/colar-ponto-de-luz.jpg', name, 0, 1 FROM products WHERE sku = 'PX-COL-002';
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT id, '/images/products/anel-solitario.jpg', name, 0, 1 FROM products WHERE sku = 'PX-ANE-003';
INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
SELECT id, '/images/products/pulseira-riviera.jpg', name, 0, 1 FROM products WHERE sku = 'PX-PUL-004';
