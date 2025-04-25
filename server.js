require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = new sqlite3.Database('./cadastros.db', (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Conectado ao banco de dados.');
});

db.run(`
    CREATE TABLE IF NOT EXISTS cadastros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        sobrenome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        telefone TEXT,
        senha TEXT NOT NULL
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS filmes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        ano INTEGER NOT NULL,
        diretor TEXT NOT NULL
    )
`);

const schemaCadastro = Joi.object({
    nome: Joi.string().pattern(new RegExp('^[A-Za-zÀ-ÖØ-öø-ÿ\\s]+$')).required().messages({
        'string.base': `Nome deve ser uma string`,
        'string.empty': `Nome não pode estar vazio`,
        'string.pattern.base': `Nome deve conter apenas caracteres alfabéticos, acentuados e espaços`
    }),
    sobrenome: Joi.string().pattern(new RegExp('^[A-Za-zÀ-ÖØ-öø-ÿ\\s]+$')).required().messages({
        'string.base': `Sobrenome deve ser uma string`,
        'string.empty': `Sobrenome não pode estar vazio`,
        'string.pattern.base': `Sobrenome deve conter apenas caracteres alfabéticos, acentuados e espaços`
    }),
    email: Joi.string().email().required().messages({
        'string.email': `E-mail deve ser um email válido`,
        'string.empty': `E-mail não pode estar vazio`
    }),
    telefone: Joi.string().pattern(new RegExp('^[0-9]*$')).allow('').optional().messages({
        'string.pattern.base': `Telefone deve conter apenas números`
    }),
    senha: Joi.string().pattern(new RegExp('^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{8,}$')).required().messages({
        'string.pattern.base': `Senha deve ter pelo menos 8 caracteres, incluir uma letra maiúscula, um número e um caractere especial (!@#$&*)`
    })
});

const schemaFilme = Joi.object({
    titulo: Joi.string().required().messages({
        'string.base': `Título deve ser uma string`,
        'string.empty': `Título não pode estar vazio`,
    }),
    descricao: Joi.string().required().messages({
        'string.base': `Descrição deve ser uma string`,
        'string.empty': `Descrição não pode estar vazio`,
    }),
    ano: Joi.number().integer().min(0).max(new Date().getFullYear()).strict().required().messages({
        'integer.base': `Ano deve ser um número`,
        'integer.empty': `Ano não pode estar vazio`,
    }),
    diretor: Joi.string().required().messages({
        'string.base': `Diretor deve ser uma string`,
        'string.empty': `Diretor não pode estar vazio`,
    })
});

app.get('/usuario/id/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT id, nome, email FROM cadastros WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao buscar o usuário.' });
        }
        if (row) {
            return res.status(200).json(row);
        } else {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
    });
});

app.get('/usuario/email/:email', (req, res) => {
    const email = req.params.email;
    db.get("SELECT id, nome, email FROM cadastros WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao buscar o usuário.' });
        }
        if (row) {
            return res.status(200).json(row);
        } else {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
    });
});

app.post('/cadastro', async (req, res) => {
    try {
        const value = await schemaCadastro.validateAsync(req.body);
        const { nome, sobrenome, email, telefone, senha } = value;

        db.get(`SELECT * FROM cadastros WHERE email = ?`, [email], (err, row) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Erro no servidor.' });
            }
            if (row) {
                return res.status(400).json({ message: 'Este email já está cadastrado.' });
            }

            db.run(`INSERT INTO cadastros (nome, sobrenome, email, telefone, senha) VALUES (?, ?, ?, ?, ?)`,
                [nome, sobrenome, email, telefone, senha],
                (err) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ message: 'Erro ao salvar o cadastro.' });
                    }
                    res.status(200).json({ message: 'Cadastro realizado com sucesso!' });
                }
            );
        });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.details[0].message });
    }
});

app.post('/cadastro/filmes', async (req, res) => {
    try {
        const value = await schemaFilme.validateAsync(req.body);
        const { titulo, descricao, ano, diretor } = value;

        db.run(`INSERT INTO filmes (titulo, descricao, ano, diretor) VALUES (?, ?, ?, ?)`,
            [titulo, descricao, ano, diretor],
            function(err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: 'Erro ao cadastrar o filme.' });
                }
                res.status(200).json({ message: 'Filme cadastrado com sucesso!', id: this.lastID });
            }
        );
    } catch (err) {
        return res.status(400).json({ message: err.details[0].message });
    }
});

