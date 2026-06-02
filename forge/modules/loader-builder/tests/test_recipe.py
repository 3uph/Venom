"""Recipe model + validation tests."""
import base64
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from recipe import Recipe, init_from_payload, validate, new_seed  # noqa: E402


def test_init_from_payload_basic():
    r = init_from_payload(b"AAAA", "raw_shellcode")
    assert r.payload.size == 4
    assert r.payload.type == "raw_shellcode"
    assert base64.b64decode(r.payload.bytes_b64) == b"AAAA"
    assert len(r.payload.sha256) == 64
    assert r.seed != 0


def test_validate_empty_recipe_complains():
    r = Recipe()
    errs = validate(r)
    assert any("payload" in e for e in errs)


def test_validate_default_recipe_ok():
    r = init_from_payload(b"BBBB", "raw_shellcode")
    errs = validate(r)
    assert errs == [], f"unexpected errors: {errs}"


def test_validate_bad_compiler():
    r = init_from_payload(b"BB", "raw_shellcode")
    r.compiler.toolchain = "nonexistent"
    errs = validate(r)
    assert any("compiler.toolchain" in e for e in errs)


def test_validate_injection_needs_process():
    r = init_from_payload(b"BB", "raw_shellcode")
    r.injection.target = "early_cascade"
    errs = validate(r)
    assert any("target_process" in e for e in errs)


def test_json_roundtrip():
    r = init_from_payload(b"hello", "raw_shellcode")
    r.encryption.algorithm = "chacha20"
    r.anti_analysis.checks = ["debugger", "vm"]
    js = r.to_json()
    r2 = Recipe.from_json(js)
    assert r2.payload.size == 5
    assert r2.encryption.algorithm == "chacha20"
    assert r2.anti_analysis.checks == ["debugger", "vm"]


def test_seed_distinct():
    seeds = {new_seed() for _ in range(20)}
    assert len(seeds) == 20


if __name__ == "__main__":
    import traceback
    fns = [v for k, v in globals().items() if k.startswith("test_")]
    fails = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            fails += 1
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception:
            fails += 1
            print(f"ERR   {fn.__name__}")
            traceback.print_exc()
    print(f"\n{len(fns) - fails}/{len(fns)} passed")
    sys.exit(1 if fails else 0)
