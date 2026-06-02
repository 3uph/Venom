import sys
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "module-sdk"))


from venom_module_sdk import VenomModule, Param

module = VenomModule(
    name="echo-module",
    version="1.0",
    platform="linux",
    description="Test module that echoes input files with optional renaming",
    category="other",
)


@module.function(
    name="echo_file",
    description="Returns the input file, optionally renamed",
    params=[
        Param("input_file", type="file", required=True, description="File to echo back"),
        Param("output_name", type="string", required=True, description="Output filename"),
    ],
    returns={"type": "file", "name": "output", "produces": "binary", "description": "The echoed file"},
)
def echo_file(input_file: str, output_name: str) -> str:
    input_path = Path(input_file)
    output_path = input_path.parent / output_name
    shutil.copy2(input_path, output_path)
    return str(output_path)


@module.function(
    name="append_bytes",
    description="Appends a marker to the file",
    params=[
        Param("input_file", type="file", required=True, description="File to modify"),
        Param("marker", type="string", required=False, description="Marker text to append"),
    ],
    returns={"type": "file", "name": "output", "produces": "binary", "description": "Modified file"},
)
def append_bytes(input_file: str, marker: str = "VENOM") -> str:
    input_path = Path(input_file)
    output_path = input_path.parent / f"marked_{input_path.name}"
    with open(input_path, "rb") as src, open(output_path, "wb") as dst:
        dst.write(src.read())
        dst.write(marker.encode())
    return str(output_path)


if __name__ == "__main__":
    module.run(host="0.0.0.0", port=5050)
