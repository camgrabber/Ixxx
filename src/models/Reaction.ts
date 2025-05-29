import { supabase } from "@/integrations/supabase/client";

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

export interface Reaction {
  id: string;
  video_id: string;
  type: ReactionType;
  count: number;
}

export const getReactionsByVideoId = async (videoId: string): Promise<Reaction[]> => {
  try {
    const { data, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("video_id", videoId);
    
    if (error) {
      console.error("Error loading reactions:", error);
      throw error;
    }
    
    return data as Reaction[];
  } catch (error) {
    console.error("Error loading reactions:", error);
    throw error;
  }
};

export const addReaction = async (videoId: string, type: ReactionType): Promise<Reaction | undefined> => {
  try {
    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from("reactions")
      .select("*")
      .eq("video_id", videoId)
      .eq("type", type)
      .single();
    
    if (existingReaction) {
      // Increment reaction count
      const { data, error } = await supabase
        .from("reactions")
        .update({ count: existingReaction.count + 1 })
        .eq("id", existingReaction.id)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating reaction:", error);
        throw error;
      }
      
      return data as Reaction;
    } else {
      // Create new reaction
      const { data, error } = await supabase
        .from("reactions")
        .insert({
          video_id: videoId,
          type: type,
          count: 1
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error adding reaction:", error);
        throw error;
      }
      
      return data as Reaction;
    }
  } catch (error) {
    console.error("Error processing reaction:", error);
    throw error;
  }
};
