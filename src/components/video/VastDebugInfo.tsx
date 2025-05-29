import React from 'react';
import { Ad } from '@/models/Ad';

interface VastDebugInfoProps {
  vastAds: {
    preroll: Ad[];
    midroll: Ad[];
    postroll: Ad[];
  };
  prerollAdTag?: string;
  midrollAdTags: Array<{ time: number; adTag: string; adType: 'vast' | 'vpaid' | 'ima' }>;
  postrollAdTag?: string;
}

const VastDebugInfo: React.FC<VastDebugInfoProps> = ({
  vastAds,
  prerollAdTag,
  midrollAdTags,
  postrollAdTag
}) => {
  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-[9999]">
      <h3 className="font-bold text-yellow-400 mb-2">VAST Debug Info</h3>
      
      <div className="mb-2">
        <strong>Raw VAST Ads from DB:</strong>
        <div>Preroll: {vastAds.preroll.length} ads</div>
        <div>Midroll: {vastAds.midroll.length} ads</div>
        <div>Postroll: {vastAds.postroll.length} ads</div>
      </div>
      
      <div className="mb-2">
        <strong>Processed for Player:</strong>
        <div>Preroll Tag: {prerollAdTag ? 'YES' : 'NO'}</div>
        <div>Midroll Tags: {midrollAdTags.length}</div>
        <div>Postroll Tag: {postrollAdTag ? 'YES' : 'NO'}</div>
      </div>
      
      {prerollAdTag && (
        <div className="mb-2">
          <strong>Preroll URL:</strong>
          <div className="text-green-400 break-all">{prerollAdTag}</div>
        </div>
      )}
      
      {vastAds.preroll.length > 0 && (
        <div className="mb-2">
          <strong>First Preroll Ad Code:</strong>
          <div className="text-blue-400 break-all max-h-20 overflow-y-auto">
            {vastAds.preroll[0].code.substring(0, 200)}...
          </div>
        </div>
      )}
    </div>
  );
};

export default VastDebugInfo;
