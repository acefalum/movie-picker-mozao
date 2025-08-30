// Arquivo: netlify/functions/data.js

import { neon } from '@netlify/neon';

// Esta função garante que a tabela para guardar nossos dados exista
async function ensureTableExists(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS movie_data (
      id INT PRIMARY KEY DEFAULT 1,
      data JSONB
    );
  `;
}

export default async (req, context) => {
  try {
    const sql = neon();
    await ensureTableExists(sql);

    // SE O PEDIDO FOR PARA "BUSCAR" DADOS (GET)
    if (req.method === 'GET') {
      let [result] = await sql`SELECT data FROM movie_data WHERE id = 1`;

      // Se não houver nada no banco de dados ainda, retorna uma estrutura vazia
      if (!result) {
        const emptyData = { movies: [], ratings: { "Maná": {}, "Mandinha": {} } };
        return new Response(JSON.stringify(emptyData), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify(result.data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SE O PEDIDO FOR PARA "SALVAR" DADOS (POST)
    if (req.method === 'POST') {
      const body = await req.json();

      // Este comando insere ou atualiza o registro único onde guardamos todos os dados
      await sql`
        INSERT INTO movie_data (id, data) 
        VALUES (1, ${JSON.stringify(body)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `;

      return new Response(JSON.stringify({ message: 'Dados salvos com sucesso!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Se o método não for GET ou POST
    return new Response(JSON.stringify({ message: 'Método não permitido' }), { status: 405 });

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ message: 'Erro interno no servidor' }), { status: 500 });
  }
};

export const config = {
  path: "/api/data"
};