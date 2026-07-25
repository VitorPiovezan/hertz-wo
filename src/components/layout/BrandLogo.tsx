'use client';

import { LPX_LOGO_CURTA_LIGHT, LPX_LOGO_CURTA_DARK } from '@/lib/logo';

/**
 * Logo da LPX Tech no cabeçalho da aplicação.
 *
 * São duas imagens em vez de um filtro CSS: o "LPX" do arquivo original é
 * preto e sumiria no tema escuro, mas o X laranja/azul e o "Tech" precisam
 * manter a cor — um `invert` no CSS estragaria os dois.
 *
 * A altura vem do `className` (ex.: "h-7"); a largura acompanha sozinha.
 */
export function BrandLogo({ className = 'h-7' }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LPX_LOGO_CURTA_LIGHT}
        alt="LPX Tech"
        className={`${className} w-auto dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LPX_LOGO_CURTA_DARK}
        alt="LPX Tech"
        className={`${className} w-auto hidden dark:block`}
      />
    </>
  );
}
