export default function manifest() {
  return {
    name: 'OneHOA',
    short_name: 'OneHOA',
    description: 'Homeowner Records Management, Payment Tracking and Receipts',
    start_url: '/landing',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/images/HOA%20Logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/HOA%20Logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/HOA%20Logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
  }
}
