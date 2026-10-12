"""Two observed cues, two binary junctions, two waited moments, one terminal outcome.

Controllers receive observations and their own outcomes. They never receive the food map.
Rule and Q independently latch the visible sign; Cadence uses its own working trace.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from time import perf_counter

import cadence as cd
import numpy as np

from experiment import CadenceController, COLORS, Q_CONFIG, SHOPS, UPSTREAM_COMMIT

CUES = ["樱花纹", "灯笼纹"]
# route = west/east bit * 2 + north/south bit; visual shop order differs.
ROUTE_TO_SHOP = [0, 2, 1, 3]
ROUTE_CONFIG = {"modules": (16,), "working_memory_amplitude": 0.3,
                "working_memory_decay": 0.2, "consolidation": 0.25,
                "actor_eta": 0.1, "actor_eta_bias": 0.01,
                "actor_gamma": 0.9, "backend": "cpu", "arousal": True}


def observation(cue, stage, branch=None, cue_mode="brief"):
    """8 public features; target, phase and completed reward are absent."""
    x = np.zeros((1, 8))
    if stage == 0 or cue_mode == "visible":
        x[0, cue] = 1
    if stage < 2:
        x[0, 2 + stage] = 1
    if branch is not None:
        x[0, 4 + branch] = 1
    if stage >= 2:
        x[0, 6 + min(stage - 2, 1)] = 1
    return x


class RouteCadence(CadenceController):
    def __init__(self, seed, initial, trace_amplitude=0.3):
        self.config = {**ROUTE_CONFIG, "working_memory_amplitude": trace_amplitude}
        self.brain = cd.Brain.compose(8, 2, seed=seed, **self.config)
        self.next_action = int(self.brain.live(initial)[0])
        self.waits = 0

    def transition(self, next_obs, reward, done):
        self.next_action = int(self.brain.live(next_obs, reward=[reward], done=[done])[0])

    def wait(self, obs):
        # Preserve the awaited action, its eligibility and reward ownership.
        self.brain.wait(obs)
        self.waits += 1

    def report(self):
        details = super().report()
        # The shared direct-task report uses four arms in calm mode; this task has two.
        details["probabilities"] = details["probabilities"][:2]
        return {**details, "waits": self.waits,
                "pending_decision_id": self.brain.decision_id}


class RouteRule:
    name = "规则记路"

    def __init__(self, seed, initial):
        self.routes = [0, 0]
        self.cue = 0
        self.next_action = self.choose(initial)
        self.attempts = [0, 0]

    def choose(self, obs):
        if obs[0, :2].any():
            self.cue = int(obs[0, :2].argmax())
        return self.routes[self.cue] // 2 if obs[0, 2] else self.routes[self.cue] % 2

    def transition(self, next_obs, reward, done):
        if done:
            self.attempts[self.cue] += 1
            if reward < 0:
                self.routes[self.cue] = (self.routes[self.cue] + 1) % 4
        self.next_action = self.choose(next_obs)

    def wait(self, obs):
        # Same public observation is available; no decision/outcome happens here.
        if obs[0, :2].any():
            self.cue = int(obs[0, :2].argmax())

    def report(self):
        return {"probabilities": np.eye(2)[self.next_action].tolist(),
                "mode": "按线索记路", "routes": self.routes.copy(),
                "remembered_cue": self.cue, "attempts": self.attempts.copy()}


class RouteQ:
    name = "Q-learning"

    def __init__(self, seed, initial):
        self.rng = np.random.default_rng(seed)
        self.q = np.zeros((2, 3, 2))  # cue × (plaza, west fork, east fork) × action
        self.cue = 0
        self.key = self.read(initial)
        self.next_action = self.choose(self.key)
        self.updates = 0

    def read(self, obs):
        if obs[0, :2].any():
            self.cue = int(obs[0, :2].argmax())
        place = 0 if obs[0, 2] else 1 + int(obs[0, 4:6].argmax())
        return self.cue, place

    def choose(self, key):
        values = self.q[key]
        if self.rng.random() < Q_CONFIG["epsilon"]:
            return int(self.rng.integers(2))
        return int(self.rng.choice(np.flatnonzero(np.isclose(values, values.max()))))

    def transition(self, next_obs, reward, done):
        next_key = self.read(next_obs)
        future = 0.0 if done else Q_CONFIG["gamma"] * self.q[next_key].max()
        index = (*self.key, self.next_action)
        self.q[index] += Q_CONFIG["alpha"] * (reward + future - self.q[index])
        self.updates += 1
        self.key = next_key
        self.next_action = self.choose(next_key)

    def wait(self, obs):
        if obs[0, :2].any():
            self.cue = int(obs[0, :2].argmax())

    def report(self):
        values = self.q[self.key]
        best = np.isclose(values, values.max())
        probs = np.full(2, Q_CONFIG["epsilon"] / 2)
        probs[best] += (1 - Q_CONFIG["epsilon"]) / best.sum()
        return {"probabilities": probs.tolist(), "mode": "记路牌 + TD",
                "values": values.tolist(), "table": self.q.tolist(),
                "remembered_cue": self.cue, "updates": self.updates,
                "state": list(self.key)}


@dataclass
class RouteScore:
    hits: int = 0
    reward: float = 0.0
    elapsed_ms: float = 0.0
    cue_recent: list = field(default_factory=lambda: [deque(maxlen=20), deque(maxlen=20)])
    recent: deque = field(default_factory=lambda: deque(maxlen=30))


class RouteExperiment:
    scenario = "route"

    def __init__(self, seed=7, phase_length=120, cue_mode="brief", reward_mode="sparse",
                 trace_amplitude=0.3):
        if cue_mode not in ("brief", "visible") or reward_mode not in ("sparse", "waypoints"):
            raise ValueError("未知线索或奖励模式")
        if type(phase_length) is not int or phase_length < 2 or phase_length % 2:
            raise ValueError("每阶段趟数必须是正偶数")
        self.seed, self.phase_length = seed, phase_length
        self.cue_mode, self.reward_mode = cue_mode, reward_mode
        self.tick = self.episodes = self.stage = 0
        self.automatic = True
        self.mapping = [0, 3]
        self.queued_target = None
        rng = np.random.default_rng(seed + 10000)
        self.cues = []
        # Every 120-episode phase is balanced, with no public phase marker.
        for _ in range(max(3, (602 + phase_length - 1) // phase_length)):
            block = np.tile([0, 1], phase_length // 2)
            rng.shuffle(block)
            self.cues.extend(int(x) for x in block)
        self.cue = self.cues[0]
        initial = observation(self.cue, 0, cue_mode=cue_mode)
        self.controllers = {"cadence": RouteCadence(seed, initial, trace_amplitude),
                            "rule": RouteRule(seed, initial), "q": RouteQ(seed, initial)}
        self.scores = {k: RouteScore() for k in self.controllers}
        self.routes = {k: [] for k in self.controllers}
        self.trip_reward = {k: 0.0 for k in self.controllers}
        self.history = []
        self.action_history = []
        self.next_observations = {k: initial.tolist() for k in self.controllers}
        self.changes = [{"episode": 0, "target": 0, "reason": "初始映射"}]
        self.positions = {k: [0.0, 0.0] for k in self.controllers}
        self.view = {"cue": self.cue, "target": self.mapping[self.cue], "stage": 0,
                     "label": "读取街口路牌"}
        self.last = {}

    @property
    def finished(self):
        return self.episodes >= (self.phase_length * 3 if self.automatic else 600)

    def move_food(self, target):
        if target not in (0, 1, 2, 3):
            raise ValueError("路线应为 0 到 3")
        if target == self.mapping[0] and self.queued_target is None:
            raise ValueError("樱花线索已对应这条路线")
        self.automatic = False
        if self.stage == 0:
            self._change(target, "手动迁移")
        else:
            self.queued_target = target  # An ongoing trip is scored under its original map.

    def _change(self, target, reason):
        self.mapping[0] = target
        self.queued_target = None
        self.changes.append({"episode": self.episodes, "target": target, "reason": reason})

    def _begin_trip(self):
        if self.queued_target is not None:
            self._change(self.queued_target, "手动迁移：新一趟生效")
        elif self.automatic and self.episodes == self.phase_length:
            self._change(1, "仅樱花线索迁移")
        elif self.automatic and self.episodes == self.phase_length * 2:
            self._change(0, "樱花线索返回")
        self.routes = {k: [] for k in self.controllers}
        self.trip_reward = {k: 0.0 for k in self.controllers}

    def step(self, count=1):
        for _ in range(count):
            if self.finished:
                break
            stage, cue = self.stage, self.cue
            if stage == 0:
                self._begin_trip()
            target = self.mapping[cue]
            event = {"tick": self.tick + 1, "episode": self.episodes + 1,
                     "stage": stage, "cue": cue, "target": target, "agents": {}}
            completed = {"tick": self.episodes + 1, "cue": cue, "target": target,
                         "routes": {}, "hits": {}, "rewards": {}}
            for key, controller in self.controllers.items():
                reward = 0.0
                action = None
                obs = observation(cue, stage, self.routes[key][0] if stage else None, self.cue_mode)
                if stage == 0:
                    action = controller.next_action
                    self.routes[key].append(action)
                    if self.reward_mode == "waypoints":
                        reward = 0.2 if action == target // 2 else -0.2
                    following = observation(cue, 1, action, self.cue_mode)
                    self._call(key, controller.transition, following, reward, False)
                    self.positions[key] = [-3.8 if action == 0 else 3.8, 0.0]
                elif stage == 1:
                    action = controller.next_action
                    self.routes[key].append(action)
                    following = observation(cue, 2, self.routes[key][0], self.cue_mode)
                    # No outcome yet: selecting an alley is not credited with an invented zero.
                    self._position(key, 0.25)
                elif stage == 2:
                    following = observation(cue, 2, self.routes[key][0], self.cue_mode)
                    self._call(key, controller.wait, following)
                    self._position(key, 0.7)
                else:
                    self._call(key, controller.wait, observation(cue, 3, self.routes[key][0], self.cue_mode))
                    route = self.routes[key][0] * 2 + self.routes[key][1]
                    hit = route == target
                    reward = 1.0 if hit else -0.25
                    next_cue = self.cues[self.episodes + 1]
                    following = observation(next_cue, 0, cue_mode=self.cue_mode)
                    self._call(key, controller.transition, following, reward, True)
                    self._position(key, 1.0)
                    score = self.scores[key]
                    score.hits += int(hit)
                    score.recent.append(int(hit))
                    score.cue_recent[cue].append(int(hit))
                    self.last[key] = {"route": route, "hit": hit, "reward": reward, "cue": cue}
                    completed["routes"][key] = route
                    completed["hits"][key] = int(hit)
                    completed["rewards"][key] = self.trip_reward[key] + reward
                self.next_observations[key] = following.tolist()
                self.trip_reward[key] += reward
                self.scores[key].reward += reward
                event["agents"][key] = {"action": action, "reward": reward,
                                        "observation": obs.tolist(), "next_observation": following.tolist(),
                                        "route_so_far": self.routes[key].copy(),
                                        "outcome_received": stage in (0, 3),
                                        "operation": "transition" if stage in (0, 3) else "wait" if stage == 2 else "travel"}
            self.tick += 1
            self.view = {"cue": cue, "target": target, "stage": stage,
                         "label": ["选东／西街", "选北／南巷", "走过巷子：奖励仍未到", "抵达店铺：结算终点奖励"][stage]}
            self.action_history.append(event)
            self.stage = (stage + 1) % 4
            if stage == 3:
                self.history.append(completed)
                self.episodes += 1
                self.cue = self.cues[self.episodes]
        return self.snapshot()

    def _call(self, key, function, *args):
        started = perf_counter()
        function(*args)
        self.scores[key].elapsed_ms += (perf_counter() - started) * 1000

    def _position(self, key, progress):
        branch, alley = self.routes[key]
        x = -3.8 if branch == 0 else 3.8
        self.positions[key] = [x, (-3.14 if alley == 0 else 3.14) * progress]

    def snapshot(self):
        agents = {}
        for key, controller in self.controllers.items():
            score = self.scores[key]
            agents[key] = {"name": controller.name, "color": COLORS[key],
                           "next_action": controller.next_action, "last": self.last.get(key),
                           "hits": score.hits, "reward": score.reward,
                           "rate": sum(score.recent) / max(1, len(score.recent)),
                           "cue_rates": [None if not rows else sum(rows) / len(rows) for rows in score.cue_recent],
                           "average_trip_ms": score.elapsed_ms / max(1, self.episodes),
                           "details": controller.report()}
        return {"scenario": "route", "seed": self.seed, "tick": self.tick,
                "episodes": self.episodes, "stage": self.stage, "cue": self.cue,
                "cue_mode": self.cue_mode, "reward_mode": self.reward_mode,
                "phase_length": self.phase_length, "automatic": self.automatic,
                "finished": self.finished, "mapping": self.mapping.copy(),
                "queued_target": self.queued_target, "view": self.view.copy(),
                "agents": agents, "positions": self.positions,
                "observations": self.next_observations, "changes": self.changes,
                "history": self.history, "action_history": self.action_history,
                "provenance": {"commit": UPSTREAM_COMMIT, "cadence_version": cd.__version__,
                               "cadence_config": {**self.controllers["cadence"].config, "modules": [16]},
                               "q_config": Q_CONFIG, "q_states": 6, "q_values": 12,
                               "rule": "per-cue four-route enumeration; latched observed sign",
                               "q_memory": "latched observed sign; same cue history available to rule",
                               "observation_fields": ["cue0", "cue1", "plaza", "fork", "west", "east", "walk1", "walk2"],
                               "terminal_reward": {"hit": 1.0, "miss": -0.25},
                               "waypoint_reward": None if self.reward_mode == "sparse" else {"correct_street": 0.2, "wrong_street": -0.2},
                               "decisions_per_trip": 2, "waits_per_trip": 2,
                               "route_to_shop": ROUTE_TO_SHOP, "shops": SHOPS, "cues": CUES,
                               "target_hidden": True, "phase_hidden": True,
                               "scope": "two junction choices; not general navigation or a world model"}}
