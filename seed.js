// seed.js - Jalankan sekali untuk generate 100 user dummy
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seedUsers() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'threatlens'
  });

  console.log('🔄 Menghapus data user dummy lama (kecuali admin)...');
  await db.query("DELETE FROM users WHERE role = 'user' AND email LIKE '%@threatlens.com'");
  
  const users = [];
  const firstNames = [
    'Cyber', 'Net', 'Threat', 'Security', 'Data', 'Malware', 'Phish', 'Virus', 'Fire', 'Packet',
    'Dark', 'Byte', 'Cipher', 'Ghost', 'Hex', 'Intrusion', 'Java', 'Kernel', 'Logic', 'Payload',
    'Query', 'Root', 'Shell', 'Zero', 'Anti', 'Block', 'Crash', 'Defend', 'Evil', 'Guard',
    'Hack', 'Info', 'Jump', 'Key', 'Lock', 'Monitor', 'Node', 'Open', 'Proxy', 'Quick',
    'Reverse', 'Stack', 'Trace', 'User', 'Virtual', 'Web', 'Xray', 'Yellow', 'Zip', 'Alpha'
  ];
  
  const lastNames = [
    'Hunter', 'Guardian', 'Tracker', 'Probe', 'Shield', 'Catcher', 'Detector', 'Slayer', 'Wall', 'Sniffer',
    'Hound', 'Knight', 'Master', 'Ranger', 'Seeker', 'Sentry', 'Stalker', 'Vigil', 'Watcher', 'Weaver',
    'Agent', 'Buster', 'Crusher', 'Defender', 'Eradicator', 'Fighter', 'Gunner', 'Hammer', 'Invader', 'Jumper',
    'Killer', 'Lancer', 'Mercenary', 'Nemesis', 'Officer', 'Patrol', 'Raider', 'Sentinel', 'Tactician', 'Unit',
    'Vanguard', 'Warrior', 'Xpert', 'Yager', 'Zealot', 'Ace', 'Blade', 'Commander', 'Dragoon', 'Elite'
  ];

  const categories = ['Phishing', 'Malware', 'DDoS', 'Ransomware', 'Spam', 'Data Breach'];
  const bioTemplates = [
    'Expert threat hunter with {years}+ years experience',
    'Cybersecurity researcher specializing in {category}',
    'Bug bounty hunter and security analyst',
    'Former {category} incident responder',
    'Open source threat intelligence contributor',
    'Digital forensics and incident response professional'
  ];

  console.log('🔄 Membuat 100 user dummy...');

  for (let i = 0; i < 100; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const username = `${firstName}${lastName}${Math.floor(i / 10) + 1}`;
    const email = `${username.toLowerCase()}@threatlens.com`;
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Reputasi: top 10 tinggi, sisanya variatif
    let reputation;
    if (i < 5) reputation = 5000 - (i * 300);      // Top 5: 5000, 4700, 4400, 4100, 3800
    else if (i < 20) reputation = 3000 - ((i - 5) * 150); // Rank 6-20: 2850 - 750
    else reputation = Math.floor(Math.random() * 700) + 50; // Sisanya: 50-750
    
    // Level akan dihitung otomatis berdasarkan reputation
    // Tidak perlu dimasukkan ke INSERT
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    const bioTemplate = bioTemplates[Math.floor(Math.random() * bioTemplates.length)];
    const bio = bioTemplate.replace('{years}', Math.floor(Math.random() * 10) + 1).replace('{category}', category);
    
    users.push([username, email, hashedPassword, 'user', reputation, bio, null]);
  }

  // Insert batch 100 user sekaligus (tanpa kolom level, xp, total_points)
  await db.query(`
    INSERT INTO users (username, email, password, role, reputation, bio, avatar) 
    VALUES ?
  `, [users]);

  console.log(`✅ Berhasil menambah ${users.length} user dummy!`);
  
  // Update level berdasarkan reputation
  await db.query(`
    UPDATE users SET level = FLOOR(reputation / 100) + 1 
    WHERE role = 'user' AND (level IS NULL OR level = 0)
  `);
  
  console.log('✅ Level users telah diupdate berdasarkan reputation!');
  
  // Tampilkan top 10
  const [topUsers] = await db.query(`
    SELECT username, reputation, level FROM users 
    WHERE role = 'user' 
    ORDER BY reputation DESC 
    LIMIT 10
  `);
  
  console.log('\n🏆 TOP 10 USER DUMMY:');
  topUsers.forEach((user, idx) => {
    console.log(`   ${idx+1}. ${user.username} - ${user.reputation} pts (Level ${user.level})`);
  });
  
  await db.end();
  console.log('\n✨ Selesai! Restart server dan buka leaderboard.');
}

seedUsers().catch(console.error);