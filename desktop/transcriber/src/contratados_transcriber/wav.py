"""Leitura e validação de WAV (task 02). Só lê; nunca grava, normaliza nem regrava o original.

Nada daqui sai do computador: o conteúdo, o caminho e o hash do áudio ficam no app (D-06a). O silêncio inicial é só medido,
nunca aplicado a offset (D-05+): quem decide o deslocamento é o Mestre.
"""
import hashlib
import struct
import sys
from array import array
from dataclasses import dataclass
from pathlib import Path

_FORMATOS = {1: "PCM", 3: "IEEE_FLOAT"}
_QUADROS_POR_BLOCO = 4096
_MAXIMO_CHUNKS = 256
_TAMANHO_INDEFINIDO = (0, 0xFFFFFFFF)
LIMIAR_PADRAO_DBFS = -60.0

_MENSAGENS = {
    "ILEGIVEL": "não foi possível abrir o arquivo",
    "NAO_RIFF": "não é um arquivo WAV (a extensão não garante o conteúdo)",
    "CABECALHO_INCOMPLETO": "o cabeçalho está incompleto",
    "SEM_FMT": "o cabeçalho de formato (fmt) não foi encontrado",
    "SEM_DATA": "não há bloco de áudio (data)",
    "SEM_AMOSTRAS": "o arquivo não tem nenhuma amostra de áudio",
    "TRUNCADO": "o arquivo está truncado ou os dados não fecham quadros inteiros",
    "FORMATO_NAO_SUPORTADO": "formato de áudio não suportado (use PCM 8/16/24/32 bits ou float de 32 bits)",
    "PARAMETROS_INVALIDOS": "o cabeçalho tem canais, taxa ou alinhamento incompatíveis",
}


class WavInvalido(Exception):
    """Erro isolado de UMA faixa. A mensagem leva só o nome do arquivo, nunca o caminho absoluto."""

    def __init__(self, codigo: str, nome_arquivo: str):
        super().__init__(f"{nome_arquivo}: {_MENSAGENS[codigo]}")
        self.codigo = codigo
        self.nome_arquivo = nome_arquivo


@dataclass(frozen=True)
class InfoWav:
    nome_arquivo: str
    tamanho_bytes: int
    canais: int
    taxa_hz: int
    bits: int
    formato: str
    duracao_ms: int
    silencio_inicial_ms: int
    sem_fala: bool
    avisos: tuple[str, ...]


