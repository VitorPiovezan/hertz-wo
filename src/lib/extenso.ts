/**
 * Valor em reais por extenso, para o recibo.
 * Ex.: 1234.5 -> "mil duzentos e trinta e quatro reais e cinquenta centavos"
 */

const UNIDADES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** 1..999 */
function ate999(n: number): string {
  if (n === 100) return 'cem';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena) partes.push(CENTENAS[centena]);
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }
  return partes.join(' e ');
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero';

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const grupos: string[] = [];
  if (milhoes) grupos.push(milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`);
  if (milhares) grupos.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`);
  if (resto) grupos.push(ate999(resto));

  if (grupos.length === 1) return grupos[0];

  // "mil e duzentos" quando o último grupo é redondo ou menor que 100;
  // "mil duzentos e cinquenta" no resto dos casos.
  const ultimo = grupos[grupos.length - 1];
  const anteriores = grupos.slice(0, -1).join(', ');
  const usaE = resto === 0 || resto < 100 || resto % 100 === 0;
  return `${anteriores}${usaE ? ' e ' : ' '}${ultimo}`;
}

export function valorPorExtenso(valor: number): string {
  const arredondado = Math.round(valor * 100) / 100;
  const inteiro = Math.floor(arredondado);
  const centavos = Math.round((arredondado - inteiro) * 100);

  // "um milhão DE reais", mas "um milhão e duzentos mil reais".
  const terminaEmMilhao = inteiro >= 1_000_000 && inteiro % 1_000_000 === 0;
  const reais =
    inteiro === 1
      ? 'um real'
      : `${inteiroPorExtenso(inteiro)}${terminaEmMilhao ? ' de' : ''} reais`;
  if (centavos === 0) return reais;

  const parteCentavos = centavos === 1 ? 'um centavo' : `${inteiroPorExtenso(centavos)} centavos`;
  return inteiro === 0 ? parteCentavos : `${reais} e ${parteCentavos}`;
}
