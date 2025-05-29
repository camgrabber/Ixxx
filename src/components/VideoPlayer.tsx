import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import LoadingOverlay from './video/LoadingOverlay';
import ErrorOverlay from './video/ErrorOverlay';
import VastAdManager from './video/VastAdManager';
import Hls from 'hls.js';

interface VideoPlayerProps {
  src: string;
  title: string;
  disableClickToToggle?: boolean;
  prerollAdTag?: string;
  prerollAdType?: 'vast' | 'vpaid' | 'ima';
  midrollAdTags?: Array<{ time: number; adTag: string; adType: 'vast' | 'vpaid' | 'ima' }>;
  postrollAdTag?: string;
  postrollAdType?: 'vast' | 'vpaid' | 'ima';
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  title, 
  disableClickToToggle = false,
  prerollAdTag,
  prerollAdType = 'vast',
  midrollAdTags = [],
  postrollAdTag,
  postrollAdType = 'vast'
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const adTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // VAST ad state
  const [currentAdState, setCurrentAdState] = useState<'none' | 'preroll' | 'midroll' | 'postroll'>('none');
  const [currentMidrollAd, setCurrentMidrollAd] = useState<{ time: number; adTag: string; adType: 'vast' | 'vpaid' | 'ima' } | null>(null);
  const [processedMidrolls, setProcessedMidrolls] = useState<Set<number>>(new Set());
  const [mainVideoStarted, setMainVideoStarted] = useState(false);
  const [prerollCompleted, setPrerollCompleted] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Detect mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  console.log('VideoPlayer: Current state:', {
    currentAdState,
    mainVideoStarted,
    prerollCompleted,
    prerollAdTag: !!prerollAdTag,
    loading,
    error,
    isMobile,
    userInteracted
  });

  // Initialize video player - determine if we should show preroll or start main video
  useEffect(() => {
    console.log('VideoPlayer: Initialization effect running');
    
    // Clear any existing timeout
    if (adTimeoutRef.current) {
      clearTimeout(adTimeoutRef.current);
    }

    // If we have a preroll ad and haven't completed it yet, show it
    if (prerollAdTag && !prerollCompleted && !mainVideoStarted) {
      console.log('VideoPlayer: Showing preroll ad');
      setCurrentAdState('preroll');
      setLoading(false);
      
      // Set a shorter timeout on mobile devices
      const timeoutDuration = isMobile ? 10000 : 15000;
      adTimeoutRef.current = setTimeout(() => {
        console.log(`VideoPlayer: Preroll timeout (${timeoutDuration/1000}s) - starting main video`);
        setCurrentAdState('none');
        setPrerollCompleted(true);
        setMainVideoStarted(true);
      }, timeoutDuration);
    } else {
      console.log('VideoPlayer: No preroll or already completed - starting main video');
      setCurrentAdState('none');
      setPrerollCompleted(true);
      setMainVideoStarted(true);
    }

    return () => {
      if (adTimeoutRef.current) {
        clearTimeout(adTimeoutRef.current);
      }
    };
  }, [prerollAdTag, prerollCompleted, mainVideoStarted, isMobile]);

