import type { FichaAlteradaDto } from '@contratados-rpg/shared/dtos/ficha';

/**
 * Merge de três vias entre o documento da ficha que veio do servidor (`base`), o que está na tela
 * com as edições do usuário (`local`) e o que acabou de chegar por `ficha:alterada` (`remoto`).
 *
 * Para cada **folha**: se o `local` divergiu da `base`, o usuário editou aquele campo e ele
 * prevalece; senão, entra o valor do `remoto`. Assim um evento remoto atualiza tudo o que o usuário
 * **não** está editando, e o `PUT` seguinte — que serializa o documento inteiro — deixa de
 * sobrescrever a edição concorrente de outro usuário (m3-17).
 *
 * **Folhas** são primitivos e **arrays**: as sub-coleções (`sequelas`, `traumas`, `lesoes`,
 * `habilidades`, `inventario.*`) são atômicas, tudo ou nada. O contrato `m3-01` não dá `id` aos
 * itens, então não há identidade estável para mesclar item a item.
 *
 * **Chaves ausentes** (`derivados`, `estado.vidaMaxima`… faltam em fichas anteriores à `m3-10`) são
 * tratadas pela mesma regra: a presença conta como valor. Chave que só o `remoto` tem entra; chave
 * que a `base` tinha e o `remoto` removeu sai; chave que só o `local` tem é edição local e fica.
 *
 * Não muta os documentos recebidos.
 *
 * Não vive em `shared/` de propósito: é política de apresentação, não regra de jogo (§6.3).
 */
export function mesclarFicha(
  base: FichaAlteradaDto,
  local: FichaAlteradaDto,
  remoto: FichaAlteradaDto,
): FichaAlteradaDto {
  return mesclarValor(base, local, remoto) as FichaAlteradaDto;
}

/** Marcador de chave ausente — distinto de `undefined` como valor. */
const AUSENTE = Symbol('ausente');

type Ausente = typeof AUSENTE;

function mesclarValor(base: unknown, local: unknown, remoto: unknown): unknown {
  if (ehObjetoSimples(base) && ehObjetoSimples(local) && ehObjetoSimples(remoto)) {
    return mesclarObjeto(base, local, remoto);
  }
  return saoIguais(local, base) ? remoto : local;
}

function mesclarObjeto(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  remoto: Record<string, unknown>,
): Record<string, unknown> {
  const chaves = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remoto)]);
  const mesclado: Record<string, unknown> = {};

  for (const chave of chaves) {
    const valorBase = ler(base, chave);
    const valorLocal = ler(local, chave);
    const valorRemoto = ler(remoto, chave);

    // Os três presentes e todos objetos: desce mais um nível.
    if (
      ehObjetoSimples(valorBase) &&
      ehObjetoSimples(valorLocal) &&
      ehObjetoSimples(valorRemoto)
    ) {
      mesclado[chave] = mesclarObjeto(valorBase, valorLocal, valorRemoto);
      continue;
    }

    // Folha (ou presença divergente): o local só vence se tiver editado.
    const vencedor = saoIguais(valorLocal, valorBase) ? valorRemoto : valorLocal;
    if (vencedor !== AUSENTE) {
      mesclado[chave] = vencedor;
    }
  }

  return mesclado;
}

function ler(objeto: Record<string, unknown>, chave: string): unknown | Ausente {
  return chave in objeto ? objeto[chave] : AUSENTE;
}

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Igualdade profunda — arrays e objetos comparados por conteúdo; `AUSENTE` só é igual a si mesmo. */
function saoIguais(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, indice) => saoIguais(item, b[indice]));
  }
  if (ehObjetoSimples(a) && ehObjetoSimples(b)) {
    const chavesA = Object.keys(a);
    const chavesB = Object.keys(b);
    return (
      chavesA.length === chavesB.length &&
      chavesA.every((chave) => chave in b && saoIguais(a[chave], b[chave]))
    );
  }
  return false;
}
