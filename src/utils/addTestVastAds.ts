import { supabase } from '@/integrations/supabase/client';

// Test VAST ad URLs - these are example VAST XML URLs
const TEST_VAST_ADS = [
  {
    name: 'Test Preroll VAST Ad',
    type: 'vast' as const,
    position: 'before-video' as const,
    code: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    is_active: true
  },
  {
    name: 'Test Midroll VAST Ad',
    type: 'vast' as const,
    position: 'video-middle' as const,
    code: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    is_active: true
  },
  {
    name: 'Test Postroll VAST Ad',
    type: 'vast' as const,
    position: 'after-video' as const,
    code: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    is_active: true
  }
];

export const addTestVastAds = async () => {
  try {
    console.log('Adding test VAST ads to database...');
    
    // First, let's check if any VAST ads already exist
    const { data: existingVastAds, error: checkError } = await supabase
      .from('ads')
      .select('*')
      .eq('type', 'vast');
    
    if (checkError) {
      console.error('Error checking existing VAST ads:', checkError);
      return false;
    }
    
    if (existingVastAds && existingVastAds.length > 0) {
      console.log('VAST ads already exist in database:', existingVastAds.length);
      return true;
    }
    
    // Add the test VAST ads
    const { data, error } = await supabase
      .from('ads')
      .insert(TEST_VAST_ADS)
      .select();
    
    if (error) {
      console.error('Error adding test VAST ads:', error);
      return false;
    }
    
    console.log('Successfully added test VAST ads:', data);
    return true;
  } catch (error) {
    console.error('Error in addTestVastAds:', error);
    return false;
  }
};
