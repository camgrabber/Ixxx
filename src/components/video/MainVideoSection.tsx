import React, { useState, useRef, useEffect } from 'react';
import { Video } from '@/models/Video';
import { Ad } from '@/models/Ad';
import VideoPlayer from '@/components/VideoPlayer';
import VideoInfo from './VideoInfo';
import AdsSection from './AdsSection';

interface MainVideoSectionProps {
  video: Video;
  inVideoAds: Ad[];
  bottomAds: Ad[];
  belowVideoAds?: Ad[];
  afterVideoAds?: Ad[];
  videoTopAds?: Ad[];
  videoMiddleAds?: Ad[];
  videoBottomAds?: Ad[];
  videoLeftAds?: Ad[];
  videoRightAds?: Ad[];
  // Video ad props
  prerollAdTag?: string;
  prerollAdType?: 'vast' | 'vpaid' | 'ima';
  midrollAdTags?: Array<{ time: number; adTag: string; adType: 'vast' | 'vpaid' | 'ima' }>;
  postrollAdTag?: string;
  postrollAdType?: 'vast' | 'vpaid' | 'ima';
}

const MainVideoSection: React.FC<MainVideoSectionProps> = ({ 
  video, 
  inVideoAds, 
  bottomAds,
  belowVideoAds = [],
  afterVideoAds = [],
  videoTopAds = [],
  videoMiddleAds = [],
  videoBottomAds = [],
  videoLeftAds = [],
  videoRightAds = [],
  prerollAdTag,
  prerollAdType = 'vast',
  midrollAdTags = [],
  postrollAdTag,
  postrollAdType = 'vast'
}) => {
  const [showInVideoAd, setShowInVideoAd] = useState(false);
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inVideoAds.length === 0) return;

    const showAdInterval = setInterval(() => {
      console.log('Displaying in-video ad');
      setShowInVideoAd(true);
      
      setTimeout(() => {
        console.log('Auto-hiding in-video ad');
        setShowInVideoAd(false);
      }, 5000);
    }, 10000);

    return () => clearInterval(showAdInterval);
  }, [inVideoAds]);

  // Filter out any VAST ads that might have slipped through - they should only be handled by VideoPlayer
  const filteredVideoTopAds = videoTopAds.filter(ad => ad.type !== 'vast');
  const filteredVideoMiddleAds = videoMiddleAds.filter(ad => ad.type !== 'vast');
  const filteredVideoBottomAds = videoBottomAds.filter(ad => ad.type !== 'vast');
  const filteredVideoLeftAds = videoLeftAds.filter(ad => ad.type !== 'vast');
  const filteredVideoRightAds = videoRightAds.filter(ad => ad.type !== 'vast');
  const filteredAfterVideoAds = afterVideoAds.filter(ad => ad.type !== 'vast');

  return (
    <div className="flex-1 space-y-6">
      {/* Video Top Ads - No VAST ads - INSTANT LOADING */}
      {filteredVideoTopAds.length > 0 && (
        <div className="video-top-ads-container">
          <AdsSection 
            ads={filteredVideoTopAds} 
            className="w-full" 
            staggerDelay={false} 
            baseDelaySeconds={0}
            positionClass="video-top-ads-section" 
            instancePrefix="vt"
          />
        </div>
      )}

      <div className="flex gap-4">
        {/* Video Left Ads - No VAST ads - INSTANT LOADING */}
        {filteredVideoLeftAds.length > 0 && (
          <div className="video-left-ads-container hidden lg:block">
            <AdsSection 
              ads={filteredVideoLeftAds} 
              className="w-full" 
              staggerDelay={false} 
              baseDelaySeconds={0}
              positionClass="video-left-ads-section" 
              instancePrefix="vl"
            />
          </div>
        )}

        <div className="flex-1">
          <div ref={videoPlayerRef} className="relative">
            <VideoPlayer 
              src={video.url} 
              title={video.title}
              disableClickToToggle={showInVideoAd}
              prerollAdTag={prerollAdTag}
              prerollAdType={prerollAdType}
              midrollAdTags={midrollAdTags}
              postrollAdTag={postrollAdTag}
              postrollAdType={postrollAdType}
            />
            
            {/* In-video ads overlay */}
            {showInVideoAd && inVideoAds.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                <div className="in-video-ads-section pointer-events-auto">
                  <AdsSection 
                    ads={inVideoAds} 
                    className="in-video-ad-container" 
                    staggerDelay={false} 
                    baseDelaySeconds={0}
                    positionClass="in-video-ads-section" 
                    instancePrefix="iv"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Video Middle Ads - No VAST ads - INSTANT LOADING */}
          {filteredVideoMiddleAds.length > 0 && (
            <div className="video-middle-ads-container mt-4">
              <AdsSection 
                ads={filteredVideoMiddleAds} 
                className="w-full" 
                staggerDelay={false} 
                baseDelaySeconds={0}
                positionClass="video-middle-ads-section" 
                instancePrefix="vm"
              />
            </div>
          )}
        </div>

        {/* Video Right Ads - No VAST ads - INSTANT LOADING */}
        {filteredVideoRightAds.length > 0 && (
          <div className="video-right-ads-container hidden lg:block">
            <AdsSection 
              ads={filteredVideoRightAds} 
              className="w-full" 
              staggerDelay={false} 
              baseDelaySeconds={0}
              positionClass="video-right-ads-section" 
              instancePrefix="vr"
            />
          </div>
        )}
      </div>
      
      {/* After video ads - No VAST ads - INSTANT LOADING */}
      {filteredAfterVideoAds.length > 0 && (
        <div className="after-video-ads-container">
          <AdsSection 
            ads={filteredAfterVideoAds} 
            className="w-full" 
            staggerDelay={false} 
            baseDelaySeconds={0}
            positionClass="after-video-ads-section" 
            instancePrefix="av"
          />
        </div>
      )}
      
      <VideoInfo video={video} belowVideoAds={belowVideoAds} />

      {/* Video Bottom Ads - No VAST ads - INSTANT LOADING */}
      {filteredVideoBottomAds.length > 0 && (
        <div className="video-bottom-ads-container">
          <AdsSection 
            ads={filteredVideoBottomAds} 
            className="w-full" 
            staggerDelay={false} 
            baseDelaySeconds={0}
            positionClass="video-bottom-ads-section" 
            instancePrefix="vb"
          />
        </div>
      )}
      
      {bottomAds.length > 0 && (
        <div className="bottom-ads-container">
          <AdsSection 
            ads={bottomAds} 
            className="w-full" 
            staggerDelay={false} 
            baseDelaySeconds={0}
            positionClass="bottom-ads-section" 
            instancePrefix="bt"
          />
        </div>
      )}
    </div>
  );
};

export default MainVideoSection;