def _ms(quadros: int, taxa_hz: int) -> int:
    """Milissegundos inteiros, arredondando ao mais próximo (mesma regra do contrato temporal da 01)."""
    return (quadros * 1000 + taxa_hz // 2) // taxa_hz


def _bytes(arquivo, quantidade: int, nome: str) -> bytes:
    dados = arquivo.read(quantidade)
    if len(dados) < quantidade:
        raise WavInvalido("CABECALHO_INCOMPLETO", nome)
    return dados


def _ler_fmt(conteudo: bytes, nome: str) -> tuple[int, int, int, int, int]:
    if len(conteudo) < 16:
        raise WavInvalido("CABECALHO_INCOMPLETO", nome)
    etiqueta, canais, taxa, _, alinhamento, bits = struct.unpack("<HHIIHH", conteudo[:16])
    if etiqueta == 0xFFFE:  # WAVE_FORMAT_EXTENSIBLE: o formato real está no início do GUID
        if len(conteudo) < 26:
            raise WavInvalido("CABECALHO_INCOMPLETO", nome)
        etiqueta = struct.unpack("<H", conteudo[24:26])[0]
    return etiqueta, canais, taxa, alinhamento, bits


def _cabecalho(arquivo, tamanho: int, nome: str):
    """Percorre os chunks até o `data`. Devolve (etiqueta, canais, taxa, alinhamento, bits, inicio_dados, bytes_dados, avisos)."""
    inicio = arquivo.read(12)
    if inicio[:4] != b"RIFF" or (len(inicio) >= 12 and inicio[8:12] != b"WAVE"):
        if len(inicio) < 4:
            raise WavInvalido("CABECALHO_INCOMPLETO", nome)
        raise WavInvalido("NAO_RIFF", nome)
    if len(inicio) < 12:
        raise WavInvalido("CABECALHO_INCOMPLETO", nome)
    fmt = None
    for _ in range(_MAXIMO_CHUNKS):
        posicao = arquivo.tell()
        cabecalho = arquivo.read(8)
        if len(cabecalho) < 8:
            break
        identificador, declarado = struct.unpack("<4sI", cabecalho)
        corpo = posicao + 8
        if identificador == b"fmt ":
            if corpo + declarado > tamanho:
                raise WavInvalido("CABECALHO_INCOMPLETO", nome)
            fmt = _ler_fmt(arquivo.read(declarado), nome)
            arquivo.seek(declarado & 1, 1)
            continue
        if identificador == b"data":
            if fmt is None:
                raise WavInvalido("SEM_FMT", nome)
            restante = tamanho - corpo
            avisos: tuple[str, ...] = ()
            if declarado in _TAMANHO_INDEFINIDO and restante > 0:
                declarado = restante
                avisos = ("TAMANHO_DATA_AJUSTADO",)
            elif declarado > restante:
                raise WavInvalido("TRUNCADO", nome)
            return (*fmt, corpo, declarado, avisos)
        arquivo.seek(declarado + (declarado & 1), 1)
        if arquivo.tell() > tamanho:
            break
    raise WavInvalido("SEM_DATA" if fmt is not None else "SEM_FMT", nome)


def _validar_formato(etiqueta: int, canais: int, taxa: int, alinhamento: int, bits: int, nome: str) -> str:
    if etiqueta not in _FORMATOS:
        raise WavInvalido("FORMATO_NAO_SUPORTADO", nome)
    if (etiqueta == 1 and bits not in (8, 16, 24, 32)) or (etiqueta == 3 and bits != 32):
        raise WavInvalido("FORMATO_NAO_SUPORTADO", nome)
    if canais < 1 or taxa < 1 or alinhamento != canais * (bits // 8):
        raise WavInvalido("PARAMETROS_INVALIDOS", nome)
    return _FORMATOS[etiqueta]


def _amostras(bloco: bytes, formato: str, bits: int) -> tuple[array, float]:
    """Converte um bloco para amostras comparáveis e devolve também a escala de fundo (full scale)."""
    if formato == "IEEE_FLOAT":
        valores, escala = array("f"), 1.0
        valores.frombytes(bloco)
    elif bits == 8:
        valores, escala = array("B"), 128.0
        valores.frombytes(bloco)
    elif bits == 16:
        valores, escala = array("h"), 32768.0
        valores.frombytes(bloco)
    elif bits == 24:  # usa os 16 bits mais significativos de cada amostra, em velocidade de C
        palavras = bytearray(len(bloco) // 3 * 2)
        palavras[0::2] = bloco[1::3]
        palavras[1::2] = bloco[2::3]
        valores, escala = array("h"), 32768.0
        valores.frombytes(bytes(palavras))
    else:
        valores, escala = array("i" if array("i").itemsize == 4 else "l"), 2147483648.0
        valores.frombytes(bloco)
    if sys.byteorder == "big" and bits != 8:
        valores.byteswap()
    return valores, escala


def _primeiro_quadro_sonoro(arquivo, inicio: int, quadros: int, canais: int, bits: int, formato: str, fracao: float) -> int | None:
    alinhamento = canais * (bits // 8)
    arquivo.seek(inicio)
    lidos = 0
    while lidos < quadros:
        quantidade = min(_QUADROS_POR_BLOCO, quadros - lidos)
        valores, escala = _amostras(arquivo.read(quantidade * alinhamento), formato, bits)
        limiar = escala * fracao if formato == "IEEE_FLOAT" else max(1, int(escala * fracao))
        centro = 128 if (formato == "PCM" and bits == 8) else 0
        if max(max(valores) - centro, centro - min(valores)) > limiar:
            for indice, valor in enumerate(valores):
                if abs(valor - centro) > limiar:
                    return lidos + indice // canais
        lidos += quantidade
    return None


def inspecionar_wav(caminho: Path, *, limiar_dbfs: float = LIMIAR_PADRAO_DBFS) -> InfoWav:
    """Lê cabeçalho e mede duração e silêncio inicial. Levanta `WavInvalido` com o código do problema."""
    caminho = Path(caminho)
    nome = caminho.name
    try:
        with caminho.open("rb") as arquivo:
            arquivo.seek(0, 2)
            tamanho = arquivo.tell()
            arquivo.seek(0)
            etiqueta, canais, taxa, alinhamento, bits, inicio, bytes_dados, avisos = _cabecalho(arquivo, tamanho, nome)
            formato = _validar_formato(etiqueta, canais, taxa, alinhamento, bits, nome)
            if bytes_dados == 0:
                raise WavInvalido("SEM_AMOSTRAS", nome)
            if bytes_dados % alinhamento:
                raise WavInvalido("TRUNCADO", nome)
            quadros = bytes_dados // alinhamento
            duracao = _ms(quadros, taxa)
            primeiro = _primeiro_quadro_sonoro(arquivo, inicio, quadros, canais, bits, formato, 10 ** (limiar_dbfs / 20))
    except OSError:
        raise WavInvalido("ILEGIVEL", nome) from None
    sem_fala = primeiro is None
    silencio = duracao if sem_fala else _ms(primeiro, taxa)
    return InfoWav(nome, tamanho, canais, taxa, bits, formato, duracao, silencio, sem_fala,
                   (*avisos, "SEM_FALA") if sem_fala else avisos)


def calcular_hash(caminho: Path) -> str:
    """SHA-256 do conteúdo, só para uso local (detecta arquivo repetido, renomeado ou alterado). Nunca vai à API."""
    caminho = Path(caminho)
    resumo = hashlib.sha256()
    try:
        with caminho.open("rb") as arquivo:
            for bloco in iter(lambda: arquivo.read(1 << 20), b""):
                resumo.update(bloco)
    except OSError:
        raise WavInvalido("ILEGIVEL", caminho.name) from None
    return resumo.hexdigest()
