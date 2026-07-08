import { TestBed } from '@angular/core/testing';
import {
  ArquetipoEnum,
  ClasseEnum,
  HabilidadeCategoriaEnum,
  ItemCategoriaEnum,
} from '@contratados-rpg/shared/enums';
import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaFormulario, FichaFormularioValor } from './ficha-formulario.component';

/**
 * Prova o formulário reutilizável da ficha (m3-06): deriva os status ao vivo por `shared/regras`
 * (sem constante de regra no front), semeia a edição a partir do documento, **preserva** as
 * sub-coleções que ainda não edita (habilidades/inventário/sequelas/traumas/lesões) no round-trip
 * e mantém a coerência que o backend revalida (reclampe por classe, Vida/Energia ≤ máximo).
 */
describe('FichaFormulario', () => {
  function dadosBase(sobrepor: Partial<FichaJogadorDadosDto> = {}): FichaJogadorDadosDto {
    return {
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
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
      estado: { vidaAtual: 5, energiaAtual: 5, sequelas: [], traumas: [], lesoes: [] },
      habilidades: [],
      inventario: { itens: [], amplificadores: [] },
      anotacoes: '',
      ...sobrepor,
    };
  }

  function montar(valorInicial: FichaFormularioValor | null) {
    TestBed.configureTestingModule({ imports: [FichaFormulario] });
    const fixture = TestBed.createComponent(FichaFormulario);
    if (valorInicial) {
      fixture.componentRef.setInput('valorInicial', valorInicial);
    }
    fixture.detectChanges();
    const emissoes: FichaFormularioValor[] = [];
    fixture.componentInstance.salvar.subscribe((valor) => emissoes.push(valor));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emissoes };
  }

  function preencherNome(raiz: HTMLElement, valor: string): void {
    const nome = raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement;
    nome.value = valor;
    nome.dispatchEvent(new Event('input'));
  }

  function submeter(raiz: HTMLElement): void {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  it('não emite quando o nome está vazio (obrigatório)', () => {
    const { raiz, emissoes } = montar(null);
    submeter(raiz);
    expect(emissoes).toHaveLength(0);
  });

  it('na criação, emite documento com Vida/Energia cheias e sub-coleções vazias', () => {
    const { fixture, raiz, emissoes } = montar(null);
    preencherNome(raiz, 'Kane');
    submeter(raiz);

    expect(emissoes).toHaveLength(1);
    const dados = emissoes[0].dados;
    expect(emissoes[0].nome).toBe('Kane');
    expect(dados.estado.sequelas).toEqual([]);
    expect(dados.habilidades).toEqual([]);
    expect(dados.inventario).toEqual({ itens: [], amplificadores: [] });
    // Vida/Energia atuais nascem no máximo derivado (ficha "cheia").
    expect(dados.estado.vidaAtual).toBe(fixture.componentInstance['vidaMaxima']());
    expect(dados.estado.energiaAtual).toBe(fixture.componentInstance['energiaMaxima']());
  });

  it('semeia a edição a partir do documento carregado', () => {
    const dados = dadosBase({ nivel: 3, atributos: { ...dadosBase().atributos, vigor: 4 } });
    const { raiz } = montar({ nome: 'Vex', dados });
    const nome = raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement;
    const nivel = raiz.querySelector('input[formControlName="nivel"]') as HTMLInputElement;
    expect(nome.value).toBe('Vex');
    expect(nivel.value).toBe('3');
  });

  it('preserva habilidades/inventário/sequelas no round-trip da edição', () => {
    const dados = dadosBase({
      habilidades: [
        {
          nome: 'Tiro Preciso',
          categoria: HabilidadeCategoriaEnum.CLASSE,
          custoEnergia: 2,
          descricao: 'Ignora cobertura leve.',
        },
      ],
      inventario: {
        itens: [
          {
            nome: 'Fuzil de Assalto',
            categoria: ItemCategoriaEnum.ARMAS_DE_FOGO,
            custo: 3,
            peso: 4,
            quantidade: 1,
            guardada: false,
            modificacoes: [],
          },
        ],
        amplificadores: [],
      },
      estado: {
        vidaAtual: 5,
        energiaAtual: 5,
        sequelas: [{ nome: 'Hipervigilância' }],
        traumas: [],
        lesoes: [],
      },
    });
    const { raiz, emissoes } = montar({ nome: 'Vex', dados });
    submeter(raiz);

    expect(emissoes).toHaveLength(1);
    expect(emissoes[0].dados.habilidades).toEqual(dados.habilidades);
    expect(emissoes[0].dados.inventario).toEqual(dados.inventario);
    expect(emissoes[0].dados.estado.sequelas).toEqual(dados.estado.sequelas);
  });

  it('ao trocar para Civil, reclampa atributos ao máximo da classe e limpa o arquétipo', () => {
    const dados = dadosBase({
      arquetipo: ArquetipoEnum.LUTADOR,
      atributos: { ...dadosBase().atributos, vigor: 6 },
    });
    const { raiz, emissoes } = montar({ nome: 'Vex', dados });

    const classe = raiz.querySelector('select[formControlName="classe"]') as HTMLSelectElement;
    classe.value = ClasseEnum.CIVIL;
    classe.dispatchEvent(new Event('change'));

    submeter(raiz);

    expect(emissoes).toHaveLength(1);
    // Civil limita atributos a 3 (obterLimitesClasse) — o Vigor 6 é reclampado.
    expect(emissoes[0].dados.atributos.vigor).toBe(3);
    expect(emissoes[0].dados.classe).toBe(ClasseEnum.CIVIL);
    expect(emissoes[0].dados.arquetipo).toBeNull();
  });
});
