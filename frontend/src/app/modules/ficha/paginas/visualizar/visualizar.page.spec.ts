import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { calcularVida } from '@contratados-rpg/shared/regras/agente';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaAlteradaDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { FichaVisualizar } from './visualizar.page';
import { FichaService } from '../../ficha.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';

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

  function montar(opcoes: { usuarioLogadoId: number; acessos?: FichaAcessoResumoDto[] }) {
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

    TestBed.configureTestingModule({
      imports: [FichaVisualizar],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: SessaoService, useValue: sessaoService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map([
                ['campanhaId', '9'],
                ['id', '42'],
              ]),
            },
            parent: null,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(FichaVisualizar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, fichaService };
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
});
