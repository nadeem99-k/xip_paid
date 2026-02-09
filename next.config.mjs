/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.telegram.org' },
      { protocol: 'https', hostname: '*.gradio.live' },
      { protocol: 'https', hostname: 'hf.space' },
      { protocol: 'https', hostname: '*.hf.space' }
    ],
  },
};

export default nextConfig;
