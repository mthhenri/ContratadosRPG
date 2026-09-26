import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type { CenaCriadaDto, CenaCriarDto } from '@contratados-rpg/shared/dtos/cena';
import { CenaStatusEnum, CenaTipoEnum } from '@contratados-rpg/shared/enums';

import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CenaService } from '../../cena.service';
import { CenaCriarDialog } from './cena-criar-dialog.component';

/**
 * Prova o dialog "Nova cena" (m7-23): o tipo é obrigatório, "Planejar" e "Abrir agora" mandam
 * `ativarImediatamente` diferente, e "Abrir agora" com uma cena ativa confirma antes de enviar —
 * porque o backend encerra a atual (m7-22).
 */
describe('CenaCriarDialog', () => {
  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  function montar(haCenaAtiva = false) {
    const cenaService = {
      criarCena: vi.fn((_campanhaId: number, dto: CenaCriarDto) =>
        of<CenaCriadaDto>({
          id: 41,
          campanhaId: 9,
          nome: dto.nome,
          tipo: dto.tipo,
          status: dto.ativarImediatamente ? CenaStatusEnum.ATIVA : CenaStatusEnum.PLANEJADA,
        }),
      ),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CenaService, useValue: cenaService }] });
    const fixture = TestBed.createComponent(CenaCriarDialog);
    fixture.componentRef.setInput('campanhaId', 9);
    fixture.componentRef.setInput('haCenaAtiva', haCenaAtiva);
    const criadas: CenaCriadaDto[] = [];
    let fechou = 0;
    fixture.componentInstance.criada.subscribe((cena) => criadas.push(cena));
    fixture.componentInstance.fechou.subscribe(() => (fechou += 1));
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, cenaService, criadas, fechou: () => fechou };
  }

  const botao = (raiz: HTMLElement, rotulo: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (item) => texto(item) === rotulo,
    )!;

  /** Preenche nome e tipo pelo DOM, como o usuário faria. */
  function preencher(
    contexto: ReturnType<typeof montar>,
    nome: string,
    tipo: CenaTipoEnum | null,
  ): void {
    const campo = contexto.raiz.querySelector<HTMLInputElement>('input')!;
    campo.value = nome;
    campo.dispatchEvent(new Event('input'));
    if (tipo !== null) {
      const seletor = contexto.raiz.querySelector<HTMLSelectElement>('select')!;
      seletor.selectedIndex = Array.from(seletor.options).findIndex(
        (opcao) => opcao.textContent?.trim() === rotulos[tipo],
      );
      seletor.dispatchEvent(new Event('change'));
    }
    contexto.fixture.detectChanges();
  }

  const rotulos: Record<CenaTipoEnum, string> = {
    [CenaTipoEnum.INVESTIGACAO]: 'Investigação',
    [CenaTipoEnum.COMBATE]: 'Combate',
    [CenaTipoEnum.FURTIVA]: 'Furtiva',
    [CenaTipoEnum.PERSEGUICAO]: 'Perseguição',
    [CenaTipoEnum.RESISTENCIA]: 'Resistência',
  };

  /** A confirmação é uma promessa: deixa ela e o `subscribe` seguinte assentarem. */
  const assentar = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('abre como "Nova cena" com o nome e os cinco tipos em português, nenhum pré-escolhido', () => {
    const { raiz } = montar();

    expect(texto(raiz.querySelector('app-modal .modal__titulo'))).toBe('Nova cena');
    const opcoes = Array.from(raiz.querySelectorAll('select option')).map((opcao) => texto(opcao));
    expect(opcoes).toEqual([
      'Escolha o tipo…',
      'Investigação',
      'Combate',
      'Furtiva',
      'Perseguição',
      'Resistência',
    ]);
    expect(raiz.querySelector<HTMLSelectElement>('select')!.selectedIndex).toBe(0);
  });

  it('exige nome e tipo — só o nome não libera nenhuma das duas ações', () => {
    const contexto = montar();
    const { raiz } = contexto;

    expect(botao(raiz, 'Planejar').disabled).toBe(true);
    expect(botao(raiz, 'Abrir agora').disabled).toBe(true);

    preencher(contexto, 'Galpão 7', null);
    expect(botao(raiz, 'Planejar').disabled).toBe(true);
    expect(botao(raiz, 'Abrir agora').disabled).toBe(true);

    preencher(contexto, 'Galpão 7', CenaTipoEnum.INVESTIGACAO);
    expect(botao(raiz, 'Planejar').disabled).toBe(false);
    expect(botao(raiz, 'Abrir agora').disabled).toBe(false);
  });

  it.each(Object.values(CenaTipoEnum))('cria uma cena %s com o tipo escolhido', async (tipo) => {
    const contexto = montar();
    preencher(contexto, 'Cena de teste', tipo);

    botao(contexto.raiz, 'Planejar').click();
    await assentar();

    expect(contexto.cenaService.criarCena).toHaveBeenCalledWith(9, {
      nome: 'Cena de teste',
      tipo,
      ativarImediatamente: false,
    });
  });

  it('"Planejar" envia o nome sem espaços nas pontas e devolve a cena planejada', async () => {
    const contexto = montar(true);
    const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar');
    preencher(contexto, '  Galpão 7  ', CenaTipoEnum.FURTIVA);

    botao(contexto.raiz, 'Planejar').click();
    await assentar();

    // Planejar nunca encerra nada: sem confirmação, mesmo com cena ativa.
    expect(confirmar).not.toHaveBeenCalled();
    expect(contexto.cenaService.criarCena).toHaveBeenCalledWith(9, {
      nome: 'Galpão 7',
      tipo: CenaTipoEnum.FURTIVA,
      ativarImediatamente: false,
    });
    expect(contexto.criadas.map((cena) => cena.status)).toEqual([CenaStatusEnum.PLANEJADA]);
  });

  it('"Abrir agora" sem cena ativa envia direto, pelo Enter do formulário', async () => {
    const contexto = montar(false);
    const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar');
    preencher(contexto, 'Galpão 7', CenaTipoEnum.COMBATE);

    contexto.raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    await assentar();

    expect(confirmar).not.toHaveBeenCalled();
    expect(contexto.cenaService.criarCena).toHaveBeenCalledWith(9, {
      nome: 'Galpão 7',
      tipo: CenaTipoEnum.COMBATE,
      ativarImediatamente: true,
    });
    expect(contexto.criadas.map((cena) => cena.status)).toEqual([CenaStatusEnum.ATIVA]);
  });

  it('"Abrir agora" com cena ativa pede confirmação; cancelar não cria nada', async () => {
    const contexto = montar(true);
    const confirmar = vi
      .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
      .mockResolvedValue(false);
    preencher(contexto, 'Galpão 7', CenaTipoEnum.COMBATE);

    botao(contexto.raiz, 'Abrir agora').click();
    await assentar();

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Abrir nova cena', rotuloConfirmar: 'Abrir agora' }),
    );
    expect(contexto.cenaService.criarCena).not.toHaveBeenCalled();
    expect(contexto.criadas).toHaveLength(0);
  });

  it('"Abrir agora" com cena ativa, confirmado, cria já ativa', async () => {
    const contexto = montar(true);
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);
    preencher(contexto, 'Galpão 7', CenaTipoEnum.PERSEGUICAO);

    botao(contexto.raiz, 'Abrir agora').click();
    await assentar();

    expect(contexto.cenaService.criarCena).toHaveBeenCalledWith(9, {
      nome: 'Galpão 7',
      tipo: CenaTipoEnum.PERSEGUICAO,
      ativarImediatamente: true,
    });
  });

  it('"Cancelar" fecha sem criar', () => {
    const contexto = montar();

    botao(contexto.raiz, 'Cancelar').click();

    expect(contexto.fechou()).toBe(1);
    expect(contexto.cenaService.criarCena).not.toHaveBeenCalled();
  });
});
