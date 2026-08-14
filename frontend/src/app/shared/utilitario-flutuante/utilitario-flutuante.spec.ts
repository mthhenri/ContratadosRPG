import { Component, ViewEncapsulation } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { CalculadoraFlutuante } from '../calculadora-flutuante/calculadora-flutuante.component';
import { HistoricoRolagensSidebar } from '../historico-rolagens-sidebar/historico-rolagens-sidebar.component';
import { InventarioEsquadraoSidebar } from '../inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component';
import { LeitorDocumentos } from '../leitor-documentos/leitor-documentos.component';
import { CadernoFlutuante } from '../../modules/pagina-caderno/caderno-flutuante.component';

@Component({
  standalone: true,
  template: '',
  styleUrl: '../../../styles.scss',
  encapsulation: ViewEncapsulation.None,
})
class EstilosGlobaisTeste {}

interface DefinicaoComponenteComEstilos {
  readonly ɵcmp: {
    readonly styles: readonly string[];
  };
}

describe('contrato CSS dos utilitários flutuantes', () => {
  const estilosGlobais = obterEstilosCompilados(EstilosGlobaisTeste);
  const estilosCalculadora = obterEstilosCompilados(CalculadoraFlutuante);
  const estilosHistorico = obterEstilosCompilados(HistoricoRolagensSidebar);
  const estilosInventario = obterEstilosCompilados(InventarioEsquadraoSidebar);
  const estilosLeitor = obterEstilosCompilados(LeitorDocumentos);
  const estilosCaderno = obterEstilosCompilados(CadernoFlutuante);

  it('ancora os gatilhos flutuantes da campanha e da ficha no canto inferior esquerdo', () => {
    for (const estilos of [estilosCalculadora, estilosHistorico, estilosInventario, estilosCaderno]) {
      expect(estilos).toContain('left: 24px');
    }
  });

  it('empilha 48px com vão de 12px e remove a vaga quando Documentos não está recolhido', () => {
    expect(estilosGlobais).toContain('--documentos-recolhidos: 0px');
    expect(estilosGlobais).toMatch(
      /:root:has\(\.utilitario-flutuante--documentos\)\s*{[^}]*--documentos-recolhidos:\s*60px/,
    );
    expect(estilosCalculadora).toMatch(/width:\s*48px;[\s\S]*height:\s*48px/);
    expect(estilosCalculadora).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 0px)',
    );
    expect(estilosHistorico).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 60px)',
    );
    expect(estilosLeitor).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 0px)',
    );
    expect(estilosCaderno).toContain(
      'bottom: calc(24px + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 180px)',
    );
  });

  it('mantém gatilhos da ficha inline em 44px e Documentos sobre piso e safe-area no mobile', () => {
    expect(estilosGlobais).toMatch(
      /@media \(max-width:\s*560px\)[\s\S]*--documentos-recolhidos:\s*56px/,
    );
    expect(estilosGlobais).toMatch(
      /:root:has\(\.ficha-nav\) \.utilitario-flutuante--documentos\s*{[^}]*--piso-flutuante:\s*57px/,
    );

    for (const estilos of [estilosCalculadora, estilosHistorico]) {
      expect(estilos).toMatch(
        /@media \(max-width:\s*560px\)[\s\S]*position:\s*static;[\s\S]*left:\s*auto;[\s\S]*width:\s*44px;[\s\S]*height:\s*44px/,
      );
    }
    expect(estilosLeitor).toContain(
      'bottom: calc(12px + env(safe-area-inset-bottom) + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 0px)',
    );
    expect(estilosHistorico).toContain(
      'bottom: calc(12px + env(safe-area-inset-bottom) + var(--piso-flutuante, 0px) + var(--documentos-recolhidos, 0px) + 56px)',
    );
  });

  it('oculta o gatilho durante a bandeja sem anchor e o restaura no enhancement ancorado', () => {
    const inicioFallback = estilosGlobais.indexOf(
      ':root:has(.bandeja__carta) .utilitario-flutuante--documentos',
    );
    const inicioSuporteAnchor = estilosGlobais.indexOf('@supports (bottom: anchor(top))');

    expect(inicioFallback).toBeGreaterThanOrEqual(0);
    expect(inicioFallback).toBeLessThan(inicioSuporteAnchor);
    expect(estilosLeitor).toContain('display: flex');
    expect(estilosGlobais.slice(0, inicioFallback)).not.toContain('display: none');
    expect(estilosGlobais.slice(inicioFallback, inicioSuporteAnchor)).toContain('display: none');

    const ramoAnchor = estilosGlobais.slice(inicioSuporteAnchor);
    expect(ramoAnchor).toContain('display: flex');
    expect(ramoAnchor).toContain('bottom: calc(anchor(top) + 12px)');
  });

  it('deixa o fallback de casar quando a carta fecha sem remover o gatilho de Documentos', () => {
    const gatilhoDocumentos = document.createElement('button');
    gatilhoDocumentos.className = 'utilitario-flutuante--documentos';
    const carta = document.createElement('article');
    carta.className = 'bandeja__carta';
    document.body.append(gatilhoDocumentos, carta);

    expect(document.documentElement.matches(':has(.bandeja__carta)')).toBe(true);

    carta.remove();

    expect(document.documentElement.matches(':has(.bandeja__carta)')).toBe(false);
    expect(gatilhoDocumentos.isConnected).toBe(true);
    gatilhoDocumentos.remove();
  });
});

function obterEstilosCompilados(componente: unknown): string {
  return (componente as DefinicaoComponenteComEstilos).ɵcmp.styles.join('\n');
}
