"""Portable core. Never logs credentials, provider keys, audio or private context."""
import hashlib
import json
import os
import re
import secrets
from pathlib import Path
from urllib.parse import urlsplit

UUID = re.compile(r"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89aAbB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}")
class OfflineError(Exception): pass
class CredentialError(Exception): pass

def parse_uri(uri: str) -> str:
    if not isinstance(uri, str) or len(uri) > 128:
        raise ValueError("Abertura inválida.")
    u = urlsplit(uri)
    if u.scheme != "contratados-transcriber" or u.netloc != "abrir" or u.query or u.fragment or not UUID.fullmatch(u.path[1:]):
        raise ValueError("Abertura inválida.")
    return u.path[1:]

def validate_origin(origin: str) -> str:
    u = urlsplit(origin)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.path not in ("", "/") or u.query or u.fragment:
        raise ValueError("Informe uma origem HTTPS sem caminho, credencial ou parâmetros.")
    _ = u.port  # Reject malformed ports.
    return origin.rstrip("/")

def account_namespace(origin: str, user_id: int) -> str:
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id < 1:
        raise ValueError("Conta inválida.")
    return hashlib.sha256(f"{validate_origin(origin)}|{user_id}".encode()).hexdigest()

class SecureStore:
    """Only DPAPI is supplied in production. Test callbacks are explicit, never fallback."""
    def __init__(self, root: Path, protect, unprotect):
        self.root = root
        self.protect = protect
        self.unprotect = unprotect
    def save(self, data: dict):
        self.root.mkdir(parents=True, exist_ok=True)
        blob = self.protect(json.dumps(data, ensure_ascii=False).encode())
        temp = self.root / "vinculo.tmp"
        with temp.open("wb") as f:
            f.write(blob); f.flush(); os.fsync(f.fileno())
        os.replace(temp, self.root / "vinculo.bin")
    def load(self) -> dict:
        p = self.root / "vinculo.bin"
        if not p.exists(): return {}
        data = json.loads(self.unprotect(p.read_bytes()))
        if not isinstance(data, dict): raise ValueError("Vínculo local inválido.")
        return data

class Session:
    def __init__(self, api, store: SecureStore):
        self.api, self.store = api, store
        self.context = None
    def start_link(self, name: str) -> dict:
        old = self.store.load()
        if old.get("secret") or old.get("revocation_pending") or old.get("user_id"):
            raise CredentialError("Desconecte o vínculo anterior antes de vincular outra conta.")
        secret = secrets.token_urlsafe(32)
        # Save before request: lost response never loses an already-authorized credential.
        data = {"secret": secret, "origin": self.api.origin}
        self.store.save(data)
        try: pedido = self.api.start_link(hashlib.sha256(secret.encode()).hexdigest(), name)
        except Exception:
            # Secret stays protected; retry creates a fresh pending request.
            raise
        data["request_id"] = pedido["identificador"]
        self.store.save(data)
        self.context = None
        return pedido
    def refresh(self) -> dict:
        data = self.store.load()
        if not data.get("secret"): return {"vinculado": False, "expirado": False}
        if data.get("revocation_pending"):
            self.disconnect()
            return {"vinculado": False, "expirado": False}
        status = self.api.status(data["secret"])
        if status.get("vinculado"):
            previous = data.get("user_id")
            if previous is not None and previous != status["usuarioId"]:
                self.context = None
                raise CredentialError("Identidade do vínculo mudou. Desconecte e vincule novamente.")
            data["user_id"] = status["usuarioId"]
            data["namespace"] = account_namespace(self.api.origin, status["usuarioId"])
            data["login"] = status["login"]
            self.store.save(data)
        else: self.context = None
        return status
    def resolve(self, intent: str) -> dict:
        if not UUID.fullmatch(intent): raise ValueError("Abertura inválida.")
        data = self.store.load()
        self.context = None
        if not data.get("secret") or not data.get("user_id") or data.get("revocation_pending"):
            raise CredentialError("Vincule sua conta e confirme o vínculo antes de abrir uma sessão.")
        # Server validates current account, device, campaign/master and single-use intent.
        self.context = self.api.resolve(intent, data["secret"])
        return self.context
    def disconnect(self):
        self.context = None
        data = self.store.load()
        if not data.get("secret"): return
        data["revocation_pending"] = True
        self.store.save(data)
        try: self.api.revoke(data["secret"])
        except OfflineError: return
        # Only credential pointer is replaced, never account results/caches.
        self.store.save({})
