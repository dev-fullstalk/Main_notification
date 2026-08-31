const { Client } = require('pg');

async function test() {
  const ports = [5432, 5433];
  const users = ['postgres', 'admin'];
  const passwords = ['postgres', 'admin', 'Cpi2026!', 'root', '123456', '12345678', ''];
  const databases = ['postgres', 'terax_database'];

  for (const port of ports) {
    for (const user of users) {
      for (const password of passwords) {
        for (const database of databases) {
          const client = new Client({
            host: '127.0.0.1',
            port,
            user,
            password,
            database,
            connectionTimeoutMillis: 1000
          });
          try {
            await client.connect();
            console.log(`CONNECTED SUCCESS: port=${port}, user=${user}, password=${password}, database=${database}`);
            await client.end();
            return { port, user, password, database };
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }
  console.log('No direct credentials matched.');
}

test();
