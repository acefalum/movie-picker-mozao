import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function getGroupId(groupName) {
  if (groupName === 'group_one') return 1;
  if (groupName === 'group_two') return 2;
  return null;
}

async function ensureTableExists() {
  await pool.query(`CREATE TABLE IF NOT EXISTS movie_data (id INT PRIMARY KEY, data JSONB);`);
}

export default async (req, context) => {
  try {
    await ensureTableExists();
    
    // Para requisições GET, o corpo pode não existir
    const body = req.method === 'POST' ? await req.json() : {};

    if (req.method === 'POST' && body.action === 'verify_password') {
      const { password } = body;
      const passOne = process.env.SITE_PASSWORD;
      const passTwo = process.env.OTHER_KEY;

      if (password === passOne) {
        return new Response(JSON.stringify({ success: true, group: 'group_one', users: ['Maná', 'Mandinha'] }), { status: 200 });
      }
      if (password === passTwo) {
        return new Response(JSON.stringify({ success: true, group: 'group_two', users: ['Marcelo', 'Isabela'] }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: false, message: 'Senha incorreta.' }), { status: 401 });
    }

    const group = req.headers.get('x-user-group');
    const groupId = getGroupId(group);
    if (!groupId) return new Response(JSON.stringify({ message: 'Grupo inválido.' }), { status: 400 });

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT data FROM movie_data WHERE id = $1', [groupId]);
      const responseData = rows[0]?.data || { movies: [], ratings: {} };
      return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { password, data } = body;
      const passOne = process.env.SITE_PASSWORD;
      const passTwo = process.env.OTHER_KEY;
      const isAuthorized = (password === passOne && group === 'group_one') || (password === passTwo && group === 'group_two');

      if (!isAuthorized) {
        return new Response(JSON.stringify({ message: 'Não autorizado.' }), { status: 401 });
      }

      await pool.query({
        text: `INSERT INTO movie_data (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`,
        values: [groupId, JSON.stringify(data)],
      });
      return new Response(JSON.stringify({ message: 'Dados salvos com sucesso!' }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'Requisição inválida.' }), { status: 400 });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ message: 'Erro interno no servidor', error: error.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/data"
};
