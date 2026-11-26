import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { CustoAcaoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CriaturaAtaqueLista } from './criatura-ataque-lista.component';

describe('CriaturaAtaqueLista', () => {
  const itens: FichaCriaturaAtaqueDto[] = [
    { nome: 'Golpe de Pedra', teste: 'lutad20kh1+3', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', danoCritico: '8D12+20', area: false },
  ];

  function montar(editavel = true, itensIniciais: FichaCriaturaAtaqueDto[] = itens) {
    TestBed.configureTestingModule({ imports: [CriaturaAtaqueLista] });
    const fixture = TestBed.createComponent(CriaturaAtaqueLista);
    fixture.componentRef.setInput('itens', itensIniciais);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaAtaqueDto[])[] = [];
    const rolados: FichaCriaturaAtaqueDto[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.rolarAtaque.subscribe((a) => rolados.push(a));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos, rolados };
  }

  it('lista os ataques só com o nome no cabeçalho — a expressão de dano não ocupa o espaço dele', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.ataque-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Golpe de Pedra']);
    expect(raiz.querySelector('.ataque-lista__dano')).toBeNull();
    expect(raiz.querySelector('.ataque-lista__cabecalho-item')?.textContent).not.toContain('4D12');
  });

  it('ordena os ataques do custo mais barato ao mais caro e, no mesmo custo, por nome', () => {
    const desordenados: FichaCriaturaAtaqueDto[] = [
      { nome: 'Zumbido Perfurante', teste: '1d20', custoAcao: CustoAcaoEnum.PADRAO, dano: '3D12', danoCritico: '6D12', area: false },
      { nome: 'Investida', teste: '1d20', custoAcao: CustoAcaoEnum.COMPLETA, dano: '4D12', danoCritico: '8D12', area: false },
      { nome: 'Ecoar', teste: '1d20', custoAcao: CustoAcaoEnum.PADRAO, dano: '2D12', danoCritico: '4D12', area: false },
      { nome: 'Toque', teste: '1d20', custoAcao: CustoAcaoEnum.ACAO_LIVRE, dano: '1D6', danoCritico: '2D6', area: false },
      { nome: 'Avanço', teste: '1d20', custoAcao: CustoAcaoEnum.MOVIMENTO, dano: '1D8', danoCritico: '2D8', area: false },
    ];
    const { raiz } = montar(false, desordenados);
    const nomes = Array.from(raiz.querySelectorAll('.ataque-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Toque', 'Avanço', 'Ecoar', 'Zumbido Perfurante', 'Investida']);
  });

  it('cada botão de rolagem escreve a própria fórmula, sem depender de tooltip', () => {
    const { fixture, raiz } = montar(false);
    const formulaDe = (classe: string) =>
      raiz.querySelector(`${classe} .ataque-lista__formula`)?.textContent?.trim();
    const nomeDe = (classe: string) => raiz.querySelector(classe)?.getAttribute('aria-label');

    expect(formulaDe('.ataque-lista__rolar--teste')).toBe('lutad20kh1+3');
    expect(formulaDe('.ataque-lista__rolar--dano')).toBe('4D12+10');
    expect(formulaDe('.ataque-lista__rolar--critico')).toBe('8D12+20');
    expect(nomeDe('.ataque-lista__rolar--teste')).toBe('Rolar teste: lutad20kh1+3');
    expect(nomeDe('.ataque-lista__rolar--critico')).toBe('Rolar dano crítico: 8D12+20');
    expect(fixture.debugElement.query(By.css('.ataque-lista__rolar--dano')).injector.get(Tooltip, null)).toBeNull();
  });

  it('caixa de criar: título, nome, custo e alvo em segmentados, fórmulas empilhadas e efeito', () => {
    const { fixture, raiz } = montar();
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const form = raiz.querySelector('.ataque-lista__form')!;
    expect(form.querySelector('.ataque-lista__form-titulo')?.textContent?.trim()).toBe('Novo ataque');
    const [colunaA, colunaB] = Array.from(form.querySelectorAll('.ataque-lista__form-coluna'));
    expect(Array.from(colunaA.querySelectorAll('app-segmentado')).map((g) => g.getAttribute('aria-label'))).toEqual([
      'Custo de ação',
      'Alvo do ataque',
    ]);
    expect(Array.from(colunaB.querySelectorAll('input')).map((campo) => campo.getAttribute('formcontrolname'))).toEqual([
      'teste',
      'dano',
      'danoCritico',
    ]);
    expect(form.querySelector('app-editor-markdown.ataque-lista__form-efeito')).not.toBeNull();
    expect(form.querySelector('select, input[type="checkbox"]')).toBeNull();
    expect(form.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Adicionar ataque');
  });

  it('os segmentados escolhem custo de ação e área', () => {
    const { fixture, raiz } = montar();
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();
    const item = (texto: string) =>
      Array.from(raiz.querySelectorAll<HTMLButtonElement>('.segmentado__item')).find((b) => b.textContent?.trim() === texto)!;

    item('Completa').click();
    item('Área').click();
    fixture.detectChanges();

    const valor = fixture.componentInstance['itemForm'].getRawValue();
    expect(valor.custoAcao).toBe(CustoAcaoEnum.COMPLETA);
    expect(valor.area).toBe(true);
    expect(item('Completa').getAttribute('aria-pressed')).toBe('true');
  });

  it('confirmar a caixa incompleta diz o que falta e não emite', () => {
    const { fixture, raiz, emitidos } = montar();
    fixture.componentInstance['adicionar']();
    fixture.componentInstance['itemForm'].patchValue({ nome: 'Golpe' });
    fixture.componentInstance['confirmar']();
    fixture.detectChanges();

    expect(raiz.querySelector('.ataque-lista__form [role="alert"]')?.textContent?.trim()).toBe(
      'Informe teste, dano e dano crítico.',
    );
    expect(emitidos).toHaveLength(0);
  });

  it('alterar abre a mesma caixa preenchida no lugar do cartão; Esc cancela', () => {
    const { fixture, raiz } = montar();
    raiz.querySelector<HTMLButtonElement>('[aria-label="Alterar Golpe de Pedra"]')!.click();
    fixture.detectChanges();

    const caixa = raiz.querySelector('.ataque-lista__item--caixa')!;
    expect(caixa.querySelector('.ataque-lista__form-titulo')?.textContent?.trim()).toBe('Alterar ataque');
    expect(caixa.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Salvar alterações');
    expect(fixture.componentInstance['itemForm'].controls.dano.value).toBe('4D12+10');

    caixa.querySelector('form')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(raiz.querySelector('.ataque-lista__item--caixa')).toBeNull();
    expect(raiz.querySelector('.ataque-lista__nome')?.textContent?.trim()).toBe('Golpe de Pedra');
  });

  it('o formulário de adicionar nasce como o primeiro item da lista', () => {
    const { fixture, raiz } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const primeiroItem = raiz.querySelector('.ataque-lista__itens > .ataque-lista__item');
    expect(primeiroItem?.querySelector('.ataque-lista__form')).not.toBeNull();
    expect(primeiroItem?.querySelector('.ataque-lista__nome')).toBeNull();
  });

  it('emite rolarAtaque ao clicar no botão de dado', () => {
    const alvo = montar(false);
    (alvo.raiz.querySelector('.ataque-lista__rolar--dano') as HTMLButtonElement).click();
    expect(alvo.rolados).toEqual([itens[0]]);
  });

  it('emite rolarAtaqueCritico ao clicar no botão de crítico', () => {
    const alvo = montar(false);
    const criticados: FichaCriaturaAtaqueDto[] = [];
    alvo.fixture.componentInstance.rolarAtaqueCritico.subscribe((a) => criticados.push(a));
    (alvo.raiz.querySelector('.ataque-lista__rolar--critico') as HTMLButtonElement).click();
    expect(criticados).toEqual([itens[0]]);
  });

  it('emite testarAtaque ao clicar no botão de teste', () => {
    const alvo = montar(false);
    const testados: FichaCriaturaAtaqueDto[] = [];
    alvo.fixture.componentInstance.testarAtaque.subscribe((a) => testados.push(a));
    (alvo.raiz.querySelector('.ataque-lista__rolar--teste') as HTMLButtonElement).click();
    expect(testados).toEqual([itens[0]]);
  });

  it('sem modo de edição geral: alterar e excluir em cada cartão editável', () => {
    const { raiz } = montar(true);
    const rotulos = Array.from(raiz.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(rotulos).not.toContain('Editar ataques');
    expect(
      Array.from(raiz.querySelectorAll('.ataque-lista__cabecalho-item .ataque-lista__acoes button')).map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['Alterar Golpe de Pedra', 'Excluir Golpe de Pedra']);
  });

  it('ficha só de leitura não tem alterar nem excluir', () => {
    const { raiz } = montar(false);
    expect(raiz.querySelector('.ataque-lista__acoes')).toBeNull();
    expect(raiz.querySelector('[aria-label="Adicionar ataque"]')).toBeNull();
  });

  it('agrupa por custo de ação, sem grupo vazio, com o título do custo', () => {
    const { raiz } = montar(false, [
      { nome: 'Investida', teste: '1d20', custoAcao: CustoAcaoEnum.COMPLETA, dano: '4D12', danoCritico: '8D12', area: false },
      { nome: 'Ecoar', teste: '1d20', custoAcao: CustoAcaoEnum.PADRAO, dano: '2D12', danoCritico: '4D12', area: false },
      { nome: 'Zumbido', teste: '1d20', custoAcao: CustoAcaoEnum.PADRAO, dano: '3D12', danoCritico: '6D12', area: false },
    ]);
    const grupos = Array.from(raiz.querySelectorAll('.ataque-lista__grupo')).map((grupo) => ({
      titulo: grupo.querySelector('.ataque-lista__grupo-alternar')?.textContent?.replace(/\s+/g, ' ').trim(),
      nomes: Array.from(grupo.querySelectorAll('.ataque-lista__nome')).map((n) => n.textContent?.trim()),
    }));
    expect(grupos).toEqual([
      { titulo: 'Ação Padrão 2', nomes: ['Ecoar', 'Zumbido'] },
      { titulo: 'Ação Completa 1', nomes: ['Investida'] },
    ]);
  });

  it('grupo compactado: nome + três dadinhos que rolam direto; o nome abre o cartão', () => {
    const { fixture, raiz, rolados } = montar(false);
    const testados: FichaCriaturaAtaqueDto[] = [];
    const criticados: FichaCriaturaAtaqueDto[] = [];
    fixture.componentInstance.testarAtaque.subscribe((a) => testados.push(a));
    fixture.componentInstance.rolarAtaqueCritico.subscribe((a) => criticados.push(a));

    raiz.querySelector<HTMLButtonElement>('.ataque-lista__grupo-alternar')!.click();
    fixture.detectChanges();
    const linha = raiz.querySelector('.ataque-lista__linha')!;
    expect(raiz.querySelector('.ataque-lista__rolagens')).toBeNull();
    expect(Array.from(linha.querySelectorAll('.ataque-lista__dado')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Rolar teste de Golpe de Pedra: lutad20kh1+3',
      'Rolar dano de Golpe de Pedra: 4D12+10',
      'Rolar dano crítico de Golpe de Pedra: 8D12+20',
    ]);
    linha.querySelectorAll<HTMLButtonElement>('.ataque-lista__dado').forEach((botao) => botao.click());
    expect([testados, rolados, criticados]).toEqual([[itens[0]], [itens[0]], [itens[0]]]);

    linha.querySelector<HTMLButtonElement>('.ataque-lista__linha-alternar')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.ataque-lista__linha')).toBeNull();
    expect(raiz.querySelector('.ataque-lista__rolagens')).not.toBeNull();
  });

  it('lista e formulário de item novo ficam na mesma área rolável, com o cabeçalho fora dela', () => {
    const { fixture, raiz } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const rolagem = raiz.querySelector('.ataque-lista__rolagem')!;
    const itensList = rolagem.querySelector('.ataque-lista__itens');
    expect(itensList).not.toBeNull();
    expect(itensList?.querySelector('.ataque-lista__form')).not.toBeNull();
    expect(rolagem.querySelector('.ataque-lista__cabecalho')).toBeNull();
    expect(raiz.querySelector('.ataque-lista__cabecalho')).not.toBeNull();
  });

  it('traz o formulário de item novo à vista dentro da área rolável', async () => {
    const rolarAteOFormulario = vi.fn();
    // jsdom não implementa `scrollIntoView`.
    Element.prototype.scrollIntoView = rolarAteOFormulario;
    const { fixture } = montar(true);
    expect(rolarAteOFormulario).not.toHaveBeenCalled();

    fixture.componentInstance['adicionar']();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(rolarAteOFormulario).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('adiciona um ataque e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Investida', teste: 'forcad20kh1+2', custoAcao: CustoAcaoEnum.COMPLETA,
      dano: '6D12+16', danoCritico: '12D12+32', area: false, efeito: '',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Investida', teste: 'forcad20kh1+2', custoAcao: CustoAcaoEnum.COMPLETA, dano: '6D12+16', danoCritico: '12D12+32', area: false },
    ]);
  });

  it('pede confirmação via ConfirmacaoService (ui-15/P-069) e só remove se confirmar', async () => {
    const alvo = montar(true);
    const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);

    await alvo.fixture.componentInstance['remover'](0);

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'perigo', entidade: 'Golpe de Pedra' }),
    );
    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([]);
  });

  it('cancelar a confirmação não remove nem emite', async () => {
    const alvo = montar(true);
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(false);

    await alvo.fixture.componentInstance['remover'](0);

    expect(alvo.emitidos).toHaveLength(0);
  });
});
