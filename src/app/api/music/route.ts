/**
 * API de Música para Entrenamientos
 * Integración con Spotify y playlists por tipo de entrenamiento
 */

import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

// Playlists curadas por tipo de entrenamiento
const workoutPlaylists = {
  cardio: [
    { id: '37i9dQZF1DX76Wlfdnj7AP', name: 'Beast Mode', description: 'Música intensa para cardio' },
    { id: '37i9dQZF1DX0HRj9P7NxeE', name: 'Workout Twerkout', description: 'Hip-hop para entrenar' },
    { id: '37i9dQZF1DWUVpAXiEPK8P', name: 'Power Workout', description: 'Rock y metal para entrenar' }
  ],
  strength: [
    { id: '37i9dQZF1DWSJHnPb1f0X3', name: 'Cardio', description: 'Tracks energéticos' },
    { id: '37i9dQZF1DX70RN3TfWWJh', name: 'Deep Focus', description: 'Para concentración en levantamientos' },
    { id: '37i9dQZF1DX2L0iB23Enbq', name: 'Motivation Mix', description: 'Música motivacional' }
  ],
  yoga: [
    { id: '37i9dQZF1DWZqd5JICZI0u', name: 'Peaceful Piano', description: 'Piano relajante' },
    { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Guitar', description: 'Guitarra acústica' },
    { id: '37i9dQZF1DWYcDQ1hSjOpn', name: 'Ambient Relaxation', description: 'Sonidos ambientales' }
  ],
  hiit: [
    { id: '37i9dQZF1DX8NTLI2TtZa6', name: 'Adrenaline Workout', description: 'Alta intensidad' },
    { id: '37i9dQZF1DX2PQDv3hfPD1', name: 'Hardstyle', description: 'EDM intenso' },
    { id: '37i9dQZF1DX3ZeFHRhhi7Y', name: 'Drum & Bass', description: 'Ritmos rápidos' }
  ],
  running: [
    { id: '37i9dQZF1DX4eRPd9frC1m', name: 'Running to Rock', description: 'Rock para correr' },
    { id: '37i9dQZF1DWZq91oLsHZvy', name: 'Running Hits', description: 'Pop para correr' },
    { id: '37i9dQZF1DX8mBRYewE6or', name: 'Marathon Motivation', description: 'Para largas distancias' }
  ]
};

// Géneros recomendados por BPM
const bpmGenres: Record<string, { min: number; max: number; genres: string[] }> = {
  warmup: { min: 90, max: 110, genres: ['pop', 'rock'] },
  cardio: { min: 120, max: 140, genres: ['edm', 'house', 'pop'] },
  strength: { min: 100, max: 130, genres: ['rock', 'metal', 'hip-hop'] },
  hiit: { min: 140, max: 180, genres: ['drum-and-bass', 'hardstyle', 'techno'] },
  cooldown: { min: 60, max: 90, genres: ['ambient', 'classical', 'acoustic'] }
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workoutType = searchParams.get('type') || 'general';
    const action = searchParams.get('action');

    if (action === 'playlists') {
      const playlists = getPlaylistsForWorkout(workoutType);
      return NextResponse.json({
        success: true,
        playlists,
        workoutType
      });
    }

    if (action === 'bpm-recommendation') {
      const recommendation = getBPMRecommendation(workoutType);
      return NextResponse.json({
        success: true,
        recommendation
      });
    }

    if (action === 'featured') {
      const featured = getFeaturedPlaylists();
      return NextResponse.json({
        success: true,
        featured
      });
    }

    // Por defecto, devolver playlists del tipo
    const playlists = getPlaylistsForWorkout(workoutType);
    return NextResponse.json({
      success: true,
      playlists,
      bpmGuide: bpmGenres
    });

  } catch (error) {
    console.error('Error fetching music:', error);
    return NextResponse.json(
      { error: 'Error obteniendo música' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, workoutData, preferences } = body;

    if (action === 'generate-mix') {
      const mix = generateCustomMix(workoutData, preferences);
      return NextResponse.json({
        success: true,
        mix
      });
    }

    if (action === 'save-playlist') {
      // Aquí iría la integración con Spotify API para crear playlist
      const playlist = await createSpotifyPlaylist(preferences);
      return NextResponse.json({
        success: true,
        playlist
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing music request:', error);
    return NextResponse.json(
      { error: 'Error procesando solicitud' },
      { status: 500 }
    );
  }
}

function getPlaylistsForWorkout(type: string) {
  const typeKey = type as keyof typeof workoutPlaylists;
  
  if (workoutPlaylists[typeKey]) {
    return workoutPlaylists[typeKey].map(pl => ({
      ...pl,
      spotifyUrl: `https://open.spotify.com/playlist/${pl.id}`,
      embedUrl: `https://open.spotify.com/embed/playlist/${pl.id}`
    }));
  }

  // Si no hay tipo específico, mezclar todas
  const allPlaylists = Object.values(workoutPlaylists).flat();
  return allPlaylists.slice(0, 5).map(pl => ({
    ...pl,
    spotifyUrl: `https://open.spotify.com/playlist/${pl.id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${pl.id}`
  }));
}

function getBPMRecommendation(workoutType: string) {
  const typeKey = workoutType.toLowerCase() as keyof typeof bpmGenres;
  
  if (bpmGenres[typeKey]) {
    return {
      bpmRange: `${bpmGenres[typeKey].min}-${bpmGenres[typeKey].max} BPM`,
      recommendedGenres: bpmGenres[typeKey].genres,
      tips: getBPMTips(typeKey)
    };
  }

  return {
    bpmRange: '100-130 BPM',
    recommendedGenres: ['pop', 'rock'],
    tips: 'Encuentra un ritmo que te motive sin distraerte.'
  };
}

function getBPMTips(phase: string): string {
  const tips: Record<string, string> = {
    warmup: 'Comienza con ritmos moderados para preparar el cuerpo gradualmente.',
    cardio: 'Mantén un BPM constante que coincida con tu zancada o pedaleo.',
    strength: 'Elige música con beats fuertes para sincronizar con tus levantamientos.',
    hiit: 'Alterna entre tracks de alto y bajo BPM para los intervalos.',
    cooldown: 'Reduce gradualmente el BPM para ayudar a la recuperación.'
  };
  return tips[phase] || 'Escucha música que te motive a seguir adelante.';
}

function getFeaturedPlaylists() {
  return {
    daily: workoutPlaylists.cardio[0],
    trending: workoutPlaylists.hiit[0],
    newReleases: workoutPlaylists.strength[2]
  };
}

function generateCustomMix(workoutData: any, preferences: any) {
  const { duration, intensity, favoriteGenres } = workoutData;
  
  // Calcular número de canciones basado en duración
  const avgSongLength = 3.5; // minutos
  const songCount = Math.ceil(duration / avgSongLength);

  // Seleccionar playlists basadas en intensidad
  let selectedPlaylists: any[] = [];
  if (intensity === 'high') {
    selectedPlaylists = [...workoutPlaylists.hiit, ...workoutPlaylists.cardio];
  } else if (intensity === 'medium') {
    selectedPlaylists = [...workoutPlaylists.strength, ...workoutPlaylists.running];
  } else {
    selectedPlaylists = [...workoutPlaylists.yoga, ...workoutPlaylists.cardio.slice(0, 1)];
  }

  // Filtrar por géneros favoritos si existen
  if (favoriteGenres && favoriteGenres.length > 0) {
    selectedPlaylists = selectedPlaylists.filter(pl =>
      favoriteGenres.some((g: string) => 
        pl.name.toLowerCase().includes(g.toLowerCase())
      )
    );
  }

  return {
    name: `Mix Personalizado - ${duration}min`,
    estimatedSongs: songCount,
    playlists: selectedPlaylists.slice(0, 3),
    structure: buildMixStructure(duration, intensity),
    spotifyLinks: selectedPlaylists.map(pl => pl.spotifyUrl)
  };
}

function buildMixStructure(duration: number, intensity: string) {
  const warmupTime = Math.round(duration * 0.1); // 10% calentamiento
  const mainTime = Math.round(duration * 0.75); // 75% principal
  const cooldownTime = duration - warmupTime - mainTime; // 15% enfriamiento

  return {
    warmup: { duration: warmupTime, bpm: '90-110', energy: 'baja-media' },
    main: { duration: mainTime, bpm: intensity === 'high' ? '140-180' : '120-140', energy: 'alta' },
    cooldown: { duration: cooldownTime, bpm: '60-90', energy: 'media-baja' }
  };
}

async function createSpotifyPlaylist(preferences: any) {
  // Mock de creación de playlist en Spotify
  // En producción, esto requeriría OAuth flow con Spotify
  
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return {
      mock: true,
      message: 'Configura las credenciales de Spotify para crear playlists reales',
      instructions: [
        '1. Ve a https://developer.spotify.com/dashboard',
        '2. Crea una nueva aplicación',
        '3. Copia Client ID y Client Secret',
        '4. Añádelos a tus variables de entorno',
        '5. Implementa OAuth flow para obtener access token'
      ]
    };
  }

  // Aquí iría el código real de integración con Spotify
  return {
    success: true,
    playlistId: 'mock_playlist_id',
    url: 'https://open.spotify.com/playlist/mock_playlist_id'
  };
}

// Helper para obtener token de Spotify (para uso en servidor)
async function getSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return null;
  }
}
