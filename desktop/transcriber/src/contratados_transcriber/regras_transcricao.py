"""Espelho em Python das regras puras de `shared/src/validators/transcricao-importacao.validators.ts` (task 02).

A fonte da verdade é o TypeScript. Este módulo é testado contra os MESMOS vetores
(`shared/src/validators/transcricao-importacao.vetores.json`); se uma regra mudar, regere os vetores e ajuste os dois lados.
Cuidado com as diferenças entre os idiomas: `trim`, `\\s`, `\\d` e `$` não significam o mesmo em JavaScript e em Python,
por isso as formas abaixo são explícitas.
"""
import re
import unicodedata

TERMO_MAXIMO = 80
NOME_MAXIMO = 255
ID_MAXIMO = 2147483647
TEMPO_MAXIMO = 2 ** 53 - 1

_ZS = "   " + "".join(chr(c) for c in range(0x2000, 0x200B)) + "  　"
_ESPACOS_JS = "\t\n\u000b\u000c\r" + _ZS + "  ﻿"  # o que String.prototype.trim remove
_RE_ZS = re.compile("[" + _ZS + "]+")
_RE_EXTENSAO = re.compile(r"\.[A-Za-z0-9]{1,5}\Z")
_RE_PREFIXO = re.compile("^[0-9]+[" + re.escape(_ESPACOS_JS) + r"_.\-]+")
_RE_IDIOMA = re.compile(r"[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}")
_ORDEM_ACHADO = {"DUPLICADO": 0, "MESMO_NOME_DIFERENTE": 1, "POSSIVEL_COPIA_RENOMEADA": 2}


def normalizar_rotulo(texto: str) -> str:
    return _RE_ZS.sub(" ", unicodedata.normalize("NFC", texto).strip(_ESPACOS_JS))


def chave_termo(termo: str) -> str:
    return normalizar_rotulo(termo).lower()


def chave_parecida(texto: str) -> str:
    sem_marcas = "".join(c for c in unicodedata.normalize("NFD", normalizar_rotulo(texto)) if not unicodedata.category(c).startswith("M"))
    return sem_marcas.lower()


def _invisivel(caractere: str) -> bool:
    return caractere not in "‌‍" and unicodedata.category(caractere) in ("Cc", "Cf")


def _validar_texto(entrada, maximo: int) -> dict:
    if not isinstance(entrada, str):
        return {"valido": False, "motivo": "TIPO"}
    aparado = unicodedata.normalize("NFC", entrada).strip(_ESPACOS_JS)
    if aparado == "":
        return {"valido": False, "motivo": "VAZIO"}
    if any(_invisivel(c) for c in aparado):
        return {"valido": False, "motivo": "CONTROLE"}
    valor = normalizar_rotulo(aparado)
    if len(valor) > maximo:
        return {"valido": False, "motivo": "LONGO"}
    return {"valido": True, "valor": valor}


def validar_termo(termo) -> dict:
    return _validar_texto(termo, TERMO_MAXIMO)


def validar_participante(rotulo) -> dict:
    return _validar_texto(rotulo, NOME_MAXIMO)


def localizar_conflito_termo(termo: str, existentes: list[str]) -> dict | None:
    chave = chave_termo(termo)
    for existente in existentes:
        if chave_termo(existente) == chave:
            return {"tipo": "DUPLICADO", "existente": existente}
    parecida = chave_parecida(termo)
    for existente in existentes:
        if chave_parecida(existente) == parecida:
            return {"tipo": "PARECIDO", "existente": existente}
    return None


def localizar_participante_parecido(participante: str, conhecidos: list[str]) -> str | None:
    rotulo = normalizar_rotulo(participante)
    if any(normalizar_rotulo(c) == rotulo for c in conhecidos):
        return None
    chave = chave_parecida(rotulo)
    for conhecido in conhecidos:
        if chave_parecida(conhecido) == chave:
            return normalizar_rotulo(conhecido)
    return None


def candidatos_nome_origem(nome_arquivo: str) -> list[str]:
    base = re.split(r"[\\/]", nome_arquivo)[-1]
    completo = normalizar_rotulo(_RE_EXTENSAO.sub("", base))
    sem_prefixo = normalizar_rotulo(_RE_PREFIXO.sub("", completo))
    unicos: list[str] = []
    for nome in (completo, sem_prefixo):
        if nome != "" and nome not in unicos:
            unicos.append(nome)
    return unicos


def sugerir_identidade(nome_arquivo: str, associacoes: list[dict]) -> dict:
    for candidato in candidatos_nome_origem(nome_arquivo):
        chave = chave_parecida(candidato)
        participantes = sorted({normalizar_rotulo(a["participante"]) for a in associacoes if chave_parecida(a["nomeOrigem"]) == chave})
        if len(participantes) == 1:
            return {"origem": "ASSOCIACAO", "participante": participantes[0], "candidatos": participantes}
        if len(participantes) > 1:
            return {"origem": "AMBIGUA", "participante": None, "candidatos": participantes}
    return {"origem": "DESCONHECIDA", "participante": None, "candidatos": []}


def _agrupar(itens: list, chave) -> dict:
    grupos: dict = {}
    for indice, item in enumerate(itens):
        grupos.setdefault(chave(item), []).append(indice)
    return grupos


