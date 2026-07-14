import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { ArquetipoEnum, ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  calcularAreaPercepcao,
  calcularDanoCorpo,
  calcularDefesa,
  calcularDerivados,
  calcularDeslocamento,
  calcularEnergia,
  calcularInventario,
  calcularVida,
} from '@contratados-rpg/shared/regras/agente';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaAlterarDto,
  FichaAlteradaDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { FichaVisualizar } from './visualizar.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';

/**
 * Prova a ficha numa tela só (m3-07): leitura por padrão e **edição no próprio lugar** para
 * dono/mestre (o botão "Editar" troca a leitura pelo formulário na mesma tela; salvar chama
 * `alterarFicha`). Reflete a permissão que o backend arbitra (§14) — um membro comum só vê a
 * ficha, sem editar nem gerir acesso. As ações de acesso disparam os métodos do `FichaService`.
 */
describe('FichaVisualizar', () => {
  const dados: FichaJogadorDadosDto = {
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    nivel: 2,
    prestigio: 0,
    atributos: {
      destreza: 1,
      forca: 1,
      luta: 1,
      pontaria: 1,
      vigor: 1,
      intelecto: 1,
      medicina: 1,
      sentidos: 1,
      social: 1,
      vontade: 1,
    },
    maestria: null,
    estado: { vidaAtual: 5, energiaAtual: 5, sequelas: [], traumas: [], lesoes: [] },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
  };

  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: 7, nome: 'Dono', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { usuarioId: 11, nome: 'Vera', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { usuarioId: 99, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE },
  ];

  function montar(opcoes: {
    usuarioLogadoId: number;
    acessos?: FichaAcessoResumoDto[];
    abaUrl?: string;
  }) {
    const recuperada: FichaRecuperadaDto = { id: 42, campanhaId: 9, usuarioId: 7, nome: 'Kane', dados };
    const fichaService = {
      recuperarFicha: vi.fn(() => of(recuperada)),
      listarAcessos: vi.fn(() => of(opcoes.acessos ?? [])),
      concederAcesso: vi.fn(() => of({ id: 1, fichaId: 42, usuarioId: 11 })),
      revogarAcesso: vi.fn(() => of({ fichaId: 42, usuarioId: 11 })),
      alterarFicha: vi.fn(
        () => of({ id: 42, campanhaId: 9, usuarioId: 7, nome: 'Novo', dados } as FichaAlteradaDto),
      ),
    };
    const campanhaService = { listarMembros: vi.fn(() => of(membros)) };
    const sessaoService = {
      usuario: () => ({ id: opcoes.usuarioLogadoId, login: 'u', nome: 'U', token: 't' }),
    };

    // Stub do tempo real: um `Subject` controlável para `ficha:alterada` e um Signal de reconexão.
    const fichaAlterada$ = new Subject<FichaAlteradaDto>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      reconexao,
      conectado: signal(true),
    };

    TestBed.configureTestingModule({
      imports: [FichaVisualizar],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map([
                ['campanhaId', '9'],
                ['id', '42'],
              ]),
              queryParamMap: new Map<string, string>(
                opcoes.abaUrl ? [['aba', opcoes.abaUrl]] : [],
              ),
            },
            parent: null,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FichaVisualizar);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      fichaService,
      tempoRealService,
      fichaAlterada$,
      reconexao,
    };
  }

  it('exibe a ficha para um membro comum sem edição inline nem painel de acesso', () => {
    // Usuário 11 não é dono (dono é 7) nem mestre (mestre é 99): só vê (ajustavel = false).
    const { raiz, fixture, fichaService } = montar({ usuarioLogadoId: 11 });
    expect(raiz.querySelector('app-ficha-visualizacao')).not.toBeNull();
    expect(fixture.componentInstance['podeGerenciar']()).toBe(false);
    expect(raiz.querySelector('.acesso')).toBeNull();
    // Não deve buscar acessos de quem não pode geri-los.
    expect(fichaService.listarAcessos).not.toHaveBeenCalled();
  });

  it('gere o acesso via menu → dialog para o dono, com elegíveis corretos', () => {
    const { raiz, fixture, fichaService } = montar({ usuarioLogadoId: 7 });
    // Edição no próprio lugar: a leitura recebe ajustavel = true (dono/mestre).
    expect(fixture.componentInstance['podeGerenciar']()).toBe(true);
    expect(fichaService.listarAcessos).toHaveBeenCalledWith(42);
    // O painel de acesso não ocupa o corpo: só aparece ao abrir a dialog pelo menu.
    expect(raiz.querySelector('.acesso')).toBeNull();
    fixture.componentInstance['abrirAcesso']();
    fixture.detectChanges();
    expect(raiz.querySelector('.dialogo .acesso')).not.toBeNull();
    // Elegíveis excluem o dono (7) e o mestre (99): resta só Vera (11).
    const elegiveis = fixture.componentInstance['membrosElegiveis']();
    expect(elegiveis.map((membro) => membro.nome)).toEqual(['Vera']);
    const rotulos = Array.from(raiz.querySelectorAll('.acesso__select option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(rotulos).toContain('Vera');
    expect(rotulos).not.toContain('Mestre');
    expect(rotulos).not.toContain('Dono');
  });

  it('oferece o menu de acesso também para o mestre', () => {
    const { raiz, fixture } = montar({ usuarioLogadoId: 99 });
    expect(fixture.componentInstance['podeGerenciar']()).toBe(true);
    // O botão de menu (kebab) aparece; a dialog abre por ele.
    expect(raiz.querySelector('.ficha-pagina__menu-botao')).not.toBeNull();
    fixture.componentInstance['abrirAcesso']();
    fixture.detectChanges();
    expect(raiz.querySelector('.dialogo .acesso')).not.toBeNull();
  });

  it('ajusta a vitalidade na hora (otimista) e persiste os cliques em lote via alterarFicha', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaService } = montar({ usuarioLogadoId: 7 });
      const componente = fixture.componentInstance;

      componente['ajustarVitalidade']({ campo: 'vidaAtual', valor: 3 });
      // Otimista: a tela já reflete o novo valor, sem esperar o backend.
      expect(componente['ficha']()?.dados.estado.vidaAtual).toBe(3);
      expect(fichaService.alterarFicha).not.toHaveBeenCalled();

      componente['ajustarVitalidade']({ campo: 'vidaAtual', valor: 2 });
      vi.advanceTimersByTime(500);

      // Cliques seguidos viram um único PUT, com o último valor.
      expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
      expect(fichaService.alterarFicha).toHaveBeenCalledWith(42, {
        nome: 'Kane',
        dados: { ...dados, estado: { ...dados.estado, vidaAtual: 2 } },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('edita as listas de Sanidade otimista e persiste em lote (m3-12)', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaService } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      const novasSequelas = [{ nome: 'Vertigem' }];
      componente['ajustarSanidade']({
        sequelas: novasSequelas,
        traumas: dados.estado.traumas,
        lesoes: dados.estado.lesoes,
      });

      // Otimista: os três blocos entram no estado sem esperar o backend.
      expect(componente['ficha']()?.dados.estado.sequelas).toEqual(novasSequelas);
      vi.advanceTimersByTime(500);

      expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
      expect(fichaService.alterarFicha).toHaveBeenCalledWith(42, {
        nome: 'Kane',
        dados: { ...dados, estado: { ...dados.estado, sequelas: novasSequelas } },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('editar o Nível soma o delta de progressão às máximas stored (m3-10)', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;

    // Semeia máximas stored na ficha carregada.
    const carregada = componente['ficha']()!;
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        estado: { ...carregada.dados.estado, vidaMaxima: 100, energiaMaxima: 50 },
      },
    });

    const nivelAntigo = carregada.dados.nivel; // 2
    componente['ajustarCampoDados']({ campo: 'nivel', valor: nivelAntigo + 1 });

    const deltaVida =
      calcularVida({ classe: dados.classe, nivel: nivelAntigo + 1, vigor: dados.atributos.vigor }) -
      calcularVida({ classe: dados.classe, nivel: nivelAntigo, vigor: dados.atributos.vigor });
    const novo = componente['ficha']()!.dados;
    expect(novo.nivel).toBe(nivelAntigo + 1);
    // A máxima stored (100) recebeu o delta — não recalculou do zero.
    expect(novo.estado.vidaMaxima).toBe(100 + deltaVida);
  });

  it('editar o Nível soma o delta aos derivados stored que dependem do Nível', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;

    // Semeia derivados stored (Combatente, atributos 1). Nível 2 → 4 (cruza o marco 3 do furtivo).
    const carregada = componente['ficha']()!;
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        derivados: {
          defesa: 20,
          esquiva: 22,
          bloqueio: 25,
          proficiencia: 5,
          habilidadesPorTurno: 9,
          deslocamento: 9,
          percepcao: 10,
          inventarioMaximo: 5,
          danoFurtivo: '1D6+1',
          danoCorpoACorpo: '1D3 [Físico]',
        },
      },
    });

    componente['ajustarCampoDados']({ campo: 'nivel', valor: 4 });

    const novos = componente['ficha']()!.dados.derivados!;
    // Defesa 10+Nível: +2 ao subir 2→4; Esquiva/Bloqueio idem (10+Nível+atributo).
    expect(novos.defesa).toBe(22);
    expect(novos.esquiva).toBe(24);
    expect(novos.bloqueio).toBe(27);
    // Proficiência = Nível: +2.
    expect(novos.proficiencia).toBe(7);
    // Hab./Turno: os Níveis 2 e 4 dão +1 cada → +1 ao subir 2→4.
    expect(novos.habilidadesPorTurno).toBe(10);
    // Dano Furtivo: cruza 1 marco (Nível 3) → +1D6+1.
    expect(novos.danoFurtivo).toBe('2D6+2');
    // Derivados que não dependem do Nível passam intactos (Dano C.a.C. depende de atributo, não Nível).
    expect(novos.deslocamento).toBe(9);
    expect(novos.percepcao).toBe(10);
    expect(novos.inventarioMaximo).toBe(5);
    expect(novos.danoCorpoACorpo).toBe('1D3 [Físico]');
  });

  it('editar atributos impacta os derivados dependentes (Sentidos→Percepção, Vigor→Vida, …)', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;

    // Combatente, Nível 2, atributos 1. Dano C.a.C. semeado = calculado (não customizado).
    const carregada = componente['ficha']()!;
    const classe = carregada.dados.classe;
    const nivel = carregada.dados.nivel; // 2
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        estado: { ...carregada.dados.estado, vidaMaxima: 100, energiaMaxima: 50 },
        derivados: {
          defesa: 12,
          esquiva: 13,
          bloqueio: 13,
          deslocamento: 9,
          proficiencia: 2,
          percepcao: 10,
          inventarioMaximo: 5,
          habilidadesPorTurno: 5,
          danoFurtivo: '1D6+1',
          danoCorpoACorpo: calcularDanoCorpo({ classe, forca: 1, vigor: 1 }),
        },
      },
    });

    const novosAtributos = {
      ...carregada.dados.atributos,
      sentidos: 3,
      vigor: 4,
      destreza: 5,
      forca: 6,
    };
    componente['ajustarAtributos']({ atributos: novosAtributos, maestria: null });
    const d = componente['ficha']()!.dados;

    // Máximas somam o delta do atributo (no Nível atual), sem recalcular do zero.
    const deltaVida =
      calcularVida({ classe, nivel, vigor: 4 }) - calcularVida({ classe, nivel, vigor: 1 });
    expect(d.estado.vidaMaxima).toBe(100 + deltaVida);
    const deltaEnergia =
      calcularEnergia({ classe, nivel, destreza: 5 }) - calcularEnergia({ classe, nivel, destreza: 1 });
    expect(d.estado.energiaMaxima).toBe(50 + deltaEnergia);

    // Percepção (Sentidos), Inventário (Força), Deslocamento (Destreza).
    expect(d.derivados!.percepcao).toBe(
      10 + (calcularAreaPercepcao({ sentidos: 3 }) - calcularAreaPercepcao({ sentidos: 1 })),
    );
    expect(d.derivados!.inventarioMaximo).toBe(
      5 + (calcularInventario({ classe, forca: 6 }) - calcularInventario({ classe, forca: 1 })),
    );
    expect(d.derivados!.deslocamento).toBe(
      9 + (calcularDeslocamento({ classe, destreza: 5 }) - calcularDeslocamento({ classe, destreza: 1 })),
    );

    // Esquiva soma Destreza, Bloqueio soma Vigor; Defesa base (Nível) não muda com atributo.
    const defAntes = calcularDefesa({ classe, nivel, destreza: 1, vigor: 1 })!;
    const defDepois = calcularDefesa({ classe, nivel, destreza: 5, vigor: 4 })!;
    expect(d.derivados!.esquiva).toBe(13 + (defDepois.esquiva - defAntes.esquiva));
    expect(d.derivados!.bloqueio).toBe(13 + (defDepois.bloqueio - defAntes.bloqueio));
    expect(d.derivados!.defesa).toBe(12);

    // Dano C.a.C. recalcula (não foi customizado): Força+Vigor 2 → 10.
    expect(d.derivados!.danoCorpoACorpo).toBe(calcularDanoCorpo({ classe, forca: 6, vigor: 4 }));
    // O que não depende de atributo fica intacto (Dano Furtivo, Proficiência, Hab./Turno).
    expect(d.derivados!.danoFurtivo).toBe('1D6+1');
    expect(d.derivados!.proficiencia).toBe(2);
    expect(d.derivados!.habilidadesPorTurno).toBe(5);
  });

  it('preserva o Dano C.a.C. customizado ao mudar atributos (só recalcula se não foi editado)', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;
    const carregada = componente['ficha']()!;
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        derivados: { danoCorpoACorpo: '9D6+9 [Custom]' },
      },
    });

    componente['ajustarAtributos']({
      atributos: { ...carregada.dados.atributos, forca: 6, vigor: 4 },
      maestria: null,
    });

    // Valor editado à mão diverge do calculado → preservado.
    expect(componente['ficha']()!.dados.derivados!.danoCorpoACorpo).toBe('9D6+9 [Custom]');
  });

  it('trocar de arquétipo aplica o delta dos Atributos Bônus fixos (Lutador → Mercenário)', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;
    const carregada = componente['ficha']()!;

    // Ficha como Lutador, com o bônus (+1 Luta, +1 Força) já embutido nos atributos.
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.LUTADOR,
        atributos: { ...carregada.dados.atributos, luta: 3, forca: 4, pontaria: 1, destreza: 2 },
      },
    });

    componente['ajustarClasse']({ classe: ClasseEnum.COMBATENTE, arquetipo: ArquetipoEnum.MERCENARIO });

    const a = componente['ficha']()!.dados.atributos;
    // Sai +1 Luta / +1 Força (Lutador); entra +1 Pontaria / +1 Destreza (Mercenário).
    expect(a.luta).toBe(2);
    expect(a.forca).toBe(3);
    expect(a.pontaria).toBe(2);
    expect(a.destreza).toBe(3);
    // Os demais atributos ficam intactos.
    expect(a.vigor).toBe(carregada.dados.atributos.vigor);
    expect(componente['ficha']()!.dados.arquetipo).toBe(ArquetipoEnum.MERCENARIO);
  });

  it('entrar num arquétipo adiciona os bônus e a progressão propaga aos derivados', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;
    const carregada = componente['ficha']()!; // Combatente, arquétipo null, atributos 1
    const classe = carregada.dados.classe;

    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        arquetipo: null,
        derivados: { inventarioMaximo: calcularInventario({ classe, forca: 1 }) },
      },
    });

    componente['ajustarClasse']({ classe, arquetipo: ArquetipoEnum.LUTADOR });

    const d = componente['ficha']()!.dados;
    // Lutador: +1 Luta, +1 Força.
    expect(d.atributos.luta).toBe(2);
    expect(d.atributos.forca).toBe(2);
    // Força 1 → 2 faz o Inventário (stored) acompanhar via a progressão.
    expect(d.derivados!.inventarioMaximo).toBe(calcularInventario({ classe, forca: 2 }));
  });

  it('trocar de classe recalcula Vida/Energia e derivados do zero (descarta ajuste; clampa a atual)', () => {
    const { fixture } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;
    const carregada = componente['ficha']()!; // Combatente, nível 2, atributos 1
    const nivel = carregada.dados.nivel;

    // Máximas e um derivado CUSTOMIZADOS (divergentes do cálculo) + atuais infladas.
    componente['ficha'].set({
      ...carregada,
      dados: {
        ...carregada.dados,
        arquetipo: null,
        estado: {
          ...carregada.dados.estado,
          vidaMaxima: 999,
          energiaMaxima: 999,
          vidaAtual: 999,
          energiaAtual: 999,
        },
        derivados: { defesa: 50 },
      },
    });

    componente['ajustarClasse']({
      classe: ClasseEnum.ESPECIALISTA,
      arquetipo: ArquetipoEnum.ENGENHEIRO,
    });

    const d = componente['ficha']()!.dados;
    // Recalculado do zero para Especialista (não 999 + delta).
    expect(d.estado.vidaMaxima).toBe(
      calcularVida({ classe: ClasseEnum.ESPECIALISTA, nivel, vigor: d.atributos.vigor }),
    );
    expect(d.estado.energiaMaxima).toBe(
      calcularEnergia({ classe: ClasseEnum.ESPECIALISTA, nivel, destreza: d.atributos.destreza }),
    );
    // A atual (999) foi clampada ao novo teto.
    expect(d.estado.vidaAtual).toBe(d.estado.vidaMaxima);
    expect(d.estado.energiaAtual).toBe(d.estado.energiaMaxima);
    // Derivados recalculados do zero (não o defesa 50 customizado).
    expect(d.derivados).toEqual(calcularDerivados(ClasseEnum.ESPECIALISTA, nivel, d.atributos));
  });

  it('concede acesso ao membro selecionado e recarrega os acessos', () => {
    const { fixture, fichaService } = montar({ usuarioLogadoId: 7 });
    const componente = fixture.componentInstance;
    componente['membroParaConceder'].setValue(11);

    componente['conceder']();

    expect(fichaService.concederAcesso).toHaveBeenCalledWith(42, 11);
    // Boot (1) + recarga pós-concessão (2).
    expect(fichaService.listarAcessos).toHaveBeenCalledTimes(2);
  });

  it('revoga o acesso de um membro concedido (na dialog)', () => {
    const { raiz, fixture, fichaService } = montar({
      usuarioLogadoId: 7,
      acessos: [{ usuarioId: 11, nome: 'Vera' }],
    });
    fixture.componentInstance['abrirAcesso']();
    fixture.detectChanges();
    expect(raiz.querySelector('.dialogo .acesso__item')).not.toBeNull();

    fixture.componentInstance['revogar'](11);

    expect(fichaService.revogarAcesso).toHaveBeenCalledWith(42, 11);
  });

  it('entra na sala da ficha ao abrir e a esquece ao destruir (m3-08)', () => {
    const { fixture, tempoRealService } = montar({ usuarioLogadoId: 99 });
    expect(tempoRealService.conectar).toHaveBeenCalled();
    expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(42);
    expect(tempoRealService.sairSalaFicha).not.toHaveBeenCalled();
    fixture.destroy();
    expect(tempoRealService.sairSalaFicha).toHaveBeenCalledWith(42);
  });

  it('aplica o ficha:alterada recebido por WebSocket sem recarregar (critério de aceite)', () => {
    // O mestre (99) vê a ficha aberta; um ficha:alterada do jogador chega pela sala e atualiza a tela.
    const { fixture, fichaAlterada$, fichaService } = montar({ usuarioLogadoId: 99 });
    const componente = fixture.componentInstance;
    expect(componente['ficha']()?.nome).toBe('Kane');

    const remota: FichaAlteradaDto = {
      id: 42,
      campanhaId: 9,
      usuarioId: 7,
      nome: 'Kane Ferido',
      dados: { ...dados, estado: { ...dados.estado, vidaAtual: 1 } },
    };
    fichaAlterada$.next(remota);

    // Atualizou o estado local — sem novo GET (recuperarFicha só no boot).
    expect(componente['ficha']()?.nome).toBe('Kane Ferido');
    expect(componente['ficha']()?.dados.estado.vidaAtual).toBe(1);
    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(1);
  });

  it('mescla o remoto com a edição local pendente: o campo remoto entra e o local sobrevive (m3-17)', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaAlterada$ } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      // O mestre ajusta a Vida (edição local pendente, debounce de 500ms em voo).
      componente['ajustarVitalidade']({ campo: 'vidaAtual', valor: 4 });
      expect(componente['ficha']()?.dados.estado.vidaAtual).toBe(4);

      // Dentro da janela, o jogador renomeia a ficha — campo que o mestre NÃO está editando.
      fichaAlterada$.next({
        id: 42,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Kane Renomeado',
        dados,
      } as FichaAlteradaDto);

      // O nome remoto entra; o ajuste local de Vida não é perdido.
      expect(componente['ficha']()?.nome).toBe('Kane Renomeado');
      expect(componente['ficha']()?.dados.estado.vidaAtual).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('o PUT em lote carrega o campo remoto mesclado — não sobrescreve a edição concorrente (m3-17)', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaAlterada$, fichaService } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      componente['ajustarVitalidade']({ campo: 'vidaAtual', valor: 4 });
      fichaAlterada$.next({
        id: 42,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Kane Renomeado',
        dados,
      } as FichaAlteradaDto);

      vi.advanceTimersByTime(500); // dispara o save debounced

      // É esta asserção que fecha a perda de dados: o payload leva o nome do jogador.
      expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
      const [, corpo] = fichaService.alterarFicha.mock.calls[0] as unknown as [
        number,
        FichaAlterarDto,
      ];
      expect(corpo.nome).toBe('Kane Renomeado');
      expect(corpo.dados.estado.vidaAtual).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignora eventos de outra ficha; no MESMO campo a edição local vence até salvar', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaAlterada$ } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      // Evento de outra ficha (id 7) é ignorado.
      fichaAlterada$.next({
        id: 7,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Outra',
        dados,
      } as FichaAlteradaDto);
      expect(componente['ficha']()?.nome).toBe('Kane');

      // Mesmo campo (`nome`) editado nos dois lados: o local vence até salvar (m3-17).
      componente['ajustarNome']('Editando');
      fichaAlterada$.next({
        id: 42,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Remoto',
        dados,
      } as FichaAlteradaDto);
      expect(componente['ficha']()?.nome).toBe('Editando');

      // Ao concluir o save (debounced), a resposta autoritativa reconcilia e libera novos remotos.
      vi.advanceTimersByTime(500);
      fichaAlterada$.next({
        id: 42,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Remoto Pós-Save',
        dados,
      } as FichaAlteradaDto);
      expect(componente['ficha']()?.nome).toBe('Remoto Pós-Save');
    } finally {
      vi.useRealTimers();
    }
  });

  it('um erro de save libera a edição pendente — não congela os live-updates', () => {
    vi.useFakeTimers();
    try {
      const { fixture, fichaService, fichaAlterada$ } = montar({ usuarioLogadoId: 99 });
      const componente = fixture.componentInstance;

      // O próximo save falha (ex.: 400/403 revalidado pelo backend).
      fichaService.alterarFicha.mockReturnValueOnce(throwError(() => new Error('400')));
      componente['ajustarNome']('Tentativa');
      vi.advanceTimersByTime(500); // dispara o save → erro → catchError libera a flag

      // Com a flag liberada, um ficha:alterada remoto volta a ser aplicado (não fica congelado).
      fichaAlterada$.next({
        id: 42,
        campanhaId: 9,
        usuarioId: 7,
        nome: 'Remoto',
        dados,
      } as FichaAlteradaDto);
      expect(componente['ficha']()?.nome).toBe('Remoto');
    } finally {
      vi.useRealTimers();
    }
  });

  it('o refetch da reconexão mescla em vez de engolir a edição local pendente (m3-17)', () => {
    const { fixture, reconexao, fichaService } = montar({ usuarioLogadoId: 99 });
    const componente = fixture.componentInstance;

    // Um save que nunca resolve mantém `edicaoPendente` verdadeiro (PUT em voo).
    fichaService.alterarFicha.mockReturnValueOnce(NEVER);
    componente['ajustarVitalidade']({ campo: 'vidaAtual', valor: 4 });

    // A reconexão traz um documento com o nome mudado por outro usuário.
    fichaService.recuperarFicha.mockReturnValueOnce(
      of({ id: 42, campanhaId: 9, usuarioId: 7, nome: 'Kane Remoto', dados } as FichaRecuperadaDto),
    );
    reconexao.set(1);
    fixture.detectChanges();

    // O nome remoto entra; o ajuste local em voo não é descartado pelo refetch.
    expect(componente['ficha']()?.nome).toBe('Kane Remoto');
    expect(componente['ficha']()?.dados.estado.vidaAtual).toBe(4);
  });

  it('ressincroniza a ficha aberta ao reconectar (§9)', () => {
    const { fixture, reconexao, fichaService } = montar({ usuarioLogadoId: 99 });
    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(1);

    // Uma reconexão bumpa o Signal → refetch da ficha aberta.
    reconexao.set(1);
    fixture.detectChanges();

    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(2);
  });

  // === Deep-link das abas (m3-11) ===

  it('deep-link: o ?aba= válido da URL semeia a aba ativa da ficha (refresh preserva)', () => {
    const { raiz } = montar({ usuarioLogadoId: 99, abaUrl: 'combate' });
    // O painel de Combate está montado (não a Visão Geral) — a aba veio da URL.
    expect(raiz.querySelector('#painel-combate')).not.toBeNull();
    expect(raiz.querySelector('#painel-visao-geral')).toBeNull();
  });

  it('deep-link: um ?aba= inválido cai na Visão Geral', () => {
    const { raiz } = montar({ usuarioLogadoId: 99, abaUrl: 'inexistente' });
    expect(raiz.querySelector('#painel-visao-geral')).not.toBeNull();
  });

  it('reflete a aba escolhida no ?aba= da URL sem empilhar histórico (replaceUrl)', () => {
    const { fixture } = montar({ usuarioLogadoId: 99 });
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');

    fixture.componentInstance['mudarAba']('sanidade');

    expect(navegar).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { aba: 'sanidade' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });
});
