import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface VideoAdProps {
  adTag: string;
  adType: 'vast' | 'vpaid' | 'ima';
  onAdComplete: () => void;
  onAdSkip?: () => void;
  skipDelay?: number; // seconds before skip button appears
  className?: string;
}

const VideoAd: React.FC<VideoAdProps> = ({
  adTag,
  adType,
  onAdComplete,
  onAdSkip,
  skipDelay = 5,
  className = ''
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [countdown, setCountdown] = useState(skipDelay);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    if (!adTag || !adContainerRef.current) return;

    console.log(`VideoAd: Loading ${adType.toUpperCase()} ad tag:`, adTag);

    const loadAd = async () => {
      try {
        if (adType === 'ima') {
          await loadIMAad();
        } else if (adType === 'vast' || adType === 'vpaid') {
          await loadVASTad();
        }
      } catch (error) {
        console.error(`VideoAd: Error loading ${adType} ad:`, error);
        setAdError(`Failed to load ${adType.toUpperCase()} ad`);
      }
    };

    loadAd();
  }, [adTag, adType]);

  // Countdown timer for skip button
  useEffect(() => {
    if (!adLoaded || skipDelay <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setShowSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adLoaded, skipDelay]);

  const loadIMAad = async () => {
    // Google IMA SDK integration
    if (typeof window.google === 'undefined' || !window.google.ima) {
      // Load Google IMA SDK if not already loaded
      await loadGoogleIMASDK();
    }

    const adDisplayContainer = new window.google.ima.AdDisplayContainer(
      adContainerRef.current,
      null // video element will be created by IMA
    );

    const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);
    
    adsLoader.addEventListener(
      window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (event: any) => {
        const adsManager = event.getAdsManager(null);
        
        adsManager.addEventListener(
          window.google.ima.AdEvent.Type.LOADED,
          () => {
            console.log('VideoAd: IMA ad loaded');
            setAdLoaded(true);
          }
        );
        
        adsManager.addEventListener(
          window.google.ima.AdEvent.Type.COMPLETE,
          () => {
            console.log('VideoAd: IMA ad completed');
            onAdComplete();
          }
        );
        
        adsManager.addEventListener(
          window.google.ima.AdErrorEvent.Type.AD_ERROR,
          (adErrorEvent: any) => {
            console.error('VideoAd: IMA ad error:', adErrorEvent.getError());
            setAdError('Ad failed to play');
          }
        );

        try {
          adsManager.init(640, 360, window.google.ima.ViewMode.NORMAL);
          adsManager.start();
        } catch (adError) {
          console.error('VideoAd: Error starting IMA ad:', adError);
          setAdError('Failed to start ad');
        }
      }
    );

    adsLoader.addEventListener(
      window.google.ima.AdErrorEvent.Type.AD_ERROR,
      (adErrorEvent: any) => {
        console.error('VideoAd: IMA loader error:', adErrorEvent.getError());
        setAdError('Failed to load ad');
      }
    );

    const adsRequest = new window.google.ima.AdsRequest();
    adsRequest.adTagUrl = adTag;
    
    adDisplayContainer.initialize();
    adsLoader.requestAds(adsRequest);
  };

  const loadVASTad = async () => {
    // Basic VAST/VPAID implementation using video element
    const videoElement = document.createElement('video');
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.controls = false;
    videoElement.autoplay = true;
    videoElement.muted = false;

    // For VAST, we need to parse the XML and extract the media file URL
    try {
      const response = await fetch(adTag);
      const vastXML = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(vastXML, 'text/xml');
      
      // Extract media file URL from VAST XML
      const mediaFile = xmlDoc.querySelector('MediaFile');
      if (mediaFile && mediaFile.textContent) {
        videoElement.src = mediaFile.textContent.trim();
        
        videoElement.addEventListener('loadeddata', () => {
          console.log('VideoAd: VAST ad loaded');
          setAdLoaded(true);
        });
        
        videoElement.addEventListener('ended', () => {
          console.log('VideoAd: VAST ad completed');
          onAdComplete();
        });
        
        videoElement.addEventListener('error', (e) => {
          console.error('VideoAd: VAST ad error:', e);
          setAdError('Ad playback failed');
        });

        if (adContainerRef.current) {
          adContainerRef.current.appendChild(videoElement);
        }
      } else {
        throw new Error('No media file found in VAST response');
      }
    } catch (error) {
      console.error('VideoAd: Error parsing VAST:', error);
      setAdError('Invalid ad format');
    }
  };

  const loadGoogleIMASDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window.google !== 'undefined' && window.google.ima) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
      script.async = true;
      script.onload = () => {
        console.log('VideoAd: Google IMA SDK loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('VideoAd: Failed to load Google IMA SDK');
        reject(new Error('Failed to load Google IMA SDK'));
      };
      document.head.appendChild(script);
    });
  };

  const handleSkip = () => {
    console.log('VideoAd: Ad skipped by user');
    if (onAdSkip) {
      onAdSkip();
    } else {
      onAdComplete();
    }
  };

  if (adError) {
    return (
      <div className={`absolute inset-0 bg-black flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <p className="text-lg mb-2">❌ {adError}</p>
          <button
            onClick={onAdComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 bg-black ${className}`} style={{ zIndex: 50 }}>
      {/* Ad container */}
      <div 
        ref={adContainerRef}
        className="w-full h-full"
        style={{ minHeight: '360px' }}
      />
      
      {/* Skip button */}
      {showSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90 transition-colors"
        >
          <X size={16} />
          Skip Ad
        </button>
      )}
      
      {/* Countdown */}
      {adLoaded && !showSkip && countdown > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg">
          Skip in {countdown}s
        </div>
      )}
      
      {/* Loading indicator */}
      {!adLoaded && !adError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Loading ad...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAd;
