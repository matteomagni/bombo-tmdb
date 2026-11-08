const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TMDB_KEY = process.env.TMDB_KEY;

// Middleware CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

const manifest = {
  id: 'org.bombo.tmdb',
  version: '1.0.1',
  name: 'BomboTMDB',
  description: 'Cataloghi d\'Autore personalizzati: Festival, Cinema Europeo e Documentari.',
  resources: ['catalog'],
  types: ['movie'],
  catalogs: [
    { type: 'movie', id: 'bombo_autore', name: '🏛️ Cinema d\'Autore' },
    { type: 'movie', id: 'bombo_europeo', name: '🇪🇺 Cinema Europeo' },
    { type: 'movie', id: 'bombo_documentari', name: '📽️ Documentari' }
  ]
};

app.get('/manifest.json', (req, res) => {
  res.json(manifest);
});

app.get('/', (req, res) => {
  res.send('Add-on BomboTMDB per Stremio attivo e funzionante!');
});

app.get('/catalog/movie/:id/:extra?.json', async (req, res) => {
  const catalogId = req.params.id;
  const extra = req.params.extra ? Object.fromEntries(new URLSearchParams(req.params.extra)) : {};
  
  const skip = parseInt(extra.skip || 0);
  const page = Math.floor(skip / 20) + 1;

  let queryParams = '';

  // Query ottimizzate e bilanciate per non restituire array vuoti
  if (catalogId === 'bombo_autore') {
    // Rimosso il filtro rigido sul voto per evitare di perdere film d'autore recenti non ancora votatissimi
    queryParams = 'with_companies=41077|91523|591|40|856|1334|3236|4894|3410|81&sort_by=primary_release_date.desc';
  } else if (catalogId === 'bombo_europeo') {
    queryParams = 'vote_average.gte=6.5&vote_count.gte=30&with_origin_country=FR|IT|DE|ES|GB|DK|SE|NO|NL&sort_by=popularity.desc';
  } else if (catalogId === 'bombo_documentari') {
    queryParams = 'with_genres=99&vote_average.gte=6.5&vote_count.gte=20&sort_by=popularity.desc';
  } else {
    return res.json({ metas: [] });
  }

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=it-IT&page=${page}&${queryParams}`;
    console.log(`[TMDB REQUEST]: ${tmdbUrl}`);

    const response = await fetch(tmdbUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`[WARNING]: TMDB ha restituito risultati vuoti per ${catalogId} a pagina ${page}`);
      return res.json({ metas: [] });
    }

    const metas = data.results.map(movie => ({
      id: `tmdb:${movie.id}`,
      type: 'movie',
      name: movie.title || movie.original_title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      background: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      description: movie.overview || 'Nessuna trama disponibile.',
      releaseInfo: movie.release_date ? movie.release_date.substring(0, 4) : '',
      imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : null
    }));

    res.json({ metas });
  } catch (error) {
    console.error('[ERROR] Errore nella chiamata a TMDB:', error);
    res.json({ metas: [] });
  }
});

module.exports = app;