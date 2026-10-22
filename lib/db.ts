import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'peixoto.db');

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

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_variations_product ON product_variations(product_id);
  `);

  // Seed default settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM store_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['store_name', 'Peixoto Semi Joias'],
      ['store_description', 'Semijoias exclusivas com design sofisticado e elegante. Peças que valorizam a sua beleza com qualidade e estilo.'],
      ['whatsapp_number', process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999'],
      ['instagram', '@peixotosemijoias'],
      ['email', 'contato@peixotosemijoias.com.br'],
      ['address', ''],
      ['about_text', 'A Peixoto Semi Joias nasceu do amor por acessórios que fazem a diferença. Cada peça é cuidadosamente selecionada para oferecer sofisticação, qualidade e estilo a preços acessíveis. Nossas semijoias são banhadas a ouro 18k, com garantia de durabilidade e brilho duradouro.'],
      ['shipping_info', 'Enviamos para todo o Brasil. Consulte prazos e valores pelo WhatsApp.'],
      ['return_policy', 'Aceitamos trocas em até 7 dias após o recebimento, desde que a peça esteja em perfeitas condições e na embalagem original.'],
      ['warranty_info', 'Todas as nossas peças possuem garantia de 6 meses contra defeitos de fabricação.'],
      ['banner_title', 'Coleção Exclusiva'],
      ['banner_subtitle', 'Descubra peças que combinam sofisticação e elegância para todos os momentos'],
      ['banner_cta', 'Explorar Coleção'],
      ['meta_title', 'Peixoto Semi Joias | Semijoias Exclusivas'],
      ['meta_description', 'Loja online de semijoias exclusivas. Brincos, colares, anéis, pulseiras e conjuntos com design sofisticado e qualidade premium.'],
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
