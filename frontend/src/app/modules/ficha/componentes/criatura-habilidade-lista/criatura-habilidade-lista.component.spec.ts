import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { HabilidadeTipoCriaturaEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaHabilidadeDto } from '@contratados-rpg/shared/dtos/ficha';

import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { CriaturaHabilidadeLista } from './criatura-habilidade-lista.component';

import { HabilidadeDescricao } from '../habilidade-descricao/habilidade-descricao.component';

describe('CriaturaHabilidadeLista', () => {
  const itens: FichaCriaturaHabilidadeDto[] = [
    { nome: 'Pele de Pedra', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Reduz dano físico.' },
  ];

  function montar(editavel = true, itensIniciais: FichaCriaturaHabilidadeDto[] = itens) {
    TestBed.configureTestingModule({ imports: [CriaturaHabilidadeLista] });
    const fixture = TestBed.createComponent(CriaturaHabilidadeLista);
    fixture.componentRef.setInput('itens', itensIniciais);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaHabilidadeDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista as habilidades com nome e descrição', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.habilidade-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Pele de Pedra']);
  });

  it('agrupa por tipo na ordem Ativas, Gatilhos, Passivas, alfabética dentro do grupo, sem grupo vazio', () => {
    const desordenadas: FichaCriaturaHabilidadeDto[] = [
      { nome: 'Visão no Escuro', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Enxerga no escuro.' },
      { nome: 'Absorver Impacto', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Reduz dano.' },
      { nome: 'Metamorfose', tipo: HabilidadeTipoCriaturaEnum.ATIVA, descricao: 'Muda de forma.' },
      { nome: 'Armadura', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Pele dura.' },
    ];
    const { raiz } = montar(false, desordenadas);
    const grupos = Array.from(raiz.querySelectorAll('.habilidade-lista__grupo')).map((grupo) => ({
      titulo: grupo.querySelector('.habilidade-lista__grupo-titulo')?.textContent?.replace(/\s+/g, ' ').trim(),
      nomes: Array.from(grupo.querySelectorAll('.habilidade-lista__nome')).map((n) => n.textContent?.trim()),
    }));
    expect(grupos).toEqual([
      { titulo: 'Ativas 1', nomes: ['Metamorfose'] },
      { titulo: 'Gatilhos 1', nomes: ['Absorver Impacto'] },
      { titulo: 'Passivas 2', nomes: ['Armadura', 'Visão no Escuro'] },
    ]);
  });

  it('não mostra grupo de tipo sem habilidade', () => {
    const { raiz } = montar(false, [
      { nome: 'Visão no Escuro', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Enxerga no escuro.' },
    ]);
    expect(raiz.querySelectorAll('.habilidade-lista__grupo')).toHaveLength(1);
  });

  it('a restrição vem destacada logo após a descrição, rotulada "Restrição"; sem restrição, não há bloco', () => {
    const { raiz } = montar(false, [
      { nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano.', restricao: 'uma vez por cena' },
      { nome: 'Calma', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Nada.' },
    ]);
    const [furia, calma] = Array.from(raiz.querySelectorAll('.habilidade-lista__item'));
    const filhos = Array.from(furia.children).map((filho) => filho.classList[0]);

    expect(furia.querySelector('.habilidade-lista__restricao-rotulo')?.textContent?.trim()).toBe('Restrição');
    expect(filhos.indexOf('habilidade-lista__restricao-bloco')).toBe(filhos.indexOf('habilidade-lista__descricao') + 1);
    expect(calma.querySelector('.habilidade-lista__restricao-bloco')).toBeNull();
  });

  it('usa a descrição no modo expansível ("Ver mais"), não o tooltip', () => {
    const { fixture } = montar(false);
    const descricao = fixture.debugElement.query(By.directive(HabilidadeDescricao));

    expect(descricao.componentInstance.expansivel()).toBe(true);
  });

  it('mostra a descrição pelo componente com teto de linhas, que já traz o nome acessível', () => {
    const { raiz } = montar(false);
    const descricao = raiz.querySelector('app-habilidade-descricao.habilidade-lista__descricao');

    expect(descricao).not.toBeNull();
    expect(
      descricao?.querySelector('app-editor-markdown')?.getAttribute('aria-label') ??
        descricao?.querySelector('[aria-label]')?.getAttribute('aria-label'),
    ).toBe('Descrição de Pele de Pedra');
  });

  it('o formulário de adicionar nasce como o primeiro item da lista', () => {
    const { fixture, raiz } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const primeiroItem = raiz.querySelector('.habilidade-lista__itens > .habilidade-lista__item');
    expect(primeiroItem?.querySelector('.habilidade-lista__form')).not.toBeNull();
    expect(primeiroItem?.querySelector('.habilidade-lista__nome')).toBeNull();
  });

  it('lista e formulário de item novo ficam na mesma área rolável, com o cabeçalho fora dela', () => {
    const { fixture, raiz } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const rolagem = raiz.querySelector('.habilidade-lista__rolagem')!;
    const itensList = rolagem.querySelector('.habilidade-lista__itens');
    expect(itensList).not.toBeNull();
    expect(itensList?.querySelector('.habilidade-lista__form')).not.toBeNull();
    expect(rolagem.querySelector('.habilidade-lista__cabecalho')).toBeNull();
    expect(raiz.querySelector('.habilidade-lista__cabecalho')).not.toBeNull();
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

  it('sem modo de edição geral: alterar e excluir ficam em cada cartão editável', () => {
    const { raiz } = montar(true);
    const rotulos = Array.from(raiz.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));

    expect(rotulos).not.toContain('Editar habilidades');
    expect(rotulos).toContain('Adicionar habilidade');
    const acoes = raiz.querySelector('.habilidade-lista__item .habilidade-lista__cabecalho-item .habilidade-lista__acoes');
    expect(Array.from(acoes!.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Alterar Pele de Pedra',
      'Excluir Pele de Pedra',
    ]);
  });

  it('ficha só de leitura não tem criar, alterar nem excluir', () => {
    const { raiz } = montar(false);
    expect(raiz.querySelector('.habilidade-lista__acoes')).toBeNull();
    expect(raiz.querySelector('[aria-label="Adicionar habilidade"]')).toBeNull();
  });

  it('alterar troca o cartão pela mesma caixa de criar, preenchida e na largura inteira', () => {
    const { fixture, raiz } = montar(true, [
      { nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano.', restricao: 'uma vez por cena' },
    ]);
    raiz.querySelector<HTMLButtonElement>('[aria-label="Alterar Fúria"]')!.click();
    fixture.detectChanges();

    const caixa = raiz.querySelector('.habilidade-lista__item--caixa');
    expect(caixa?.querySelector('.habilidade-lista__form-titulo')?.textContent?.trim()).toBe('Alterar habilidade');
    expect(caixa?.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Salvar alterações');
    expect(fixture.componentInstance['itemForm'].getRawValue()).toEqual({
      nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano.', restricao: 'uma vez por cena',
    });
    const ativo = caixa?.querySelector('.segmentado__item--ativo')?.textContent?.trim();
    expect(ativo).toBe('De Gatilho');
    expect(raiz.querySelector('.habilidade-lista__nome')).toBeNull();

    fixture.componentInstance['adicionar']();
    fixture.detectChanges();
    expect(raiz.querySelector('.habilidade-lista__form-titulo')?.textContent?.trim()).toBe('Nova habilidade');
  });

  it('o segmentado de tipo escolhe o tipo da habilidade', () => {
    const { fixture, raiz } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();

    const ativa = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.segmentado__item')).find(
      (botao) => botao.textContent?.trim() === 'Ativa',
    )!;
    ativa.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['itemForm'].controls.tipo.value).toBe(HabilidadeTipoCriaturaEnum.ATIVA);
    expect(ativa.getAttribute('aria-pressed')).toBe('true');
  });

  it('confirmar a caixa incompleta diz o que falta e não emite', () => {
    const { fixture, raiz, emitidos } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();
    expect(raiz.querySelector('.habilidade-lista__form [role="alert"]')).toBeNull();

    fixture.componentInstance['confirmar']();
    fixture.detectChanges();

    expect(raiz.querySelector('.habilidade-lista__form [role="alert"]')?.textContent?.trim()).toBe(
      'Informe nome e descrição.',
    );
    expect(emitidos).toHaveLength(0);
  });

  it('Esc cancela e Ctrl+Enter confirma a caixa', () => {
    const { fixture, raiz, emitidos } = montar(true);
    fixture.componentInstance['adicionar']();
    fixture.detectChanges();
    const form = () => raiz.querySelector('.habilidade-lista__form')!;

    form().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(raiz.querySelector('.habilidade-lista__form')).toBeNull();

    fixture.componentInstance['adicionar']();
    fixture.componentInstance['itemForm'].patchValue({ nome: 'Eco', descricao: 'Repete.' });
    fixture.detectChanges();
    form().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));

    expect(emitidos[0]?.at(-1)).toEqual({ nome: 'Eco', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Repete.' });
  });

  it('compactar um grupo deixa só os nomes; o nome abre e fecha a habilidade; expandir volta tudo', () => {
    const { fixture, raiz } = montar(true, [
      { nome: 'Imaterialidade', tipo: HabilidadeTipoCriaturaEnum.ATIVA, descricao: 'Atravessa matéria.' },
      { nome: 'Encaixe', tipo: HabilidadeTipoCriaturaEnum.ATIVA, descricao: 'Agarra o rosto.' },
      { nome: 'Pele', tipo: HabilidadeTipoCriaturaEnum.PASSIVA, descricao: 'Dura.' },
    ]);
    const grupo = (indice: number) => raiz.querySelectorAll('.habilidade-lista__grupo')[indice];
    const alternarGrupo = (indice: number) => {
      grupo(indice).querySelector<HTMLButtonElement>('.habilidade-lista__grupo-alternar')!.click();
      fixture.detectChanges();
    };

    alternarGrupo(0);
    expect(grupo(0).querySelector('.habilidade-lista__grupo-alternar')?.getAttribute('aria-expanded')).toBe('false');
    expect(Array.from(grupo(0).querySelectorAll('.habilidade-lista__linha')).map((l) => l.textContent?.trim())).toEqual([
      'Encaixe',
      'Imaterialidade',
    ]);
    expect(grupo(0).querySelector('app-habilidade-descricao')).toBeNull();
    expect(grupo(1).querySelector('app-habilidade-descricao')).not.toBeNull();

    grupo(0).querySelector<HTMLButtonElement>('.habilidade-lista__linha-alternar')!.click();
    fixture.detectChanges();
    expect(grupo(0).querySelectorAll('.habilidade-lista__linha')).toHaveLength(1);
    expect(grupo(0).querySelectorAll('app-habilidade-descricao')).toHaveLength(1);
    const aberto = grupo(0).querySelector<HTMLButtonElement>('.habilidade-lista__linha-alternar--aberto')!;
    expect(aberto.getAttribute('aria-expanded')).toBe('true');
    aberto.click();
    fixture.detectChanges();
    expect(grupo(0).querySelectorAll('.habilidade-lista__linha')).toHaveLength(2);

    alternarGrupo(0);
    expect(grupo(0).querySelectorAll('.habilidade-lista__linha')).toHaveLength(0);
    expect(grupo(0).querySelectorAll('app-habilidade-descricao')).toHaveLength(2);
  });

  it('adiciona uma habilidade e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Fúria', tipo: HabilidadeTipoCriaturaEnum.GATILHO, descricao: 'Ativa ao sofrer dano crítico.', restricao: 'uma vez por cena' },
    ]);
  });

  it('pede confirmação via ConfirmacaoService (ui-15/P-069) e só remove se confirmar', async () => {
    const alvo = montar(true);
    const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);

    await alvo.fixture.componentInstance['remover'](0);

    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ severidade: 'perigo', entidade: 'Pele de Pedra' }),
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
