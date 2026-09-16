import { initializeDatabase, getDb } from './db/database.js';

async function checkSQLite() {
  console.log('==============================================');
  console.log('       SQLITE DATABASE CONNECTION STATUS      ');
  console.log('==============================================\n');

  await initializeDatabase();
  const db = getDb();

  console.log('✅ SQLite Connection: ACTIVE & CONNECTED\n');

  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log('📁 SQLite Tables Found:');
  for (const t of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get()?.count || 0;
    console.log(`   • ${t.name.padEnd(18)} : ${count} records`);
  }

  // Show demo student
  const student = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE email = 'demo@studybuddy.com'").get();
  console.log('\n🧑‍🎓 Student Account in SQLite:');
  console.log(`   Name  : ${student?.name}`);
  console.log(`   Email : ${student?.email}`);
  console.log(`   Role  : ${student?.role}`);

  // Show admin
  const admin = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE email = 'admin@studybuddy.com'").get();
  console.log('\n👨‍💼 Admin Account in SQLite:');
  console.log(`   Name  : ${admin?.name}`);
  console.log(`   Email : ${admin?.email}`);
  console.log(`   Role  : ${admin?.role}`);

  console.log('\n==============================================');
  console.log('SQLite database file: server/db/studybuddy.db');
  console.log('==============================================\n');
}

checkSQLite().catch(console.error);
