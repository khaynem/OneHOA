export default function manifest() {
  return {
    name: 'OneHOA Payment Monitoring',
    short_name: 'OneHOA',
    description: 'Track and record monthly maintenance fee payments',
    start_url: '/payment-monitoring',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/images/HOA_Logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/HOA_Logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/HOA_Logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
  }
}
