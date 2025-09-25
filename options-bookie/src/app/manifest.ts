import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OptionsBookie - Options Trading Tracker',
    short_name: 'OptionsBookie',
    description: 'Professional options trading tracker with real-time analytics and portfolio management.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['finance', 'business', 'productivity'],
    lang: 'en',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/images/OptionBookie1.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/OptionBookie1.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/images/OptionBookie1.png',
        sizes: '1280x720',
        type: 'image/png',
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
