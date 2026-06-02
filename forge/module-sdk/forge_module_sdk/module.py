import json
import time
import tempfile
from pathlib import Path
from functools import wraps
from flask import Flask, jsonify, request, send_file
from forge_module_sdk.param import Param


class ForgeModule:
    def __init__(self, name: str, version: str, platform: str, description: str = ""):
        self.name = name
        self.version = version
        self.platform = platform
        self.description = description
        self._functions: list[dict] = []
        self._handlers: dict[str, callable] = {}
        self._start_time = time.time()
        self._app = Flask(name)
        self._setup_routes()

    def function(self, name: str, description: str, params: list[Param], returns: dict):
        def decorator(fn):
            self._functions.append({
                "name": name,
                "description": description,
                "params": [p.to_dict() for p in params],
                "returns": returns,
            })
            self._handlers[name] = fn

            @wraps(fn)
            def wrapper(*args, **kwargs):
                return fn(*args, **kwargs)
            return wrapper
        return decorator

    def _setup_routes(self):
        @self._app.route("/manifest", methods=["GET"])
        def manifest():
            return jsonify({
                "name": self.name,
                "version": self.version,
                "platform": self.platform,
                "description": self.description,
                "functions": self._functions,
            })

        @self._app.route("/health", methods=["GET"])
        def health():
            return jsonify({
                "status": "ok",
                "name": self.name,
                "version": self.version,
                "uptime_seconds": int(time.time() - self._start_time),
            })

        @self._app.route("/execute", methods=["POST"])
        def execute():
            func_name = request.form.get("function")
            if not func_name or func_name not in self._handlers:
                return jsonify({"error": f"Unknown function: {func_name}"}), 400

            params_json = request.form.get("params", "{}")
            try:
                params = json.loads(params_json)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid params JSON"}), 400

            func_def = next((f for f in self._functions if f["name"] == func_name), None)
            file_param_names = [p["name"] for p in func_def["params"] if p["type"] == "file"] if func_def else []

            kwargs = dict(params)
            for fp_name in file_param_names:
                if fp_name in request.files:
                    uploaded = request.files[fp_name]
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded.filename}")
                    uploaded.save(tmp.name)
                    kwargs[fp_name] = tmp.name

            try:
                result_path = self._handlers[func_name](**kwargs)
            except Exception as e:
                return jsonify({"error": str(e)}), 500

            if result_path and Path(result_path).exists():
                return send_file(result_path, as_attachment=True, download_name=Path(result_path).name)
            else:
                return jsonify({"error": "Handler did not return a valid file path"}), 500

    def run(self, host: str = "0.0.0.0", port: int = 5000):
        self._app.run(host=host, port=port)
