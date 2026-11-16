/** @type {import('next').NextConfig} */
const nextConfig = {
  // Die Gesetzesdaten liegen als JSON unter data/ und werden serverseitig gelesen.
  outputFileTracingIncludes: {
    "/api/**": ["./data/gesetze/**", "./data/erlaeuterungen/**"],
  },
};

export default nextConfig;
