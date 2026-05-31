// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'images.unsplash.com',
//       },
//       // ✅ Local Development
//       {
//         protocol: 'http',
//         hostname: 'localhost',
//         port: '8000',
//         pathname: '/media/**',
//       },
//       // ✅ Production Backend (Render)
//       {
//         protocol: 'https',
//         hostname: 'dating-platform-backend.onrender.com',
//         pathname: '/media/**', 
//       },
//     ],
//     dangerouslyAllowSVG: true,
//     unoptimized: process.env.NODE_ENV === 'development',
//   },
// };

// module.exports = nextConfig;


import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Allow opening dev app from LAN IP (e.g. http://192.168.135.1:3001)
  allowedDevOrigins: ["192.168.135.1"],
  images: {
    remotePatterns: [
      // ✅ Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },

      // ✅ Cloudinary (IMPORTANT)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },

      // ✅ Local Development
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },

      // ✅ Production Backend (Render)
      {
        protocol: "https",
        hostname: "dating-platform-backend.onrender.com",
        pathname: "/media/**",
      },
    ],

    // ⚡ Recommended for Cloudinary (no distortion)
    unoptimized: false,

    // ⚡ Keep SVG safe if needed
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;