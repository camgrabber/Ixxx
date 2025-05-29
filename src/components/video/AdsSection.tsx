import React, { useEffect } from 'react';
import AdContainer from '@/components/AdContainer';
import { Ad } from '@/models/Ad';

interface AdsSectionProps {
  ads: Ad[];
  className?: string;
  staggerDelay?: boolean;
  baseDelaySeconds?: number;
  positionClass?: string;
  instancePrefix?: string;
}

const AdsSection: React.FC<AdsSectionProps> = ({ 
  ads, 
  className = "", 
  staggerDelay = false, 
  baseDelaySeconds = 0,
  positionClass = "",
  instancePrefix = ""
}) => {
  useEffect(() => {
    if (ads.length > 0) {
      console.log(`AdsSection: Rendering ${ads.length} ads in ${positionClass || 'unknown'} section with prefix ${instancePrefix} - INSTANT LOADING`);
    }
  }, [ads, positionClass, instancePrefix]);

  if (ads.length === 0) return null;

  return (
    <div 
      className={`ads-section ${positionClass} ${className}`}
      style={{ 
        width: '100%',
        display: 'block',
        position: 'relative'
      }}
    >
      {ads.map((ad, index) => {
        // Remove all delays - load instantly
        const delaySeconds = 0;
        
        // Create unique key and instance ID using prefix, timestamp and index
        const uniqueKey = `${ad.id}-${ad.position}-${index}-${instancePrefix}-${Date.now()}`;
        const instanceId = `${instancePrefix}-${index}-${Date.now()}`;
        
        console.log(`AdsSection: Rendering ad ${ad.name} at position ${ad.position} with INSTANT loading (0s delay) and instance ID ${instanceId}`);
        
        return (
          <div 
            key={uniqueKey} 
            className={`ad-item-${positionClass}`}
            style={{
              width: '100%',
              marginBottom: index < ads.length - 1 ? '8px' : '0',
              display: 'block'
            }}
          >
            <AdContainer 
              adType={ad.type} 
              adCode={ad.code} 
              className={`ad-in-${positionClass}`}
              delaySeconds={delaySeconds}
              position={ad.position}
              adId={ad.id}
              adName={ad.name}
              instanceId={instanceId}
            />
          </div>
        );
      })}
    </div>
  );
};

export default AdsSection;