app.get('/busca/:titulo', (req, res) => {
    const titulo = `%${req.params.titulo}%`;
    db.all("SELECT id, titulo, descricao, ano, diretor FROM filmes WHERE titulo LIKE ? COLLATE NOCASE", [titulo], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao buscar filmes.' });
        }
        if (rows && rows.length > 0) {
            return res.status(200).json(rows);
        } else {
            return res.status(404).json({ message: 'Nenhum filme encontrado com esse título.' });
        }
    });
});

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: "API Golden Movie Studio",
            version: "1.0.0",
            description: `API para gerenciamento de usuários e filmes da Golden Movie Studio (GMS).
            Esta API permite a manipulação de informações de filmes e usuários, incluindo cadastro, atualização e busca.
            UrlBase: http://localhost:3000`,

            contact: {
                name: "Suporte GMS",
                email: "suporte@gms.com"
            },
            servers: [{ url: "http://localhost:3000" }]
        },
        tags: [
            {
                name: 'Usuários',
                description: 'Operações de gerenciamento de usuários'
            },
            {
                name: 'Filmes',
                description: 'Operações relacionadas a filmes'
            }
        ],
        components: {
            schemas: {
                Filme: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            description: "Identificador único do filme."
                        },
                        titulo: {
                            type: "string",
                            description: "Título do filme."
                        },
                        descricao: {
                            type: "string",
                            description: "Descrição breve do filme."
                        },
                        ano: {
                            type: "integer",
                            description: "Ano de lançamento do filme."
                        },
                        diretor: {
                            type: "string",
                            description: "Diretor do filme."
                        }
                    }
                },
                Usuario: {
                    type: "object",
                    required: ["nome", "sobrenome", "email", "senha"],
                    properties: {
                        nome: {
                            type: "string",
                            description: "Primeiro nome do usuário."
                        },
                        sobrenome: {
                            type: "string",
                            description: "Sobrenome do usuário."
                        },
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email do usuário, usado para login."
                        },
                        telefone: {
                            type: "string",
                            description: "Telefone do usuário, opcional para contato."
                        },
                        senha: {
                            type: "string",
                            description: "Senha do usuário para acesso ao sistema."
                        }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Descrição detalhada do erro ocorrido."
                        }
                    }
                }
            }
        }
    },
    apis: ["server.js"]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, HOST, () => {
    const RESET = "\x1b[0m";
    const GREEN = "\x1b[32m";
    const YELLOW = "\x1b[33m"
    console.log(`${GREEN}**Servidor rodando em http://${HOST}:${PORT}${RESET}`);
    console.log(`${YELLOW}**Documentação em http://${HOST}:${PORT}/api-docs${RESET}`);
});

/**
 * @swagger
 * /cadastro:
 *   post:
 *     tags: [Usuários]
 *     summary: Registra um novo usuário
 *     description: Cria um novo usuário no sistema com os dados fornecidos. Garante que o email não esteja duplicado e valida o formato dos dados conforme as regras especificadas.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *           example:
 *             nome: "Alice"
 *             sobrenome: "Johnson"
 *             email: "alice@teste.com"
 *             telefone: "1122334455"
 *             senha: "Password@123"
 *     responses:
 *       200:
 *         description: Cadastro realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *             example:
 *               id: 1
 *               nome: "Alice"
 *               sobrenome: "Johnson"
 *               email: "alice@teste.com"
 *               telefone: "1122334455"
 *               senha: "Password@123"
 *       400:
 *         description: Erro na validação dos dados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 summary: Missing fields
 *                 value:
 *                   message: "Todos os campos obrigatórios devem ser preenchidos."
 *               invalidEmail:
 *                 summary: Invalid email format
 *                 value:
 *                   message: "O formato do email é inválido."
 *       500:
 *         description: Erro interno no servidor
 */

/**
 * @swagger
 * /usuario/id/{id}:
 *   get:
 *     tags: [Usuários]
 *     summary: Busca um usuário pelo ID
 *     description: Retorna detalhes do usuário especificado pelo ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: O ID do usuário a ser buscado
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro no servidor
 *
 * @swagger
 * /usuario/email/{email}:
 *   get:
 *     tags: [Usuários]
 *     summary: Busca um usuário pelo e-mail
 *     description: Retorna detalhes do usuário especificado pelo e-mail.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: O e-mail do usuário a ser buscado
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro no servidor
 */

/**
 * @swagger
 * /busca/{titulo}:
 *   get:
 *     tags: [Filmes]
 *     summary: Busca um filme
 *     description: Retorna uma lista de filmes baseada no termo de busca fornecido.
 *     parameters:
 *       - in: path
 *         name: titulo
 *         required: true
 *         schema:
 *           type: string
 *         description: Título do filme a ser buscado
 *     responses:
 *       200:
 *         description: Busca realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Filme'
 *       404:
 *         description: Filme não encontrado
 */

/**
 * @swagger
 * /cadastro/filmes:
 *   post:
 *     tags: [Filmes]
 *     summary: Registra um novo filme
 *     description: Cria um novo filme no sistema com os dados fornecidos. 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Filme'
 *           example:
 *             titulo: "A Era do Gelo 3"
 *             descricao: "Depois que Sid rouba alguns ovos de dinossauro, Manny, Diego e o resto de seus amigos pré-históricos entram em um mundo misterioso e subterrâneo para resgatar Sid."
 *             ano: 2009
 *             diretor: "Carlos Saldanha"
 *     responses:
 *       200:
 *         description: Cadastro realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Filme'
 *       400:
 *         description: Erro na validação dos dados
 *       500:
 *         description: Erro interno no servidor
 */