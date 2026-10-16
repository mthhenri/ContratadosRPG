/** Duração em milissegundos no formato `m:ss,mmm` (com sinal, para offsets negativos). */
export function formatarMilissegundos(valor: number): string {
  const sinal = valor < 0 ? '-' : '';
  const total = Math.abs(Math.trunc(valor));
  const minutos = Math.floor(total / 60000);
  const segundos = Math.floor((total % 60000) / 1000);
  const resto = String(total % 1000).padStart(3, '0');
  return `${sinal}${minutos}:${String(segundos).padStart(2, '0')},${resto}`;
}
