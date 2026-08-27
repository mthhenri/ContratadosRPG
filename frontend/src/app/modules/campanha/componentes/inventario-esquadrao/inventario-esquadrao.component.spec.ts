import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ItemCategoriaEnum } from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { InventarioEsquadrao } from './inventario-esquadrao.component';

describe('InventarioEsquadrao', () => {
  let fixture: ComponentFixture<InventarioEsquadrao>;
  const campanhaService = {
    adicionarItemInventario: vi.fn(() => of({ itens: [] })),
    ajustarQuantidadeItemInventario: vi.fn(() => of({ itens: [] })),
    removerItemInventario: vi.fn(() => of({ itens: [] })),
  };
  const fichaService = { pegarItemInventario: vi.fn(() => of({ id: 3 })) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [InventarioEsquadrao],
      providers: [
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
      ],
    });
    fixture = TestBed.createComponent(InventarioEsquadrao);
    fixture.componentRef.setInput('campanhaId', 8);
    fixture.componentRef.setInput('itens', []);
    fixture.componentRef.setInput('fichas', [{ id: 3, nome: 'Vera' }]);
    fixture.componentRef.setInput('somenteLeitura', false);
    fixture.detectChanges();
  });

  it('orienta a adicionar quando o inventário está vazio', () => {
    expect(fixture.nativeElement.textContent).toContain('Nenhum item armazenado');
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__adicionar')).not.toBeNull();
  });

  it('mantém o catálogo aberto depois de adicionar um item', () => {
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('.inventario-esquadrao__adicionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    (raiz.querySelector('.inventario-esquadrao__catalogo-adicionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.inventario-esquadrao__catalogo')).not.toBeNull();
    expect(raiz.textContent).toContain('Adicionado');
  });

  it('adiciona item customizado com os campos mecânicos representáveis pelo inventário coletivo', () => {
    const raiz = fixture.nativeElement as HTMLElement;
    const botao = Array.from(raiz.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Item custom'),
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(raiz.querySelector('.inventario-esquadrao__form')).not.toBeNull();
    fixture.componentInstance['itemCustomForm'].patchValue({
      nome: 'Escudo improvisado',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 350,
      peso: 2,
      quantidade: 3,
      descricao: 'Placas recuperadas da base.',
      resistencia: '8 [Físico]',
    });
    fixture.detectChanges();

    expect(raiz.textContent).toContain('Resistência');
    expect(raiz.textContent).not.toContain('Informação (alcance / área / munição)');
    (raiz.querySelector('.inventario-esquadrao__form') as HTMLFormElement)
      .dispatchEvent(new Event('submit'));

    expect(campanhaService.adicionarItemInventario).toHaveBeenCalledWith(8, {
      nome: 'Escudo improvisado',
      categoria: ItemCategoriaEnum.PROTECOES,
      custo: 350,
      peso: 2,
      quantidade: 3,
      descricao: 'Placas recuperadas da base.',
      resistencia: '8 [Físico]',
    });
    expect(fixture.componentInstance['criandoItem']()).toBe(false);
  });

  it('não envia item customizado sem nome', () => {
    fixture.componentInstance['alternarCriarItem']();
    fixture.componentInstance['confirmarCriarItem']();

    expect(campanhaService.adicionarItemInventario).not.toHaveBeenCalled();
  });

  it('filtra os itens do catálogo pela busca sem decorar o nome com ícone', () => {
    const raiz = fixture.nativeElement as HTMLElement;
    (raiz.querySelector('.inventario-esquadrao__adicionar') as HTMLButtonElement).click();
    fixture.detectChanges();

    const busca = raiz.querySelector('[aria-label="Buscar itens"]') as HTMLInputElement;
    busca.value = 'Energético Concentrado';
    busca.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const cards = raiz.querySelectorAll('.inventario-esquadrao__catalogo-item');
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain('Energético Concentrado');
    expect(cards[0].querySelector('.inventario-esquadrao__catalogo-item-cabecalho app-icone')).toBeNull();
  });

  it('lista item e encaminha ajuste e transferência', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Kit médico', categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 2, peso: 1, quantidade: 2,
    }]);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.textContent).toContain('Kit médico');
    (raiz.querySelector('[aria-label="Aumentar quantidade de Kit médico"]') as HTMLButtonElement).click();
    (raiz.querySelector('.inventario-esquadrao__pegar') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.inventario-esquadrao__confirmar') as HTMLButtonElement).click();

    expect(campanhaService.ajustarQuantidadeItemInventario).toHaveBeenCalledWith(8, 'item-1', 1);
    expect(fichaService.pegarItemInventario).toHaveBeenCalledWith(3, 'item-1', 2);
  });

  it('exibe as modificações preservadas no card do item', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Colete Reforçado', categoria: ItemCategoriaEnum.PROTECOES,
      custo: 100, peso: 3, quantidade: 1,
      modificacoes: [{ nome: 'Placa Extra', empilhamentos: 1, efeitos: [{ tipo: 'RESISTENCIA', valor: 2 }] }],
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__mod-tag')?.textContent)
      .toContain('Placa Extra ×1');
    expect(fixture.nativeElement.textContent).toContain('+2 de resist. (todas)');
  });

  it('pede confirmação no próprio item antes de remover', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Kit médico', categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 2, peso: 1, quantidade: 2,
    }]);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('[aria-label="Remover Kit médico"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.removerItemInventario).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('Remover item?');
    (raiz.querySelector('[aria-label="Confirmar remoção de Kit médico"]') as HTMLButtonElement).click();

    expect(campanhaService.removerItemInventario).toHaveBeenCalledWith(8, 'item-1');
  });

  it('permite cancelar a confirmação de remoção', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Kit médico', categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 2, peso: 1, quantidade: 2,
    }]);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('[aria-label="Remover Kit médico"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('[aria-label="Cancelar remoção de Kit médico"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.removerItemInventario).not.toHaveBeenCalled();
    expect(raiz.textContent).not.toContain('Remover item?');
    expect(raiz.querySelector('[aria-label="Remover Kit médico"]')).not.toBeNull();
  });

  it('mostra os itens sem ações de alteração durante a missão', () => {
    fixture.componentRef.setInput('itens', [{
      id: 'item-1', nome: 'Kit médico', categoria: ItemCategoriaEnum.MEDICINAL,
      custo: 2, peso: 1, quantidade: 2,
    }]);
    fixture.componentRef.setInput('somenteLeitura', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Kit médico');
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__adicionar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__quantidade')).toBeNull();
    expect(fixture.nativeElement.querySelector('.inventario-esquadrao__pegar')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover Kit médico"]')).toBeNull();
  });
});
