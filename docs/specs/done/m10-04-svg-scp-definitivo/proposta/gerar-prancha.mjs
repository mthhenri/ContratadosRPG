import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", {
    paths: [process.env.CODEX_BROWSER_PACKAGES || process.cwd()]
}));
const { PNG } = require(require.resolve("pngjs", {
    paths: [process.env.CODEX_BROWSER_PACKAGES || process.cwd()]
}));
const pasta = dirname(fileURLToPath(import.meta.url));
const raiz = join(pasta, "../../../../..");
const artefatos = join(raiz, ".artifacts/m10-04");
mkdirSync(artefatos, { recursive: true });
const livro = readFileSync(join(raiz, "docs/core/sistema-v4.1.4.md"), "utf8");
const tokens = readFileSync(join(raiz, "docs/design/tema/_tokens.scss"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const nomes = ["Desconhecida", "Nula", "Baixa", "Média", "Alta", "Extrema",
    "Catastrófica", "Apocalíptica"];
const chaves = ["desconhecida", "nula", "baixa", "media", "alta", "extrema",
    "catastrofica", "apocaliptica"];
const paleta = [...livro.matchAll(/\[image([1-8])\]: <data:image\/png;base64,([^>]+)>/g)]
    .map((imagem, indice) => {
        const bytes = Buffer.from(imagem[2], "base64");
        writeFileSync(join(artefatos, `original-${imagem[1]}.png`), bytes);
        const pixels = PNG.sync.read(bytes).data;
        let alfaMaximo = 0;
        for (let posicao = 3; posicao < pixels.length; posicao += 4) {
            alfaMaximo = Math.max(alfaMaximo, pixels[posicao]);
        }
        const contagens = new Map();
        for (let posicao = 0; posicao < pixels.length; posicao += 4) {
            if (pixels[posicao + 3] !== alfaMaximo) continue;
            const cor = "#" + [...pixels.subarray(posicao, posicao + 3)]
                .map(canal => canal.toString(16).padStart(2, "0")).join("");
            contagens.set(cor, (contagens.get(cor) || 0) + 1);
        }
        const [cor, ocorrencias] = [...contagens].sort((primeiro, segundo) =>
            segundo[1] - primeiro[1])[0];
        return { nome: nomes[indice], chave: chaves[indice], imagem: Number(imagem[1]),
            cor, alfaMaximo, ocorrencias };
    });

// Fonte CC BY-SA 3.0: Wikimedia Commons, revisão BmboB de 16/06/2023.
const contorno = "m51.9 11.9h31.7l3.07 11.4.944.391c19.4 8.03 32 26.9 32 47.9 " +
    "0 2.26-.149 4.53-.445 6.77l-.133 1.01 8.37 8.37-15.8 27.4-11.4-3.06-.809.623" +
    "c-9.06 6.95-20.2 10.7-31.6 10.7-11.4 6e-5-22.5-3.77-31.6-10.7l-.81-.623" +
    "-11.4 3.06-15.8-27.4 8.37-8.37-.133-1.01c-.296-2.25-.445-4.51-.445-6.77" +
    ".000141-21 12.6-39.9 32-47.9l.944-.391z";
const navegador = await chromium.launch({ headless: true, channel: "msedge" });
const pagina = await navegador.newPage();
const formas = await pagina.evaluate(({ contorno }) => {
    const caminho = document.createElementNS("http://www.w3.org/2000/svg", "path");
    caminho.setAttribute("d", contorno);
    const comprimento = caminho.getTotalLength();
    const pontos = Array.from({ length: 2400 }, (_, indice) => {
        const ponto = caminho.getPointAtLength(comprimento * indice / 2400);
        return [ponto.x, ponto.y];
    });
    function simplificar(pontos, tolerancia) {
        if (pontos.length < 3) return pontos;
        const primeiro = pontos[0], ultimo = pontos.at(-1);
        const horizontal = ultimo[0] - primeiro[0], vertical = ultimo[1] - primeiro[1];
        let distanciaMaxima = 0, indiceMaximo = 0;
        for (let indice = 1; indice < pontos.length - 1; indice++) {
            const distancia = Math.abs(vertical * (pontos[indice][0] - primeiro[0]) -
                horizontal * (pontos[indice][1] - primeiro[1])) /
                (Math.hypot(horizontal, vertical) || 1);
            if (distancia > distanciaMaxima) {
                distanciaMaxima = distancia; indiceMaximo = indice;
            }
        }
        if (distanciaMaxima <= tolerancia) return [primeiro, ultimo];
        return [...simplificar(pontos.slice(0, indiceMaximo + 1), tolerancia).slice(0, -1),
            ...simplificar(pontos.slice(indiceMaximo), tolerancia)];
    }
    function borda(espessura) {
        const bordaExterior = [], bordaInterior = [];
        pontos.forEach((ponto, indice) => {
            const anterior = pontos[(indice + pontos.length - 1) % pontos.length];
            const seguinte = pontos[(indice + 1) % pontos.length];
            const horizontal = seguinte[0] - anterior[0];
            const vertical = seguinte[1] - anterior[1];
            const comprimento = Math.hypot(horizontal, vertical);
            const normal = [vertical / comprimento * espessura / 2,
                -horizontal / comprimento * espessura / 2];
            bordaExterior.push([ponto[0] + normal[0], ponto[1] + normal[1]]);
            bordaInterior.push([ponto[0] - normal[0], ponto[1] - normal[1]]);
        });
        return [bordaExterior, bordaInterior].map(borda => {
            const meio = Math.floor(borda.length / 2);
            const reduzida = [...simplificar(borda.slice(0, meio + 1), 0.05).slice(0, -1),
                ...simplificar([...borda.slice(meio), borda[0]], 0.05)];
            return "M" + reduzida.map(ponto => ponto.map(valor =>
                Number((valor * 24 / 135).toFixed(4))).join(" ")).join("L") + "Z";
        }).join("");
    }
    return { icone: borda(6), silhueta: borda(4) };
}, { contorno });
await navegador.close();
const escala = valor => Number((valor * 24 / 135).toFixed(4));
const centro = [escala(67.7), escala(71.5)];
const aro = [36, 30].map(raio => {
    const distancia = escala(raio);
    return `M${centro[0] - distancia} ${centro[1]}a${distancia} ${distancia} 0 1 0 ` +
        `${distancia * 2} 0a${distancia} ${distancia} 0 1 0 ${-distancia * 2} 0Z`;
}).join("");
const seta = [[64.7,30.6],[64.7,54.6],[59.62,54.6],[67.7,68.6],
    [75.78,54.6],[70.7,54.6],[70.7,30.6]].map(ponto => ponto.map(escala).join(" "));
function conteudo(variante) {
    return `<path fill-rule="evenodd" d="${formas[variante]}"/>\n` +
        `<path fill-rule="evenodd" d="${aro}"/>\n` +
        [0,120,240].map(angulo => `<path transform="rotate(${angulo} ${centro.join(" ")})" ` +
            `d="M${seta.join("L")}Z"/>`).join("\n");
}
for (const variante of ["icone", "silhueta"]) {
    writeFileSync(join(pasta, `scp-${variante}-v1.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none">\n` +
        `<metadata>Proposta v1. Logo far2; PNG Aelanna; vetor Vizorsols/BmboB. ` +
        `Adaptado para ContratadosRPG. CC BY-SA 3.0. ` +
        `https://commons.wikimedia.org/wiki/File:SCP_Foundation_(emblem).svg</metadata>\n` +
        conteudo(variante) + "\n</svg>\n");
}
writeFileSync(join(pasta, "paleta.json"), JSON.stringify(paleta, null, 4) + "\n");
const svg = (variante, tamanho) => `<svg class="prancha__svg prancha__svg--${tamanho}" ` +
    `viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">` +
    conteudo(variante) + "</svg>";
const tamanhos = [16,20,24,32,48,64,96];
const marcaSite = readFileSync(join(raiz, "frontend/public/logo-black.svg"), "utf8")
    .match(/<g[\s\S]*<\/g>/)[0].replace(/fill="#000000"/g, 'fill="currentColor"');
const svgMarca = tamanho => `<svg class="prancha__svg prancha__svg--${tamanho}" ` +
    `viewBox="0 0 1000 1000" aria-hidden="true">${marcaSite}</svg>`;
const faixas = base => `<section class="prancha__base prancha__base--${base}">
    <h2>Base ${base === "escuro" ? "escura" : "clara"}</h2>
    <h3>Criatura · SCP oficial · viewBox 24</h3>
    <div class="prancha__tamanhos">${tamanhos.map(tamanho => `<figure>${svg("icone", tamanho)}<figcaption>${tamanho}px</figcaption></figure>`).join("")}</div>
    <h3>Regras e níveis · marca própria SCP + D20 · asset atual</h3>
    <div class="prancha__tamanhos">${tamanhos.map(tamanho => `<figure>${svgMarca(tamanho)}<figcaption>${tamanho}px</figcaption></figure>`).join("")}</div>
    <h3>Oito níveis · original do livro → preenchimento sólido</h3>
    <div class="prancha__niveis">${paleta.map((nivel, indice) => `<figure class="prancha__nivel prancha__nivel--${nivel.chave}">
        <figcaption><strong>${indice} · ${nivel.nome}</strong><span>${nivel.cor} · alfa original ${nivel.alfaMaximo}/255</span></figcaption>
        <div class="prancha__comparacao"><img src="../../../../.artifacts/m10-04/original-${nivel.imagem}.png" alt="Logo original: ${nivel.nome}" width="68" height="68"><span aria-hidden="true">→</span><span class="prancha__suporte">${svgMarca(96)}</span></div>
    </figure>`).join("")}</div>
</section>`;
writeFileSync(join(pasta, "../m10-04-scp-aprovacao.html"), `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>M10-04 · SCP · proposta v1</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
    <style>
${tokens}
:root { ${paleta.map(nivel => `--ameaca-${nivel.chave}: ${nivel.cor};`).join("\n")} --ameaca-fundo-escuro: #13161b; --ameaca-fundo-claro: var(--contrast); }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-sans); }
.prancha { max-width: 1640px; padding: var(--pad-card); margin: auto; }
h1, h2, h3, strong, figcaption { font-family: var(--font-mono); }
h1 { font-size: 24px; } h2 { font-size: 20px; } h3 { font-size: 13px; text-transform: uppercase; letter-spacing: var(--tracking-label); margin-top: 28px; }
p { max-width: 960px; line-height: 1.6; } a { color: var(--text); text-decoration: underline; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
.prancha__status { color: var(--warning); font-family: var(--font-mono); }
.prancha__bases { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--gap-grid); }
.prancha__base { min-width: 0; padding: var(--pad-card); border: 1px solid var(--border-strong); border-radius: var(--radius-card); background: var(--surface); color: var(--text); }
.prancha__base--claro { --bg: #eef0f3; --surface: #ffffff; --surface-2: #e7eaee; --text: #12151a; --text-dim: #4a4f57; --border-strong: rgba(0,0,0,.16); color-scheme: light; }
.prancha__tamanhos { display: flex; flex-wrap: wrap; align-items: end; gap: var(--space-16); }
figure { margin: 0; } .prancha__tamanhos figure { display: grid; justify-items: center; gap: var(--space-12); }
.prancha__tamanhos figcaption { font-size: 11px; color: var(--text-dim); }
.prancha__svg { display: block; flex: none; }
${tamanhos.map(tamanho => `.prancha__svg--${tamanho} { width: ${tamanho}px; height: ${tamanho}px; }`).join("\n")}
.prancha__niveis { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--space-12); }
.prancha__nivel { min-width: 0; padding: var(--space-12); border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface-2); }
.prancha__nivel figcaption { display: grid; gap: var(--space-8); font-size: 12px; }
.prancha__nivel figcaption span { color: var(--text-dim); font-size: 10px; }
.prancha__comparacao { display: flex; align-items: center; justify-content: space-around; gap: var(--space-8); margin-top: var(--space-16); }
.prancha__suporte { display: grid; place-items: center; padding: var(--space-8); background: var(--ameaca-fundo-escuro); border-radius: var(--radius-control); }
${paleta.map(nivel => `.prancha__nivel--${nivel.chave} .prancha__suporte { color: var(--ameaca-${nivel.chave}); }`).join("\n")}
.prancha__nivel--catastrofica .prancha__suporte, .prancha__nivel--extrema .prancha__suporte { background: var(--ameaca-fundo-claro); }
footer { margin-top: var(--space-20); padding-top: var(--space-20); border-top: 1px solid var(--border-strong); }
@media(max-width:1080px) { .prancha__bases { grid-template-columns: minmax(0,1fr); } }
@media(max-width:560px) { .prancha { padding: var(--space-12); } .prancha__base { padding: var(--space-12); } .prancha__niveis { grid-template-columns: minmax(0,1fr); } h1 { font-size: 20px; } }
    </style>
</head>
<body>
<main class="prancha">
    <p class="prancha__status">M10-04 // USOS REVISTOS PELO AUTOR — 08/10/2026</p>
    <h1>Criatura e a marca de ContratadosRPG</h1>
    <p>Logo SCP oficial reservado à identidade de Criatura. Regras e níveis usam nossa marca SCP + D20. Abaixo, a marca própria é o SVG já existente, recolorido sem redesenho; seu refino para tamanhos pequenos permanece aberto. Os SVGs oficiais preparados são preservados. As oito cores vêm das imagens originais do livro.</p>
    <div class="prancha__bases">${faixas("escuro")}${faixas("claro")}</div>
    <footer>
        <h2>Crédito proposto para Regras</h2>
        <p><a href="https://commons.wikimedia.org/wiki/File:SCP_Foundation_(emblem).svg">Logo SCP</a>: far2; versão de alta resolução por Aelanna; vetor de Vizorsols e BmboB. Adaptado para ContratadosRPG. Licença <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>.</p>
        <p>A escolha de uso está registrada: oficial em Criatura; marca própria no restante. O texto de crédito, os acabamentos e a incorporação ao app permanecem em preparação. Esta prancha não encerra os gates dos componentes reais.</p>
    </footer>
</main>
</body>
</html>
`);
console.log(JSON.stringify({ paleta, propostas: ["scp-icone-v1.svg", "scp-silhueta-v1.svg"] }));
