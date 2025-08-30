// Arquivo: netlify/functions/data.js

import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTableExists() {
  await pool.query(`CREATE TABLE IF NOT EXISTS movie_data (id INT PRIMARY KEY DEFAULT 1, data JSONB);`);
}

export default async (req, context) => {
  try {
    await ensureTableExists();

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT data FROM movie_data WHERE id = 1');
      const responseData = rows[0]?.data || { movies: [], ratings: { "Maná": {}, "Mandinha": {} } };
      return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const suppliedPassword = body.password;
      const correctPassword = process.env.SITE_PASSWORD;

      if (!correctPassword || suppliedPassword !== correctPassword) {
        return new Response(JSON.stringify({ message: 'Senha incorreta.' }), { status: 401 });
      }

      // Se a ação for APENAS verificar a senha, responda com sucesso e pare aqui.
      if (body.action === 'verify_password') {
        return new Response(JSON.stringify({ message: 'Senha correta' }), { status: 200 });
      }
      
      // Se for uma ação de salvar, continue para salvar os dados
      if (body.data) {
        await pool.query({
          text: `INSERT INTO movie_data (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`,
          values: [JSON.stringify(body.data)],
        });
        return new Response(JSON.stringify({ message: 'Dados salvos com sucesso!' }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ message: 'Método não permitido ou dados inválidos' }), { status: 400 });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ message: 'Erro interno no servidor', error: error.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/data"
};
