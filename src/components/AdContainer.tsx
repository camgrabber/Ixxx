import React, { useEffect, useRef, useState, useCallback } from 'react';
import VastAdPlayer from './video/VastAdPlayer';

interface AdContainerProps {
  adType: 'monetag' | 'adstera' | 'vast';
  adCode: string;
  className?: string;
  delaySeconds?: number;
  position?: 
    | 'top'
    | 'bottom'
    | 'sidebar'
    | 'in-video'
    | 'below-video'
    | 'before-video'
    | 'after-video'
    | 'sidebar-top'
    | 'sidebar-bottom'
    | 'video-top'
    | 'video-middle'
    | 'video-bottom'
    | 'video-left'
    | 'video-right';
  adId?: string;
  adName?: string;
  instanceId?: string;
}

// Global registry to track ad instances
const globalAdRegistry = new Map<string, number>();

const AdContainer: React.FC<AdContainerProps> = ({ 
  adType, 
  adCode, 
  className, 
  delaySeconds = 0,
  position = 'top',
  adId = '',
  adName = '',
  instanceId = ''
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  
  // Create a unique instance ID
  const uniqueInstanceId = useRef<string>(
    `ad-${adId}-${position}-${instanceId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // Get or increment instance counter for this ad
  const getInstanceNumber = useCallback(() => {
    const key = `${adId}-${position}`;
    const current = globalAdRegistry.get(key) || 0;
    const instanceNumber = current + 1;
    globalAdRegistry.set(key, instanceNumber);
    return instanceNumber;
  }, [adId, position]);

  // Check if the ad code is a VAST URL
  const isVastUrl = useCallback((code: string) => {
    if (!code) return false;
    
    // Check for VAST URL patterns
    const vastPatterns = [
      /\.xml(\?|$)/i,
      /vast/i,
      /vpaid/i,
      /adnxs\.com/i,
      /googlesyndication\.com.*videoplayback/i,
      /doubleclick\.net/i,
      /\.mp4(\?|$)/i,
      /\.webm(\?|$)/i,
      /\.avi(\?|$)/i,
      /\.mov(\?|$)/i
    ];
    
    return vastPatterns.some(pattern => pattern.test(code)) || code.startsWith('http');
  }, []);

  const loadAd = useCallback(() => {
    if (!adContainerRef.current || !adCode || hasLoadedRef.current) {
      return;
    }
    
    const instanceNumber = getInstanceNumber();
    const finalInstanceId = `${uniqueInstanceId.current}-inst-${instanceNumber}`;
    
    console.log(`AdContainer: Loading ${adName} (${adType}) instance ${instanceNumber} at position ${position} with ID ${finalInstanceId}`);
    
    // Check if this should be treated as a VAST ad
    if (adType === 'vast' || isVastUrl(adCode)) {
      console.log(`AdContainer: Detected VAST ad for ${adName}`);
      setIsLoaded(true);
      hasLoadedRef.current = true;
      return;
    }
    
    try {
      const container = adContainerRef.current;
      container.innerHTML = '';
      
      // Create isolated container with overflow containment
      const adWrapper = document.createElement('div');
      adWrapper.id = finalInstanceId;
      adWrapper.setAttribute('data-ad-instance', finalInstanceId);
      adWrapper.setAttribute('data-instance-number', instanceNumber.toString());
      adWrapper.style.cssText = `
        width: 100% !important;
        height: auto !important;
        min-height: 90px !important;
        display: block !important;
        position: relative !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 8px !important;
        box-sizing: border-box !important;
        isolation: isolate !important;
        contain: layout style paint !important;
        background: #f8f9fa !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
      `;
      
      container.appendChild(adWrapper);
      
      // Create iframe sandbox for ad isolation
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        min-height: 90px !important;
        border: none !important;
        display: block !important;
        background: transparent !important;
      `;
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
      
      // Create iframe content with ad code
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: transparent !important;
              font-family: Arial, sans-serif !important;
            }
            * {
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
          </style>
        </head>
        <body>
          ${adCode}
        </body>
        </html>
      `;
      
      iframe.onload = () => {
        console.log(`AdContainer: Iframe loaded for ${adName} instance ${instanceNumber}`);
        setIsLoaded(true);
        hasLoadedRef.current = true;
        
        // Auto-resize iframe based on content
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const resizeObserver = new ResizeObserver(() => {
              const height = Math.max(90, iframeDoc.body.scrollHeight);
              iframe.style.height = `${height}px`;
              adWrapper.style.minHeight = `${height}px`;
            });
            resizeObserver.observe(iframeDoc.body);
          }
        } catch (e) {
          console.log('AdContainer: Could not set up auto-resize, using fixed height');
        }
      };
      
      iframe.onerror = () => {
        console.error(`AdContainer: Iframe error for ${adName} instance ${instanceNumber}`);
        setError('Failed to load ad content');
      };
      
      adWrapper.appendChild(iframe);
      
      // Write content to iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(iframeContent);
        iframeDoc.close();
      }
      
      console.log(`AdContainer: ${adName} instance ${instanceNumber} setup completed with iframe isolation`);
      
    } catch (error) {
      console.error(`AdContainer: Critical error loading ${adName}:`, error);
      setError(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [adCode, adType, position, adName, instanceId, getInstanceNumber, isVastUrl]);

  useEffect(() => {
    if (!adCode) {
      console.warn(`AdContainer: No ad code provided for ${adName || uniqueInstanceId.current}`);
      return;
    }

    if (hasLoadedRef.current) {
      return; // Prevent multiple loads
    }

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    setIsLoaded(false);
    setError(null);

    if (delaySeconds > 0) {
      console.log(`AdContainer: Delaying load of ${adName} (${uniqueInstanceId.current}) by ${delaySeconds}s`);
      loadTimeoutRef.current = setTimeout(loadAd, delaySeconds * 1000);
    } else {
      loadAd();
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [adCode, delaySeconds, loadAd]);

  const getContainerDimensions = () => {
    const defaultSizes = {
      'in-video': { width: 320, height: 50 },
      'top': { width: 728, height: 90 },
      'bottom': { width: 728, height: 90 },
      'sidebar': { width: 300, height: 250 },
      'below-video': { width: 320, height: 100 },
      'before-video': { width: 728, height: 90 },
      'after-video': { width: 728, height: 90 },
      'video-top': { width: 728, height: 90 },
      'video-middle': { width: 728, height: 90 },
      'video-bottom': { width: 728, height: 90 },
      'video-left': { width: 160, height: 600 },
      'video-right': { width: 160, height: 600 },
      'sidebar-top': { width: 300, height: 250 },
      'sidebar-bottom': { width: 300, height: 250 }
    };

    return defaultSizes[position] || { width: 320, height: 90 };
  };

  const dimensions = getContainerDimensions();

  if (!adCode) {
    return null;
  }

  // Render VAST ad player if this is a VAST ad
  if (adType === 'vast' || isVastUrl(adCode)) {
    return (
      <div 
        className={`ad-container-wrapper vast-ad ${position}-position ${className || ''}`}
        style={{
          width: '100%',
          maxWidth: '100%',
          minHeight: `${dimensions.height}px`,
          margin: position === 'in-video' ? '0' : '8px 0',
          display: 'block',
          position: 'relative',
          backgroundColor: 'transparent',
          borderRadius: position === 'in-video' ? '12px' : '8px',
          overflow: 'hidden',
          zIndex: 1,
          isolation: 'isolate',
          contain: 'layout style paint'
        }}
        data-ad-type="vast"
        data-position={position}
        data-ad-id={adId}
        data-ad-name={adName}
        data-instance-id={uniqueInstanceId.current}
      >
        <VastAdPlayer
          vastUrl={adCode}
          className="w-full h-full"
          onAdComplete={() => console.log(`VAST ad completed: ${adName}`)}
          onAdError={(error) => {
            console.error(`VAST ad error for ${adName}:`, error);
            setError(error);
          }}
          autoplay={true}
          showSkip={true}
          skipDelay={5}
        />
      </div>
    );
  }

  return (
    <div 
      className={`ad-container-wrapper ${position}-position ${className || ''}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: `${dimensions.height}px`,
        margin: position === 'in-video' ? '0' : '8px 0',
        display: 'block',
        position: 'relative',
        backgroundColor: 'transparent',
        borderRadius: position === 'in-video' ? '12px' : '8px',
        border: error ? '2px solid #ef4444' : 'none',
        overflow: 'hidden',
        zIndex: 1,
        isolation: 'isolate',
        contain: 'layout style paint'
      }}
      data-ad-type={adType}
      data-position={position}
      data-ad-id={adId}
      data-ad-name={adName}
      data-instance-id={uniqueInstanceId.current}
    >
      {error && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: '#ef4444',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: `${dimensions.height}px`,
          background: '#fee2e2',
          borderRadius: '8px'
        }}>
          <div>
            <div>❌ Ad Load Error</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
              {error}
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={adContainerRef}
        style={{
          width: '100%',
          minHeight: `${dimensions.height}px`,
          position: 'relative',
          display: 'block',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default AdContainer;
