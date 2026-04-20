// Lightweight GA4 helpers

type GAParams = Record<string, any>;

const isGAReady = (): boolean => {
  // @ts-ignore
  return typeof window !== 'undefined' && typeof (window as any).gtag === 'function';
};

export const trackPageView = (path?: string, title?: string) => {
  if (!isGAReady()) return;
  const GA_ID = (window as any).GA_MEASUREMENT_ID;
  (window as any).gtag('event', 'page_view', {
    page_title: title || document.title,
    page_location: window.location.href,
    page_path: path || window.location.pathname,
    send_to: GA_ID,
  });
};

export const trackEvent = (name: string, params: GAParams = {}) => {
  if (!isGAReady()) return;
  (window as any).gtag('event', name, params);
};

export const setUserProperty = (properties: GAParams) => {
  if (!isGAReady()) return;
  (window as any).gtag('set', 'user_properties', properties);
};


