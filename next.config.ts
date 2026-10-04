import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Comprovantes e documentos: fotos são reduzidas no celular, PDFs vão até 4 MB.
    // A Vercel recusa qualquer requisição acima de 4,5 MB.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
