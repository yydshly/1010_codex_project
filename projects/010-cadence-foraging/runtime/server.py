"""Local-only HTTP API and production static-file server. No secret or external model API."""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from experiment import Experiment, UPSTREAM_COMMIT
from algorithm_trace import TracedRouteExperiment
from fish_experiment import FishExperiment

ROOT = Path(__file__).resolve().parent.parent
SESSIONS = {}
FISH_SESSIONS = {}
LOCK = threading.RLock()
MAX_BODY = 16_384


def integer(body, key, default, low, high):
    value = body.get(key, default)
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f"{key} 必须是 {low} 到 {high} 的整数")
    return value


class Handler(BaseHTTPRequestHandler):
    def json_response(self, body, status=200):
        payload = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/api/health":
            self.json_response({"ok": True, "engine": "real-cadence-python", "commit": UPSTREAM_COMMIT})
            return
        if self.path.startswith("/api/"):
            self.json_response({"error": "接口不存在"}, 404)
            return
        requested = self.path.split("?", 1)[0]
        path = (ROOT / "web" / "dist" / requested.lstrip("/")).resolve()
        base = (ROOT / "web" / "dist").resolve()
        if path == base:
            path = base / "index.html"
        if not path.is_relative_to(base) or not path.is_file():
            self.send_error(404, "Build web first: npm run build")
            return
        payload = path.read_bytes()
        self.send_response(200)
        mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.suffix == ".js":
            mime = "application/javascript"
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY:
                raise ValueError("请求体长度无效")
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError("请求体必须是对象")
            with LOCK:
                if self.path == "/api/fishing":
                    seed = integer(body, "seed", 7, 0, 99999)
                    experiment = FishExperiment(seed, body.get("mode", "inertia"))
                    session = str(uuid.uuid4())
                    if len(FISH_SESSIONS) >= 8:
                        oldest = min(FISH_SESSIONS, key=lambda key: FISH_SESSIONS[key]["used"])
                        del FISH_SESSIONS[oldest]
                    FISH_SESSIONS[session] = {"experiment": experiment, "used": time.monotonic(), "request": None}
                    self.json_response({"session": session, **experiment.snapshot()}, 201)
                    return
                fish_match = re.fullmatch(r"/api/fishing/([0-9a-f-]{36})/train", self.path)
                if fish_match:
                    if fish_match[1] not in FISH_SESSIONS:
                        self.json_response({"error": "捕鱼会话不存在，请重新开始"}, 404)
                        return
                    entry = FISH_SESSIONS[fish_match[1]]
                    request_id = body.get("request_id")
                    if not isinstance(request_id, str) or not 1 <= len(request_id) <= 80:
                        raise ValueError("缺少 request_id")
                    count = integer(body, "count", 8, 1, 16)
                    signature = (request_id, json.dumps(body, sort_keys=True))
                    if entry["request"] and request_id == entry["request"][0]:
                        if signature != entry["request"]:
                            raise ValueError("同一请求编号不能携带不同参数")
                    else:
                        entry["experiment"].train(count)
                        entry["request"] = signature
                    entry["used"] = time.monotonic()
                    self.json_response({"session": fish_match[1], **entry["experiment"].snapshot()})
                    return
                if self.path == "/api/sessions":
                    seed = integer(body, "seed", 7, 0, 99999)
                    scenario = body.get("scenario", "direct")
                    if scenario not in ("direct", "route"):
                        raise ValueError("未知实验场景")
                    phase = integer(body, "phase_length", 120 if scenario == "route" else 200,
                                    40 if scenario == "route" else 100,
                                    200 if scenario == "route" else 300)
                    if scenario == "route":
                        experiment = TracedRouteExperiment(seed, phase, body.get("cue_mode", "brief"),
                                                           body.get("reward_mode", "sparse"))
                    else:
                        experiment = Experiment(seed, phase)
                    session = str(uuid.uuid4())
                    # Sessions are bounded, private to this localhost process, and never shared.
                    if len(SESSIONS) >= 16:
                        oldest = min(SESSIONS, key=lambda key: SESSIONS[key]["used"])
                        del SESSIONS[oldest]
                    SESSIONS[session] = {"experiment": experiment, "used": time.monotonic(), "request": None}
                    self.json_response({"session": session, **experiment.snapshot()}, 201)
                    return
                match = re.fullmatch(r"/api/sessions/([0-9a-f-]{36})/(step|move)", self.path)
                if not match or match[1] not in SESSIONS:
                    self.json_response({"error": "实验会话不存在，请重新开始"}, 404)
                    return
                entry = SESSIONS[match[1]]
                experiment = entry["experiment"]
                request_id = body.get("request_id")
                if not isinstance(request_id, str) or not 1 <= len(request_id) <= 80:
                    raise ValueError("缺少 request_id")
                signature = (request_id, match[2], json.dumps(body, sort_keys=True))
                if entry["request"] and request_id == entry["request"][0]:
                    if signature != entry["request"]:
                        raise ValueError("同一请求编号不能携带不同参数")
                    self.json_response({"session": match[1], **experiment.snapshot()})
                    return
                if match[2] == "step":
                    count = integer(body, "count", 1, 1, 32)
                    experiment.step(count)
                else:
                    target = integer(body, "target", 0, 0, 3)
                    experiment.move_food(target)
                entry["request"], entry["used"] = signature, time.monotonic()
                self.json_response({"session": match[1], **experiment.snapshot()})
        except (ValueError, json.JSONDecodeError) as error:
            self.json_response({"error": str(error)}, 400)
        except Exception as error:
            # Never fabricate a decision or silently substitute a JavaScript policy.
            self.json_response({"error": f"真实引擎运行失败：{type(error).__name__}: {error}"}, 500)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8190)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Cadence foraging: http://127.0.0.1:{args.port}/ (real Python engine)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
