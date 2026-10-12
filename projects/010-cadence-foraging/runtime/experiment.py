"""A four-arm continuing bandit. Only actions' measured rewards reach controllers."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from time import perf_counter
from typing import Any

import cadence as cd
import numpy as np

UPSTREAM_COMMIT = "19bee92756d1842176ad30b1cd01edbfbfa3f14c"
SHOPS = ["花见团子", "青叶茶屋", "铃木饭团", "春日面包"]
COLORS = {"cadence": "#247d75", "rule": "#ca8431", "q": "#8c69b4"}
OBSERVATION = np.array([[1.0, 0.0, 0.0, 0.0]])
# The task contains no relevant previous cue. A zero trace is an explicit task choice.
CADENCE_CONFIG = {
    "modules": (16,), "working_memory_amplitude": 0.0,
    "consolidation": 0.25, "actor_eta": 0.1, "actor_eta_bias": 0.01,
    "backend": "cpu", "arousal": True,
}
Q_CONFIG = {"alpha": 0.3, "epsilon": 0.12, "gamma": 0.9}
WINDOW = 30


class CadenceController:
    name = "Cadence"

    def __init__(self, seed: int):
        self.brain = cd.Brain.compose(4, 4, seed=seed, **CADENCE_CONFIG)
        self.next_action = int(self.brain.live(OBSERVATION)[0])

    def feedback(self, action: int, reward: float) -> None:
        # The feedback is for the issued action, once, before choosing the next.
        self.next_action = int(self.brain.live(OBSERVATION, reward=[reward])[0])

    def report(self) -> dict[str, Any]:
        actor = self.brain.basal_ganglia
        state = actor.state
        mood = dict(self.brain.last_arousal or {})
        base = actor.probabilities(state)[0]
        if mood.get("mode") == "aroused":
            behavior = actor.probabilities(state, mood.get("temperature"))[0]
        else:
            behavior = np.eye(4)[self.next_action]
        settle = dict(self.brain.last_settlement or {})
        return {
            "probabilities": behavior.tolist(), "base_probabilities": base.tolist(),
            "mode": mood.get("mode", "aroused"), "arousal": mood.get("level", 0.0),
            "updates": actor.updates, "memory_writes": self.brain.hippocampus.writes,
            "sweeps": settle.get("steps", 0), "residual": settle.get("max_residual", 0.0),
            "qualified": settle.get("qualified", True),
            "activity": np.asarray(state.activation)[0].tolist(),
            "motor_indices": self.brain.motor_index.tolist(),
            "edges": int(self.brain.brain.connectome.synapses),
        }


class RuleController:
    name = "规则巡查"

    def __init__(self, seed: int):
        self.next_action = 0
        self.last_hit = False

    def feedback(self, action: int, reward: float) -> None:
        self.last_hit = reward > 0
        self.next_action = action if self.last_hit else (action + 1) % 4

    def report(self) -> dict[str, Any]:
        return {"probabilities": np.eye(4)[self.next_action].tolist(),
                "mode": "复访" if self.last_hit else "巡查", "updates": 0}


class QController:
    name = "Q-learning"

    def __init__(self, seed: int):
        self.rng = np.random.default_rng(seed)
        self.q = np.zeros(4)
        self.updates = 0
        self.next_action = self.choose()

    def choose(self) -> int:
        if self.rng.random() < Q_CONFIG["epsilon"]:
            return int(self.rng.integers(4))
        best = np.flatnonzero(np.isclose(self.q, self.q.max()))
        return int(self.rng.choice(best))

    def feedback(self, action: int, reward: float) -> None:
        # One observed context, a continuing state, four actions. No target is supplied.
        target = reward + Q_CONFIG["gamma"] * self.q.max()
        self.q[action] += Q_CONFIG["alpha"] * (target - self.q[action])
        self.updates += 1
        self.next_action = self.choose()

    def report(self) -> dict[str, Any]:
        probs = np.full(4, Q_CONFIG["epsilon"] / 4)
        best = np.isclose(self.q, self.q.max())
        probs[best] += (1 - Q_CONFIG["epsilon"]) / best.sum()
        return {"probabilities": probs.tolist(), "values": self.q.tolist(),
                "mode": "ε = 0.12", "updates": self.updates}


@dataclass
class Score:
    hits: int = 0
    reward: float = 0.0
    calls: int = 0
    elapsed_ms: float = 0.0


class Experiment:
    """One private session; moving food does not reset or tell the controllers."""

    def __init__(self, seed: int = 7, phase_length: int = 200, automatic: bool = True):
        self.seed, self.phase_length, self.automatic = seed, phase_length, automatic
        self.tick, self.target, self.phase_start = 0, 0, 0
        self.controllers = {"cadence": CadenceController(seed),
                            "rule": RuleController(seed), "q": QController(seed)}
        self.scores = {key: Score() for key in self.controllers}
        self.recent = {key: deque(maxlen=WINDOW) for key in self.controllers}
        self.history: list[dict[str, Any]] = []
        self.changes = [{"tick": 0, "target": 0, "reason": "初始食物"}]
        self.last_actions: dict[str, Any] = {}

    def move_food(self, target: int, *, manual: bool = True) -> None:
        if target == self.target:
            raise ValueError("请选择另一个奖励地点")
        self.target, self.phase_start = target, self.tick
        if manual:
            self.automatic = False
        self.changes.append({"tick": self.tick, "target": target,
                             "reason": "手动迁移" if manual else "预定迁移"})

    def step(self, count: int = 1) -> dict[str, Any]:
        for _ in range(count):
            if self.tick >= 1000 or (self.automatic and self.tick >= self.phase_length * 3):
                break
            if self.automatic and self.tick == self.phase_length:
                self.move_food(2, manual=False)
            elif self.automatic and self.tick == self.phase_length * 2:
                self.move_food(0, manual=False)
            row: dict[str, Any] = {"tick": self.tick + 1, "target": self.target, "hits": {}, "actions": {}}
            # Targets stay inside the environment. A policy gets only its own scalar reward.
            for key, controller in self.controllers.items():
                action = controller.next_action
                hit = action == self.target
                reward = 1.0 if hit else -0.25
                start = perf_counter()
                controller.feedback(action, reward)
                elapsed = (perf_counter() - start) * 1000
                score = self.scores[key]
                score.hits += int(hit)
                score.reward += reward
                score.calls += 1
                score.elapsed_ms += elapsed
                self.recent[key].append(int(hit))
                row["hits"][key] = int(hit)
                row["actions"][key] = action
                self.last_actions[key] = {"action": action, "hit": hit, "reward": reward,
                                          "feedback_ms": elapsed}
            self.tick += 1
            self.history.append(row)
        return self.snapshot()

    def snapshot(self) -> dict[str, Any]:
        agents = {}
        for key, controller in self.controllers.items():
            score = self.scores[key]
            agents[key] = {
                "name": controller.name, "color": COLORS[key], "next_action": controller.next_action,
                "last": self.last_actions.get(key), "hits": score.hits, "reward": score.reward,
                "rate": sum(self.recent[key]) / max(1, len(self.recent[key])),
                "average_feedback_ms": score.elapsed_ms / max(1, score.calls),
                "details": controller.report(),
            }
        return {
            "tick": self.tick, "target": self.target, "seed": self.seed,
            "phase_length": self.phase_length, "phase_start": self.phase_start,
            "automatic": self.automatic,
            "finished": self.tick >= (self.phase_length * 3 if self.automatic else 1000),
            "agents": agents, "changes": self.changes, "history": self.history,
            "provenance": {"cadence_version": cd.__version__, "commit": UPSTREAM_COMMIT,
                           "backend": "Python / NumPy / CPU", "observation": OBSERVATION.tolist(),
                           "cadence_config": {**CADENCE_CONFIG, "modules": [16]},
                           "q_config": Q_CONFIG, "reward": {"hit": 1, "miss": -0.25},
                           "window": WINDOW, "shops": SHOPS},
        }
