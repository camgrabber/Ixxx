declare global {
  interface Window {
    google?: {
      ima: {
        AdDisplayContainer: new (containerElement: HTMLElement, videoElement?: HTMLVideoElement) => any;
        AdsLoader: new (adDisplayContainer: any) => any;
        AdsRequest: new () => any;
        AdEvent: {
          Type: {
            LOADED: string;
            COMPLETE: string;
            STARTED: string;
            PAUSED: string;
            RESUMED: string;
            SKIPPED: string;
          };
        };
        AdErrorEvent: {
          Type: {
            AD_ERROR: string;
          };
        };
        AdsManagerLoadedEvent: {
          Type: {
            ADS_MANAGER_LOADED: string;
          };
        };
        ViewMode: {
          NORMAL: string;
          FULLSCREEN: string;
        };
      };
    };
  }
}

export {};
