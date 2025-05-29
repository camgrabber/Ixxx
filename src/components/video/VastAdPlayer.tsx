import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface VastAdPlayerProps {
  vastUrl: string;
  onAdComplete?: () => void;
  onAdError?: (error: string) => void;
  className?: string;
  autoplay?: boolean;
  showSkip?: boolean;
  skipDelay?: number;
}

const VastAdPlayer: React.FC<VastAdPlayerProps> = ({
  vastUrl,
  onAdComplete,
  onAdError,
  className = '',
  autoplay = true,
  showSkip = true,
  skipDelay = 5
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [countdown, setCountdown] = useState(skipDelay);
  const [adStarted, setAdStarted] = useState(false);

  useEffect(() => {
    if (!vastUrl) {
      setError('No VAST URL provided');
      return;
    }

    console.log('VastAdPlayer: Loading VAST ad from URL:', vastUrl);
    loadVastAd();
  }, [vastUrl]);

  // Countdown timer for skip button
  useEffect(() => {
    if (!adStarted || !showSkip) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setShowSkipButton(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adStarted, showSkip]);

  const loadVastAd = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if URL is already a direct video file
      if (isDirectVideoUrl(vastUrl)) {
        console.log('VastAdPlayer: Direct video URL detected');
        loadDirectVideo(vastUrl);
        return;
      }

      // Fetch VAST XML
      console.log('VastAdPlayer: Fetching VAST XML from:', vastUrl);
      const response = await fetch(vastUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch VAST XML: ${response.status}`);
      }

      const vastXml = await response.text();
      console.log('VastAdPlayer: VAST XML received, length:', vastXml.length);
      
      const videoUrl = parseVastXml(vastXml);
      if (videoUrl) {
        console.log('VastAdPlayer: Extracted video URL:', videoUrl);
        loadDirectVideo(videoUrl);
      } else {
        throw new Error('No video URL found in VAST XML');
      }
    } catch (err) {
      console.error('VastAdPlayer: Error loading VAST ad:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load VAST ad';
      setError(errorMessage);
      setLoading(false);
      onAdError?.(errorMessage);
    }
  };

  const isDirectVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const parseVastXml = (xmlString: string): string | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('VastAdPlayer: XML parsing error:', parserError.textContent);
        return null;
      }

      // Try multiple selectors to find media files
      const selectors = [
        'MediaFile',
        'MediaFiles MediaFile',
        'Linear MediaFiles MediaFile',
        'InLine Creatives Creative Linear MediaFiles MediaFile'
      ];

      for (const selector of selectors) {
        const mediaFiles = xmlDoc.querySelectorAll(selector);
        console.log(`VastAdPlayer: Found ${mediaFiles.length} media files with selector: ${selector}`);
        
        if (mediaFiles.length > 0) {
          // Prefer MP4 files, fall back to first available
          let selectedMedia = null;
          
          for (const media of Array.from(mediaFiles)) {
            const type = media.getAttribute('type') || '';
            const url = media.textContent?.trim();
            
            if (url) {
              if (type.includes('mp4') || url.includes('.mp4')) {
                selectedMedia = media;
                break;
              } else if (!selectedMedia) {
                selectedMedia = media;
              }
            }
          }
          
          if (selectedMedia) {
            const videoUrl = selectedMedia.textContent?.trim();
            if (videoUrl) {
              console.log('VastAdPlayer: Selected media file:', videoUrl);
              return videoUrl;
            }
          }
        }
      }

      console.warn('VastAdPlayer: No suitable media files found in VAST XML');
      return null;
    } catch (err) {
      console.error('VastAdPlayer: Error parsing VAST XML:', err);
      return null;
    }
  };

  const loadDirectVideo = (videoUrl: string) => {
    const video = videoRef.current;
    if (!video) return;

    video.src = videoUrl;
    
    video.addEventListener('loadeddata', () => {
      console.log('VastAdPlayer: Video loaded successfully');
      setLoading(false);
      
      if (autoplay) {
        video.play().catch(err => {
          console.error('VastAdPlayer: Autoplay failed:', err);
          setError('Click to play ad');
        });
      }
    });

    video.addEventListener('play', () => {
      console.log('VastAdPlayer: Video started playing');
      setAdStarted(true);
    });

    video.addEventListener('ended', () => {
      console.log('VastAdPlayer: Video ended');
      onAdComplete?.();
    });

    video.addEventListener('error', (e) => {
      console.error('VastAdPlayer: Video error:', e);
      setError('Failed to play video ad');
      setLoading(false);
      onAdError?.('Failed to play video ad');
    });
  };

  const handleSkip = () => {
    console.log('VastAdPlayer: Ad skipped by user');
    onAdComplete?.();
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  if (error) {
    return (
      <div className={`bg-black flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-white text-center p-4">
          <p className="text-lg mb-2">❌ {error}</p>
          <button
            onClick={() => onAdComplete?.()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black min-h-[200px] ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Loading VAST ad...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleVideoClick}
        playsInline
        muted={false}
        controls={false}
      />

      {/* Skip button */}
      {showSkipButton && showSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90 transition-colors z-10"
        >
          <X size={16} />
          Skip Ad
        </button>
      )}

      {/* Countdown */}
      {adStarted && !showSkipButton && showSkip && countdown > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg z-10">
          Skip in {countdown}s
        </div>
      )}
    </div>
  );
};

export default VastAdPlayer;
