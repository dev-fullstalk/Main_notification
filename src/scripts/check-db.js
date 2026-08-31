const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'terax_database',
  options: '-c search_path=notification',
});

async function main() {
  const chans = await pool.query(`
    SELECT c.id, c.name, cp.name as platform, c.is_active 
    FROM channels c 
    JOIN channels_platforms cp ON c.id__channels_platforms = cp.id
  `);
  console.log('--- CHANNELS IN DB ---');
  console.table(chans.rows);

  const convs = await pool.query(`
    SELECT conv.id, conv.contact_id, cont.name as contact_name, conv.last_message_preview, conv.last_message_at
    FROM conversations conv
    JOIN contacts cont ON conv.contact_id = cont.id
  `);
  console.log('--- CONVERSATIONS IN DB ---');
  console.table(convs.rows);

  const msgs = await pool.query(`
    SELECT id, conversation_id, content, id__messages_sender_types, created_at
    FROM messages
  `);
  console.log('--- MESSAGES IN DB ---');
  console.table(msgs.rows);

  await pool.end();
}

main().catch(console.error);
