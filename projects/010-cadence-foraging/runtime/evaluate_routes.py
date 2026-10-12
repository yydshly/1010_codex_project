"""All fixed modes/seeds, complete outcomes, per-cue retention, and trace ablations."""
import argparse
import hashlib
import json
import platform
from pathlib import Path
from time import perf_counter

import numpy as np

from route_experiment import RouteExperiment

MODES = [("brief", "sparse", 0.3), ("visible", "sparse", 0.3),
         ("brief", "waypoints", 0.3), ("visible", "waypoints", 0.3),
         ("brief", "sparse", 0.0), ("brief", "waypoints", 0.0)]


def metrics(rows, key):
    def rate(selected):
        return None if not selected else sum(r["hits"][key] for r in selected) / len(selected)
    recovery = next((end for end in range(20, len(rows) + 1)
                     if sum(r["hits"][key] for r in rows[end-20:end]) >= 18), None)
    return {"trips": len(rows), "hit_rate": rate(rows), "last40": rate(rows[-40:]),
            "cue0_last20": rate([r for r in rows if r["cue"] == 0][-20:]),
            "cue1_last20": rate([r for r in rows if r["cue"] == 1][-20:]),
            "first_90pct_window_end": recovery}


def run(seeds, length, include_steps=False, modes=MODES):
    lives = []
    for cue_mode, reward_mode, trace in modes:
        for seed in seeds:
            started = perf_counter()
            e = RouteExperiment(seed, length, cue_mode, reward_mode, trace)
            result = e.step(length * 3 * 4)
            life = {"seed": seed, "cue_mode": cue_mode, "reward_mode": reward_mode,
                    "trace_amplitude": trace, "elapsed_seconds": perf_counter()-started,
                    "controllers": {k: {"hits": v["hits"], "reward": v["reward"],
                                         "average_trip_ms": v["average_trip_ms"],
                                         "phases": [metrics(result["history"][i*length:(i+1)*length], k) for i in range(3)]}
                                    for k,v in result["agents"].items()},
                    "history": result["history"], "final_agents": result["agents"],
                    "provenance": result["provenance"]}
            if include_steps:
                life["action_history"] = result["action_history"]
            lives.append(life)
            print(json.dumps({k: life[k] for k in ("seed", "cue_mode", "reward_mode", "trace_amplitude", "elapsed_seconds", "controllers")}), flush=True)
    sources = ["route_experiment.py", "evaluate_routes.py", "experiment.py"]
    return {"schema": "sakura-route-evaluation/1", "seeds": seeds, "phase_length": length,
            "python": platform.python_version(), "numpy": np.__version__,
            "platform": platform.platform(),
            "source_sha256": {p: hashlib.sha256(Path(__file__).with_name(p).read_bytes()).hexdigest() for p in sources},
            "scope": "bounded two-junction task; same raw inputs; rule/Q latch the observed cue; no independent confirmation",
            "lives": lives}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", type=int, nargs="+", default=[7, 41, 42, 43])
    parser.add_argument("--phase-length", type=int, default=120)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--include-steps", action="store_true")
    args = parser.parse_args()
    receipt = run(args.seeds, args.phase_length, args.include_steps)
    args.out.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
