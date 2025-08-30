// Arquivo: netlify/functions/data.js

import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movie_data (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB
    );
  `);
}

export default async (req, context) => {
  try {
    await ensureTableExists();

    // LEITURA DE DADOS (GET) - continua público, sem senha
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT data FROM movie_data WHERE id = 1');
      const responseData = rows[0]?.data || { movies: [], ratings: { "Maná": {}, "Mandinha": {} } };
      return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });
    }

    // ALTERAÇÃO DE DADOS (POST) - agora requer senha
    if (req.method === 'POST') {
      // --- NOSSO "SEGURANÇA" ESTÁ AQUI ---
      const suppliedPassword = req.headers.get('x-auth-password'); // Pega a senha enviada pelo frontend
      const correctPassword = process.env.SITE_PASSWORD; // Pega a senha secreta do Netlify

      if (!correctPassword || suppliedPassword !== correctPassword) {
        // Se a senha estiver errada ou não for fornecida, retorna um erro de "Não Autorizado"
        return new Response(JSON.stringify({ message: 'Senha incorreta ou não fornecida.' }), { status: 401 });
      }
      // --- FIM DA VERIFICAÇÃO ---

      // Se a senha estiver correta, o código continua normalmente...
      const body = await req.json();
      await pool.query({
        text: `INSERT INTO movie_data (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`,
        values: [JSON.stringify(body)],
      });
      return new Response(JSON.stringify({ message: 'Dados salvos com sucesso!' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Método não permitido' }), { status: 405 });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ message: 'Erro interno no servidor', error: error.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/data"
};