  // Setup main video when ad state is 'none'
  useEffect(() => {
    if (currentAdState !== 'none' || !mainVideoStarted) return;

    const video = videoRef.current;
    if (!video || !src) return;
    
    console.log('VideoPlayer: Setting up main video source:', src);
    
    // Clean up existing HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setLoading(true);

    // Check for HLS stream
    if (src.includes('.m3u8') && Hls.isSupported()) {
      try {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('VideoPlayer: HLS manifest parsed');
          setLoading(false);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('VideoPlayer: Fatal HLS error:', data);
            setError(`Failed to load video: ${data.type} error`);
            setLoading(false);
            hls.destroy();
          }
        });
        
        hlsRef.current = hls;
      } catch (e) {
        console.error("VideoPlayer: Error setting up HLS:", e);
        setError("Failed to initialize HLS player");
        setLoading(false);
      }
    } else {
      // Regular video
      console.log('VideoPlayer: Using regular video element');
      video.src = src;
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, currentAdState, mainVideoStarted]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentAdState !== 'none') return;

    const onLoadedMetadata = () => {
      console.log('VideoPlayer: Video metadata loaded');
      setDuration(video.duration);
      setLoading(false);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    const onError = () => {
      console.error("VideoPlayer: Video error:", video.error);
      setError("Failed to load video. Please try again.");
      setLoading(false);
    };

    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setIsPlaying(true);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    const onEnded = () => {
      setIsPlaying(false);
      if (postrollAdTag && mainVideoStarted && prerollCompleted) {
        console.log('VideoPlayer: Main video ended, showing postroll ad');
        setCurrentAdState('postroll');
      }
    };

    // Add listeners
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [currentAdState, postrollAdTag, mainVideoStarted, prerollCompleted]);

  // Check for midroll ads
  useEffect(() => {
    if (currentAdState !== 'none' || !mainVideoStarted || !prerollCompleted || midrollAdTags.length === 0) return;

    midrollAdTags.forEach(midroll => {
      if (
        currentTime >= midroll.time && 
        currentTime < midroll.time + 1 && 
        !processedMidrolls.has(midroll.time)
      ) {
        console.log(`VideoPlayer: Triggering midroll ad at ${midroll.time}s:`, midroll.adTag);
        setCurrentMidrollAd(midroll);
        setCurrentAdState('midroll');
        setProcessedMidrolls(prev => new Set(prev).add(midroll.time));
        
        // Pause main video
        const video = videoRef.current;
        if (video && !video.paused) {
          video.pause();
        }
      }
    });
  }, [currentTime, midrollAdTags, processedMidrolls, currentAdState, mainVideoStarted, prerollCompleted]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying || currentAdState !== 'none') return;
    
    const timeoutId = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, showControls, currentAdState]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Ad event handlers
  const handlePrerollComplete = () => {
    console.log('VideoPlayer: Preroll completed successfully');
    if (adTimeoutRef.current) {
      clearTimeout(adTimeoutRef.current);
    }
    setCurrentAdState('none');
    setPrerollCompleted(true);
    setMainVideoStarted(true);
    setUserInteracted(true);
  };

  const handleMidrollComplete = () => {
    console.log('VideoPlayer: Midroll completed');
    setCurrentAdState('none');
    setCurrentMidrollAd(null);
    
    // Resume main video
    const video = videoRef.current;
    if (video) {
      video.play().catch(console.error);
    }
  };

  const handlePostrollComplete = () => {
    console.log('VideoPlayer: Postroll completed');
    setCurrentAdState('none');
  };

  const handleAdError = (error: string) => {
    console.error('VideoPlayer: Ad error:', error);
    if (adTimeoutRef.current) {
      clearTimeout(adTimeoutRef.current);
    }
    
    // Continue with video on ad error
    if (currentAdState === 'preroll') {
      console.log('VideoPlayer: Preroll failed, starting main video');
      setPrerollCompleted(true);
      setMainVideoStarted(true);
      setCurrentAdState('none');
    } else if (currentAdState === 'midroll') {
      handleMidrollComplete();
    } else if (currentAdState === 'postroll') {
      handlePostrollComplete();
    }
  };

  const handleAdStarted = () => {
    console.log('VideoPlayer: Ad started successfully');
    if (adTimeoutRef.current) {
      clearTimeout(adTimeoutRef.current);
    }
    setUserInteracted(true);
  };

  // Player controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || currentAdState !== 'none') return;

    setUserInteracted(true);
    if (video.paused) {
      setMainVideoStarted(true);
      video.play().catch(err => {
        console.error("Error playing video:", err);
        setError("Could not play video");
      });
    } else {
      video.pause();
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || currentAdState !== 'none') return;
    
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video || currentAdState !== 'none') return;
    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video || currentAdState !== 'none') return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleVideoClick = () => {
    setShowControls(true);
    setUserInteracted(true);
    if (!disableClickToToggle && currentAdState === 'none') {
      togglePlay();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const video = videoRef.current;
    if (video) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        if (src.includes('.m3u8') && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          hlsRef.current = hls;
        }
      } else {
        video.load();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden"
      onMouseMove={handleMouseMove}
      onDoubleClick={toggleFullscreen}
    >
      {/* Loading and error overlays */}
      {loading && !error && currentAdState === 'none' && <LoadingOverlay />}
      {error && <ErrorOverlay errorMessage={error} onRetry={handleRetry} />}
      
      {/* Main video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        title={title}
        playsInline
        onClick={handleVideoClick}
        style={{ display: currentAdState === 'none' ? 'block' : 'none' }}
      />
      
      {/* VAST Ad Overlays */}
      {currentAdState === 'preroll' && prerollAdTag && (
        <VastAdManager
          vastUrl={prerollAdTag}
          onAdComplete={handlePrerollComplete}
          onAdError={handleAdError}
          onAdStarted={handleAdStarted}
          skipDelay={5}
          autoplay={!isMobile}
          className="z-50"
        />
      )}
      
      {currentAdState === 'midroll' && currentMidrollAd && (
        <VastAdManager
          vastUrl={currentMidrollAd.adTag}
          onAdComplete={handleMidrollComplete}
          onAdError={handleAdError}
          onAdStarted={handleAdStarted}
          skipDelay={5}
          autoplay={!isMobile}
          className="z-50"
        />
      )}
      
      {currentAdState === 'postroll' && postrollAdTag && (
        <VastAdManager
          vastUrl={postrollAdTag}
          onAdComplete={handlePostrollComplete}
          onAdError={handleAdError}
          onAdStarted={handleAdStarted}
          skipDelay={3}
          autoplay={!isMobile}
          className="z-50"
        />
      )}
      
      {/* Video controls - only show when no ads are playing */}
      {showControls && currentAdState === 'none' && (prerollCompleted || !prerollAdTag) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              className="w-full h-2 bg-gray-600 rounded-full"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${progress}%, rgba(255,255,255,0.3) ${progress}%)`
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={togglePlay} className="text-white hover:text-primary">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              
              <button onClick={skipBackward} className="text-white hover:text-primary">
                <SkipBack size={20} />
              </button>
              
              <button onClick={skipForward} className="text-white hover:text-primary">
                <SkipForward size={20} />
              </button>
              
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <button onClick={toggleMute} className="text-white hover:text-primary">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-gray-600 rounded-full"
                />
              </div>
              
              <button onClick={toggleMute} className="md:hidden text-white hover:text-primary">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              
              <button onClick={toggleFullscreen} className="text-white hover:text-primary">
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
