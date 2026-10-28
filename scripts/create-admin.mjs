import { writeFile, chmod, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { configuration, root } from '../server/app.mjs';
import { openStore, passwordHash, email } from '../server/store.mjs';

const config = configuration();
const store = openStore(config.databasePath, config);
try {
  const address = email(process.argv[2] || 'admin@aurora-atlas.local');
  if (store.db.prepare('SELECT id FROM admins WHERE email=?').get(address)) throw new Error('This administrator already exists. Existing passwords are never overwritten.');
  const credentials = resolve(root, '.data/admin-credentials.txt');
  await stat(credentials).then(() => { throw new Error('A credentials file already exists. Keep it private and move it before creating another administrator.'); }, (error) => { if (error.code !== 'ENOENT') throw error; });
  const password = randomBytes(24).toString('base64url');
  await writeFile(credentials, `Aurora Atlas local administrator\nURL: ${config.publicUrl}/admin.html\nEmail: ${address}\nPassword: ${password}\n\nKeep this file private. It is excluded from Git and cannot be served by the website.\n`, { mode: 0o600, flag: 'wx' });
  store.db.prepare('INSERT INTO admins VALUES(?,?,?)').run(randomUUID(), address, passwordHash(password));
  await chmod(credentials, 0o600);
  console.log(`Administrator created. Credentials saved to ${credentials}`);
} finally { store.close(); }
