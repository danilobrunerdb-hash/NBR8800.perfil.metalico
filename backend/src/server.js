const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

// Importação das rotas
const calcularRoutes = require('./routes/calcular');

// Middlewares
app.use(cors()); // Permite o Frontend Vite (localhost:5173) acessar esta API
app.use(express.json()); // Habilita o parseamento do body das requisições em formato JSON

// Registro das rotas principais
app.use('/api', calcularRoutes);

// Inicia o servidor HTTP do Backend
app.listen(port, () => {
  console.log(`🚀 Backend de Engenharia rodando em http://localhost:${port}`);
});
