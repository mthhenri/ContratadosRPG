import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  CadenciaEnum, ComportamentoCriaturaEnum, ModificadorCriaturaEnum, NivelAmeacaEnum,
  OrigemCriaturaEnum, PorteCriaturaEnum, TenacidadeEnum, TipoDanoEnum, CustoAcaoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaCriaturaDadosDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaVisualizacao } from './criatura-visualizacao.component';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { FichaRolagemRegistroService } from '../../ficha-rolagem-registro.service';

describe('CriaturaVisualizacao', () => {
  const dados: FichaCriaturaDadosDto = {
    identidade: {
      designacao: 'A Estátua', origem: OrigemCriaturaEnum.ORIGINAL, conceito: 'x',
      naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA, motivacao: 'x', ganchoUnico: 'x',
    },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    // Distribuição fixa da regra: 2 Forte / 3 Médio / 3 Fraco / 2 Frágil (`shared/regras/criatura`).
    modificadores: {
      destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
      pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.MEDIO,
      vontade: ModificadorCriaturaEnum.FRACO,
    },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [{ nome: 'Golpe', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false }],
    habilidades: [], anotacoes: '',
  };

  function montar() {
    TestBed.configureTestingModule({
      imports: [CriaturaVisualizacao],
      providers: [FichaRolagemRegistroService],
    });
    const fixture = TestBed.createComponent(CriaturaVisualizacao);
    fixture.componentRef.setInput('fichaId', 4);
    fixture.componentRef.setInput('nome', 'A Estátua');
    fixture.componentRef.setInput('cor', null);
    fixture.componentRef.setInput('imagemUrl', null);
    fixture.componentRef.setInput('oculta', false);
    fixture.componentRef.setInput('dados', dados);
    fixture.componentRef.setInput('ajustavel', true);
    fixture.detectChanges();

    const eventos: Record<string, unknown[]> = {};
    for (const nome of [
      'vitalidadeMudou', 'defesaMudou', 'identidadeMudou', 'naMudou', 'vdMudou', 'atributosMudou',
      'modificadoresMudou', 'tenacidadeMudou', 'resistenciasMudou', 'fraquezasMudou', 'regeneracaoMudou',
      'porteMudou', 'deslocamentoMudou', 'cadenciaMudou', 'iniciativaBonusMudou', 'ataquesMudou',
      'habilidadesMudou', 'anotacoesMudou', 'nomeMudou', 'corMudou', 'ocultaMudou',
    ] as const) {
      eventos[nome] = [];
      (fixture.componentInstance as never as Record<string, { subscribe: (fn: (v: unknown) => void) => void }>)[nome]
        .subscribe((v: unknown) => eventos[nome].push(v));
    }
    return { fixture, eventos, bandeja: TestBed.inject(BandejaDadosService) };
  }

  it('calcula o Atributo Efetivo (atributo + modificador) por chave', () => {
    const { fixture } = montar();
    // luta=6, modificador FORTE em VD30: base 0 + (30-5)/5*2.5 = 12.5 -> floor 12 => efetivo 18.
    expect(fixture.componentInstance['atributoEfetivo']('luta')).toBe(18);
  });

  it('emite vitalidadeMudou com o campo e valor clampados ao ajustar Vida atual', () => {
    const { fixture, eventos } = montar();
    fixture.componentInstance['ajustarVida'](-5);
    expect(eventos['vitalidadeMudou']).toEqual([{ campo: 'vidaAtual', valor: 95 }]);
  });

  it('rola um ataque e mostra o resultado na bandeja', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarAtaque'](dados.ataques[0]);
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].rotulo).toBe('Golpe');
    expect(bandeja.entradas()[0].formula).toBe('4D12+10');
  });

  it('rola um teste de atributo e mostra o resultado na bandeja', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarTesteAtributo']('vontade');
    expect(bandeja.entradas()).toHaveLength(1);
    // vontade=4 (Atributo Final) é a contagem de dados; +5 é o modificador FRACO em VD30 (valor
    // fixo somado ao resultado — nunca aumenta o pool, ver `criatura-rolagem.ts`).
    expect(bandeja.entradas()[0].formula).toBe('vontaded20kh1+5');
  });

  it('botão Teste do ataque rola o Atributo Efetivo do atributo do ataque, não uma mecânica nova', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarTesteAtaque'](dados.ataques[0]);
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].formula).toBe('lutad20kh1+12');
  });

  it('repassa a lista de ataques editada para ataquesMudou', () => {
    const { fixture, eventos } = montar();
    const novos = [...dados.ataques, { nome: 'Segundo', atributo: 'forca' as const, custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '2D10', tipoDano: TipoDanoEnum.FISICO, area: false }];
    fixture.componentInstance['aoAtaquesMudar'](novos);
    expect(eventos['ataquesMudou']).toEqual([novos]);
  });

  it('renderiza a designação e o VD vindos dos dados', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.criatura__designacao')?.textContent?.trim()).toBe('A Estátua');
    expect(raiz.querySelector('.criatura__stat--vd')?.textContent).toContain('30');
  });

  it('renderiza a lista de ataques vinda dos dados na aba Ataques e Habilidades', () => {
    const { fixture } = montar();
    fixture.componentInstance['selecionarAba']('ataques');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.ataque-lista__nome').length).toBe(1);
  });

  it('a grade de Atributos só vira lista editável depois do lápis do cabeçalho', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.criatura__atributo-card').length).toBe(10);
    expect(raiz.querySelector('.criatura__atributo-linha')).toBeNull();

    fixture.componentInstance['editarAtributos']();
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.criatura__atributo-linha').length).toBe(10);
    expect(raiz.querySelector('.criatura__atributo-card')).toBeNull();

    fixture.componentInstance['cancelarAtributos']();
    fixture.detectChanges();
    expect(raiz.querySelectorAll('.criatura__atributo-card').length).toBe(10);
  });

  it('a edição de Atributos é rascunho: Cancelar descarta e Salvar emite os dois mapas de uma vez', () => {
    const { fixture, eventos } = montar();
    fixture.componentInstance['editarAtributos']();
    fixture.componentInstance['definirAtributoRascunho']('luta', 9);
    fixture.detectChanges();
    expect(eventos['atributosMudou']).toEqual([]);

    fixture.componentInstance['cancelarAtributos']();
    expect(eventos['atributosMudou']).toEqual([]);

    fixture.componentInstance['editarAtributos']();
    fixture.componentInstance['definirAtributoRascunho']('luta', 9);
    fixture.componentInstance['salvarAtributos']();
    expect(eventos['atributosMudou']).toEqual([{ ...dados.atributos, luta: 9 }]);
    expect(eventos['modificadoresMudou']).toEqual([dados.modificadores]);
    expect(fixture.componentInstance['atributosEmEdicao']()).toBe(false);
  });

  it('não salva enquanto a cota fixa de Modificadores (2/3/3/2) não fecha', () => {
    const { fixture, eventos } = montar();
    fixture.componentInstance['editarAtributos']();
    // destreza era FRAGIL: virar FORTE deixa 3 Fortes e 1 Frágil — distribuição inválida.
    fixture.componentInstance['definirModificadorRascunho']('destreza', ModificadorCriaturaEnum.FORTE);
    fixture.detectChanges();

    expect(fixture.componentInstance['violacoesModificadores']().length).toBeGreaterThan(0);
    fixture.componentInstance['salvarAtributos']();
    expect(eventos['modificadoresMudou']).toEqual([]);
    expect(fixture.componentInstance['atributosEmEdicao']()).toBe(true);

    // compensando (um Forte vira Frágil) a cota fecha e o salvamento passa.
    fixture.componentInstance['definirModificadorRascunho']('forca', ModificadorCriaturaEnum.FRAGIL);
    fixture.detectChanges();
    expect(fixture.componentInstance['violacoesModificadores']()).toEqual([]);
    fixture.componentInstance['salvarAtributos']();
    expect(eventos['modificadoresMudou']).toEqual([
      { ...dados.modificadores, destreza: ModificadorCriaturaEnum.FORTE, forca: ModificadorCriaturaEnum.FRAGIL },
    ]);
  });

  it('os chips de classificação só viram selects depois do lápis, já com o valor atual selecionado', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.criatura__chip').length).toBe(4);
    expect(raiz.querySelector('.criatura__classificacao-grade')).toBeNull();

    fixture.componentInstance['alternarEdicaoClassificacao']();
    fixture.detectChanges();

    // Regressão: com `[value]` no <select> as opções ainda não existem quando o binding roda e o
    // controle abria sempre na 1ª opção — o valor atual tem que vir de `[selected]` na opção.
    const selects = Array.from(raiz.querySelectorAll<HTMLSelectElement>('.criatura__classificacao-grade select'));
    expect(selects.map((s) => s.value)).toEqual([
      OrigemCriaturaEnum.ORIGINAL,
      PorteCriaturaEnum.GRANDE,
      ComportamentoCriaturaEnum.CACADORA,
      NivelAmeacaEnum.ALTA,
    ]);
  });

  it('o Atributo Efetivo só ganha destaque quando o modificador está acima do neutro', () => {
    const { fixture } = montar();
    // forca é FORTE e vigor é MEDIO (destacados); destreza é FRAGIL e vontade é FRACO (não).
    expect(fixture.componentInstance['atributoDestacado']('forca')).toBe(true);
    expect(fixture.componentInstance['atributoDestacado']('vigor')).toBe(true);
    expect(fixture.componentInstance['atributoDestacado']('destreza')).toBe(false);
    expect(fixture.componentInstance['atributoDestacado']('vontade')).toBe(false);
  });
});
