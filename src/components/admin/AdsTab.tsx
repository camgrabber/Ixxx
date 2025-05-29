import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Ad as AdModel, addAd, updateAd, deleteAd } from '@/models/Ad';
import { useToast } from '@/hooks/use-toast';

interface AdsTabProps {
  ads: AdModel[];
}

const AdsTab: React.FC<AdsTabProps> = ({ ads }) => {
  const [newAd, setNewAd] = useState({
    name: '',
    type: 'monetag' as 'monetag' | 'adstera' | 'vast',
    code: '',
    position: 'top' as AdModel['position'],
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('AdsTab: Form submission started with data:', newAd);
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('AdsTab: Already submitting, ignoring');
      return;
    }
    
    // Basic validation
    if (!newAd.name.trim()) {
      console.log('AdsTab: Validation failed - name is empty');
      toast({
        title: "Error",
        description: "Ad name is required.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newAd.code.trim()) {
      console.log('AdsTab: Validation failed - code is empty');
      toast({
        title: "Error", 
        description: "Ad code is required.",
        variant: "destructive",
      });
      return;
    }

    if (!newAd.position) {
      console.log('AdsTab: Validation failed - position is empty');
      toast({
        title: "Error", 
        description: "Position is required.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('AdsTab: Attempting to add ad with validated data:', {
        name: newAd.name.trim(),
        type: newAd.type,
        code: newAd.code.trim(),
        position: newAd.position,
        is_active: newAd.is_active
      });
      
      const result = await addAd({
        name: newAd.name.trim(),
        type: newAd.type,
        code: newAd.code.trim(),
        position: newAd.position,
        is_active: newAd.is_active
      });
      
      console.log('AdsTab: Ad added successfully:', result);
      
      // Reset form only after successful addition
      setNewAd({
        name: '',
        type: 'monetag',
        code: '',
        position: 'top',
        is_active: true
      });
      
      toast({
        title: "Success!",
        description: `${newAd.type.toUpperCase()} ad "${newAd.name}" has been added successfully.`,
      });
    } catch (error) {
      console.error("AdsTab: Error adding ad:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to add ad: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleToggleAd = async (ad: AdModel) => {
    try {
      const updatedAd = { ...ad, is_active: !ad.is_active };
      await updateAd(updatedAd);
      
      toast({
        title: "Ad Updated",
        description: `Ad ${ad.is_active ? 'disabled' : 'enabled'} successfully.`,
      });
    } catch (error) {
      console.error("AdsTab: Error toggling ad:", error);
      toast({
        title: "Error",
        description: "Failed to update ad. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleRemoveAd = async (id: string) => {
    try {
      const success = await deleteAd(id);
      if (success) {
        toast({
          title: "Ad Removed",
          description: "The ad has been removed.",
        });
      } else {
        throw new Error("Failed to delete ad");
      }
    } catch (error) {
      console.error("AdsTab: Error removing ad:", error);
      toast({
        title: "Error",
        description: "Failed to remove ad. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPositionDisplayName = (position: string) => {
    const positionMap: { [key: string]: string } = {
      'top': 'Page Top Banner',
      'in-video': 'Video Overlay (on top of video)',
      'below-video': 'Below Video Details',
      'bottom': 'Page Bottom Banner',
      'sidebar': 'Sidebar General',
      'before-video': 'Before Video Starts (VAST - inside player)',
      'after-video': 'After Video Ends (VAST - inside player)',
      'sidebar-top': 'Sidebar Top Section',
      'sidebar-bottom': 'Sidebar Bottom Section',
      'video-top': 'Above Video Player',
      'video-middle': 'During Video Play (VAST - inside player)',
      'video-bottom': 'Below Video Player',
      'video-left': 'Left Side of Video Player',
      'video-right': 'Right Side of Video Player'
    };
    return positionMap[position] || position;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Add Ad Form */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Ad</CardTitle>
            <CardDescription>
              Configure ads for different positions. VAST ads play inside the video player.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adName">Ad Name</Label>
                <Input
                  id="adName"
                  value={newAd.name}
                  onChange={(e) => setNewAd({ ...newAd, name: e.target.value })}
                  placeholder="E.g. Homepage Top Banner"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adType">Ad Provider</Label>
                <Select 
                  value={newAd.type}
                  onValueChange={(value: 'monetag' | 'adstera' | 'vast') => setNewAd({ ...newAd, type: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ad provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monetag">Monetag (Banner/Pop)</SelectItem>
                    <SelectItem value="adstera">Adstera (Banner/Pop)</SelectItem>
                    <SelectItem value="vast">VAST (Video Ads)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adPosition">Position</Label>
                <Select 
                  value={newAd.position}
                  onValueChange={(value: AdModel['position']) => {
                    console.log('AdsTab: Position selected:', value);
                    setNewAd({ ...newAd, position: value });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">📄 Page Top Banner</SelectItem>
                    <SelectItem value="before-video">🎬 Before Video Starts (VAST - inside player)</SelectItem>
                    <SelectItem value="video-top">📺 Above Video Player</SelectItem>
                    <SelectItem value="video-left">◀️ Left Side of Video Player</SelectItem>
                    <SelectItem value="video-right">▶️ Right Side of Video Player</SelectItem>
                    <SelectItem value="in-video">🎯 Video Overlay (on top of video)</SelectItem>
                    <SelectItem value="video-middle">⏱️ During Video Play (VAST - inside player)</SelectItem>
                    <SelectItem value="video-bottom">📺 Below Video Player</SelectItem>
                    <SelectItem value="below-video">📝 Below Video Details</SelectItem>
                    <SelectItem value="after-video">🏁 After Video Ends (VAST - inside player)</SelectItem>
                    <SelectItem value="sidebar-top">📋 Sidebar Top Section</SelectItem>
                    <SelectItem value="sidebar">📋 Sidebar General</SelectItem>
                    <SelectItem value="sidebar-bottom">📋 Sidebar Bottom Section</SelectItem>
                    <SelectItem value="bottom">📄 Page Bottom Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adCode">Ad Code</Label>
                <Textarea
                  id="adCode"
                  value={newAd.code}
                  onChange={(e) => setNewAd({ ...newAd, code: e.target.value })}
                  placeholder={newAd.type === 'vast' ? 'Paste VAST XML URL here (e.g., https://example.com/vast.xml)' : 'Paste banner/pop ad code here'}
                  rows={5}
                  required
                  disabled={isSubmitting}
                />
                {newAd.type === 'vast' && (
                  <p className="text-sm text-gray-600">
                    💡 For VAST ads, paste the XML URL. These will play as video ads inside the player.
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="adActive"
                  checked={newAd.is_active}
                  onCheckedChange={(checked) => setNewAd({ ...newAd, is_active: checked })}
                  disabled={isSubmitting}
                />
                <Label htmlFor="adActive">Active</Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding Ad...' : 'Add Ad'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      {/* Ad List */}
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Your Ads</h2>
        
        {ads.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No ads configured</p>
            <p className="text-sm text-gray-400">Add your first ad using the form</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <Card key={ad.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h3 className="font-semibold">{ad.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          ad.type === 'monetag' 
                            ? 'bg-blue-100 text-blue-800' 
                            : ad.type === 'adstera'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {ad.type.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                          {getPositionDisplayName(ad.position)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          ad.is_active 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {ad.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`ad-toggle-${ad.id}`}
                          checked={ad.is_active}
                          onCheckedChange={() => handleToggleAd(ad)}
                        />
                        <Label htmlFor={`ad-toggle-${ad.id}`} className="text-sm">
                          {ad.is_active ? 'Enabled' : 'Disabled'}
                        </Label>
                      </div>
                      
                      <Button 
                        onClick={() => handleRemoveAd(ad.id)} 
                        variant="destructive" 
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                    <p className="text-xs text-gray-500 font-mono break-all">
                      {ad.code.length > 100 ? `${ad.code.slice(0, 100)}...` : ad.code}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdsTab;
