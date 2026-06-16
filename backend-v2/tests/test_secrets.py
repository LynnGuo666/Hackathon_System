from pathlib import Path

from app.core import secrets as secret_store
from app.core.config import get_settings


def test_encrypt_decrypt_roundtrip(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    plaintext = "my-super-secret-password"
    token = secret_store.encrypt(plaintext)
    assert token != plaintext
    assert secret_store.decrypt(token) == plaintext


def test_encrypt_empty_returns_empty(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    assert secret_store.encrypt("") == ""
    assert secret_store.decrypt("") == ""


def test_key_file_created_on_first_use(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    assert not key_file.exists()
    secret_store.encrypt("test")
    assert key_file.exists()
    assert key_file.stat().st_size == 32


def test_key_file_reused_on_subsequent_calls(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    token1 = secret_store.encrypt("hello")
    secret_store.reset_cache_for_tests()
    token2 = secret_store.encrypt("hello")
    assert secret_store.decrypt(token1) == "hello"
    assert secret_store.decrypt(token2) == "hello"


def test_encrypt_json_roundtrip(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    obj = {"smtp_password": "p@ss", "port": 587}
    token = secret_store.encrypt_json(obj)
    assert secret_store.decrypt_json(token) == obj


def test_decrypt_json_empty_returns_empty_dict(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    assert secret_store.decrypt_json("") == {}


def test_different_plaintexts_produce_different_ciphertexts(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    t1 = secret_store.encrypt("aaa")
    t2 = secret_store.encrypt("bbb")
    assert t1 != t2


def test_tampered_ciphertext_raises(tmp_path: Path, monkeypatch):
    key_file = tmp_path / ".secret_key"
    monkeypatch.setenv("SECRET_KEY_FILE", str(key_file))
    get_settings.cache_clear()
    secret_store.reset_cache_for_tests()

    token = secret_store.encrypt("secret")
    tampered = token[:-4] + "XXXX"
    import pytest
    with pytest.raises(Exception):
        secret_store.decrypt(tampered)
