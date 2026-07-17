import { FormacaoBonusEnum, FormacaoParametroEnum } from '../../enums';
import type { FormacaoDefinicaoDto } from './identidade.dtos';

/**
 * As 21 linhas da tabela de bônus de **Formação** (`docs/core/sistema-v4.1.0.md` — "⬦ Formação"),
 * transcritas 1:1. `codigo`/`grupo`/`rotulo` conferidos contra o documento; `parametro` só nas
 * linhas que exigem escolha do jogador (categoria de arma, tipo de dano, atributo, condição,
 * esquiva/bloqueio).
 *
 * **Cobertura real: 5 de 21.** Só as linhas com `efeito.alvo` em `DERIVADO`/`DERIVADO_ESCOLHA`/
 * `DANO_CORPO`/`DANO_FURTIVO_DADO` têm campo hoje em `FichaDerivadosDto` e são aplicadas por
 * `aplicarFormacaoAosDerivados`. As outras 16 (`ROLAGEM`/`RESISTENCIA`/`SOBRECARGA`/`INICIATIVA`/
 * `DT_REPARO`) **não têm consumidor ainda** — o motor de rolagem só nasce na `m3-15` (backlog) e a
 * ficha não modela resistências/Sobrecarga/Iniciativa/DT de reparo.
 *
 * **Aviso à sessão futura — isto não é código morto.** Ao fim da `m3-23`, os alvos `ROLAGEM`,
 * `RESISTENCIA`, `SOBRECARGA`, `INICIATIVA` e `DT_REPARO` estão **corretos, testados e sem nenhum
 * consumidor**. É deliberado (decisão do autor): quando os campos existirem, muda-se o
 * **aplicador**, não esta tabela. **Não apagar por "não usado".**
 */
