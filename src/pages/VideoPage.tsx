import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVideoById, getVideoByCustomUrl, incrementViews, Video } from '@/models/Video';
import { getAdsByPosition, Ad } from '@/models/Ad';
import { useSEOSettings } from '@/hooks/useSEOSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { incrementPageView, incrementUniqueVisitor } from '@/models/Analytics';

import AdsSection from '@/components/video/AdsSection';
import VideoHeader from '@/components/video/VideoHeader';
import MainVideoSection from '@/components/video/MainVideoSection';
import VideoSidebar from '@/components/video/VideoSidebar';
import LoadingState from '@/components/video/LoadingState';
import ErrorState from '@/components/video/ErrorState';
import SEOHead from '@/components/SEOHead';
import VastDebugInfo from '@/components/video/VastDebugInfo';
import { addTestVastAds } from '@/utils/addTestVastAds';

const VideoPage: React.FC = () => {
  const { id, customUrl } = useParams<{ id?: string, customUrl?: string }>();
  
  // ALL useState hooks must be at the top and always called in the same order
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Ad state hooks - only for NON-VAST ads
  const [topAds, setTopAds] = useState<Ad[]>([]);
  const [bottomAds, setBottomAds] = useState<Ad[]>([]);
  const [sidebarAds, setSidebarAds] = useState<Ad[]>([]);
  const [inVideoAds, setInVideoAds] = useState<Ad[]>([]);
  const [belowVideoAds, setBelowVideoAds] = useState<Ad[]>([]);
  const [beforeVideoAds, setBeforeVideoAds] = useState<Ad[]>([]);
  const [afterVideoAds, setAfterVideoAds] = useState<Ad[]>([]);
  const [sidebarTopAds, setSidebarTopAds] = useState<Ad[]>([]);
  const [sidebarBottomAds, setSidebarBottomAds] = useState<Ad[]>([]);
  const [videoTopAds, setVideoTopAds] = useState<Ad[]>([]);
  const [videoMiddleAds, setVideoMiddleAds] = useState<Ad[]>([]);
  const [videoBottomAds, setVideoBottomAds] = useState<Ad[]>([]);
  const [videoLeftAds, setVideoLeftAds] = useState<Ad[]>([]);
  const [videoRightAds, setVideoRightAds] = useState<Ad[]>([]);
  
  // VAST ads state - these will be passed to VideoPlayer
  const [vastAds, setVastAds] = useState<{
    preroll: Ad[],
    midroll: Ad[],
    postroll: Ad[]
  }>({ preroll: [], midroll: [], postroll: [] });

  const { seoSettings } = useSEOSettings('video');
  const { toast } = useToast();

  // Track visit
  useEffect(() => {
    console.log('VideoPage: Tracking page visit');
    incrementPageView();
    
    const hasVisitedBefore = localStorage.getItem('hasVisited');
    if (!hasVisitedBefore) {
      incrementUniqueVisitor();
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  // Load VAST ads separately for video player
  const loadVastAds = async () => {
    try {
      console.log('VideoPage: Loading VAST ads for video player');
      
      // First check if we have any VAST ads, if not add test ones
      const { data: existingVastAds } = await supabase
        .from('ads')
        .select('*')
        .eq('type', 'vast')
        .eq('is_active', true);
      
      if (!existingVastAds || existingVastAds.length === 0) {
        console.log('VideoPage: No VAST ads found, adding test ads...');
        await addTestVastAds();
      }
      
      const [beforeVasts, middleVasts, afterVasts] = await Promise.all([
        getAdsByPosition('before-video'),
        getAdsByPosition('video-middle'),
        getAdsByPosition('after-video')
      ]);
      
      console.log('VideoPage: Raw ad data received:', {
        beforeVasts: beforeVasts.map(ad => ({ id: ad.id, name: ad.name, type: ad.type })),
        middleVasts: middleVasts.map(ad => ({ id: ad.id, name: ad.name, type: ad.type })),
        afterVasts: afterVasts.map(ad => ({ id: ad.id, name: ad.name, type: ad.type }))
      });
      
      // Only get VAST ads for video player
      const prerollVasts = beforeVasts.filter(ad => ad.type === 'vast');
      const midrollVasts = middleVasts.filter(ad => ad.type === 'vast');
      const postrollVasts = afterVasts.filter(ad => ad.type === 'vast');
      
      console.log(`VideoPage: Found VAST ads - preroll: ${prerollVasts.length}, midroll: ${midrollVasts.length}, postroll: ${postrollVasts.length}`);
      
      if (prerollVasts.length > 0) {
        console.log('VideoPage: Preroll VAST ad found:', prerollVasts[0]);
      }
      
      setVastAds({
        preroll: prerollVasts,
        midroll: midrollVasts,
        postroll: postrollVasts
      });
    } catch (error) {
      console.error('VideoPage: Error loading VAST ads:', error);
    }
  };

  // Load VAST ads
  useEffect(() => {
    loadVastAds();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setVideo(null);
      
      try {
        console.log('VideoPage: Loading video data with params:', { id, customUrl });
        let foundVideo: Video | undefined;
        
        if (customUrl) {
          console.log('VideoPage: Attempting to load by custom URL:', customUrl);
          foundVideo = await getVideoByCustomUrl(customUrl);
        } 
        if (!foundVideo && id) {
          console.log('VideoPage: Attempting to load by ID:', id);
          foundVideo = await getVideoById(id);
        }
        
        if (foundVideo) {
          console.log('VideoPage: Video found:', foundVideo.title);
          setVideo(foundVideo);
          await incrementViews(foundVideo.id);
        } else {
          console.error('VideoPage: Video not found');
          setError(`Video was not found.`);
          toast({
            title: "Video Not Found",
            description: "The requested video could not be found.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("VideoPage: Error loading video:", e);
        setError("An error occurred while loading the video.");
        toast({
          title: "Error",
          description: "An error occurred while loading the video.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id || customUrl) {
      loadData();
    } else {
      setError("No video identifier provided");
      setLoading(false);
    }
  }, [id, customUrl, toast]);

  useEffect(() => {
    const loadAds = async () => {
      try {
        console.log("VideoPage: Fetching NON-VAST ads for INSTANT loading...");
        const [
          topAdsData,
          bottomAdsData,
          sidebarAdsData,
          inVideoAdsData,
          belowVideoAdsData,
          beforeVideoAdsData,
          afterVideoAdsData,
          sidebarTopAdsData,
          sidebarBottomAdsData,
          videoTopAdsData,
          videoMiddleAdsData,
          videoBottomAdsData,
          videoLeftAdsData,
          videoRightAdsData
        ] = await Promise.all([
          getAdsByPosition('top'),
          getAdsByPosition('bottom'),
          getAdsByPosition('sidebar'),
          getAdsByPosition('in-video'),
          getAdsByPosition('below-video'),
          getAdsByPosition('before-video'),
          getAdsByPosition('after-video'),
          getAdsByPosition('sidebar-top'),
          getAdsByPosition('sidebar-bottom'),
          getAdsByPosition('video-top'),
          getAdsByPosition('video-middle'),
          getAdsByPosition('video-bottom'),
          getAdsByPosition('video-left'),
          getAdsByPosition('video-right')
        ]);
        
        // Filter OUT VAST ads - they are handled separately by VideoPlayer
        setTopAds(topAdsData.filter(ad => ad.type !== 'vast'));
        setBottomAds(bottomAdsData.filter(ad => ad.type !== 'vast'));
        setSidebarAds(sidebarAdsData.filter(ad => ad.type !== 'vast'));
        setInVideoAds(inVideoAdsData.filter(ad => ad.type !== 'vast'));
        setBelowVideoAds(belowVideoAdsData.filter(ad => ad.type !== 'vast'));
        setBeforeVideoAds(beforeVideoAdsData.filter(ad => ad.type !== 'vast'));
        setAfterVideoAds(afterVideoAdsData.filter(ad => ad.type !== 'vast'));
        setSidebarTopAds(sidebarTopAdsData.filter(ad => ad.type !== 'vast'));
        setSidebarBottomAds(sidebarBottomAdsData.filter(ad => ad.type !== 'vast'));
        setVideoTopAds(videoTopAdsData.filter(ad => ad.type !== 'vast'));
        setVideoMiddleAds(videoMiddleAdsData.filter(ad => ad.type !== 'vast'));
        setVideoBottomAds(videoBottomAdsData.filter(ad => ad.type !== 'vast'));
        setVideoLeftAds(videoLeftAdsData.filter(ad => ad.type !== 'vast'));
        setVideoRightAds(videoRightAdsData.filter(ad => ad.type !== 'vast'));

        console.log(`VideoPage: Loaded NON-VAST ads for INSTANT display: ${topAdsData.filter(ad => ad.type !== 'vast').length} top, ${bottomAdsData.filter(ad => ad.type !== 'vast').length} bottom, etc.`);
      } catch (error) {
        console.error("VideoPage: Error fetching ads:", error);
      }
    };

    loadAds();
    
    const adsChannel = supabase
      .channel('video-page-ads')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ads' },
        async () => {
          console.log('VideoPage: Ads changed, refetching for INSTANT loading');
          try {
            // Reload both VAST and non-VAST ads
            await loadVastAds();
            
            const [
              topAdsData,
              bottomAdsData,
              sidebarAdsData,
              inVideoAdsData,
              belowVideoAdsData,
              beforeVideoAdsData,
              afterVideoAdsData,
              sidebarTopAdsData,
              sidebarBottomAdsData,
              videoTopAdsData,
              videoMiddleAdsData,
              videoBottomAdsData,
              videoLeftAdsData,
              videoRightAdsData
            ] = await Promise.all([
              getAdsByPosition('top'),
              getAdsByPosition('bottom'),
              getAdsByPosition('sidebar'),
              getAdsByPosition('in-video'),
              getAdsByPosition('below-video'),
              getAdsByPosition('before-video'),
              getAdsByPosition('after-video'),
              getAdsByPosition('sidebar-top'),
              getAdsByPosition('sidebar-bottom'),
              getAdsByPosition('video-top'),
              getAdsByPosition('video-middle'),
              getAdsByPosition('video-bottom'),
              getAdsByPosition('video-left'),
              getAdsByPosition('video-right')
            ]);
            
            // Filter out VAST ads from external positions
            setTopAds(topAdsData.filter(ad => ad.type !== 'vast'));
            setBottomAds(bottomAdsData.filter(ad => ad.type !== 'vast'));
            setSidebarAds(sidebarAdsData.filter(ad => ad.type !== 'vast'));
            setInVideoAds(inVideoAdsData.filter(ad => ad.type !== 'vast'));
            setBelowVideoAds(belowVideoAdsData.filter(ad => ad.type !== 'vast'));
            setBeforeVideoAds(beforeVideoAdsData.filter(ad => ad.type !== 'vast'));
            setAfterVideoAds(afterVideoAdsData.filter(ad => ad.type !== 'vast'));
            setSidebarTopAds(sidebarTopAdsData.filter(ad => ad.type !== 'vast'));
            setSidebarBottomAds(sidebarBottomAdsData.filter(ad => ad.type !== 'vast'));
            setVideoTopAds(videoTopAdsData.filter(ad => ad.type !== 'vast'));
            setVideoMiddleAds(videoMiddleAdsData.filter(ad => ad.type !== 'vast'));
            setVideoBottomAds(videoBottomAdsData.filter(ad => ad.type !== 'vast'));
            setVideoLeftAds(videoLeftAdsData.filter(ad => ad.type !== 'vast'));
            setVideoRightAds(videoRightAdsData.filter(ad => ad.type !== 'vast'));
          } catch (error) {
            console.error("VideoPage: Error refetching ads:", error);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(adsChannel);
    };
  }, []);

  const copyCurrentLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({
      title: "Link Copied!",
      description: "Video link copied to clipboard!",
      variant: "default",
    });
    
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800 flex items-center justify-center">
        <ErrorState errorMessage={error || "Video data is unavailable."} />
      </div>
    );
  }

  let pageTitle = video.title;
  let pageDescription = video.description || 'Watch this exciting video on our platform.';
  
  if (seoSettings) {
    pageTitle = seoSettings.title.replace('{title}', video.title);
    pageDescription = seoSettings.description.replace('{description}', video.description || '');
  }

  const shareUrl = video.custom_url ? 
    `${window.location.origin}/v/${video.custom_url}` : 
    `${window.location.origin}/video/${video.id}`;

  // Prepare VAST ads for video player - these will show INSIDE the player
  const prerollAdTag = vastAds.preroll.length > 0 ? vastAds.preroll[0].code : undefined;
  
  // Create midroll ads from VAST ads
  const midrollAdTags = vastAds.midroll.map((ad, index) => ({
    time: 30 + (index * 60), // Show at 30s, 90s, 150s, etc.
    adTag: ad.code,
    adType: 'vast' as const
  }));
  
  // Postroll ad from VAST ads
  const postrollAdTag = vastAds.postroll.length > 0 ? vastAds.postroll[0].code : undefined;

  console.log('VideoPage: Passing VAST ads to VideoPlayer:', {
    prerollAdTag: !!prerollAdTag,
    midrollAdTags: midrollAdTags.length,
    postrollAdTag: !!postrollAdTag,
    vastAdUrls: {
      preroll: prerollAdTag,
      postroll: postrollAdTag,
      midroll: midrollAdTags.map(m => m.adTag)
    }
  });

  return (
    <>
      <SEOHead 
        seoSettings={seoSettings}
        title={pageTitle}
        description={pageDescription}
        url={shareUrl}
        image={video.thumbnail || seoSettings?.og_image}
        type="video.movie"
        videoUrl={video.url}
      />

      {/* Debug component - shows VAST ad status */}
      <VastDebugInfo 
        vastAds={vastAds}
        prerollAdTag={prerollAdTag}
        midrollAdTags={midrollAdTags}
        postrollAdTag={postrollAdTag}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800 animate-fade-in">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          {/* Top ads - NO VAST ads here - INSTANT LOADING */}
          {topAds.length > 0 && (
            <div className="mb-8 top-ads-container">
              <AdsSection 
                ads={topAds} 
                className="w-full" 
                staggerDelay={false} 
                baseDelaySeconds={0}
                positionClass="top-ads-section" 
                instancePrefix="tp"
              />
            </div>
          )}
          
          <VideoHeader onCopyLink={copyCurrentLink} copied={copied} />
          
          {/* Before video ads - NO VAST ads here - INSTANT LOADING */}
          {beforeVideoAds.length > 0 && (
            <div className="mb-6 before-video-ads-container">
              <AdsSection 
                ads={beforeVideoAds} 
                className="w-full" 
                staggerDelay={false} 
                baseDelaySeconds={0}
                positionClass="before-video-ads-section" 
                instancePrefix="bv"
              />
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <MainVideoSection 
              video={video} 
              inVideoAds={inVideoAds} 
              bottomAds={bottomAds}
              belowVideoAds={belowVideoAds}
              afterVideoAds={afterVideoAds}
              videoTopAds={videoTopAds}
              videoMiddleAds={videoMiddleAds}
              videoBottomAds={videoBottomAds}
              videoLeftAds={videoLeftAds}
              videoRightAds={videoRightAds}
              prerollAdTag={prerollAdTag}
              prerollAdType="vast"
              midrollAdTags={midrollAdTags}
              postrollAdTag={postrollAdTag}
              postrollAdType="vast"
            />
            
            <VideoSidebar 
              sidebarAds={sidebarAds} 
              sidebarTopAds={sidebarTopAds}
              sidebarBottomAds={sidebarBottomAds}
              onCopyLink={copyCurrentLink} 
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoPage;
