import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { afterEach, describe, expect, it } from 'vitest';
import { StandardResponse } from '@contratados-rpg/shared/interfaces';
import { CadenciaEnum, ComportamentoCriaturaEnum, ModificadorCriaturaEnum, NivelAmeacaEnum, OrigemCriaturaEnum, PorteCriaturaEnum, TenacidadeEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaDadosDto, FichaCriaturaRecuperadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaEdicaoCriaturaService } from './ficha-edicao-criatura.service';

describe('FichaEdicaoCriaturaService', () => {
  const dados: FichaCriaturaDadosDto = {
    identidade: {
      origem: OrigemCriaturaEnum.ORIGINAL,
      conceito: 'x', naturezaFisica: 'x', comportamento: ComportamentoCriaturaEnum.CACADORA,
      motivacao: 'x', ganchoUnico: 'x',
    },
    na: NivelAmeacaEnum.ALTA, vd: 30,
    atributos: { destreza: 1, forca: 8, luta: 6, pontaria: 1, vigor: 8, intelecto: 1, medicina: 1, sentidos: 4, social: 1, vontade: 4 },
    modificadores: {
      destreza: ModificadorCriaturaEnum.FRAGIL, forca: ModificadorCriaturaEnum.FORTE, luta: ModificadorCriaturaEnum.FORTE,
      pontaria: ModificadorCriaturaEnum.FRAGIL, vigor: ModificadorCriaturaEnum.MEDIO, intelecto: ModificadorCriaturaEnum.FRACO,
      medicina: ModificadorCriaturaEnum.FRACO, sentidos: ModificadorCriaturaEnum.MEDIO, social: ModificadorCriaturaEnum.FRACO,
      vontade: ModificadorCriaturaEnum.FRACO,
    },
    tenacidade: TenacidadeEnum.RESISTENTE, vidaMaxima: 100, vidaAtual: 100, defesa: 30,
    resistencias: [], fraquezas: [{ tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 }],
    porte: PorteCriaturaEnum.GRANDE, deslocamento: { terrestre: 9 }, cadencia: CadenciaEnum.SINGULAR,
    ataques: [], habilidades: [], anotacoes: '',
  };
  const fichaInicial: FichaCriaturaRecuperadaDto = {
    id: 4, campanhaId: 9, usuarioId: 7, nome: 'A Estátua', cor: null, imagemUrl: null, imagemFoco: null, oculta: false, dados,
  };

  function envelope<T>(conteudo: T): StandardResponse<T> {
    return { sucesso: true, dados: conteudo, mensagem: 'ok' };
  }

  function montar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), FichaEdicaoCriaturaService],
    });
    const servico = TestBed.inject(FichaEdicaoCriaturaService);
    const http = TestBed.inject(HttpTestingController);
    const ficha = signal<FichaCriaturaRecuperadaDto | null>(fichaInicial);
    servico.inicializar(ficha, () => 4);
    servico.definirBase(fichaInicial);
    return { servico, http, ficha };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('ajusta a vida atual e persiste em lote (debounced) via PUT /ficha/criatura/:id', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarVitalidade({ campo: 'vidaAtual', valor: 60 });
    expect(ficha()?.dados.vidaAtual).toBe(60);
    expect(servico.estadoPersistencia()).toBe('salvando');

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body.dados.vidaAtual).toBe(60);
    requisicao.flush(envelope({ ...fichaInicial, dados: { ...dados, vidaAtual: 60 } }));

    expect(servico.estadoPersistencia()).toBe('salvo');
  });

  it('mudar a VD recalcula Vida Máxima e Defesa pela fórmula e desloca a Vida atual na mesma diferença', async () => {
    const { servico, http, ficha } = montar();
    servico.ajustarVitalidade({ campo: 'vidaAtual', valor: 40 });

    // Resistente ×75: VD 31 → Vida Máxima 2.325 (era 100, ajustada à mão); Defesa 15 + 31÷2 = 30.
    servico.ajustarVd(31);
    expect(ficha()?.dados).toMatchObject({ vd: 31, vidaMaxima: 2325, vidaAtual: 2265, defesa: 30 });

    servico.ajustarVd(40);
    expect(ficha()?.dados).toMatchObject({ vd: 40, vidaMaxima: 3000, vidaAtual: 2940, defesa: 35 });

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.body.dados).toMatchObject({ vd: 40, vidaMaxima: 3000, vidaAtual: 2940, defesa: 35 });
    requisicao.flush(envelope(ficha()!));
  });

  it('confirmar a mesma VD (ou campo vazio) não sobrescreve Vida e Defesa ajustadas à mão', async () => {
    const { servico, http, ficha } = montar();
    servico.ajustarDefesa(42);

    servico.ajustarVd(30);
    servico.ajustarVd(Number.NaN);
    expect(ficha()?.dados).toMatchObject({ vd: 30, vidaMaxima: 100, vidaAtual: 100, defesa: 42 });

    await new Promise((r) => setTimeout(r, 550));
    http.expectOne((req) => req.url.endsWith('/ficha/criatura/4')).flush(envelope(ficha()!));
  });

  it('mudar a Tenacidade recalcula só a Vida; a Defesa ajustada à mão continua', async () => {
    const { servico, http, ficha } = montar();
    servico.ajustarDefesa(42);

    servico.ajustarTenacidade(TenacidadeEnum.PADRAO);
    expect(ficha()?.dados).toMatchObject({ tenacidade: TenacidadeEnum.PADRAO, vidaMaxima: 1050, vidaAtual: 1050, defesa: 42 });

    await new Promise((r) => setTimeout(r, 550));
    http.expectOne((req) => req.url.endsWith('/ficha/criatura/4')).flush(envelope(ficha()!));
  });

  it('ajusta a lista de ataques inteira e persiste', async () => {
    const { servico, http, ficha } = montar();
    const novosAtaques = [{ nome: 'Golpe', teste: 'lutad20kh1+3', custoAcao: 'PADRAO' as never, dano: '4D12+10', danoCritico: '8D12+20', area: false }];

    servico.ajustarAtaques(novosAtaques);
    expect(ficha()?.dados.ataques).toEqual(novosAtaques);

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.body.dados.ataques).toEqual(novosAtaques);
    requisicao.flush(envelope({ ...fichaInicial, dados: { ...dados, ataques: novosAtaques } }));
  });

  it('ajusta nome (campo relacional, fora de dados) e persiste', async () => {
    const { servico, http, ficha } = montar();

    servico.ajustarNome('Nova Designação');
    expect(ficha()?.nome).toBe('Nova Designação');

    await new Promise((r) => setTimeout(r, 550));
    const requisicao = http.expectOne((req) => req.url.endsWith('/ficha/criatura/4'));
    expect(requisicao.request.body.nome).toBe('Nova Designação');
    requisicao.flush(envelope({ ...fichaInicial, nome: 'Nova Designação' }));
  });
});
