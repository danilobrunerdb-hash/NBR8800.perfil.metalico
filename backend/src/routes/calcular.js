const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { calculateProfile } = require('../services/calculator');

// Lê a base de dados JSON (simulando um banco de dados real em memória)
const profilesPath = path.join(__dirname, '../data/profiles.json');
const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));

/**
 * Rota POST /api/calcular
 * Recebe o nome do perfil, os esforços atuantes e as propriedades do aço.
 * Realiza a verificação na NBR 8800 utilizando o serviço 'calculator'.
 * Retorna os dados geométricos e o relatório completo de status e capacidades (Mrd, Vrd).
 */
router.post('/calcular', (req, res) => {
  try {
    const { profileName, loads, material } = req.body;

    if (!profileName || !loads || !material) {
      return res.status(400).json({ error: 'Parâmetros incompletos enviados pelo cliente.' });
    }

    // Busca o perfil na "tabela de banco de dados"
    const selectedProfile = profilesData.find(p => p.nome === profileName);

    if (!selectedProfile) {
      return res.status(404).json({ error: 'Perfil metálico não encontrado na base de dados.' });
    }

    // Chama o serviço de cálculo (Lógica de Negócio isolada)
    const results = calculateProfile(
      selectedProfile,
      loads,
      material
    );

    // Retorna para o Frontend o perfil inteiro (com as geometrias para renderização) e os resultados matemáticos
    return res.status(200).json({
      profile: selectedProfile,
      results: results
    });

  } catch (err) {
    console.error('Erro no cálculo estrutural:', err);
    return res.status(500).json({ error: 'Erro interno no servidor ao processar o cálculo estrutural.' });
  }
});

/**
 * Rota GET /api/perfis
 * Rota auxiliar para popular a lista (combobox) no frontend
 */
router.get('/perfis', (req, res) => {
  // Retorna apenas os nomes ou os objetos inteiros se o front preferir
  res.status(200).json(profilesData);
});

module.exports = router;
