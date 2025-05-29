import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdsByPosition, Ad } from "@/models/Ad";

export function useAds() {
  const [topAds, setTopAds] = useState<Ad[]>([]);
  const [bottomAds, setBottomAds] = useState<Ad[]>([]);
  const [sidebarAds, setSidebarAds] = useState<Ad[]>([]);
  const [inVideoAds, setInVideoAds] = useState<Ad[]>([]);
  const [belowVideoAds, setBelowVideoAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAds = useCallback(async () => {
    console.log('useAds: Fetching all ads from Supabase');
    setLoading(true);
    setError(null);
    
    try {
      const [
        topAdsData,
        bottomAdsData,
        sidebarAdsData,
        inVideoAdsData,
        belowVideoAdsData
      ] = await Promise.all([
        getAdsByPosition('top'),
        getAdsByPosition('bottom'),
        getAdsByPosition('sidebar'),
        getAdsByPosition('in-video'),
        getAdsByPosition('below-video')
      ]);
      
      console.log(`useAds: Fetched ads - top: ${topAdsData.length}, bottom: ${bottomAdsData.length}, sidebar: ${sidebarAdsData.length}, in-video: ${inVideoAdsData.length}, below-video: ${belowVideoAdsData.length}`);
      
      setTopAds(topAdsData);
      setBottomAds(bottomAdsData);
      setSidebarAds(sidebarAdsData);
      setInVideoAds(inVideoAdsData);
      setBelowVideoAds(belowVideoAdsData);
    } catch (err) {
      console.error('useAds: Error fetching ads:', err);
      setError('Failed to load ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAds();

    // Set up real-time listener for ads changes
    console.log('useAds: Setting up real-time subscription for ads');
    const adsChannel = supabase
      .channel('ads_real_time')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ads' },
        (payload) => {
          console.log('useAds: Real-time ads change detected:', payload.eventType);
          // Refetch all ads when any change occurs
          fetchAllAds();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('useAds: Successfully subscribed to ads real-time updates');
        }
        if (err) {
          console.error('useAds: Subscription error:', err);
          setError('Failed to subscribe to real-time updates');
        }
      });

    return () => {
      console.log('useAds: Cleaning up ads real-time subscription');
      supabase.removeChannel(adsChannel);
    };
  }, [fetchAllAds]);

  return {
    topAds,
    bottomAds,
    sidebarAds,
    inVideoAds,
    belowVideoAds,
    loading,
    error,
    refetchAds: fetchAllAds
  };
}
