import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAlteradaDto,
  FichaJogadorDadosDto,
  FichaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { FichaEditar } from './editar.page';
import { FichaService } from '../../ficha.service';
import { FichaFormularioValor } from '../../componentes/ficha-formulario/ficha-formulario.component';

/**
 * Prova a tela de edição (m3-06): carrega a ficha da rota via `recuperarFicha` e entrega ao
 * formulário; salvar chama `alterarFicha` com o valor emitido e reflete o resultado em tela.
 */
describe('FichaEditar', () => {
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
    estado: { vidaAtual: 5, energiaAtual: 5, sequelas: [], traumas: [], lesoes: [] },
    habilidades: [],
    inventario: { itens: [], amplificadores: [] },
    anotacoes: '',
  };

  function montar() {
    const recuperada: FichaRecuperadaDto = { id: 42, campanhaId: 9, usuarioId: 7, nome: 'Kane', dados };
    const fichaService = {
      recuperarFicha: vi.fn(() => of(recuperada)),
      alterarFicha: vi.fn(
        () => of({ id: 42, campanhaId: 9, usuarioId: 7, nome: 'Novo', dados } as FichaAlteradaDto),
      ),
    };

    TestBed.configureTestingModule({
      imports: [FichaEditar],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
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

    const fixture = TestBed.createComponent(FichaEditar);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, fichaService };
  }

  it('carrega a ficha da rota e entrega ao formulário', () => {
    const { raiz, fichaService } = montar();
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(42);
    const nome = raiz.querySelector('input[formControlName="nome"]') as HTMLInputElement;
    expect(nome.value).toBe('Kane');
  });

  it('salva as alterações via alterarFicha', () => {
    const { fixture, fichaService } = montar();
    const valor: FichaFormularioValor = { nome: 'Novo', dados };

    fixture.componentInstance['salvar'](valor);

    expect(fichaService.alterarFicha).toHaveBeenCalledWith(42, { nome: 'Novo', dados });
  });
});
