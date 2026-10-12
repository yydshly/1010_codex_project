"""Record one real TemporalPatchNet update for a fixed training fish.

This isolated batch of one is a teaching inspection, not a new holdout result or
a modification to the original eight-fish training protocol. No Cadence source
is patched; observe() returns its actual free, plus, minus and delta arrays.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import inspect
import json
from pathlib import Path

import numpy as np
from cadence.temporal import contrast_asymmetry

from fish_experiment import FishExperiment, CONFIG, DT, HISTORY, HORIZONS, SCALE, features
from experiment import UPSTREAM_COMMIT

ROOT = Path(__file__).resolve().parent


def phase_record(net, phase, inputs, target, boundary, parameters, beta=0.0):
    activity = phase.activity
    previous = np.concatenate((np.tanh(boundary)[:, None], activity[:, :-1]), axis=1)
    temporal = phase.hidden - previous @ parameters["A"].T - inputs @ parameters["B"].T
    output_defect = phase.output - activity @ parameters["C"].T
    loss = float(.5 * np.mean((phase.output - target) ** 2))
    base_energy = float(.5 * np.mean(np.sum(temporal ** 2, axis=(1, 2))
                                     + np.sum(output_defect ** 2, axis=(1, 2))))
    return {"hidden": phase.hidden[0].tolist(), "activity": activity[0].tolist(),
            "output": phase.output[0].tolist(), "temporal_defect": temporal[0].tolist(),
            "output_defect": output_defect[0].tolist(), "loss": loss,
            "base_energy": base_energy, "objective": base_energy + beta * loss,
            "beta": beta, "residual": phase.residual, "converged": phase.converged,
            "reason": phase.reason, "iterations": phase.iterations,
            "energy_history": list(phase.energy_history),
            "accepted_step_sizes": list(phase.accepted_step_sizes),
            "accepted_damping": list(phase.accepted_damping)}


def build_record(seed=7, mode="inertia", sample_index=0):
    experiment = FishExperiment(seed, mode)
    if not 0 <= sample_index < len(experiment.training):
        raise ValueError("sample_index must select one of the 192 training fish")
    clips = experiment.training[sample_index:sample_index + 1]
    history = clips[:, :HISTORY + 1]
    inputs = features(history)
    targets = np.stack([(clips[:, t + HORIZONS] - clips[:, t, None]) / SCALE
                        for t in range(2, HISTORY + 1)], axis=1).reshape(1, 7, 24)
    net = experiment.net
    net.reset()
    boundary = np.zeros((1, CONFIG["hidden"]))
    before = net.parameters()
    before_snapshot = net.snapshot()
    report = net.observe(inputs, targets, beta=CONFIG["beta"], rate=CONFIG["rate"], backtrack=True)
    if not report.updated or report.plus is None or report.minus is None or report.delta is None:
        raise RuntimeError(f"Actual single-fish update refused: {report.reason}")
    after = net.parameters()
    # A read-only zero-boundary free replay: no answer is supplied here.
    updated_free = net.imagine(inputs, state=boundary)
    if not updated_free.converged:
        raise RuntimeError(f"Updated free replay failed: {updated_free.reason}")
    phases = {"free": phase_record(net, report.free, inputs, targets, boundary, before),
              "plus": phase_record(net, report.plus, inputs, targets, boundary, before, report.beta),
              "minus": phase_record(net, report.minus, inputs, targets, boundary, before, -report.beta),
              "after": phase_record(net, updated_free, inputs, targets, boundary, after)}
    # Read-only replay of the first Newton equation under the old parameters.
    # This fixed sample accepts exactly one state step in each detuned phase.
    original = type(net).restore(before_snapshot)
    for name, phase, signed_beta in (("plus", report.plus, report.beta),
                                    ("minus", report.minus, -report.beta)):
        if not phase.accepted_step_sizes:
            continue
        gradient, diagonal, lower = original._reduced_derivatives(
            inputs, report.free.hidden, boundary, targets, signed_beta)
        direction, _, _ = original._block_solve(diagonal, lower, -gradient,
                                               phase.accepted_damping[0])
        proposed = report.free.hidden + phase.accepted_step_sizes[0] * direction
        phases[name]["first_newton_step"] = {
            "gradient": gradient[0].tolist(), "direction": direction[0].tolist(),
            "step_size": phase.accepted_step_sizes[0], "damping": phase.accepted_damping[0],
            "matches_actual_final_path": bool(phase.iterations == 1 and np.array_equal(proposed, phase.hidden)),
            "scope": "Read-only replay from actual free start and accepted damping; compared with the actual returned path.",
        }
    # Explicit products independently reconstructed from detached phase values.
    gradients = {}
    for name in ("plus", "minus"):
        p = phases[name]
        activity = np.asarray(p["activity"])
        previous = np.vstack((boundary[0], activity[:-1]))
        e, r = np.asarray(p["temporal_defect"]), np.asarray(p["output_defect"])
        gradients[name] = {"A": (-e.T @ previous).tolist(),
                           "B": (-e.T @ inputs[0]).tolist(),
                           "C": (-r.T @ activity).tolist()}
    change = {k: after[k] - before[k] for k in before}
    # Independent, target-free probes of one C weight under the old snapshot.
    # These are diagnostics, not the activity nudges or the accepted EP update.
    port, neuron, focus, epsilon = 2, 0, 6, .001
    trials = []
    for label, shift in (("minus_weight", -epsilon), ("old_weight", 0.),
                         ("plus_weight", epsilon), ("only_ep_weight", change["C"][port, neuron])):
        candidate = {key: value.copy() for key, value in before.items()}
        candidate["C"][port, neuron] += shift
        probe_net = type(net).restore(before_snapshot)
        probe_net.set_parameters(candidate)
        replay = probe_net.imagine(inputs, state=boundary)
        if not replay.converged:
            raise RuntimeError("Independent C-weight probe did not converge")
        trials.append({"label": label, "shift": float(shift),
                       "weight": float(candidate["C"][port, neuron]),
                       "loss": float(.5 * np.mean((replay.output - targets) ** 2)),
                       "output": replay.output[0].tolist()})
    exact_c_gradient = float(np.sum((report.free.output[0, :, port] - targets[0, :, port])
                                   * report.free.activity[0, :, neuron]) / (7 * 24))
    parameter_probe = {"parameter": "C[2,0]", "port": port, "neuron": neuron, "focus": focus,
                       "epsilon": epsilon, "trials": trials,
                       "finite_difference": (trials[2]["loss"] - trials[0]["loss"]) / (2 * epsilon),
                       "exact_free_loss_gradient": exact_c_gradient,
                       "scope": "Independent old-snapshot copies; only C[2,0] varies. imagine receives no target; the external grader uses the fixed training labels. Not an EP phase or a holdout evaluation."}
    velocity = np.diff(history[0], axis=0) / DT
    acceleration = np.diff(velocity, axis=0) / DT
    upstream_file = Path(inspect.getfile(type(net)))
    return {
        "schema": "cadence-fish-ep-sample/1", "recorded_at": datetime.now().isoformat(timespec="seconds"),
        "model_seed": seed, "mode": mode, "sample_index": sample_index,
        "trajectory_seed": experiment.train_seeds[sample_index],
        "scope": "One fixed training fish, isolated cold model, batch=1; not the batch=8 live session or a holdout evaluation.",
        "config": {**CONFIG, "batch": 1, "max_iterations": net.max_iterations,
                   "tolerance": net.tolerance, "initial_radius": .5},
        "input": {"positions": history[0].tolist(), "times": (np.arange(9) * DT).tolist(),
                  "features": inputs[0].tolist(), "velocities": velocity.tolist(),
                  "accelerations": acceleration.tolist(), "cutoff_steps": list(range(2, 9)),
                  "boundary": boundary[0].tolist()},
        "training_positions": clips[0].tolist(), "targets": targets[0].tolist(),
        "phases": phases,
        "parameters": {"before": {k: v.tolist() for k, v in before.items()},
                       "after": {k: v.tolist() for k, v in after.items()},
                       "ep_delta": {k: v.tolist() for k, v in report.delta.items()},
                       "actual_change": {k: v.tolist() for k, v in change.items()},
                       "local_gradients": gradients},
        "parameter_probe": parameter_probe,
        "update": {"updated": bool(report.updated), "reason": report.reason,
                   "requested_beta": CONFIG["beta"], "beta": report.beta,
                   "contrast_halvings": report.contrast_halvings,
                   "contrast_asymmetry": contrast_asymmetry(report.free, report.plus, report.minus),
                   "requested_rate": CONFIG["rate"], "accepted_rate": report.accepted_rate,
                   "initial_loss": report.initial_loss, "final_loss": report.final_loss,
                   "replay_losses": list(report.replay_losses), "replay_calls": report.replay_calls,
                   "parameter_count": sum(v.size for v in before.values()),
                   "changed_count": sum(int(np.count_nonzero(change[k])) for k in before),
                   "change_norms": {k: float(np.linalg.norm(v)) for k, v in change.items()},
                   "updates": net.updates},
        "provenance": {"engine": "real-cadence-TemporalPatchNet", "commit": UPSTREAM_COMMIT,
                       "package_version": "0.80.0", "license": "GPL-3.0",
                       "upstream_temporal_sha256": hashlib.sha256(upstream_file.read_bytes()).hexdigest(),
                       "upstream_source": f"https://github.com/muellerberndt/cadence/blob/{UPSTREAM_COMMIT}/src/cadence/temporal.py",
                       "free_input": "Only nine history positions; targets are passed to observe teaching, never imagine replay.",
                       "train_seed_ids": experiment.train_seeds, "test_seed_ids": experiment.test_seeds},
        "source_sha256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                          for name in ("fish_experiment.py", "record_fish_ep.py")},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--mode", choices=("inertia", "independent"), default="inertia")
    parser.add_argument("--sample", type=int, default=0)
    parser.add_argument("--out", type=Path, default=ROOT.parent / "notes/fish-ep-sample.json")
    args = parser.parse_args()
    record = build_record(args.seed, args.mode, args.sample)
    args.out.write_text(json.dumps(record, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf8")
    focus, port, neuron = 6, 2, 0
    origin = np.asarray(record["input"]["positions"])[8]
    truth = np.asarray(record["training_positions"])[12]
    for name in ("free", "plus", "minus", "after"):
        point = origin + np.asarray(record["phases"][name]["output"])[focus, 2:4] * SCALE
        print(name, point.tolist(), "error_px", float(np.linalg.norm(point - truth)))
    print("C[2,0]", record["parameters"]["before"]["C"][port][neuron],
          "delta", record["parameters"]["ep_delta"]["C"][port][neuron],
          "after", record["parameters"]["after"]["C"][port][neuron])
    print("Observed single-sample update:", record["update"])

