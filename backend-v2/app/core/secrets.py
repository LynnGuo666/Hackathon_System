"""AES-256-GCM 加密工具，用于把敏感凭据（SMTP 密码、邮件服务 API Key）加密后入库。

密钥来源：首次启动在 SECRET_KEY_FILE（默认项目根 .secret_key）生成 32 字节随机密钥，
权限 0600，仅存内存。后续启动读取该文件。密钥文件需纳入运维备份/权限管理。
"""

from __future__ import annotations

import base64
import json
import os
import secrets as _secrets
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

# 模块级缓存：单进程内只读取一次密钥文件。
_secret_key_cache: bytes | None = None

# 凭据值若为空则不加密、不存储，用此哨兵表示「未设置」。
EMPTY_MARKER = ""


def _default_key_file() -> Path:
    return Path(get_settings().secret_key_file).expanduser()


def load_or_create_secret_key() -> bytes:
    """读取或生成 AES 主密钥。生成时写入文件（权限 0600）。"""
    global _secret_key_cache
    if _secret_key_cache is not None:
        return _secret_key_cache

    key_file = _default_key_file()
    if key_file.exists():
        raw = key_file.read_bytes().strip()
        if len(raw) == 32:
            _secret_key_cache = raw
            return _secret_key_cache
        # 文件存在但内容异常，避免静默用弱密钥，重新生成更安全。

    key = _secrets.token_bytes(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    # 先写临时文件再原子重命名 + 收紧权限，避免半写文件被读取。
    tmp_file = key_file.with_suffix(key_file.suffix + ".tmp")
    tmp_file.write_bytes(key)
    try:
        os.chmod(tmp_file, 0o600)
    except OSError:
        # 某些文件系统（如容器只读层挂载点）可能不支持 chmod，忽略不阻断启动。
        pass
    tmp_file.replace(key_file)
    _secret_key_cache = key
    return key


def encrypt(plaintext: str) -> str:
    """AES-256-GCM 加密，返回 base64(nonce + ciphertext + tag)。空串返回空串。"""
    if not plaintext:
        return EMPTY_MARKER
    key = load_or_create_secret_key()
    aesgcm = AESGCM(key)
    nonce = _secrets.token_bytes(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt(token: str) -> str:
    """解密 encrypt() 产出的 token。空串返回空串。"""
    if not token:
        return EMPTY_MARKER
    key = load_or_create_secret_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(token)
    nonce, ciphertext = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")


def reset_cache_for_tests() -> None:
    """测试用：清空模块级密钥缓存，强制下次重新读取文件。"""
    global _secret_key_cache
    _secret_key_cache = None


def encrypt_json(obj: dict) -> str:
    """把 dict 序列化后加密，适合需要加密的结构化配置。"""
    return encrypt(json.dumps(obj, ensure_ascii=False))


def decrypt_json(token: str) -> dict:
    """decrypt_json 的逆向，返回 dict；token 为空时返回空 dict。"""
    if not token:
        return {}
    return json.loads(decrypt(token))
