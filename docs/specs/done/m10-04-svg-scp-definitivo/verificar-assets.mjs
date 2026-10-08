import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pasta = dirname(fileURLToPath(import.meta.url));
const raiz = join(pasta, "../../../..");
const require = createRequire(join(raiz, "package.json"));
const { JSDOM } = require("jsdom");
const ler = caminho => readFileSync(join(raiz, caminho), "utf8");
const xml = fonte => new JSDOM(fonte, { contentType: "image/svg+xml" }).window.document;
const formas = fonte => [...xml(fonte).querySelectorAll("path")].map(elemento =>
    Object.fromEntries([...elemento.attributes].map(atributo => [atributo.name,
        atributo.name === "d"
            ? atributo.value.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)
            : atributo.value,
    ])),
);
const publico = nome => ler(`frontend/public/marcas/${nome}.svg`);
const proposta = variante => readFileSync(join(pasta, `proposta/scp-${variante}-v1.svg`), "utf8");
for (const variante of ["icone", "silhueta"]) {
    assert.deepEqual(formas(publico(`scp-${variante}`)), formas(proposta(variante)));
}
const original = ler("frontend/public/logo-black.svg");
for (const variante of ["icone", "silhueta"]) {
    const asset = publico(`contratados-${variante}`);
    assert.deepEqual(formas(asset), formas(original));
    assert.equal(xml(asset).querySelectorAll("path").length, 20);
    const grupo = xml(asset).querySelector(variante === "icone" ? "g > g" : "svg > g");
    assert.equal(grupo.getAttribute("transform"), xml(original).querySelector("g").getAttribute("transform"));
    assert.equal(grupo.getAttribute("fill"), "currentColor");
}
const template = ler("frontend/src/app/shared/icone/icone.component.html");
for (const nome of ["scp", "contratados"]) {
    const conteudo = template.match(new RegExp(`@case \\("${nome}"\\) \\{([\\s\\S]*?)\\n        \\}`))[1];
    assert.deepEqual(formas(`<svg xmlns="http://www.w3.org/2000/svg">${conteudo}</svg>`),
        formas(publico(`${nome}-icone`)));
}
for (const nome of ["scp-icone", "scp-silhueta", "contratados-icone", "contratados-silhueta"]) {
    const documento = xml(publico(nome));
    assert.equal(documento.querySelector("image, filter, script"), null);
    assert.equal(documento.documentElement.getAttribute("fill"), "currentColor");
    assert.equal(documento.documentElement.getAttribute("stroke"), "none");
    assert.match(documento.querySelector("metadata").textContent, /CC BY-SA 3\.0/);
}
const paleta = JSON.parse(readFileSync(join(pasta, "proposta/paleta.json"), "utf8"));
for (const tokens of ["docs/design/tema/_tokens.scss", "frontend/src/styles/tema/_tokens.scss"]) {
    const fonte = ler(tokens);
    for (const nivel of paleta) {
        assert.match(fonte, new RegExp(`--ameaca-${nivel.chave}: ${nivel.cor};`));
    }
}
console.log("Quatro assets, geometria aprovada/atual, template e paleta nos dois handoffs conferidos.");
