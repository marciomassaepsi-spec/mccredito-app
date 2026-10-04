import Image from "next/image";

import { cn } from "cn";

type LogoProps = {
  className?: string;
  width?: number;
  priority?: boolean;
};

/** Logo da MC Créditos sobre fundo branco (o arquivo original tem fundo branco). */
export function Logo({ className, width = 120, priority }: LogoProps) {
  return (
    <span className={cn("inline-flex rounded-lg bg-white px-2 py-1", className)}>
      <Image
        src="/logo.png"
        alt="MC Créditos, a sua loja de créditos"
        width={width}
        height={Math.round((width * 91) / 208)}
        priority={priority}
      />
    </span>
  );
}
