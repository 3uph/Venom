"""Invoke compiler toolchain to produce the loader artifact."""
from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from recipe import Recipe


class BuildError(RuntimeError):
    pass


def _toolchain_cmd(recipe: Recipe) -> str:
    if recipe.compiler.toolchain == "mingw_gcc":
        return "x86_64-w64-mingw32-gcc"
    if recipe.compiler.toolchain == "clang_msvc":
        return "clang"
    raise BuildError(f"Toolchain not yet implemented: {recipe.compiler.toolchain}")


def compile_loader(recipe: Recipe, source: str, output_name: str, output_ext: str = "exe") -> Path:
    """Compile the C source, return path to the produced PE.

    Caller owns the returned file (in a tmp dir that the caller cleans up
    after sending the response).
    """
    cc = _toolchain_cmd(recipe)
    if shutil.which(cc) is None:
        raise BuildError(f"Compiler not found in PATH: {cc}")

    work = Path(tempfile.mkdtemp(prefix="venom_loader_"))
    src = work / "loader.c"
    src.write_text(source)
    out = work / f"{output_name}.{output_ext}"

    cmd = [
        cc,
        "-O2",
        "-Wl,--gc-sections",
        "-ffunction-sections",
        "-fdata-sections",
        "-s",
        "-fno-ident",
        "-o", str(out),
        str(src),
        "-lbcrypt",
        "-static",
        "-mwindows" if output_ext == "exe" and recipe.compiler.language == "c" else "-mwindows",
    ]
    # `-mwindows` strips the console — operator can disable later by removing
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        raise BuildError(
            f"compile failed (rc={proc.returncode}):\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        )
    if not out.exists():
        raise BuildError("compiler reported success but output binary missing")
    return out
