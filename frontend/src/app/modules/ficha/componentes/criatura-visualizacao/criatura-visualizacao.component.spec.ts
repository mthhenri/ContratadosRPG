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
    ataques: [{ nome: 'Golpe', teste: 'lutad20kh1+3', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', danoCritico: '8D12+20', tipoDano: TipoDanoEnum.FISICO, area: false }],
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
      'imagemMudou', 'removerImagem', 'focoMudou',
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

  it('rola o crítico de um ataque — fórmula independente de danoCritico, não o dobro de dano', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarAtaque'](dados.ataques[0], true);
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].rotulo).toBe('Golpe (Crítico)');
    expect(bandeja.entradas()[0].formula).toBe('8D12+20');
  });

  it('rola um teste de atributo e mostra o resultado na bandeja', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarTesteAtributo']('vontade');
    expect(bandeja.entradas()).toHaveLength(1);
    // vontade=4 (Atributo Final) é a contagem de dados; +5 é o modificador FRACO em VD30 (valor
    // fixo somado ao resultado — nunca aumenta o pool, ver `criatura-rolagem.ts`).
    expect(bandeja.entradas()[0].formula).toBe('vontaded20kh1+5');
  });

  it('botão Teste do ataque rola a fórmula própria de ataque.teste, não mais um atributo isolado', () => {
    const { fixture, bandeja } = montar();
    fixture.componentInstance['rolarTesteAtaque'](dados.ataques[0]);
    expect(bandeja.entradas()).toHaveLength(1);
    expect(bandeja.entradas()[0].formula).toBe('lutad20kh1+3');
  });

  it('repassa a lista de ataques editada para ataquesMudou', () => {
    const { fixture, eventos } = montar();
    const novos = [...dados.ataques, { nome: 'Segundo', teste: 'forcad20kh1+1', custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '2D10', danoCritico: '4D10', tipoDano: TipoDanoEnum.FISICO, area: false }];
    fixture.componentInstance['aoAtaquesMudar'](novos);
    expect(eventos['ataquesMudou']).toEqual([novos]);
  });

  it('renderiza a designação e o VD vindos dos dados', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.criatura__designacao')?.textContent?.trim()).toBe('A Estátua');
    expect(raiz.querySelector('.criatura__stat--vd')?.textContent).toContain('30');
  });

  it('renderiza a lista de ataques vinda dos dados na aba Ataques', () => {
    const { fixture } = montar();
    fixture.componentInstance['selecionarAba']('ataques');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelectorAll('.ataque-lista__nome').length).toBe(1);
  });

  it('começa na aba Geral e tem as 4 abas (Geral/Descrição/Ataques/Habilidades)', () => {
    const { fixture } = montar();
    expect(fixture.componentInstance['abaAtiva']()).toBe('geral');
    const rotulos = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.criatura__aba span'),
    ).map((el) => el.textContent?.trim());
    expect(rotulos).toEqual(['Geral', 'Descrição', 'Ataques', 'Habilidades']);
  });

  it('a aba Habilidades renderiza só a lista de habilidades (separada de Ataques)', () => {
    const { fixture } = montar();
    fixture.componentInstance['selecionarAba']('habilidades');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.habilidade-lista')).not.toBeNull();
    expect(raiz.querySelector('.ataque-lista__nome')).toBeNull();
  });

  it('a aba Geral mostra Cadência, Bônus de Iniciativa e Deslocamento na mesma linha', () => {
    const { fixture } = montar();
    const linha = (fixture.nativeElement as HTMLElement).querySelector('.criatura__stats--info')!;
    expect(linha.querySelector('.criatura__stat--deslocamento')).not.toBeNull();
    expect(linha.textContent).toContain('Cadência');
    expect(linha.textContent).toContain('Bônus de Iniciativa');
    expect(linha.textContent).toContain('Deslocamento');
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

  it('a barra superior mostra o rótulo e o badge FICHA-CRT com o id zero-padded', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.criatura__rotulo-secao')?.textContent?.trim()).toBe('Ficha de Criatura');
    expect(raiz.querySelector('.chip-classificacao')?.textContent?.trim()).toBe('FICHA-CRT-0004');
  });

  it('o <input type=color> emite corMudou quando a cor muda', () => {
    const { fixture, eventos } = montar();
    const componente = fixture.componentInstance;
    componente['corCriaturaForm'].setValue('#336699');
    expect(eventos['corMudou']).toEqual(['#336699']);
  });

  it('sem imagem, não mostra o selo de ajustar enquadramento', () => {
    const { fixture } = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.criatura__avatar-enquadrar')).toBeNull();
  });

  describe('enquadramento do avatar (pan/zoom)', () => {
    function montarComImagem() {
      const resultado = montar();
      resultado.fixture.componentRef.setInput('imagemUrl', 'https://exemplo.test/estatua.webp');
      resultado.fixture.detectChanges();
      return resultado;
    }

    it('o selo de enquadramento abre o seletor pra imagem existente, sem arquivo pendente', () => {
      const { fixture } = montarComImagem();
      const raiz = fixture.nativeElement as HTMLElement;
      (raiz.querySelector('.criatura__avatar-enquadrar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(raiz.querySelector('app-ajuste-enquadramento-imagem')).not.toBeNull();
      expect(fixture.componentInstance['arquivoPendente']()).toBeNull();
    });

    it('confirmar o enquadramento de uma imagem existente só emite focoMudou (sem imagemMudou)', () => {
      const { fixture, eventos } = montarComImagem();
      fixture.componentInstance['abrirEnquadramentoExistente']();
      fixture.componentInstance['confirmarEnquadramento']({ x: 30, y: 40, escala: 1.4 });
      expect(eventos['focoMudou']).toEqual([{ x: 30, y: 40, escala: 1.4 }]);
      expect(eventos['imagemMudou']).toEqual([]);
      expect(fixture.componentInstance['enquadramentoOrigem']()).toBeNull();
    });

    it('selecionar um arquivo novo não emite imagemMudou direto — abre o enquadramento primeiro', () => {
      const { fixture, eventos } = montar();
      const arquivo = new File(['x'], 'nova.png', { type: 'image/png' });
      fixture.componentInstance['aoSelecionarImagem']({
        target: { files: [arquivo], value: '' },
      } as unknown as Event);
      expect(eventos['imagemMudou']).toEqual([]);
      expect(fixture.componentInstance['enquadramentoOrigem']()).toBe(arquivo);
      expect(fixture.componentInstance['arquivoPendente']()).toBe(arquivo);
    });

    it('confirmar o enquadramento de um arquivo novo emite imagemMudou e focoMudou juntos', () => {
      const { fixture, eventos } = montar();
      const arquivo = new File(['x'], 'nova.png', { type: 'image/png' });
      fixture.componentInstance['aoSelecionarImagem']({
        target: { files: [arquivo], value: '' },
      } as unknown as Event);
      fixture.componentInstance['confirmarEnquadramento']({ x: 10, y: 20, escala: 1 });
      expect(eventos['imagemMudou']).toEqual([arquivo]);
      expect(eventos['focoMudou']).toEqual([{ x: 10, y: 20, escala: 1 }]);
      expect(fixture.componentInstance['arquivoPendente']()).toBeNull();
    });

    it('fecharEnquadramento (Cancelar) não emite nada', () => {
      const { fixture, eventos } = montarComImagem();
      fixture.componentInstance['abrirEnquadramentoExistente']();
      fixture.componentInstance['fecharEnquadramento']();
      expect(eventos['focoMudou']).toEqual([]);
      expect(eventos['imagemMudou']).toEqual([]);
      expect(fixture.componentInstance['enquadramentoOrigem']()).toBeNull();
    });
  });
});
