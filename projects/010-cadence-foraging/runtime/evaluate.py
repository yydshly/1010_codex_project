"""Run all declared seeds, preserve outcomes, and measure adaptation on the actual experiment."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
from pathlib import Path
from time import perf_counter

import numpy as np

from experiment import Experiment, UPSTREAM_COMMIT


def summarize(history, key, length):
    phases = []
    for start in range(0, len(history), length):
        rows = history[start:start + length]
        hits = [row["hits"][key] for row in rows]
        # Delay is the END of the first 20-action window with at least 18 hits.
        recovery = next((end for end in range(20, len(hits) + 1)
                         if sum(hits[end - 20:end]) >= 18), None)
        phases.append({"trials": len(hits), "hit_rate": sum(hits) / len(hits),
                       "last_50_hit_rate": sum(hits[-50:]) / len(hits[-50:]),
                       "recovery_window_end": recovery})
    return phases


def run(seeds, length):
    lives = []
    for seed in seeds:
        started = perf_counter()
        experiment = Experiment(seed, length)
        result = experiment.step(length * 3)
        elapsed = perf_counter() - started
        life = {"seed": seed, "elapsed_seconds": elapsed,
                "controllers": {key: {"phases": summarize(result["history"], key, length),
                                      "hits": result["agents"][key]["hits"],
                                      "reward": result["agents"][key]["reward"],
                                      "average_feedback_ms": result["agents"][key]["average_feedback_ms"]}
                                for key in result["agents"]},
                "history": result["history"], "final_agents": result["agents"]}
        lives.append(life)
        print(json.dumps({"seed": seed, "elapsed_seconds": round(elapsed, 2),
                          "controllers": life["controllers"]}), flush=True)
    source = Path(__file__).with_name("experiment.py")
    return {"schema": "sakura-foraging-evaluation/1", "upstream_commit": UPSTREAM_COMMIT,
            "experiment_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "python": platform.python_version(), "numpy": np.__version__,
            "platform": platform.platform(), "phase_length": length,
            "declared_seeds": seeds, "provenance": result["provenance"],
            "recovery_definition": "end of first 20-action window with at least 18 hits, one-based within phase",
            "scope": "bounded local experiment; no general ranking or energy comparison", "lives": lives}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seeds", nargs="+", type=int, default=[7, 41, 42, 43])
    parser.add_argument("--phase-length", type=int, default=200)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    receipt = run(args.seeds, args.phase_length)
    args.out.write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
