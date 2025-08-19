const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/usuario', (req, res) => {
    db.query('SELECT * FROM usuario', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/usuario/:cliente_id', (req, res) => {
    const { cliente_id } = req.params;
    db.query('SELECT * FROM usuario WHERE cliente_id = ?', [cliente_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Usuário não encontrado" });
        res.json(results[0]);
    });
});

app.post('/usuario', (req, res) => {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: "Nome e email são obrigatórios" });

    db.query('INSERT INTO usuario (nome, email) VALUES (?, ?)', [nome, email], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!!', id: result.insertId });
    });
});

app.get('/livro', (req, res) => {
    db.query('SELECT * FROM livro', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/livro', (req, res) => {
    const { titulo, autor, categoria, ano_public } = req.body;
    if (!titulo || !autor || !categoria) return res.status(400).json({ error: "Título, autor e categoria são obrigatórios" });

    db.query(
        'INSERT INTO livro (titulo, autor, categoria, ano_public) VALUES (?, ?, ?, ?)',
        [titulo, autor, categoria, ano_public],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Livro cadastrado com sucesso!!', id: result.insertId });
        }
    );
});

app.get('/emprestimos', (req, res) => {
    const sql = `
        SELECT e.empre_id, u.nome AS usuario, l.titulo AS livro, 
               e.data_emprestimo, e.data_prevista, e.status
        FROM emprestimos e
        JOIN usuario u ON e.cliente_id = u.cliente_id
        JOIN livro l ON e.livro_id = l.livro_id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const hoje = new Date();
        const emprestimosAtualizados = [];

        results.forEach(e => {
            if (e.status === "ativo" && new Date(e.data_prevista) < hoje) {
                e.status = "atrasado";
                db.query('UPDATE emprestimos SET status = ? WHERE empre_id = ?', ["atrasado", e.empre_id]);
            }
            emprestimosAtualizados.push(e);
        });

        res.json(emprestimosAtualizados);
    });
});

app.post('/emprestimos', (req, res) => {
    const { cliente_id, livro_id, data_emprestimo, data_prevista, status } = req.body;
    if (!cliente_id || !livro_id || !data_emprestimo || !data_prevista) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    const statusFinal = status || 'ativo';

    db.query(
        'INSERT INTO emprestimos (cliente_id, livro_id, data_emprestimo, data_prevista, status) VALUES (?, ?, ?, ?, ?)',
        [cliente_id, livro_id, data_emprestimo, data_prevista, statusFinal],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Seu Empréstimo foi registrado com sucesso!!', id: result.insertId });
        }
    );
});

app.put('/emprestimos/:id/status', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!["ativo", "atrasado", "devolvido"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
    }

    db.query(
        'UPDATE emprestimos SET status = ? WHERE empre_id = ?',
        [status, id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Status atualizado com sucesso' });
        }
    );
});

app.delete('/emprestimos/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM emprestimos WHERE empre_id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Empréstimo excluído com sucesso' });
    });
});

app.listen(PORT, () => {
    console.log(` Servidor rodando na porta ${PORT}`);
});
