"""Fixtures sintéticas e reproduzíveis de WAV (task 02, entregável 7). Nenhum áudio real nem arquivo binário versionado:
tudo é gerado em memória a partir de regras simples, para provar o cálculo temporal sem afirmar semântica do Craig real."""
import struct

FORMATO_PCM = 1
FORMATO_FLOAT = 3
FORMATO_ADPCM = 2
FORMATO_EXTENSIBLE = 0xFFFE


def quadro_tom(canais: int, bits: int, formato: int = FORMATO_PCM, amplitude: float = 0.5, positivo: bool = True) -> bytes:
    sinal = 1 if positivo else -1
    if formato == FORMATO_FLOAT:
        return struct.pack("<f", sinal * amplitude) * canais
    if bits == 8:
        return bytes([128 + sinal * int(127 * amplitude)]) * canais
    maximo = 2 ** (bits - 1) - 1
    valor = sinal * int(maximo * amplitude)
    return valor.to_bytes(bits // 8, "little", signed=True) * canais


def tom(frames: int, canais: int = 1, bits: int = 16, formato: int = FORMATO_PCM, amplitude: float = 0.5) -> bytes:
    """Onda quadrada determinística (alterna a cada 24 quadros) com amplitude conhecida."""
    alto = quadro_tom(canais, bits, formato, amplitude, True)
    baixo = quadro_tom(canais, bits, formato, amplitude, False)
    return b"".join(alto if (i // 24) % 2 == 0 else baixo for i in range(frames))


def silencio(frames: int, canais: int = 1, bits: int = 16, formato: int = FORMATO_PCM) -> bytes:
    if bits == 8 and formato == FORMATO_PCM:
        return bytes([128]) * (frames * canais)
    return bytes(frames * canais * (bits // 8))


def chunk(identificador: bytes, conteudo: bytes, tamanho_declarado: int | None = None) -> bytes:
    declarado = len(conteudo) if tamanho_declarado is None else tamanho_declarado
    corpo = identificador + struct.pack("<I", declarado) + conteudo
    return corpo + (b"\x00" if len(conteudo) % 2 else b"")


def fmt(canais: int = 1, taxa: int = 48000, bits: int = 16, formato: int = FORMATO_PCM, extra: bytes | None = None) -> bytes:
    alinhamento = canais * (bits // 8)
    base = struct.pack("<HHIIHH", formato, canais, taxa, taxa * alinhamento, alinhamento, bits)
    if formato == FORMATO_EXTENSIBLE:
        # cbSize(22) = bits válidos (2) + máscara de canais (4) + SubFormat GUID (16, começa pelo código do formato real)
        extra = extra if extra is not None else struct.pack("<HI", bits, 0) + struct.pack("<H", FORMATO_PCM) + bytes(14)
    return chunk(b"fmt ", base + (struct.pack("<H", len(extra)) + extra if extra is not None else b""))


def wav(dados: bytes, *, canais: int = 1, taxa: int = 48000, bits: int = 16, formato: int = FORMATO_PCM,
        antes: tuple[bytes, ...] = (), tamanho_data: int | None = None, tamanho_riff: int | None = None,
        com_fmt: bool = True, com_data: bool = True) -> bytes:
    corpo = b"WAVE" + (fmt(canais, taxa, bits, formato) if com_fmt else b"") + b"".join(antes)
    if com_data:
        corpo += chunk(b"data", dados, tamanho_data)
    declarado = len(corpo) if tamanho_riff is None else tamanho_riff
    return b"RIFF" + struct.pack("<I", declarado) + corpo
