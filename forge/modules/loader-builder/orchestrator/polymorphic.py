"""Per-build seed-driven mutation for the generated loader source.

Stage 1: identifier randomization, AES key/IV generation, section name choice.
Stage 2 (TODO): LLM rewrite of template fragments via Ollama.
"""
from __future__ import annotations

import random
import secrets
import string


_IDENT_PREFIXES = ["v_", "x_", "k_", "p_", "m_", "s_", "r_", "n_"]


def make_rng(seed: int) -> random.Random:
    return random.Random(seed)


def rand_ident(rng: random.Random, length: int = 8) -> str:
    prefix = rng.choice(_IDENT_PREFIXES)
    body = "".join(rng.choices(string.ascii_lowercase + string.digits, k=length))
    return prefix + body


def gen_aes256_key() -> bytes:
    return secrets.token_bytes(32)


def gen_aes_iv() -> bytes:
    return secrets.token_bytes(16)


def gen_idents(rng: random.Random, count: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    while len(out) < count:
        i = rand_ident(rng)
        if i in seen:
            continue
        seen.add(i)
        out.append(i)
    return out
