import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, getVideos } from '@/models/Video';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAccessCodeVerification } from '@/hooks/useAccessCodeVerification';
import { useAds } from '@/hooks/useAds';
import { useSEOSettings } from '@/hooks/useSEOSettings';
import AccessCodePrompt from '@/components/AccessCodePrompt';
import AdsSection from '@/components/video/AdsSection';
import SEOHead from '@/components/SEOHead';

const Videos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVerified, isLoading: accessLoading, verifyCode } = useAccessCodeVerification();
  const { seoSettings } = useSEOSettings('videos');
  
  const {
    topAds,
    bottomAds,
    sidebarAds,
    belowVideoAds,
    loading: adsLoading,
    error: adsError
  } = useAds();

  useEffect(() => {
    if (adsError) {
      console.error('Videos page: Error loading ads:', adsError);
    }
    console.log(`Videos page: Ads loaded - top: ${topAds.length}, bottom: ${bottomAds.length}, sidebar: ${sidebarAds.length}, below-video: ${belowVideoAds.length}`);
  }, [topAds, bottomAds, sidebarAds, belowVideoAds, adsError]);

  useEffect(() => {
    if (!isVerified) return;

    const fetchVideos = async () => {
      try {
        console.log('Videos page: Fetching videos');
        const videosData = await getVideos();
        console.log('Videos page: Fetched videos:', videosData.length);
        setVideos(videosData);
      } catch (error) {
        console.error('Videos page: Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [isVerified]);

  // Show loading while checking access
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show access code prompt if not verified
  if (!isVerified) {
    return <AccessCodePrompt onCodeVerified={verifyCode} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800">
        <div className="container mx-auto px-4 py-3">
          {/* Top ads */}
          {topAds.length > 0 && (
            <div className="mb-3 no-spacing">
              <AdsSection 
                ads={topAds} 
                className="w-full no-spacing" 
                staggerDelay={true} 
                baseDelaySeconds={0.5}
                positionClass="top-ads-section"
                instancePrefix="videos-loading-top"
              />
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-72 bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Sidebar ads */}
            {sidebarAds.length > 0 && (
              <div className="lg:w-80">
                <AdsSection 
                  ads={sidebarAds} 
                  className="w-full no-spacing" 
                  staggerDelay={true} 
                  baseDelaySeconds={1}
                  positionClass="sidebar-ads-section"
                  instancePrefix="videos-loading-sidebar"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        seoSettings={seoSettings}
        title={seoSettings?.title || 'All Videos - Video Player Pro'}
        description={seoSettings?.description || 'Browse through our complete collection of videos'}
        url={window.location.href}
        type="website"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 dark:from-slate-900 dark:via-gray-950 dark:to-slate-800">
        <div className="container mx-auto px-4 py-3">
          {/* Top ads - ZERO SPACING */}
          {topAds.length > 0 && (
            <div className="mb-3 no-spacing">
              <AdsSection 
                ads={topAds} 
                className="w-full no-spacing" 
                staggerDelay={true} 
                baseDelaySeconds={0.5}
                positionClass="top-ads-section"
                instancePrefix="videos-page-top"
              />
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <header className="mb-4 text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                  <span className="gradient-text">All Videos</span>
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Browse through our complete collection of videos
                </p>
              </header>

              {videos.length === 0 ? (
                <div className="text-center py-8">
                  <Play size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-3">
                    No videos available
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Check back later for new content!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((video, index) => {
                    const videoUrl = video.custom_url ? `/v/${video.custom_url}` : `/video/${video.id}`;
                    console.log('Video card:', video.title, 'URL:', videoUrl);
                    console.log(`Rendering video ${index + 1}, belowVideoAds available:`, belowVideoAds.length);
                    
                    return (
                      <div key={video.id} className="space-y-3">
                        <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                          {/* Make thumbnail clickable */}
                          <Link to={videoUrl} className="block">
                            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer">
                              {video.thumbnail ? (
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                                  <Play size={32} className="text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Play size={32} className="text-white" />
                              </div>
                            </div>
                          </Link>
                          
                          <CardHeader className="pb-2">
                            <CardTitle className="line-clamp-2 text-base">{video.title}</CardTitle>
                            {video.description && (
                              <CardDescription className="line-clamp-2">
                                {video.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                              <div className="flex items-center gap-1">
                                <Eye size={14} />
                                <span>{video.views} views</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{formatDistanceToNow(new Date(video.date_added))} ago</span>
                              </div>
                            </div>
                            
                            <Link to={videoUrl} className="block">
                              <Button className="w-full">
                                <Play size={16} className="mr-2" />
                                Watch Video
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                        
                        {/* Below Video Ads - Show for every video with unique instance prefix */}
                        {belowVideoAds.length > 0 && (
                          <div className="no-spacing">
                            <AdsSection 
                              ads={belowVideoAds} 
                              className="w-full no-spacing" 
                              staggerDelay={true} 
                              baseDelaySeconds={2 + (index * 0.5)}
                              positionClass="below-video-ads-section"
                              instancePrefix={`video-${video.id}-below`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar ads - ZERO SPACING */}
            {sidebarAds.length > 0 && (
              <div className="lg:w-80">
                <AdsSection 
                  ads={sidebarAds} 
                  className="w-full no-spacing" 
                  staggerDelay={true} 
                  baseDelaySeconds={1}
                  positionClass="sidebar-ads-section"
                  instancePrefix="videos-page-sidebar"
                />
              </div>
            )}
          </div>

          {/* Bottom ads - ZERO SPACING */}
          {bottomAds.length > 0 && (
            <div className="mt-4 no-spacing">
              <AdsSection 
                ads={bottomAds} 
                className="w-full no-spacing" 
                staggerDelay={true} 
                baseDelaySeconds={2}
                positionClass="bottom-ads-section"
                instancePrefix="videos-page-bottom"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Videos;
