// Arquivo: netlify/functions/data.js

import { Pool } from '@neondatabase/serverless';

async function ensureTableExists(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movie_data (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB
    );
  `);
}

export default async (req, context) => {
  // Inicializa a conexão com o banco de dados usando a variável de ambiente
  const pool = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL });

  try {
    await ensureTableExists(pool);

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT data FROM movie_data WHERE id = 1');
      
      const responseData = rows[0]?.data || { movies: [], ratings: { "Maná": {}, "Mandinha": {} } };

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      await pool.query({
        text: `INSERT INTO movie_data (id, data) VALUES (1, $1)
               ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;`,
        values: [JSON.stringify(body)],
      });
      
      return new Response(JSON.stringify({ message: 'Dados salvos com sucesso!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Método não permitido' }), { status: 405 });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ message: 'Erro interno no servidor', error: error.message }), { status: 500 });
  } finally {
    // Importante: fecha a conexão ao final da execução
    await pool.end();
  }
};

export const config = {
  path: "/api/data"
};
