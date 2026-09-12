'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Headphones, Play, Pause, SkipForward, Volume2, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Playlist {
  id: string;
  name: string;
  description: string;
  spotifyUrl?: string;
  embedUrl?: string;
}

export function WorkoutMusic() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('general');
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const workoutTypes = [
    { id: 'general', name: 'General', icon: '🎵' },
    { id: 'cardio', name: 'Cardio', icon: '🏃' },
    { id: 'strength', name: 'Fuerza', icon: '💪' },
    { id: 'hiit', name: 'HIIT', icon: '🔥' },
    { id: 'yoga', name: 'Yoga', icon: '🧘' },
    { id: 'running', name: 'Running', icon: '👟' }
  ];

  useEffect(() => {
    fetchPlaylists();
  }, [selectedType]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/music?action=playlists&type=${selectedType}`);
      const data = await response.json();
      if (data.success) {
        setPlaylists(data.playlists);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (playlistId: string) => {
    if (currentTrack === playlistId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(playlistId);
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-purple-500" />
            Música para Entrenamientos
          </CardTitle>
          <CardDescription>
            Playlists curadas por tipo de entrenamiento con el BPM ideal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tipos de entrenamiento */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {workoutTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedType === type.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-border hover:border-purple-500/50'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-xs font-medium">{type.name}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Player actual */}
      {currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold">Reproduciendo ahora</div>
                    <div className="text-sm text-white/80">Playlist de {selectedType}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <SkipForward className="w-5 h-5 rotate-180" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 w-12 h-12 rounded-full"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lista de playlists */}
      {loading ? (
        <div className="text-center py-8">
          <Music className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando playlists...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-3 flex items-center justify-center">
                    <Music className="w-12 h-12 text-white/50" />
                  </div>
                  <CardTitle className="text-base">{playlist.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {playlist.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Spotify</Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={currentTrack === playlist.id && isPlaying ? 'default' : 'outline'}
                        onClick={() => togglePlay(playlist.id)}
                      >
                        {currentTrack === playlist.id && isPlaying ? (
                          <Pause className="w-4 h-4 mr-1" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        {currentTrack === playlist.id && isPlaying ? 'Pausar' : 'Reproducir'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="flex-1">
                      <Heart className="w-4 h-4 mr-1" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {playlist.spotifyUrl && (
                    <a
                      href={playlist.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block text-center"
                    >
                      Abrir en Spotify →
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Guía de BPM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Guía de BPM por Tipo de Entrenamiento</CardTitle>
          <CardDescription>
            Elige la música con el ritmo adecuado para maximizar tu rendimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { phase: 'Calentamiento', bpm: '90-110', color: 'bg-green-500', energy: 'Baja-Media' },
              { phase: 'Cardio', bpm: '120-140', color: 'bg-blue-500', energy: 'Media-Alta' },
              { phase: 'Fuerza', bpm: '100-130', color: 'bg-orange-500', energy: 'Alta' },
              { phase: 'HIIT', bpm: '140-180', color: 'bg-red-500', energy: 'Máxima' },
              { phase: 'Enfriamiento', bpm: '60-90', color: 'bg-purple-500', energy: 'Baja' }
            ].map((item, i) => (
              <div key={i} className={`${item.color}/10 border-2 ${item.color.replace('bg-', 'border-')} rounded-lg p-3 text-center`}>
                <div className={`text-2xl font-bold ${item.color.replace('bg-', 'text-')}`}>
                  {item.bpm}
                </div>
                <div className="text-xs font-medium mb-1">{item.phase}</div>
                <div className="text-xs text-muted-foreground">{item.energy}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
