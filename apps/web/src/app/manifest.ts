import type { MetadataRoute } from 'next';

/** Lets Cherri be installed to the home screen as an app (Android "Install app", iPhone "Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cherri · women’s health',
    short_name: 'Cherri',
    description: 'Cycle tracking, doctor consults, lab decoding and a doctor-ready report. Private and made for India.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF5F3',
    theme_color: '#4A2340',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
