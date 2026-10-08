import { TestBed } from '@angular/core/testing';

import { Icone, IconeNome } from './icone.component';

/**
 * Prova o componente de ícone reutilizável: renderiza um SVG monocromático (herda a cor via
 * `currentColor`, sem emoji) e desenha formas diferentes conforme o `nome`.
 */
describe('Icone', () => {
    it("incorpora o trio preenchido aprovado, sem confundir Vida com Machucado", () => {
        for (const nome of ["vida", "energia", "defesa"] as const) {
            const svg = montar(nome).querySelector("svg")!;
            expect(svg.getAttribute("fill")).toBe("currentColor");
            expect(svg.getAttribute("stroke")).toBe("none");
            expect(svg.querySelectorAll("path")).toHaveLength(1);
        }
        expect(assinatura("vida")).not.toBe(assinatura("machucado"));
        expect(assinatura("energia")).not.toBe(assinatura("defesa"));
    });
  function montar(nome: IconeNome) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Icone] });
    const fixture = TestBed.createComponent(Icone);
    fixture.componentRef.setInput('nome', nome);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** Assinatura das formas do glifo (jsdom não serializa innerHTML de SVG). */
  function assinatura(nome: IconeNome): string {
    const formas = montar(nome).querySelectorAll('svg circle, svg path, svg rect');
    return Array.from(formas)
      .map((forma) => forma.tagName + (forma.getAttribute('d') ?? forma.getAttribute('r') ?? ''))
      .join('|');
  }

  it('renderiza um <svg> que herda a cor do texto (currentColor)', () => {
    const raiz = montar('agente');
    const svg = raiz.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
    expect(svg!.querySelectorAll('circle, path, rect').length).toBeGreaterThan(0);
  });

  it('desenha formas distintas para nomes distintos', () => {
    expect(assinatura('descanso')).not.toBe(assinatura('compras'));
  });

  it('distingue visualmente a simulação da calculadora aritmética', () => {
    expect(assinatura('simulacao')).not.toBe(assinatura('calculadora'));
  });

  it('representa a simulação como árvore vertical de cenários', () => {
    expect(montar('simulacao').querySelectorAll('svg > circle')).toHaveLength(7);
  });

  it('renderiza o glifo monocromático próprio de documentos', () => {
    const nome: IconeNome = 'documentos';
    const raiz = montar(nome);
    const svg = raiz.querySelector('svg');

    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(assinatura(nome)).not.toBe('');
    expect(assinatura(nome)).not.toBe(assinatura('anotacoes'));
  });

  it('distingue o caderno da campanha das anotações da própria ficha', () => {
    expect(assinatura('caderno')).not.toBe('');
    expect(assinatura('caderno')).not.toBe(assinatura('anotacoes'));
    expect(assinatura('caderno')).not.toBe(assinatura('documentos'));
  });

  it('`dados` desenha dois d20, o de trás recortado pela silhueta do da frente', () => {
    const raiz = montar('dados');
    const dados = raiz.querySelectorAll('svg svg use');
    expect(dados.length).toBe(2);
    expect(dados[0].getAttribute('href')).toBe(dados[1].getAttribute('href'));
    const recortado = raiz.querySelector('g[mask]');
    expect(recortado).not.toBeNull();
    expect(recortado!.querySelectorAll('use').length).toBe(1);
    expect(raiz.querySelector('mask')).not.toBeNull();
  });

  it('os selos de olho (rolagens/acesso) desenham formas distintas entre si e do olho puro', () => {
    const nomes: IconeNome[] = [
      'olho',
      'olho-fechado',
      'olho-rolagens',
      'olho-fechado-rolagens',
      'olho-membros',
    ];
    const formas = nomes.map(assinatura);
    expect(new Set(formas).size).toBe(formas.length);
  });

  it('os glifos da biblioteca (m9-04) são próprios e distintos dos vizinhos', () => {
    const nomes: IconeNome[] = [
      'biblioteca',
      'documentos',
      'caderno',
      'anotacoes',
      'imagem',
      'tamanho-real',
      'ajustar-largura',
    ];
    const formas = nomes.map(assinatura);
    expect(formas.every((forma) => forma !== '')).toBe(true);
    expect(new Set(formas).size).toBe(nomes.length);
  });

    // M10-03: desenhos aprovados em ICO[nome].op[dec], sem escolhas locais do navegador.
    const identidade: ReadonlyArray<readonly [IconeNome, string]> = [
        [
            "combatente",
            "<path d=\"M4 4l10.5 10.5M4 4h3.5l9 9M20 4l-10.5 10.5M20 4h-3.5l-9 9\"/>" +
            "<path d=\"M13 16.5l4.5-4.5M7 12l4.5 4.5M16 15l4 4M8 15l-4 4\"/>",
        ],
        [
            "especialista",
            "<circle cx=\"12\" cy=\"12\" r=\"9\"/>" +
            "<path d=\"M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9z\"/>",
        ],
        [
            "suporte",
            "<circle cx=\"12\" cy=\"12\" r=\"9\"/>" +
            "<path d=\"M10 7h4v3h3v4h-3v3h-4v-3H7v-4h3z\"/>",
        ],
        [
            "lutador",
            "<rect x=\"5\" y=\"6.5\" width=\"3\" height=\"11\" rx=\"1\"/>" +
            "<rect x=\"16\" y=\"6.5\" width=\"3\" height=\"11\" rx=\"1\"/>" +
            "<path d=\"M8 12h8M3 9.5v5M21 9.5v5\"/>",
        ],
        [
            "mercenario",
            "<circle cx=\"12\" cy=\"12\" r=\"7\"/>" +
            "<path d=\"M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4\"/>" +
            "<circle cx=\"12\" cy=\"12\" r=\".8\" fill=\"currentColor\"/>",
        ],
        [
            "vanguarda",
            "<path d=\"M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z\"/>" +
            "<path d=\"M8.5 13.5 12 10l3.5 3.5\"/>",
        ],
        [
            "engenheiro",
            "<path d=\"M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17a2.1 2.1 0 0 0 3 3l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z\"/>",
        ],
        [
            "assassino",
            "<g transform=\"rotate(45 12 12)\">" +
            "<path d=\"M12 2.5 14 5v8.5h-4V5z\"/>" +
            "<path d=\"M8 13.5h8\"/>" +
            "<path d=\"M12 13.5v5\"/>" +
            "<circle cx=\"12\" cy=\"20\" r=\"1.5\"/>" +
            "</g>",
        ],
        [
            "academico",
            "<path d=\"M2.5 9 12 5l9.5 4L12 13z\"/>" +
            "<path d=\"M6.5 11v4.5c3 2.5 8 2.5 11 0V11\"/>" +
            "<path d=\"M21.5 9v5\"/>",
        ],
        [
            "paramedico",
            "<path d=\"M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z\"/>",
        ],
        [
            "diplomata",
            "<path d=\"M12 4v16M7.5 20h9M5 7h14\"/>" +
            "<path d=\"M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z\"/>",
        ],
        [
            "comandante",
            "<path d=\"M5 9l7-4 7 4M5 14l7-4 7 4M5 19l7-4 7 4\"/>",
        ],
        [
            "bestial",
            "<path d=\"M6 3.5c-1.5 5-.5 11 2.5 16.5\"/>" +
            "<path d=\"M11 3c-1.3 5.5-.3 11.5 3 17.5\"/>" +
            "<path d=\"M16 3.5c-1 5 0 10 3 15\"/>",
        ],
        [
            "artificial",
            "<rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"1.5\"/>" +
            "<rect x=\"9.5\" y=\"9.5\" width=\"5\" height=\"5\" rx=\".5\"/>" +
            "<path d=\"M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21\"/>",
        ],
        [
            "hibrido",
            "<path d=\"M7 3c0 6 10 6 10 12s-10 3-10 6\"/>" +
            "<path d=\"M17 3c0 6-10 6-10 12s10 3 10 6\"/>" +
            "<path d=\"M8.5 6.5h7M9 12h6M8.5 17.5h7\"/>",
        ],
        [
            "civil",
            "<circle cx=\"12\" cy=\"8\" r=\"4\"/>" +
            "<path d=\"M4.5 20.5c.8-4 3.8-6.5 7.5-6.5s6.7 2.5 7.5 6.5\"/>",
        ],
        [
            "npc",
            "<circle cx=\"12\" cy=\"6\" r=\"2.5\"/>" +
            "<path d=\"M9.5 10h5l1 7h-7z\"/>" +
            "<path d=\"M6.5 20.5h11M7.5 17h9\"/>",
        ],
    ];

    it.each(identidade)("renderiza %s com o desenho de identidade aprovado", (nome, desenho) => {
        const svg = montar(nome).querySelector("svg")!;
        expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
        expect(svg.getAttribute("fill")).toBe("none");
        expect(svg.getAttribute("stroke")).toBe("currentColor");
        expect(svg.getAttribute("stroke-width")).toBe("1.75");
        expect(svg.getAttribute("stroke-linecap")).toBe("round");
        expect(svg.getAttribute("stroke-linejoin")).toBe("round");
        expect(svg.getAttribute("aria-hidden")).toBe("true");

        const referencia = new DOMParser().parseFromString(
            '<svg xmlns="http://www.w3.org/2000/svg">' + desenho + "</svg>",
            "image/svg+xml",
        ).documentElement;
        // Compara toda a árvore, incluindo transform da adaga e preenchimento da mira.
        function descrever(elemento: Element): unknown {
            return {
                nome: elemento.localName,
                atributos: Object.fromEntries(Array.from(elemento.attributes)
                    .filter((atributo) => !atributo.name.startsWith("_ngcontent"))
                    .map((atributo) => [atributo.name, atributo.value])),
                filhos: Array.from(elemento.children).map(descrever),
            };
        }
        expect(Array.from(svg.children).map(descrever))
            .toEqual(Array.from(referencia.children).map(descrever));
    });

    it("distingue todos os desenhos de identidade e seus vizinhos existentes", () => {
        const nomes: IconeNome[] = [
            ...identidade.map(([nome]) => nome),
            "agente", "dt", "corpo-a-corpo", "protecoes", "patente", "documentos",
        ];
        const formas = nomes.map(assinatura);
        expect(formas.every((forma) => forma !== "")).toBe(true);
        expect(new Set(formas).size).toBe(nomes.length);
    });

    it.each(["scp", "criatura", "contratados"] as const)(
        "renderiza %s como formas preenchidas com cor herdada",
        (nome) => {
            const svg = montar(nome).querySelector("svg")!;
            expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
            expect(svg.getAttribute("fill")).toBe("currentColor");
            expect(svg.getAttribute("stroke")).toBe("none");
            expect(svg.getAttribute("aria-hidden")).toBe("true");
            expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
            expect(svg.querySelector("image, filter, script")).toBeNull();
        },
    );

    it("reserva o SCP oficial a criatura e mantém nossa marca distinta", () => {
        expect(assinatura("criatura")).toBe(assinatura("scp"));
        expect(assinatura("contratados")).not.toBe(assinatura("scp"));
        expect(montar("scp").querySelectorAll("path")).toHaveLength(5);
        expect(montar("contratados").querySelectorAll("path")).toHaveLength(20);
    });
});
