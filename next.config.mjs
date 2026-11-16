/** @type {import('next').NextConfig} */
const nextConfig = {
  // Das runde "N" unten links ist ein Entwicklerwerkzeug von Next.js – für die App nicht nötig.
  devIndicators: false,
  // Die Gesetzesdaten liegen als JSON unter data/ und werden serverseitig gelesen.
  outputFileTracingIncludes: {
    "/api/**": ["./data/gesetze/**", "./data/erlaeuterungen/**"],
  },
};

export default nextConfig;
