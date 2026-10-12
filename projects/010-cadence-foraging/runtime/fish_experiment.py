"""Position-only, held-out fish forecasting using the pinned TemporalPatchNet.

Simulation state never enters a predictor. Future positions are labels only in
the disjoint, already-collected training pool; evaluation never updates weights.
"""
from __future__ import annotations

import hashlib
import time

import numpy as np
from cadence import TemporalPatchNet

from experiment import UPSTREAM_COMMIT

DT = 0.05
HISTORY = 8
HORIZONS = np.arange(2, 25, 2)
STEPS = HISTORY + int(HORIZONS[-1]) + 1
WORLD = [1000, 600]
GUN = np.array([500., 575.])
BULLET_SPEED = 700.
FISH_RADIUS, BULLET_RADIUS = 13., 4.
SCALE = 150.
MODES = ("inertia", "independent")
KEYS = ("cadence", "velocity", "acceleration")
CONFIG = {"dt": DT, "history": HISTORY, "horizons": HORIZONS.tolist(),
          "inputs": 4, "hidden": 8, "outputs": 24, "beta": .003,
          "rate": 5., "batch": 8, "train_clips": 192, "test_clips": 48,
          "max_training_batches": 192, "displacement_scale": SCALE,
          "bullet_speed": BULLET_SPEED, "fish_radius": FISH_RADIUS,
          "bullet_radius": BULLET_RADIUS, "gun": GUN.tolist()}


def trajectory(seed: int, mode: str) -> np.ndarray:
    """One short clip; no wrap, bounds reflection or externally hidden cue."""
    rng = np.random.default_rng(seed)
    position = np.array([500., 280.]) + rng.uniform(-60, 60, 2)
    angle = rng.uniform(-np.pi, np.pi)
    velocity = rng.uniform(60, 115) * np.array([np.cos(angle), np.sin(angle)])
    acceleration = rng.normal(0, 70, 2)
    positions = [position.copy()]
    for _ in range(STEPS - 1):
        if mode == "inertia":
            acceleration = .9 * acceleration + rng.normal(0, 35, 2)
            velocity = velocity + acceleration * DT
            speed = np.linalg.norm(velocity)
            if speed > 170:
                velocity *= 170 / speed
        elif mode == "independent":
            angle = rng.uniform(-np.pi, np.pi)
            velocity = rng.uniform(60, 170) * np.array([np.cos(angle), np.sin(angle)])
        else:
            raise ValueError("未知鱼运动条件")
        position = position + velocity * DT
        positions.append(position.copy())
    return np.array(positions)


def features(history: np.ndarray) -> np.ndarray:
    """Derived only from timestamped positions, never simulator velocity/a."""
    p = np.asarray(history, dtype=float)
    velocity = np.diff(p, axis=-2) / DT
    acceleration = np.diff(velocity, axis=-2) / DT
    return np.concatenate([velocity[..., 1:, :] / 170,
                           acceleration / 400], axis=-1)


def baselines(history: np.ndarray) -> dict:
    p = np.asarray(history, dtype=float)
    v = (p[..., -1, :] - p[..., -2, :]) / DT
    a = (p[..., -1, :] - 2 * p[..., -2, :] + p[..., -3, :]) / DT ** 2
    t = HORIZONS * DT
    cv = p[..., -1, None, :] + v[..., None, :] * t[:, None]
    ca = cv + .5 * a[..., None, :] * t[:, None] ** 2
    return {"velocity": cv, "acceleration": ca}


def first_contact(actual: np.ndarray, direction: np.ndarray) -> float | None:
    """Continuous swept circle collision against each actual fish segment."""
    radius = FISH_RADIUS + BULLET_RADIUS
    for i in range(len(actual) - 1):
        relative = actual[i] - (GUN + direction * BULLET_SPEED * i * DT)
        change = actual[i + 1] - actual[i] - direction * BULLET_SPEED * DT
        c = float(relative @ relative - radius ** 2)
        if c <= 0:
            return i * DT
        a, b = float(change @ change), float(2 * relative @ change)
        discriminant = b * b - 4 * a * c
        if a > 1e-12 and discriminant >= 0:
            fraction = (-b - np.sqrt(discriminant)) / (2 * a)
            if 0 <= fraction <= 1:
                return float((i + fraction) * DT)
    return None


