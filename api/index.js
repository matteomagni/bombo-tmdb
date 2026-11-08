const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TMDB_KEY = '31b49a1e712c418bf23c6a72c77d4693';

// Middleware per abilitare CORS (necessario per far leggere l'add-on a Stremio)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// 1. Manifest dell'Add-on con le 3 righe
const manifest = {
  id: 'org.bombo.tmdb',
  version: '1.0.0',
  name: 'BomboTMDB',
  description: 'Cataloghi d\'Autore personalizzati: Festival, Cinema Europeo e Documentari.',
  resources: ['catalog'],
  types: ['movie'],
  catalogs: [
    { type: 'movie', id: 'bombo_festival', name: '🏛️ Festival & Autore' },
    { type: 'movie', id: 'bombo_europeo', name: '🇪🇺 Cinema Europeo' },
    { type: 'movie', id: 'bombo_documentari', name: '📽️ Documentari d\'Autore' }
  ]
};

// Rotta per il Manifest
app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

// Rotta principale per l'apertura del sito
app.get('/', (req, res) => {
  res.send('Add-on BomboTMDB per Stremio attivo! Usa /manifest.json per installarlo.');
});

// 2. Gestione dei cataloghi e delle tue Query TMDB
app.get('/catalog/movie/:id.json', async (req, res) => {
  const catalogId = req.params.id;
  let queryParams = '';

  if (catalogId === 'bombo_festival') {
    queryParams = 'vote_average.gte=7.4&vote_count.gte=80&with_keywords=3385|10183|3384|10610|10609|10608|265814|222243&sort_by=primary_release_date.desc';
  } else if (catalogId === 'bombo_europeo') {
    queryParams = 'vote_average.gte=7.4&vote_count.gte=80&with_origin_country=FR|IT|DE|ES|GB|DK|SE|NO|PL|BE|NL|GR|PT|AT|CH|IE&sort_by=primary_release_date.desc';
  } else if (catalogId === 'bombo_documentari') {
    queryParams = 'with_genres=99&vote_average.gte=7.4&vote_count.gte=80&sort_by=primary_release_date.desc';
  } else {
    return res.json({ metas: [] });
  }

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=it-IT&${queryParams}`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!data.results) return res.json({ metas: [] });

    const metas = data.results.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: 'movie',
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      description: movie.overview || 'Nessuna trama disponibile.'
    }));

    res.json({ metas });
  } catch (error) {
    console.error(error);
    res.json({ metas: [] });
  }
});

module.exports = app;