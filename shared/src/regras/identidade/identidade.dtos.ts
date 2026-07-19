import type { FormacaoBonusEnum, FormacaoParametroEnum } from '../../enums';

/**
 * DTOs e tipos do motor de **Identidade** (`regras/identidade`, m3-23). Fonte:
 * `docs/core/sistema-v4.1.0.md` — "⬡ Identidade" > "⬦ Origem" > "⬦ Formação". Em conflito com o
 * código, o documento vence (proibição #27).
 */

/** Os cinco grupos da tabela de Formação, verbatim do documento. */
export type FormacaoGrupo = 'Combate' | 'Movimento' | 'Perícia' | 'Equipamento' | 'Logística';

/**
 * O efeito mecânico de uma linha de Formação — um descritor declarativo, não uma função sob medida
 * (m3-23). `DERIVADO`/`DERIVADO_ESCOLHA`/`DANO_CORPO`/`DANO_FURTIVO_DADO` têm campo hoje em
 * `FichaDerivadosDto` e são aplicados por `aplicarFormacaoAosDerivados`. `ROLAGEM`/`DURACAO_EFEITO`/
 * `RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/`DT_REPARO` **não têm consumidor ainda** — ficam modelados e corretos,
 * aguardando os campos/motor que os aplicarão (ver aviso em `formacoes.dados.ts`).
 */
export type EfeitoFormacao =
  | { readonly alvo: 'DERIVADO'; readonly campo: 'deslocamento' | 'inventarioMaximo'; readonly valor: number }
  | { readonly alvo: 'DERIVADO_ESCOLHA'; readonly campos: readonly ['esquiva', 'bloqueio']; readonly valor: number }
  | { readonly alvo: 'DANO_CORPO'; readonly valor: number }
  | { readonly alvo: 'DANO_FURTIVO_DADO'; readonly valor: number }
  | { readonly alvo: 'ROLAGEM'; readonly modificador: 'DADO' | 'BONUS'; readonly valor: number }
  | { readonly alvo: 'DURACAO_EFEITO'; readonly valor: number }
  | {
      readonly alvo: 'RESISTENCIA' | 'SOBRECARGA' | 'INICIATIVA' | 'DT_REPARO';
      readonly valor: number;
    };

/** Uma linha da tabela de Formação (`FORMACOES`): código, grupo, rótulo verbatim, parâmetro exigido e efeito. */
export interface FormacaoDefinicaoDto {
  readonly codigo: FormacaoBonusEnum;
  readonly grupo: FormacaoGrupo;
  readonly rotulo: string;
  readonly parametro: FormacaoParametroEnum | null;
  readonly efeito: EfeitoFormacao;
}
