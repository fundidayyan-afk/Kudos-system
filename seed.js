const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./index');

const DEMO_USERS = [
  { name: 'Alice Nguyen', email: 'alice@datacom.test', password: 'Password123!', role: 'user' },
  { name: 'Ben Carter', email: 'ben@datacom.test', password: 'Password123!', role: 'user' },
  { name: 'Chloe Davis', email: 'chloe@datacom.test', password: 'Password123!', role: 'user' },
  { name: 'Dev Patel', email: 'dev@datacom.test', password: 'Password123!', role: 'user' },
  { name: 'Admin Amy', email: 'admin@datacom.test', password: 'AdminPass123!', role: 'admin' },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, role, is_active)
  VALUES (?, ?, ?, ?, ?, 1)
`);

const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();

if (existing.count > 0) {
  console.log('Users already exist — skipping seed. Delete kudos.db to reseed.');
  process.exit(0);
}

for (const u of DEMO_USERS) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(randomUUID(), u.name, u.email, hash, u.role);
}

console.log('Seeded demo users:');
DEMO_USERS.forEach((u) => console.log(`  ${u.role.padEnd(5)} | ${u.email} | ${u.password}`));
