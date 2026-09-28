import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaJogadorDadosDto, FichaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaEdicaoService } from './ficha-edicao.service';

/**
 * Regressão de P-082 (`docs/specs/done/p-082-ficha-autosave-e-selecao.spec.md`): a intenção de
 * salvamento tem que ficar vinculada ao ID e ao documento de origem capturados no instante do
 * ajuste, não relidos na hora de montar o PUT — senão trocar a ficha exibida entre o ajuste e o
 * fim do debounce (500ms) manda os dados certos para o destino errado.
 */
describe('FichaEdicaoService', () => {
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

  const fichaInicial: FichaRecuperadaDto = {
    id: 1,
    campanhaId: 9,
    usuarioId: 7,
    nome: 'Alfa',
    cor: null,
    imagemUrl: null,
    imagemFoco: null,
    oculta: false,
    dados,
  };

  function envelope<T>(conteudo: T): StandardResponse<T> {
    return { sucesso: true, dados: conteudo, mensagem: 'ok' };
  }

  function montar(fichaId = 1) {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FichaEdicaoService],
    });
    const servico = TestBed.inject(FichaEdicaoService);
    const http = TestBed.inject(HttpTestingController);
    const ficha = signal<FichaRecuperadaDto | null>({ ...fichaInicial, id: fichaId });
    servico.inicializar(ficha, () => fichaId);
    servico.definirBase(ficha());
    return { servico, http, ficha };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('ajusta o nome e persiste em lote (debounced) via PUT /ficha/:id', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarNome('Alfa (editado)');
    expect(ficha()?.nome).toBe('Alfa (editado)');
    expect(servico.estadoPersistencia()).toBe('salvando');

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/1'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body.nome).toBe('Alfa (editado)');
    requisicao.flush(envelope({ ...fichaInicial, nome: 'Alfa (editado)' }));

    expect(servico.estadoPersistencia()).toBe('salvo');
    expect(servico.edicaoPendente()).toBe(false);
  });

  it('P-082: trocar o ID/documento de origem depois de agendar não muda o destino do PUT', async () => {
    const idAtual = { valor: 1 };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FichaEdicaoService],
    });
    const servico = TestBed.inject(FichaEdicaoService);
    const http = TestBed.inject(HttpTestingController);
    const ficha = signal<FichaRecuperadaDto | null>({ ...fichaInicial, id: 1, nome: 'Alfa' });
    servico.inicializar(ficha, () => idAtual.valor);
    servico.definirBase(ficha());

    servico.ajustarNome('Alfa (editado)');

    // Simula a troca: a seleção já mudou para Beta (id 2) e o documento que a página tem na mão
    // também já é o de Beta — mas o GET de Beta "ainda não voltou" no cenário real; aqui simulamos
    // diretamente o estado pós-troca síncrona, antes do debounce de 500ms disparar.
    idAtual.valor = 2;
    ficha.set({ ...fichaInicial, id: 2, nome: 'Beta' });

    await new Promise((r) => setTimeout(r, 550));
    const chamadas = http.match(() => true);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].request.url.endsWith('/ficha/1')).toBe(true);
    expect(chamadas[0].request.body.nome).toBe('Alfa (editado)');
    chamadas[0].flush(envelope({ ...fichaInicial, id: 1, nome: 'Alfa (editado)' }));
  });

  it('serializa escritas da mesma ficha sem cancelar a que já está em voo, e a resposta antiga não apaga edição posterior', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarNome('Primeiro');
    await new Promise((r) => setTimeout(r, 550));
    const primeira = http.expectOne((req) => req.url.endsWith('/ficha/1'));

    // Uma 2ª edição acontece enquanto a 1ª ainda está em voo, e seu próprio debounce dispara.
    servico.ajustarNome('Segundo');
    await new Promise((r) => setTimeout(r, 550));

    // A 2ª intenção não é enviada enquanto a 1ª estiver em voo (serializa; nunca cancela a que já
    // foi enviada pra mandar a nova por cima).
    expect(http.match(() => true)).toHaveLength(0);

    primeira.flush(envelope({ ...fichaInicial, nome: 'Primeiro' }));
    // A resposta da 1ª chega vendo que já há edição mais nova — dispara a 2ª na hora (sem esperar
    // outro debounce) em vez de aplicar o documento antigo por cima da edição mais nova.
    expect(ficha()?.nome).toBe('Segundo');
    expect(servico.edicaoPendente()).toBe(true);

    const segunda = http.expectOne((req) => req.url.endsWith('/ficha/1'));
    expect(segunda.request.body.nome).toBe('Segundo');
    segunda.flush(envelope({ ...fichaInicial, nome: 'Segundo' }));

    expect(ficha()?.nome).toBe('Segundo');
    expect(servico.edicaoPendente()).toBe(false);
    expect(servico.estadoPersistencia()).toBe('salvo');
  });

  it('falha no PUT não descarta a edição — "antecipar" reenvia exatamente o que falhou (retry)', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarNome('Falha');
    await new Promise((r) => setTimeout(r, 550));
    const primeira = http.expectOne((req) => req.url.endsWith('/ficha/1'));
    primeira.flush('erro', { status: 500, statusText: 'Erro interno' });

    // `edicaoPendente` volta a `false` (m3-17: sem isto, todo remoto futuro passaria a mesclar em
    // vez de substituir, congelando os live-updates por uma falha só) — mas o documento local
    // continua com a edição, sem reverter (P-082, sem descarte silencioso).
    expect(servico.edicaoPendente()).toBe(false);
    expect(ficha()?.nome).toBe('Falha');

    let resultado: boolean | undefined;
    servico.antecipar().subscribe((sucesso) => (resultado = sucesso));
    const retry = http.expectOne((req) => req.url.endsWith('/ficha/1'));
    expect(retry.request.body.nome).toBe('Falha');
    retry.flush(envelope({ ...fichaInicial, nome: 'Falha' }));

    expect(resultado).toBe(true);
    expect(servico.edicaoPendente()).toBe(false);
  });

  it('"antecipar" resolve na hora quando não há edição pendente', () => {
    const { servico } = montar();

    let resultado: boolean | undefined;
    servico.antecipar().subscribe((sucesso) => (resultado = sucesso));

    expect(resultado).toBe(true);
  });

  it('"antecipar" envia a edição pendente na hora, sem esperar o debounce de 500ms', () => {
    const { servico, http } = montar();

    servico.ajustarNome('Rápido');
    let resultado: boolean | undefined;
    servico.antecipar().subscribe((sucesso) => (resultado = sucesso));

    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/1'));
    expect(requisicao.request.body.nome).toBe('Rápido');
    requisicao.flush(envelope({ ...fichaInicial, nome: 'Rápido' }));

    expect(resultado).toBe(true);
  });
});
