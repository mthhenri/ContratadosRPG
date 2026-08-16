import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoDanoEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaCriaturaCriarDto, FichaCriaturaDadosDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaService } from '../../ficha.service';
import { GuiaCriacaoRascunhoService } from '../../guia-criacao-rascunho.service';
import { CriaturaCriar } from './criar-criatura.page';

describe('CriaturaCriar', () => {
  const CAMPANHA_ID = 57;

  function montar(campanhaId: number | null = CAMPANHA_ID, rascunhoExistente: unknown = null) {
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    const fichaService = {
      criarFichaCriatura: vi.fn(() => of({
        id: 99, campanhaId: CAMPANHA_ID, usuarioId: 1, nome: 'A Estátua', cor: null,
        imagemUrl: null, oculta: true, dados: {} as FichaCriaturaDadosDto,
      })),
    };
    const rascunhos = {
      recuperar: vi.fn(() => rascunhoExistente),
      salvar: vi.fn(),
      limpar: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [CriaturaCriar],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => campanhaId !== null ? String(campanhaId) : null } }, parent: null } },
        { provide: Router, useValue: router },
        { provide: FichaService, useValue: fichaService },
        { provide: GuiaCriacaoRascunhoService, useValue: rascunhos },
      ],
    });

    const fixture = TestBed.createComponent(CriaturaCriar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, componente: fixture.componentInstance, fichaService, router, rascunhos };
  }

  afterEach(() => TestBed.resetTestingModule());

  /** Preenche o estado com "A Estátua" (docs/core/guia_de_mestre-v4.0.0.md — "Exemplo de Ficha
   * Completa"), passo a passo, avançando pelo assistente — mesmos valores usados no caso de
   * teste do motor de regras (`shared/src/regras/criatura/a-estatua.spec.ts`, m4-02). */
  function preencherAEstatua(componente: CriaturaCriar): void {
    const atualizar = componente['atualizar'].bind(componente) as (parcial: Partial<Record<string, unknown>>) => void;
    const avancar = componente['avancar'].bind(componente) as () => void;

    atualizar({
      designacao: 'A Estátua', origem: OrigemCriaturaEnum.SCP_ADAPTADO,
      conceito: 'Uma figura de pedra humanoide que só se move quando ninguém a observa diretamente.',
      naturezaFisica: 'Humanoide, altura entre 1,8m e 2,1m, aparência de pedra calcária escura. Sem feições definidas.',
      comportamento: ComportamentoCriaturaEnum.CACADORA,
      motivacao: 'Desconhecida. Não demonstra comunicação, territorialidade ou padrão de seleção de alvos.',
      ganchoUnico: 'Imóvel enquanto observada. Letal em frações de segundo quando não é.',
      temaHorror: 'Paranoia, atenção dividida, cooperação forçada.',
    });
    avancar();

    atualizar({ na: NivelAmeacaEnum.MEDIA, vd: 30 });
    avancar();

    atualizar({
      atributos: { forca: 3, destreza: 4, luta: 5, pontaria: 2, vigor: 3, intelecto: 2, medicina: 2, sentidos: 3, social: 0, vontade: 2 },
    });
    avancar();

    atualizar({
      modificadores: {
        destreza: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
        forca: ModificadorCriaturaEnum.MEDIO, vigor: ModificadorCriaturaEnum.MEDIO, sentidos: ModificadorCriaturaEnum.MEDIO,
        intelecto: ModificadorCriaturaEnum.FRACO, medicina: ModificadorCriaturaEnum.FRACO, vontade: ModificadorCriaturaEnum.FRACO,
        pontaria: ModificadorCriaturaEnum.FRAGIL, social: ModificadorCriaturaEnum.FRAGIL,
      },
    });
    avancar();

    atualizar({ tenacidade: TenacidadeEnum.PADRAO, vidaAtual: 1050 });
    avancar();

    avancar(); // Defesa — só leitura

    atualizar({
      resistencias: [
        { tipo: TipoDanoEnum.FISICO, subtipo: '', valor: 36 },
        { tipo: TipoDanoEnum.BALISTICO, subtipo: '', valor: 16 },
      ],
      fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: '', valor: 26 }],
    });
    avancar();

    avancar(); // Regeneração — nenhuma

    atualizar({
      porte: PorteCriaturaEnum.MEDIO,
      deslocamento: { terrestre: 9, voador: null, aquatico: null, sobrenatural: null },
    });
    avancar();

    atualizar({
      cadencia: CadenciaEnum.SINGULAR,
      ataques: [
        { nome: 'Pancada', teste: 'lutad20kh1+5', custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '3D12+4', danoCritico: '6D12+8', tipoDano: TipoDanoEnum.FISICO, area: false, efeito: '' },
        {
          nome: 'Esmagamento', teste: 'lutad20kh1+5', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', danoCritico: '8D12+20', tipoDano: TipoDanoEnum.FISICO,
          area: false, efeito: 'O alvo realiza um teste de Vigor (DT 20) ou fica Imobilizado por 1 turno.',
        },
      ],
    });
    avancar();

    atualizar({
      habilidades: [
        {
          nome: 'Imobilidade Absoluta', tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao: 'Enquanto ao menos um agente mantiver contato visual direto com a criatura, ela não pode se mover, '
            + 'atacar ou usar habilidades de nenhum tipo. Dano, condições e efeitos externos continuam a afetá-la normalmente.',
          restricao: '',
        },
        {
          nome: 'Velocidade Impossível', tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao: 'Quando não está sendo observada, a criatura ignora o custo de Ação de Movimento para se deslocar.',
          restricao: '',
        },
        {
          nome: 'Ruptura de Observação', tipo: HabilidadeTipoCriaturaEnum.GATILHO,
          descricao: 'Quando o número de agentes com contato visual direto com a criatura cai para zero por qualquer '
            + 'motivo, ela age imediatamente fora da ordem de iniciativa com uma Ação Padrão.',
          restricao: '',
        },
      ],
    });
    avancar();
  }

  it('lê o campanhaId da rota-pai', () => {
    const { componente } = montar();
    expect(componente['campanhaId']).toBe(CAMPANHA_ID);
  });

  it('começa sem designação revelada no resumo operacional', () => {
    const { raiz } = montar();
    const resumo = raiz.querySelector('.guia__resumo-corpo');
    expect(resumo?.textContent).toContain('Preencha a designação para iniciar');
  });

  it('bloqueia o avanço da Identidade sem os campos obrigatórios', () => {
    const { componente } = montar();
    expect(componente['passoValido']()).toBe(false);
    componente['atualizar']({ designacao: 'A Estátua' });
    expect(componente['passoValido']()).toBe(false);
  });

  it('reproduz "A Estátua" ponta a ponta e chega à Revisão sem violações', () => {
    const { fixture, componente } = montar();
    preencherAEstatua(componente);
    fixture.detectChanges();

    expect(componente['passos'][componente['estado']().passo]).toBe('Revisão');
    expect(componente['violacoesFinais']()).toEqual([]);
  });

  it('calcula Vida Máxima, Defesa e Contra-Ataque exatamente como o exemplo do guia', () => {
    const { componente } = montar();
    preencherAEstatua(componente);

    expect(componente['vidaMaxima']()).toBe(1050);
    expect(componente['defesaBase']()).toBe(30);
    expect(componente['contraAtaque']()).toBe(true);
  });

  it('envia o DTO de criação com os mesmos dados do exemplo "A Estátua" do documento', () => {
    const { componente, fichaService, router } = montar();
    preencherAEstatua(componente);

    componente['criar']();

    expect(fichaService.criarFichaCriatura).toHaveBeenCalledTimes(1);
    const criarFichaCriatura = fichaService.criarFichaCriatura as unknown as { mock: { calls: [FichaCriaturaCriarDto][] } };
    const dto = criarFichaCriatura.mock.calls[0][0];
    expect(dto.campanhaId).toBe(CAMPANHA_ID);
    expect(dto.nome).toBe('A Estátua');
    expect(dto.cor).toBeNull();
    expect(dto.dados).toEqual({
      identidade: {
        designacao: 'A Estátua', origem: OrigemCriaturaEnum.SCP_ADAPTADO,
        conceito: 'Uma figura de pedra humanoide que só se move quando ninguém a observa diretamente.',
        naturezaFisica: 'Humanoide, altura entre 1,8m e 2,1m, aparência de pedra calcária escura. Sem feições definidas.',
        comportamento: ComportamentoCriaturaEnum.CACADORA,
        motivacao: 'Desconhecida. Não demonstra comunicação, territorialidade ou padrão de seleção de alvos.',
        ganchoUnico: 'Imóvel enquanto observada. Letal em frações de segundo quando não é.',
        temaHorror: 'Paranoia, atenção dividida, cooperação forçada.',
      },
      na: NivelAmeacaEnum.MEDIA, vd: 30,
      atributos: { forca: 3, destreza: 4, luta: 5, pontaria: 2, vigor: 3, intelecto: 2, medicina: 2, sentidos: 3, social: 0, vontade: 2 },
      modificadores: {
        destreza: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
        forca: ModificadorCriaturaEnum.MEDIO, vigor: ModificadorCriaturaEnum.MEDIO, sentidos: ModificadorCriaturaEnum.MEDIO,
        intelecto: ModificadorCriaturaEnum.FRACO, medicina: ModificadorCriaturaEnum.FRACO, vontade: ModificadorCriaturaEnum.FRACO,
        pontaria: ModificadorCriaturaEnum.FRAGIL, social: ModificadorCriaturaEnum.FRAGIL,
      },
      tenacidade: TenacidadeEnum.PADRAO, vidaMaxima: 1050, vidaAtual: 1050, defesa: 30,
      resistencias: [
        { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 36 },
        { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 16 },
      ],
      fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 26 }],
      porte: PorteCriaturaEnum.MEDIO,
      deslocamento: { terrestre: 9, voador: null, aquatico: null, sobrenatural: null },
      cadencia: CadenciaEnum.SINGULAR,
      ataques: [
        { nome: 'Pancada', teste: 'lutad20kh1+5', custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '3D12+4', danoCritico: '6D12+8', tipoDano: TipoDanoEnum.FISICO, area: false },
        {
          nome: 'Esmagamento', teste: 'lutad20kh1+5', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', danoCritico: '8D12+20', tipoDano: TipoDanoEnum.FISICO,
          area: false, efeito: 'O alvo realiza um teste de Vigor (DT 20) ou fica Imobilizado por 1 turno.',
        },
      ],
      habilidades: [
        {
          nome: 'Imobilidade Absoluta', tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao: 'Enquanto ao menos um agente mantiver contato visual direto com a criatura, ela não pode se mover, '
            + 'atacar ou usar habilidades de nenhum tipo. Dano, condições e efeitos externos continuam a afetá-la normalmente.',
        },
        {
          nome: 'Velocidade Impossível', tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
          descricao: 'Quando não está sendo observada, a criatura ignora o custo de Ação de Movimento para se deslocar.',
        },
        {
          nome: 'Ruptura de Observação', tipo: HabilidadeTipoCriaturaEnum.GATILHO,
          descricao: 'Quando o número de agentes com contato visual direto com a criatura cai para zero por qualquer '
            + 'motivo, ela age imediatamente fora da ordem de iniciativa com uma Ação Padrão.',
        },
      ],
    } satisfies FichaCriaturaDadosDto);

    expect(router.navigate).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'criatura', 99]);
  });

  it('bloqueia o passo Resistências sem ao menos uma fraqueza', () => {
    const { componente } = montar();
    componente['atualizar']({ vd: 30, resistencias: [{ tipo: TipoDanoEnum.FISICO, subtipo: '', valor: 10 }], fraquezas: [] });
    componente['atualizar']({ passo: 6 });
    expect(componente['passoValido']()).toBe(false);
  });

  it('bloqueia o passo Porte e Deslocamento sem nenhum modo declarado', () => {
    const { componente } = montar();
    componente['atualizar']({ porte: PorteCriaturaEnum.MEDIO, passo: 8 });
    expect(componente['passoValido']()).toBe(false);
  });

  it('a distribuição de Modificadores só fica completa em 2 Forte / 3 Médio / 3 Fraco / 2 Frágil', () => {
    const { componente } = montar();
    componente['atualizar']({
      modificadores: {
        destreza: ModificadorCriaturaEnum.FORTE, forca: ModificadorCriaturaEnum.FORTE,
        luta: ModificadorCriaturaEnum.MEDIO, vigor: ModificadorCriaturaEnum.MEDIO, sentidos: ModificadorCriaturaEnum.MEDIO,
        intelecto: ModificadorCriaturaEnum.FRACO, medicina: ModificadorCriaturaEnum.FRACO, vontade: ModificadorCriaturaEnum.FRACO,
        pontaria: ModificadorCriaturaEnum.FRAGIL, social: null,
      },
    });
    expect(componente['distribuicaoModificadoresCompleta']()).toBe(false);

    componente['atualizar']({ modificadores: { ...componente['estado']().modificadores, social: ModificadorCriaturaEnum.FRAGIL } });
    expect(componente['distribuicaoModificadoresCompleta']()).toBe(true);
  });

  it('não navega ao clicar em Sair sem confirmar, e não usa o confirm() nativo do navegador', () => {
    const { fixture, raiz, componente, router } = montar();
    (raiz.querySelector('.guia__sair') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(componente['confirmandoSaida']()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    const dialogo = raiz.querySelector('.guia__sair-dialog') as HTMLDialogElement;
    expect(dialogo).not.toBeNull();
    expect(dialogo.tagName).toBe('DIALOG');
  });

  it('navega para o painel só depois de confirmar, e "Continuar aqui" cancela sem navegar', () => {
    const { componente, router } = montar();

    componente['sair']();
    componente['cancelarSaida']();
    expect(componente['confirmandoSaida']()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();

    componente['sair']();
    componente['confirmarSaida']();
    expect(componente['confirmandoSaida']()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/painel', CAMPANHA_ID]);
  });

  describe('rascunho salvo neste dispositivo', () => {
    it('não sobrescreve o rascunho salvo antes do mestre decidir "Retomar" ou "Começar do zero"', () => {
      const { componente, rascunhos } = montar(CAMPANHA_ID, { designacao: 'Salva antes', passo: 2 });
      expect(componente['temRascunho']()).toBe(true);
      expect(rascunhos.salvar).not.toHaveBeenCalled();

      componente['atualizar']({ designacao: 'Outra coisa' });
      expect(rascunhos.salvar).not.toHaveBeenCalled();
    });

    it('sem rascunho existente, salva o estado normalmente a cada mudança', () => {
      const { componente, rascunhos } = montar();
      expect(componente['temRascunho']()).toBe(false);

      componente['atualizar']({ designacao: 'Nova criatura' });
      expect(rascunhos.salvar).toHaveBeenCalled();
    });

    it('"Retomar" carrega o estado salvo e mantém os passos já visitados', () => {
      const { componente } = montar(CAMPANHA_ID, { designacao: 'Salva antes', passo: 3 });
      componente['retomar']();
      expect(componente['estado']().designacao).toBe('Salva antes');
      expect(componente['visitado']()).toBe(3);
      expect(componente['temRascunho']()).toBe(false);
    });

    it('"Começar do zero" descarta o rascunho salvo', () => {
      const { componente, rascunhos } = montar(CAMPANHA_ID, { designacao: 'Salva antes', passo: 3 });
      componente['recomecar']();
      expect(rascunhos.limpar).toHaveBeenCalledWith(CAMPANHA_ID, 'criatura');
      expect(componente['temRascunho']()).toBe(false);
      expect(componente['estado']().designacao).toBe('');
    });

    it('limpa o rascunho ao criar a ficha com sucesso', () => {
      const { componente, rascunhos } = montar();
      preencherAEstatua(componente);
      componente['criar']();
      expect(rascunhos.limpar).toHaveBeenCalledWith(CAMPANHA_ID, 'criatura');
    });
  });
});
