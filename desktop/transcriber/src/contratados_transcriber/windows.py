"""DPAPI current-user scope. Fail closed outside Windows; never plaintext fallback."""
import ctypes
from ctypes import wintypes
import os
from pathlib import Path
from .core import SecureStore

class Blob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]

def crypt(data: bytes, decrypt=False) -> bytes:
    if os.name != "nt": raise OSError("Proteção de credenciais requer Windows DPAPI.")
    source = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    src = Blob(len(data), source); out = Blob()
    dll = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]; kernel.LocalFree.restype = ctypes.c_void_p
    if decrypt:
        fn = dll.CryptUnprotectData
        fn.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        ok = fn(ctypes.byref(src), None, None, None, None, 1, ctypes.byref(out))
    else:
        fn = dll.CryptProtectData
        fn.argtypes = [ctypes.POINTER(Blob), wintypes.LPCWSTR, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
        ok = fn(ctypes.byref(src), "Contratados Transcriber", None, None, None, 1, ctypes.byref(out))
    if not ok: raise OSError("Não foi possível proteger ou abrir o vínculo Windows.")
    try: return ctypes.string_at(out.pbData, out.cbData)
    finally: kernel.LocalFree(out.pbData)

def store_for(origin: str) -> SecureStore:
    import hashlib
    if os.name != "nt": raise OSError("Este aplicativo requer Windows de 64 bits.")
    root = Path(os.environ["LOCALAPPDATA"]) / "Contratados" / "Transcriber" / hashlib.sha256(origin.encode()).hexdigest()
    return SecureStore(root, crypt, lambda b: crypt(b, True))

def resources() -> dict:
    import platform
    import shutil
    if os.name != "nt": return {"compatível": False, "sistema": platform.system()}
    class Memory(ctypes.Structure):
        _fields_ = [("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD)] + [(x, ctypes.c_ulonglong) for x in ["ullTotalPhys", "ullAvailPhys", "ullTotalPageFile", "ullAvailPageFile", "ullTotalVirtual", "ullAvailVirtual", "ullAvailExtendedVirtual"]]
    m = Memory(); m.dwLength = ctypes.sizeof(m)
    ok = ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return {"compatível": platform.machine().upper() in ("AMD64", "X86_64"), "sistema": platform.platform(),
            "RAM disponível (GiB)": round(m.ullAvailPhys / 2**30, 1) if ok else "indisponível",
            "Disco livre (GiB)": round(shutil.disk_usage(os.environ["LOCALAPPDATA"]).free / 2**30, 1),
            "CPU (threads)": os.cpu_count(), "GPU": "Verificação do motor na task 04; sem dependência de GPU aqui."}
