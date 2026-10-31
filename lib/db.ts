import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'peixoto.db');

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  ensureDataDir();
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initializeSchema(_db);
  return _db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      sku TEXT UNIQUE NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      price REAL NOT NULL DEFAULT 0,
      promo_price REAL,
      promo_start TEXT,
      promo_end TEXT,
      cost_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 3,
      materials TEXT,
      care_instructions TEXT,
      supplier TEXT,
      weight TEXT,
      dimensions TEXT,
      published INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 0,
      is_promo INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      alt TEXT,
      sort_order INTEGER DEFAULT 0,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      price_adjustment REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      sku_suffix TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'aguardando_contato',
      customer_name TEXT,
      customer_phone TEXT,
      customer_notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'pendente',
      payment_status TEXT DEFAULT 'pendente',
      admin_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      variation_type TEXT,
      variation_value TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variation_id INTEGER REFERENCES product_variations(id),
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reason TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      old_price REAL,
      new_price REAL NOT NULL,
      old_promo_price REAL,
      new_promo_price REAL,
      old_cost_price REAL,
      new_cost_price REAL,
      changed_by TEXT,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Geral',
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variations_product ON product_variations(product_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  `);

  // Migrações de colunas para bancos existentes
  try {
    const orderCols = db.prepare("PRAGMA table_info(orders)").all().map((c: any) => c.name);
    if (!orderCols.includes('payment_method')) {
      db.prepare("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'pendente'").run();
    }
    if (!orderCols.includes('payment_status')) {
      db.prepare("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pendente'").run();
    }

    const prodCols = db.prepare("PRAGMA table_info(products)").all().map((c: any) => c.name);
    if (!prodCols.includes('supplier')) {
      db.prepare("ALTER TABLE products ADD COLUMN supplier TEXT").run();
    }
  } catch {}

  // Always guarantee default admin user exists
  const defaultHash = '$2b$12$okUwDpH8OZyERrfx/UfJj./hLZUiu/QPe05ii5Fy5ytqmdhycnnOe';
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO admin_users (username, password_hash, name, role, active)
      VALUES (?, ?, ?, ?, 1)
    `).run('admin', defaultHash, 'Administrador Peixoto', 'admin');
  }

  // 1. Seed default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM store_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['store_name', 'Peixoto Semi Joias'],
      ['store_description', 'Catálogo de semijoias com acabamento sofisticado e garantia. Peças banhadas em ouro 18k e prata 925.'],
      ['whatsapp_number', process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5531995779163'],
      ['instagram', '@usePeixoto'],
      ['email', '@usePeixoto'],
      ['address', ''],
      ['about_text', 'A Peixoto Semi Joias oferece semijoias com acabamento refinado e garantia. Nossas peças recebem banho de alta qualidade em ouro 18k e prata 925, pensadas para acompanhar você com elegância em todos os momentos.'],
      ['shipping_info', 'Enviamos para todo o Brasil. Detalhes de envio e prazos são informados diretamente no atendimento via WhatsApp.'],
      ['return_policy', 'Solicitações de troca podem ser feitas em até 7 dias corridos após o recebimento da peça.'],
      ['warranty_info', 'Garantia de 6 meses no banho e defeitos de fabricação.'],
      ['banner_title', 'Catálogo Peixoto Semi Joias'],
      ['banner_subtitle', 'Conheça nossa seleção de peças com acabamento refinado'],
      ['banner_cta', 'Ver Catálogo'],
      ['meta_title', 'Peixoto Semi Joias | Catálogo Digital'],
      ['meta_description', 'Catálogo digital de semijoias Peixoto. Brincos, colares, anéis e pulseiras com finalização e atendimento direto pelo WhatsApp.'],
      ['low_stock_threshold', '3'],
    ];
    const insertSetting = db.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (?, ?)');
    const insertMany = db.transaction(() => {
      for (const [key, value] of defaultSettings) {
        insertSetting.run(key, value);
      }
    });
    insertMany();
  }

  // 2. Seed default categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const defaultCategories = [
      ['Brincos', 'brincos', 1],
      ['Colares', 'colares', 2],
      ['Anéis', 'aneis', 3],
      ['Pulseiras', 'pulseiras', 4],
      ['Conjuntos', 'conjuntos', 5]
    ];
    const insertCat = db.prepare('INSERT INTO categories (name, slug, sort_order, active, featured) VALUES (?, ?, ?, 1, 1)');
    const seedCategories = db.transaction(() => {
      for (const [name, slug, sort] of defaultCategories) {
        insertCat.run(name, slug, sort);
      }
    });
    seedCategories();
  }

  // 3. Seed default products if empty (Ensures catalog is never blank on Render or new deploys)
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (prodCount.count === 0) {
    const brincosCat = db.prepare("SELECT id FROM categories WHERE slug = 'brincos'").get() as { id: number } | undefined;
    const colaresCat = db.prepare("SELECT id FROM categories WHERE slug = 'colares'").get() as { id: number } | undefined;
    const aneisCat = db.prepare("SELECT id FROM categories WHERE slug = 'aneis'").get() as { id: number } | undefined;
    const pulseirasCat = db.prepare("SELECT id FROM categories WHERE slug = 'pulseiras'").get() as { id: number } | undefined;

    const initialProducts = [
      {
        name: 'BRINCO GOTA ZIRCÔNIA LUXO',
        slug: 'brinco-gota-zirconia-luxo',
        description: 'Brinco formato gota com micro zircônias e banho antialérgico.',
        sku: 'PX-BRI-001',
        category_id: brincosCat?.id ?? null,
        price: 149.90,
        cost_price: 45.00,
        materials: 'Banho Ouro 18k (10 milésimos)',
        promo_price: null,
        stock_quantity: 12,
        image_url: '/images/products/brinco-gota.jpg'
      },
      {
        name: 'COLAR PONTO DE LUZ VENEZIANA',
        slug: 'colar-ponto-de-luz-veneziana',
        description: 'Colar com corrente veneziana e pingente ponto de luz em zircônia cristal.',
        sku: 'PX-COL-002',
        category_id: colaresCat?.id ?? null,
        price: 149.90,
        cost_price: 48.00,
        materials: 'Banho Ouro 18k (10 milésimos)',
        promo_price: null,
        stock_quantity: 15,
        image_url: '/images/products/colar-ponto-de-luz.jpg'
      },
      {
        name: 'ANEL SOLITÁRIO CRAVEJADO',
        slug: 'anel-solitario-cravejado',
        description: 'Anel solitário clássico com aro cravejado e pedra central lapidada.',
        sku: 'PX-ANE-003',
        category_id: aneisCat?.id ?? null,
        price: 54.90,
        cost_price: 18.00,
        materials: 'Banho Ródio Branco com micro zircônias',
        promo_price: null,
        stock_quantity: 20,
        image_url: '/images/products/anel-solitario.jpg'
      },
      {
        name: 'PULSEIRA RIVIERA CRISTAIS',
        slug: 'pulseira-riviera-cristais',
        description: 'Pulseira estilo riviera articulada com cristais cravejados individualmente.',
        sku: 'PX-PUL-004',
        category_id: pulseirasCat?.id ?? null,
        price: 89.90,
        cost_price: 28.00,
        materials: 'Banho Prata 925 com zircônias',
        promo_price: null,
        stock_quantity: 8,
        image_url: '/images/products/pulseira-riviera.jpg'
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (name, slug, description, sku, category_id, price, cost_price, materials, promo_price, stock_quantity, published, featured, is_new, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?)
    `);
    const insertImg = db.prepare(`
      INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
      VALUES (?, ?, ?, 0, 1)
    `);

    const seedProducts = db.transaction(() => {
      let sort = 1;
      for (const p of initialProducts) {
        const res = insertProd.run(
          p.name, p.slug, p.description, p.sku, p.category_id, p.price, p.cost_price || 35.0, p.materials || 'Banho Ouro 18k hipoalergênico', p.promo_price, p.stock_quantity, sort++
        );
        const productId = res.lastInsertRowid;
        insertImg.run(productId, p.image_url, p.name);
      }
    });
    seedProducts();
  }
}

// Helper to get a setting
export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM store_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

// Helper to get all settings
export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// Helper to update settings
export function updateSettings(settings: Record<string, string>) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO store_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const updateMany = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, value);
    }
  });
  updateMany();
}

// Generate order number
export function generateOrderNumber(): string {
  const db = getDb();
  const now = new Date();
  const prefix = `PX${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastOrder = db.prepare(
    "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}%`) as { order_number: string } | undefined;

  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.order_number.slice(prefix.length), 10);
    sequence = lastSeq + 1;
  }
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