export const FORMACOES: Readonly<Record<FormacaoBonusEnum, FormacaoDefinicaoDto>> = {
  // ── Combate (5) ─────────────────────────────────────────────────────────────
  [FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA]: {
    codigo: FormacaoBonusEnum.COMBATE_DADO_CATEGORIA_ARMA,
    grupo: 'Combate',
    rotulo: '+1 dado em testes com uma categoria de arma (Corpo a Corpo, Armas de Fogo, Exótica ou Explosivo)',
    parametro: FormacaoParametroEnum.CATEGORIA_ARMA,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO]: {
    codigo: FormacaoBonusEnum.COMBATE_ESQUIVA_OU_BLOQUEIO,
    grupo: 'Combate',
    rotulo: '+1 de Esquiva ou Bloqueio (escolha um)',
    parametro: FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO,
    efeito: { alvo: 'DERIVADO_ESCOLHA', campos: ['esquiva', 'bloqueio'], valor: 1 },
  },
  [FormacaoBonusEnum.COMBATE_DANO_CORPO]: {
    codigo: FormacaoBonusEnum.COMBATE_DANO_CORPO,
    grupo: 'Combate',
    rotulo: '+1 no dano de Corpo (golpes desarmados)',
    parametro: null,
    efeito: { alvo: 'DANO_CORPO', valor: 1 },
  },
  [FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO]: {
    codigo: FormacaoBonusEnum.COMBATE_RESISTENCIA_TIPO_DANO,
    grupo: 'Combate',
    rotulo: '+3 de resistência contra um tipo de dano (Físico, Balístico, Químico ou Explosão)',
    parametro: FormacaoParametroEnum.TIPO_DANO,
    efeito: { alvo: 'RESISTENCIA', valor: 3 },
  },
  [FormacaoBonusEnum.COMBATE_DANO_FURTIVO_DADO]: {
    codigo: FormacaoBonusEnum.COMBATE_DANO_FURTIVO_DADO,
    grupo: 'Combate',
    rotulo: '+1 dado de dano Furtivo',
    parametro: null,
    efeito: { alvo: 'DANO_FURTIVO_DADO' },
  },
  // ── Movimento (2) ───────────────────────────────────────────────────────────
  [FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO]: {
    codigo: FormacaoBonusEnum.MOVIMENTO_DESLOCAMENTO,
    grupo: 'Movimento',
    rotulo: '+1m de Deslocamento',
    parametro: null,
    efeito: { alvo: 'DERIVADO', campo: 'deslocamento', valor: 1 },
  },
  [FormacaoBonusEnum.MOVIMENTO_DADO_CORRIDA]: {
    codigo: FormacaoBonusEnum.MOVIMENTO_DADO_CORRIDA,
    grupo: 'Movimento',
    rotulo: '+1 dado em testes de Corrida',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  // ── Perícia (4) ─────────────────────────────────────────────────────────────
  [FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO]: {
    codigo: FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO,
    grupo: 'Perícia',
    rotulo: '+1 dado em testes de um atributo específico',
    parametro: FormacaoParametroEnum.ATRIBUTO,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO]: {
    codigo: FormacaoBonusEnum.PERICIA_BONUS_ATRIBUTO,
    grupo: 'Perícia',
    rotulo: '+1 em testes de um atributo específico',
    parametro: FormacaoParametroEnum.ATRIBUTO,
    efeito: { alvo: 'ROLAGEM', modificador: 'BONUS', valor: 1 },
  },
  [FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO_CONDICAO]: {
    codigo: FormacaoBonusEnum.PERICIA_DADO_ATRIBUTO_CONDICAO,
    grupo: 'Perícia',
    rotulo: '+1 dado em testes de um atributo em condição específica (ex.: +1 dado em Destreza para Furtividade)',
    parametro: FormacaoParametroEnum.CONDICAO,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.PERICIA_DADO_INICIATIVA]: {
    codigo: FormacaoBonusEnum.PERICIA_DADO_INICIATIVA,
    grupo: 'Perícia',
    rotulo: '+1 dado em Iniciativa',
    parametro: null,
    efeito: { alvo: 'INICIATIVA', valor: 1 },
  },
  // ── Equipamento (7) ─────────────────────────────────────────────────────────
  [FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_MEDICINAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_MEDICINAIS,
    grupo: 'Equipamento',
    rotulo: '+1 dado em testes com itens medicinais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_MEDICINAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_MEDICINAIS,
    grupo: 'Equipamento',
    rotulo: '+2 em testes com itens medicinais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'BONUS', valor: 2 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_MEDICINAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_MEDICINAIS,
    grupo: 'Equipamento',
    rotulo: '+1 dado de efeito com itens medicinais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_OPERACIONAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_DADO_ITENS_OPERACIONAIS,
    grupo: 'Equipamento',
    rotulo: '+1 dado em testes com itens operacionais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_OPERACIONAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_BONUS_ITENS_OPERACIONAIS,
    grupo: 'Equipamento',
    rotulo: '+2 em testes com itens operacionais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'BONUS', valor: 2 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_OPERACIONAIS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_DADO_EFEITO_ITENS_OPERACIONAIS,
    grupo: 'Equipamento',
    rotulo: '+1 dado de efeito com itens operacionais',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  [FormacaoBonusEnum.EQUIPAMENTO_TURNO_EXTRA_STATUS]: {
    codigo: FormacaoBonusEnum.EQUIPAMENTO_TURNO_EXTRA_STATUS,
    grupo: 'Equipamento',
    rotulo: '+1 turno extra de duração em itens com efeitos de status',
    parametro: null,
    efeito: { alvo: 'ROLAGEM', modificador: 'DADO', valor: 1 },
  },
  // ── Logística (3) ───────────────────────────────────────────────────────────
  [FormacaoBonusEnum.LOGISTICA_INVENTARIO_MAXIMO]: {
    codigo: FormacaoBonusEnum.LOGISTICA_INVENTARIO_MAXIMO,
    grupo: 'Logística',
    rotulo: '+1 na base de cálculo de Inventário',
    parametro: null,
    efeito: { alvo: 'DERIVADO', campo: 'inventarioMaximo', valor: 1 },
  },
  [FormacaoBonusEnum.LOGISTICA_SOBRECARGA]: {
    codigo: FormacaoBonusEnum.LOGISTICA_SOBRECARGA,
    grupo: 'Logística',
    rotulo: '+3 de tolerância de Sobrecarga',
    parametro: null,
    efeito: { alvo: 'SOBRECARGA', valor: 3 },
  },
  [FormacaoBonusEnum.LOGISTICA_DT_REPARO]: {
    codigo: FormacaoBonusEnum.LOGISTICA_DT_REPARO,
    grupo: 'Logística',
    rotulo: 'Reduz a DT de reparo de equipamentos em -2',
    parametro: null,
    efeito: { alvo: 'DT_REPARO', valor: -2 },
  },
};
