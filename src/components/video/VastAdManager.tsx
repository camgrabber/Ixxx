import React, { useEffect, useRef, useState } from 'react';
import { X, Play } from 'lucide-react';

interface VastAdManagerProps {
  vastUrl: string;
  onAdComplete: () => void;
  onAdError?: (error: string) => void;
  onAdStarted?: () => void;
  skipDelay?: number;
  autoplay?: boolean;
  className?: string;
}

const VastAdManager: React.FC<VastAdManagerProps> = ({
  vastUrl,
  onAdComplete,
  onAdError,
  onAdStarted,
  skipDelay = 5,
  autoplay = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [adState, setAdState] = useState<'loading' | 'ready' | 'playing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [countdown, setCountdown] = useState(skipDelay);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  console.log('VastAdManager: Initializing with URL:', vastUrl);

  // Detect mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Load and parse VAST ad with aggressive timeout
  useEffect(() => {
    if (!vastUrl) {
      console.error('VastAdManager: No VAST URL provided');
      setError('No VAST URL provided');
      setAdState('error');
      onAdError?.('No VAST URL provided');
      return;
    }

    console.log('VastAdManager: Loading VAST ad from:', vastUrl);
    
    // Set a shorter timeout for mobile devices
    const timeoutDuration = isMobile ? 3000 : 5000;
    const loadTimeout = setTimeout(() => {
      console.error(`VastAdManager: Ad loading timeout (${timeoutDuration/1000}s)`);
      setError('Ad loading timeout');
      setAdState('error');
      onAdError?.('Ad loading timeout - continuing to main video');
    }, timeoutDuration);

    const loadVastAd = async () => {
      try {
        setAdState('loading');
        setError(null);

        // Check if it's a direct video URL
        if (isDirectVideoUrl(vastUrl)) {
          console.log('VastAdManager: Direct video URL detected');
          setVideoUrl(vastUrl);
          setAdState('ready');
          clearTimeout(loadTimeout);
          
          // Auto-start video immediately on direct URLs
          if (autoplay) {
            setTimeout(() => startVideoPlayback(), 100);
          }
          return;
        }

        // Fetch VAST XML with shorter timeout for mobile
        console.log('VastAdManager: Fetching VAST XML');
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), isMobile ? 2000 : 3000);
        
        try {
          const response = await fetch(vastUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/xml, text/xml, */*',
              'User-Agent': navigator.userAgent
            }
          });
          
          clearTimeout(fetchTimeout);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const vastXml = await response.text();
          console.log('VastAdManager: VAST XML received, length:', vastXml.length);
          
          if (vastXml.length < 50) {
            throw new Error('Invalid VAST response - too short');
          }
          
          const extractedVideoUrl = parseVastXml(vastXml);
          if (extractedVideoUrl) {
            console.log('VastAdManager: Video URL extracted:', extractedVideoUrl);
            setVideoUrl(extractedVideoUrl);
            setAdState('ready');
            clearTimeout(loadTimeout);
            
            // Auto-start video immediately after parsing
            if (autoplay) {
              setTimeout(() => startVideoPlayback(), 100);
            }
          } else {
            throw new Error('No media file found in VAST response');
          }
        } catch (fetchError) {
          clearTimeout(fetchTimeout);
          throw fetchError;
        }
      } catch (err) {
        console.error('VastAdManager: Error loading VAST ad:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setAdState('error');
        clearTimeout(loadTimeout);
        // Immediately call error handler on mobile to avoid waiting
        setTimeout(() => {
          onAdError?.(errorMessage);
        }, isMobile ? 500 : 1000);
      }
    };

    loadVastAd();

    return () => {
      clearTimeout(loadTimeout);
    };
  }, [vastUrl, autoplay, onAdError, isMobile]);

  // Countdown for skip button
  useEffect(() => {
    if (adState !== 'playing' || skipDelay <= 0) return;

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
  }, [adState, skipDelay]);

  const isDirectVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  const parseVastXml = (xmlString: string): string | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('VastAdManager: XML parsing error');
        return null;
      }

      // Multiple selectors to find media files
      const mediaSelectors = [
        'MediaFile',
        'MediaFiles MediaFile',
        'Linear MediaFiles MediaFile',
        'InLine Creatives Creative Linear MediaFiles MediaFile',
        'Wrapper InLine Creatives Creative Linear MediaFiles MediaFile'
      ];

      for (const selector of mediaSelectors) {
        const mediaFiles = xmlDoc.querySelectorAll(selector);
        
        if (mediaFiles.length > 0) {
          // Prefer MP4, then any video format
          const sortedMedia = Array.from(mediaFiles).sort((a, b) => {
            const aType = a.getAttribute('type') || '';
            const bType = b.getAttribute('type') || '';
            const aUrl = a.textContent?.trim() || '';
            const bUrl = b.textContent?.trim() || '';
            
            if (aType.includes('mp4') || aUrl.includes('.mp4')) return -1;
            if (bType.includes('mp4') || bUrl.includes('.mp4')) return 1;
            return 0;
          });

          const selectedMedia = sortedMedia[0];
          const videoUrl = selectedMedia?.textContent?.trim();
          
          if (videoUrl && videoUrl.startsWith('http')) {
            console.log('VastAdManager: Selected video URL:', videoUrl);
            return videoUrl;
          }
        }
      }

      console.warn('VastAdManager: No valid media files found in VAST XML');
      return null;
    } catch (err) {
      console.error('VastAdManager: Error parsing VAST XML:', err);
      return null;
    }
  };

  const startVideoPlayback = async () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    console.log('VastAdManager: Starting video playback with URL:', videoUrl);
    video.src = videoUrl;
    
    const onLoadedData = async () => {
      console.log('VastAdManager: Video data loaded successfully');
      
      try {
        // Always mute initially to allow autoplay
        video.muted = true;
        
        await video.play();
        console.log('VastAdManager: Ad started playing');
        setAdState('playing');
        onAdStarted?.();
      } catch (err) {
        console.error('VastAdManager: Autoplay failed:', err);
        setError('Failed to start ad playback');
        setAdState('error');
        setTimeout(() => onAdError?.('Video playback failed'), 500);
      }
    };

    const onError = (e: Event) => {
      console.error('VastAdManager: Video error:', e);
      setError('Failed to play ad video');
      setAdState('error');
      setTimeout(() => onAdError?.('Video playback failed'), 500);
    };

    const onEnded = () => {
      console.log('VastAdManager: Ad playback completed');
      onAdComplete();
    };

    // Remove old listeners
    video.removeEventListener('loadeddata', onLoadedData);
    video.removeEventListener('error', onError);
    video.removeEventListener('ended', onEnded);

    // Add new listeners
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('error', onError);
    video.addEventListener('ended', onEnded);
  };

  const handleSkip = () => {
    console.log('VastAdManager: Ad skipped by user');
    onAdComplete();
  };

  const handlePlayClick = async () => {
    console.log('VastAdManager: Play button clicked');
    if (adState === 'ready' && videoUrl) {
      await startVideoPlayback();
    }
  };

  const handleContinue = () => {
    console.log('VastAdManager: User clicked continue after error');
    onAdComplete();
  };

  // Error state with immediate continue option
  if (adState === 'error') {
    return (
      <div className={`absolute inset-0 bg-black flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-4">
          <div className="text-yellow-400 text-lg mb-2">⚠️ Ad Loading Issue</div>
          <p className="text-sm mb-4">Starting main video...</p>
          <button
            onClick={handleContinue}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to Video
          </button>
        </div>
      </div>
    );
  }

  // Loading state with faster timeout on mobile
  if (adState === 'loading') {
    return (
      <div className={`absolute inset-0 bg-black flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading Advertisement...</p>
          <p className="text-sm text-gray-400 mt-2">
            Will continue automatically in {isMobile ? 3 : 5} seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 bg-black ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        controls={false}
      />

      {/* Play button overlay for ready state */}
      {adState === 'ready' && !autoplay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <button
            onClick={handlePlayClick}
            className="bg-white/20 backdrop-blur-sm text-white rounded-full p-8 hover:bg-white/30 transition-colors"
          >
            <Play size={64} fill="white" />
          </button>
        </div>
      )}

      {/* Skip button */}
      {showSkip && adState === 'playing' && (
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90 transition-colors z-10"
        >
          <X size={16} />
          Skip Ad
        </button>
      )}

      {/* Countdown */}
      {adState === 'playing' && !showSkip && countdown > 0 && skipDelay > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg z-10">
          Skip in {countdown}s
        </div>
      )}

      {/* Ad indicator */}
      {adState === 'playing' && (
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded text-sm z-10">
          Advertisement
        </div>
      )}

      {/* Mobile-specific unmute button */}
      {adState === 'playing' && isMobile && (
        <button
          onClick={() => {
            const video = videoRef.current;
            if (video) {
              video.muted = !video.muted;
            }
          }}
          className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1 rounded text-sm z-10"
        >
          🔊 Unmute
        </button>
      )}
    </div>
  );
};

export default VastAdManager;