def shot(origin: np.ndarray, prediction: np.ndarray, actual: np.ndarray) -> dict:
    """All predictors fire once, with identical speed/radii and actual path."""
    times = np.r_[0., HORIZONS * DT]
    path = np.vstack([origin, prediction])

    def point(t):
        return np.array([np.interp(t, times, path[:, axis]) for axis in range(2)])

    intercept = None
    # A fast forecast segment can enter and leave the reachable circle while
    # both endpoint gaps remain positive. Solve every segment, not just signs.
    for i, (left, right) in enumerate(zip(times[:-1], times[1:])):
        velocity = (path[i + 1] - path[i]) / (right - left)
        offset = path[i] - velocity * left - GUN
        a = float(velocity @ velocity - BULLET_SPEED ** 2)
        b, c = float(2 * offset @ velocity), float(offset @ offset)
        if abs(a) <= 1e-10:
            roots = [-c / b] if abs(b) > 1e-10 else [left] if c <= 1e-10 else []
        else:
            discriminant = b * b - 4 * a * c
            roots = [(-b - np.sqrt(discriminant)) / (2 * a),
                     (-b + np.sqrt(discriminant)) / (2 * a)] if discriminant >= 0 else []
        valid = [t for t in roots if left - 1e-10 <= t <= right + 1e-10 and t >= 0]
        if valid:
            intercept = float(np.clip(min(valid), left, right))
            break
    aim = point(intercept) if intercept is not None else prediction[-1]
    delta = aim - GUN
    direction = delta / max(1e-12, np.linalg.norm(delta))
    contact = first_contact(actual, direction)
    return {"aim": aim.tolist(), "direction": direction.tolist(),
            "planned_time": intercept, "hit_time": contact, "hit": contact is not None}


