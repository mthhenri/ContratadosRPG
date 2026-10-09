import { describe, expect, it } from 'vitest';

import { CalculadoraFlutuante } from '../calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { InventarioEsquadraoSidebar } from '../inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component';
import { CadernoFlutuante } from '../../modules/pagina-caderno/caderno-flutuante.component';

interface DefinicaoComponenteComEstilos {
  readonly ɵcmp: {
    readonly styles: readonly string[];
  };
}

describe('contrato CSS dos utilitários flutuantes', () => {
  const estilosCalculadora = obterEstilosCompilados(CalculadoraFlutuante);
  const estilosHistorico = obterEstilosCompilados(HistoricoRolagensSidebar);
  const estilosInventario = obterEstilosCompilados(InventarioEsquadraoSidebar);
  const estilosCaderno = obterEstilosCompilados(CadernoFlutuante);

  it('ancora os gatilhos flutuantes da campanha e da ficha no canto inferior esquerdo', () => {
    for (const estilos of [estilosCalculadora, estilosHistorico, estilosInventario, estilosCaderno]) {
      expect(estilos).toContain('left: 24px');
    }
  });

  it('empilha os utilitários em 48px com vão de 12px', () => {
    expect(estilosCalculadora).toMatch(/width:\s*48px;[\s\S]*height:\s*48px/);
    expect(estilosCalculadora).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + 0px)',
    );
    expect(estilosHistorico).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + 60px)',
    );
    expect(estilosCaderno).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + 180px)',
    );
  });

  it('mantém gatilhos da ficha inline em 44px e respeita a safe-area no mobile', () => {
    for (const estilos of [estilosCalculadora, estilosHistorico]) {
      expect(estilos).toMatch(
        /@media \(max-width:\s*560px\)[\s\S]*position:\s*static;[\s\S]*left:\s*auto;[\s\S]*width:\s*44px;[\s\S]*height:\s*44px/,
      );
    }
    expect(estilosHistorico).toContain(
      'bottom: calc(12px + env(safe-area-inset-bottom) + var(--piso-flutuante, 0px) + 56px)',
    );
  });

});

function obterEstilosCompilados(componente: unknown): string {
  return (componente as DefinicaoComponenteComEstilos).ɵcmp.styles.join('\n');
}
