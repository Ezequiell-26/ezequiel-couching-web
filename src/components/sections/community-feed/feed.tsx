"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, Image as ImageIcon, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Post {
  id: number;
  profile: { name: string };
  content: string;
  images?: string;
  likes: number;
  comments: number;
  tags?: string;
  createdAt: string;
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    fetch("/api/community?limit=10")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;

    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
      });

      if (res.ok) {
        const post = await res.json();
        setPosts([post, ...posts]);
        setNewPost("");
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const timeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return "ahora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <section className="py-12 px-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            💬 Comunidad
          </h2>
          <p className="text-muted-foreground text-lg">
            Comparte tus logros, dudas y experiencias con otros miembros
          </p>
        </motion.div>

        {/* Crear post */}
        <Card className="p-4 mb-6">
          <Textarea
            placeholder="¿Qué quieres compartir hoy?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="min-h-[100px] mb-3"
          />
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm">
              <ImageIcon className="w-4 h-4 mr-2" />
              Foto
            </Button>
            <Button onClick={handlePost}>
              <Send className="w-4 h-4 mr-2" />
              Publicar
            </Button>
          </div>
        </Card>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Sé el primero en publicar</h3>
            <p className="text-muted-foreground">
              Inicia la conversación en la comunidad
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold">
                      {post.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{post.profile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          hace {timeAgo(post.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mb-3">{post.content}</p>
                      
                      {post.images && (
                        <div className="mb-3 rounded-lg overflow-hidden">
                          <img
                            src={post.images.split(",")[0]}
                            alt="Post image"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      {post.tags && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {post.tags.split(",").map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Heart className="w-4 h-4" />
                          {post.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments}
                        </button>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors ml-auto">
                          <Share2 className="w-4 h-4" />
                          Compartir
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
