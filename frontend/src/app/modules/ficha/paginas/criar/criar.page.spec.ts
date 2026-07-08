import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriadaDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaCriar } from './criar.page';
import { FichaService } from '../../ficha.service';
import { FichaFormularioValor } from '../../componentes/ficha-formulario/ficha-formulario.component';

/**
 * Prova a tela de criação (m3-06): lê o `campanhaId` da rota, chama `criarFicha` com o valor
 * emitido pelo formulário e navega para a edição da ficha recém-criada.
 */
describe('FichaCriar', () => {
  const valor: FichaFormularioValor = {
    nome: 'Kane',
    dados: {
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
    },
  };

  function montar() {
    const fichaService = {
      criarFicha: vi.fn(() => of({ id: 42, campanhaId: 9, usuarioId: 7, nome: 'Kane', dados: valor.dados } as FichaCriadaDto)),
    };

    TestBed.configureTestingModule({
      imports: [FichaCriar],
      providers: [
        provideRouter([]),
        { provide: FichaService, useValue: fichaService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['campanhaId', '9']]) }, parent: null },
        },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(FichaCriar);
    fixture.detectChanges();
    return { fixture, fichaService, navegar };
  }

  it('cria a ficha na campanha da rota e navega para a edição', () => {
    const { fixture, fichaService, navegar } = montar();

    fixture.componentInstance['criar'](valor);

    expect(fichaService.criarFicha).toHaveBeenCalledWith({
      campanhaId: 9,
      nome: 'Kane',
      dados: valor.dados,
    });
    expect(navegar).toHaveBeenCalledWith(['/painel', 9, 'ficha', 42, 'editar']);
  });
});