class FishExperiment:
    def __init__(self, seed=7, mode="inertia"):
        if mode not in MODES:
            raise ValueError("未知鱼运动条件")
        self.seed, self.mode = seed, mode
        self.net = TemporalPatchNet(4, 8, 24, seed=seed, initial_radius=.5,
                                    max_iterations=35, tolerance=1e-7)
        self.rng = np.random.default_rng(seed + 900000)
        # Separate RNG streams: no test path is used for teaching.
        self.train_seeds = [1000000 + seed * 1000 + i for i in range(CONFIG["train_clips"])]
        self.test_seeds = [200000000 + seed * 1000 + i for i in range(CONFIG["test_clips"])]
        self.training = np.stack([trajectory(s, mode) for s in self.train_seeds])
        self.testing = np.stack([trajectory(s, mode) for s in self.test_seeds])
        self.attempts = self.updates = 0
        self.training_ms = 0.
        self.last_training = None
        self.rejections = {}
        self.curve = []
        self.cold_parameters = {k: v.copy() for k, v in self.net.parameters().items()}
        self.evaluate()
        self.cold_metrics = self.metrics["cadence"].copy()

    def parameter_hash(self):
        digest = hashlib.sha256()
        for k, v in sorted(self.net.parameters().items()):
            digest.update(k.encode())
            digest.update(v.tobytes())
        return digest.hexdigest()

    def predict(self, histories):
        p = np.asarray(histories, dtype=float)
        if p.ndim == 2:
            p = p[None]
        phase = self.net.imagine(features(p), state=np.zeros((len(p), CONFIG["hidden"])))
        if not phase.converged:
            raise RuntimeError(f"Cadence 预测求解失败：{phase.reason}")
        displacement = phase.output[:, -1].reshape(len(p), len(HORIZONS), 2) * SCALE
        return p[:, -1, None, :] + displacement

    def train(self, count=8):
        for _ in range(min(count, CONFIG["max_training_batches"] - self.attempts)):
            indices = self.rng.integers(0, len(self.training), CONFIG["batch"])
            clips = self.training[indices]
            # All targets occur AFTER their associated input; inputs use only
            # positions [0..HISTORY]. Historical targets are already collected.
            histories = clips[:, :HISTORY + 1]
            targets = np.stack([(clips[:, t + HORIZONS] - clips[:, t, None]) / SCALE
                                for t in range(2, HISTORY + 1)], axis=1)
            before = self.parameter_hash()
            self.net.reset()
            start = time.perf_counter()
            report = self.net.observe(features(histories), targets.reshape(len(clips), HISTORY - 1, -1),
                                      beta=CONFIG["beta"], rate=CONFIG["rate"], backtrack=True)
            elapsed = (time.perf_counter() - start) * 1000
            self.training_ms += elapsed
            self.attempts += 1
            self.updates += int(report.updated)
            if not report.updated:
                self.rejections[report.reason] = self.rejections.get(report.reason, 0) + 1
            self.last_training = {"updated": bool(report.updated), "reason": report.reason,
                                  "batch": self.attempts, "samples": CONFIG["batch"],
                                  "initial_loss": report.initial_loss, "final_loss": report.final_loss,
                                  "accepted_rate": report.accepted_rate,
                                  "parameter_changed": before != self.parameter_hash(),
                                  "elapsed_ms": elapsed,
                                  "train_seed_ids": [self.train_seeds[i] for i in indices],
                                  "last_input_step": HISTORY, "last_target_step": HISTORY + int(HORIZONS[-1])}
        self.evaluate()
        return self.snapshot()

    def evaluate(self):
        histories = self.testing[:, :HISTORY + 1]
        expected = self.testing[:, HISTORY + HORIZONS]
        start = time.perf_counter()
        cadence_prediction = self.predict(histories)
        cadence_ms = (time.perf_counter() - start) * 1000
        predictions = {"cadence": cadence_prediction, **baselines(histories),
                       "stationary": np.broadcast_to(histories[:, -1, None, :], expected.shape)}
        self.cases = []
        for i, clip in enumerate(self.testing):
            actual = clip[HISTORY:]
            self.cases.append({"id": i, "seed": self.test_seeds[i], "positions": clip.tolist(),
                               "forecasts": {k: predictions[k][i].tolist() for k in predictions},
                               "errors": {k: np.linalg.norm(predictions[k][i] - expected[i], axis=-1).tolist() for k in predictions},
                               "shots": {k: shot(histories[i, -1], predictions[k][i], actual) for k in predictions}})
        self.metrics = {}
        for k in predictions:
            distances = np.linalg.norm(predictions[k] - expected, axis=-1)
            hits = sum(case["shots"][k]["hit"] for case in self.cases)
            self.metrics[k] = {"ade": float(distances.mean()), "fde": float(distances[:, -1].mean()),
                               "at_02": float(distances[:, 1].mean()), "at_06": float(distances[:, 5].mean()),
                               "at_12": float(distances[:, 11].mean()),
                               "hits": hits, "shots": len(self.cases), "hit_rate": hits / len(self.cases)}
        self.predict_ms = cadence_ms / len(self.testing)
        row = {"batches": self.attempts, "updates": self.updates, **self.metrics["cadence"]}
        if self.curve and self.curve[-1]["batches"] == self.attempts:
            self.curve[-1] = row
        else:
            self.curve.append(row)

    def snapshot(self):
        return {"schema": "cadence-fishing-forecast/1", "seed": self.seed, "mode": self.mode,
                "config": CONFIG, "world": WORLD, "batches": self.attempts, "updates": self.updates,
                "finished": self.attempts >= CONFIG["max_training_batches"],
                "training_ms": self.training_ms, "predict_ms_per_clip": self.predict_ms,
                "last_training": self.last_training, "rejections": self.rejections,
                "parameter_sha256": self.parameter_hash(), "parameter_count": 288,
                "cold_metrics": getattr(self, "cold_metrics", self.metrics["cadence"]),
                "metrics": self.metrics, "curve": [row.copy() for row in self.curve], "cases": self.cases,
                "provenance": {"commit": UPSTREAM_COMMIT, "engine": "real-cadence-TemporalPatchNet",
                               "input": "only observed position differences at fixed dt; 0..8",
                               "training_seeds": self.train_seeds, "test_seeds": self.test_seeds,
                               "evaluation": "frozen parameters; 48 unseen fish clips; no test teaching",
                               "shot": "one straight constant-speed bullet per predictor/clip; swept-circle collision"}}
