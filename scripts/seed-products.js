const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'peixoto.db');
const db = new Database(dbPath);

console.log('Seeding products and categories...');

// Seed categories
const categories = [
  { name: 'Brincos', slug: 'brincos', sort_order: 1 },
  { name: 'Colares', slug: 'colares', sort_order: 2 },
  { name: 'Anéis', slug: 'aneis', sort_order: 3 },
  { name: 'Pulseiras', slug: 'pulseiras', sort_order: 4 },
  { name: 'Conjuntos', slug: 'conjuntos', sort_order: 5 }
];

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO categories (name, slug, sort_order, active, featured)
  VALUES (?, ?, ?, 1, 1)
`);

for (const c of categories) {
  insertCategory.run(c.name, c.slug, c.sort_order);
}

// Fetch category ids
const brincosCat = db.prepare("SELECT id FROM categories WHERE slug = 'brincos'").get();
const colaresCat = db.prepare("SELECT id FROM categories WHERE slug = 'colares'").get();
const aneisCat = db.prepare("SELECT id FROM categories WHERE slug = 'aneis'").get();
const pulseirasCat = db.prepare("SELECT id FROM categories WHERE slug = 'pulseiras'").get();

const products = [
  {
    name: 'BRINCO GOTA ZIRCÔNIA LUXO',
    slug: 'brinco-gota-zirconia-luxo',
    description: 'Brinco gota cravejado com micro zircônias e banho em ouro 18k antialérgico.',
    sku: 'PX-BRI-001',
    category_id: brincosCat ? brincosCat.id : null,
    price: 149.90,
    promo_price: null,
    stock_quantity: 12,
    image_url: '/images/products/brinco-gota.jpg'
  },
  {
    name: 'COLAR PONTO DE LUZ VENEZIANA',
    slug: 'colar-ponto-de-luz-veneziana',
    description: 'Colar com corrente veneziana e pingente ponto de luz em zircônia cristal, banhado a ouro 18k.',
    sku: 'PX-COL-002',
    category_id: colaresCat ? colaresCat.id : null,
    price: 149.90,
    promo_price: null,
    stock_quantity: 15,
    image_url: '/images/products/colar-ponto-de-luz.jpg'
  },
  {
    name: 'ANEL SOLITÁRIO CRAVEJADO',
    slug: 'anel-solitario-cravejado',
    description: 'Anel solitário clássico com aro cravejado de zircônias e pedra central com brilho extraordinário.',
    sku: 'PX-ANE-003',
    category_id: aneisCat ? aneisCat.id : null,
    price: 54.90,
    promo_price: null,
    stock_quantity: 20,
    image_url: '/images/products/anel-solitario.jpg'
  },
  {
    name: 'PULSEIRA RIVIERA CRISTAIS',
    slug: 'pulseira-riviera-cristais',
    description: 'Pulseira estilo riviera flexível com cristais cravejados individualmente e banho ouro 18k.',
    sku: 'PX-PUL-004',
    category_id: pulseirasCat ? pulseirasCat.id : null,
    price: 89.90,
    promo_price: null,
    stock_quantity: 8,
    image_url: '/images/products/pulseira-riviera.jpg'
  }
];

const insertProduct = db.prepare(`
  INSERT INTO products (name, slug, description, sku, category_id, price, promo_price, stock_quantity, published, featured, is_new, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?)
`);

const insertImage = db.prepare(`
  INSERT INTO product_images (product_id, url, alt, sort_order, is_primary)
  VALUES (?, ?, ?, 0, 1)
`);

db.transaction(() => {
  // Clear old products if any
  db.prepare('DELETE FROM product_images').run();
  db.prepare('DELETE FROM products').run();

  let sort = 1;
  for (const p of products) {
    const res = insertProduct.run(
      p.name, p.slug, p.description, p.sku, p.category_id, p.price, p.promo_price, p.stock_quantity, sort++
    );
    const productId = res.lastInsertRowid;
    insertImage.run(productId, p.image_url, p.name);
  }
})();

console.log('Successfully seeded 4 showcase products and categories!');
