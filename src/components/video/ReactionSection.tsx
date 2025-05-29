import React, { useState, useEffect } from 'react';
import { ReactionType, Reaction, getReactionsByVideoId, addReaction } from '@/models/Reaction';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Heart, ThumbsUp, Laugh, Frown, AngryIcon, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReactionSectionProps {
  videoId: string;
}

const ReactionSection: React.FC<ReactionSectionProps> = ({ videoId }) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReactions();
    
    // Configure proper real-time subscription using the proper channel name
    const channel = supabase
      .channel(`reactions-${videoId}`) // Use unique channel name per video
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reactions', 
          filter: `video_id=eq.${videoId}` 
        },
        (payload) => {
          console.log('Reaction update detected:', payload);
          loadReactions(); // Reload reactions when changes occur
        }
      )
      .subscribe((status) => {
        console.log(`Reaction subscription status: ${status}`);
      });
    
    return () => {
      console.log('Unsubscribing from reactions channel');
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  const loadReactions = async () => {
    setLoading(true);
    try {
      console.log(`Loading reactions for video ${videoId}`);
      const fetchedReactions = await getReactionsByVideoId(videoId);
      console.log('Fetched reactions:', fetchedReactions);
      setReactions(fetchedReactions);
    } catch (error) {
      console.error("Error loading reactions:", error);
      toast({
        title: "Error",
        description: "Failed to load reactions. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddReaction = async (type: ReactionType) => {
    if (processing) return;
    
    setProcessing(true);
    console.log(`Adding ${type} reaction to video ${videoId}`);
    
    try {
      const updatedReaction = await addReaction(videoId, type);
      console.log('Reaction added/updated:', updatedReaction);
      
      toast({
        title: "Thanks for your reaction!",
        variant: "default"
      });
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast({
        title: "Error",
        description: "Failed to add your reaction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getReactionCount = (type: ReactionType): number => {
    const reaction = reactions.find(r => r.type === type);
    return reaction ? reaction.count : 0;
  };

  const getReactionIcon = (type: ReactionType) => {
    switch (type) {
      case 'like':
        return <ThumbsUp size={18} />;
      case 'love':
        return <Heart size={18} />;
      case 'laugh':
        return <Laugh size={18} />;
      case 'wow':
        return <Smile size={18} />;
      case 'sad':
        return <Frown size={18} />;
      case 'angry':
        return <AngryIcon size={18} />;
      default:
        return <ThumbsUp size={18} />;
    }
  };

  const reactionButtons = [
    { type: 'like' as ReactionType, label: 'Like' },
    { type: 'love' as ReactionType, label: 'Love' },
    { type: 'laugh' as ReactionType, label: 'Haha' },
    { type: 'wow' as ReactionType, label: 'Wow' },
    { type: 'sad' as ReactionType, label: 'Sad' },
    { type: 'angry' as ReactionType, label: 'Angry' }
  ];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {reactionButtons.map(reaction => (
          <Button
            key={reaction.type}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            disabled={processing || loading}
            onClick={() => handleAddReaction(reaction.type)}
          >
            {getReactionIcon(reaction.type)}
            <span>{reaction.label}</span>
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs ml-1">
              {getReactionCount(reaction.type)}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ReactionSection;