def detectar_duplicidade(arquivos: list[dict]) -> list[dict]:
    def assinatura(a: dict) -> str:
        return f"{a['tamanhoBytes']}|{a['duracaoMilissegundos']}"

    achados: list[dict] = []
    for indices_do_nome in _agrupar(arquivos, lambda a: chave_termo(a["nomeArquivo"])).values():
        if len(indices_do_nome) < 2:
            continue
        por_assinatura = _agrupar(indices_do_nome, lambda i: assinatura(arquivos[i]))
        for iguais in por_assinatura.values():
            if len(iguais) > 1:
                achados.append({"tipo": "DUPLICADO", "indices": [indices_do_nome[i] for i in iguais]})
        if len(por_assinatura) > 1:
            achados.append({"tipo": "MESMO_NOME_DIFERENTE", "indices": indices_do_nome})
    for indices_da_assinatura in _agrupar(arquivos, assinatura).values():
        nomes = {chave_termo(arquivos[i]["nomeArquivo"]) for i in indices_da_assinatura}
        if len(nomes) > 1:
            achados.append({"tipo": "POSSIVEL_COPIA_RENOMEADA", "indices": indices_da_assinatura})
    return sorted(achados, key=lambda a: (_ORDEM_ACHADO[a["tipo"]], a["indices"][0]))


def participantes_sem_faixa(esperados: list[str], participantes_das_faixas: list[str]) -> list[str]:
    presentes = {chave_parecida(p) for p in participantes_das_faixas}
    return [e for e in esperados if chave_parecida(e) not in presentes]


def montar_glossario_efetivo(termos: list[str]) -> dict:
    ordenados = sorted(t for t in (normalizar_rotulo(t) for t in termos) if t != "")
    vistos: set[str] = set()
    unicos: list[str] = []
    for termo in ordenados:
        chave = chave_termo(termo)
        if chave in vistos:
            continue
        vistos.add(chave)
        unicos.append(termo)
    return {"versao": 1, "termos": unicos}


def _inteiro_seguro(valor) -> bool:
    if isinstance(valor, bool):
        return False
    if isinstance(valor, float):
        return valor.is_integer() and abs(valor) <= TEMPO_MAXIMO
    return isinstance(valor, int) and abs(valor) <= TEMPO_MAXIMO


def _id_valido(valor) -> bool:
    return _inteiro_seguro(valor) and 1 <= valor <= ID_MAXIMO


def montar_pacote_trabalho(entrada: dict) -> dict:
    """Contrato do motor. Recusa termo de outra campanha (sem repetir o termo), faixa sem identidade confirmada e valores fora do contrato."""
    erros: list[str] = []
    if not _id_valido(entrada["campanhaId"]):
        erros.append("Campanha inválida.")
    if not _id_valido(entrada["sessaoId"]):
        erros.append("Sessão inválida.")
    idioma = entrada["idioma"]
    if not isinstance(idioma, str) or len(idioma) > 35 or not _RE_IDIOMA.fullmatch(idioma):
        erros.append("Idioma inválido.")
    if any(item["campanhaId"] != entrada["campanhaId"] for item in entrada["glossario"]):
        erros.append("Glossário de outra campanha não pode entrar neste pacote.")
    termos: list[str] = []
    for item in entrada["glossario"]:
        termo = validar_termo(item["termo"])
        if termo["valido"]:
            termos.append(termo["valor"])
        else:
            erros.append("Há termo de glossário inválido.")
    if len(entrada["faixas"]) == 0:
        erros.append("O pacote precisa de ao menos uma faixa.")
    identificadores: set[str] = set()
    for indice, faixa in enumerate(entrada["faixas"], start=1):
        rotulo = f"Faixa {indice}"
        identificador = faixa["identificador"]
        if not isinstance(identificador, str) or identificador == "":
            erros.append(f"{rotulo}: identificador ausente.")
        elif identificador in identificadores:
            erros.append(f"{rotulo}: identificador repetido.")
        else:
            identificadores.add(identificador)
        if faixa["identidadeConfirmada"] is not True:
            erros.append(f"{rotulo}: a identidade ainda não foi confirmada.")
        if not validar_participante(faixa["participante"])["valido"]:
            erros.append(f"{rotulo}: participante inválido.")
        if not _inteiro_seguro(faixa["deslocamentoMilissegundos"]):
            erros.append(f"{rotulo}: deslocamento inválido.")
        silencio = faixa["silencioInicialMilissegundos"]
        if silencio is not None and (not _inteiro_seguro(silencio) or silencio < 0):
            erros.append(f"{rotulo}: silêncio inicial inválido.")
    if erros:
        return {"ok": False, "erros": erros}
    return {"ok": True, "pacote": {
        "campanhaId": entrada["campanhaId"], "sessaoId": entrada["sessaoId"], "idioma": idioma,
        "glossario": montar_glossario_efetivo(termos)["termos"],
        "faixas": [{
            "identificador": f["identificador"], "nomeArquivo": f["nomeArquivo"],
            "participante": normalizar_rotulo(f["participante"]),
            "deslocamentoMilissegundos": f["deslocamentoMilissegundos"],
            "silencioInicialMilissegundos": f["silencioInicialMilissegundos"],
        } for f in entrada["faixas"]],
    }}
