import type { NextConfig } from "next";

const cabecalhosDeSeguranca = [
  // O app não pode ser aberto dentro de outro site (evita "clickjacking")
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Comprovantes e documentos: fotos são reduzidas no celular, PDFs vão até 4 MB.
    // A Vercel recusa qualquer requisição acima de 4,5 MB.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
