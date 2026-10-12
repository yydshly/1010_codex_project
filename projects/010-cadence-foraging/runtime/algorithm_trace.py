"""Read-only frames around the pinned Brain's real calls, for the local UI.

The benchmark protocol stays in route_experiment.py. These instance wrappers call
each original exactly once on the observed controller; reads do not settle,
learn or draw an extra action.
"""
from collections import deque

import numpy as np
import cadence as cd

from route_experiment import RouteExperiment


def vector(value):
    return np.asarray(value, dtype=float).reshape(-1).tolist()


def norm(value):
    return float(np.linalg.norm(value))


class BrainRecorder:
    limit = 96

    def __init__(self, controller):
        self.controller = controller
        self.brain = brain = controller.brain
        self.actor = actor = brain.basal_ganglia
        self.frames = deque(maxlen=self.limit)
        self.serial = 0
        self.tick = 0
        self.episode = 1
        self.original_observation = None
        self.current_action = controller.next_action
        self.current_space = "street"
        self.credit_frames = []
        graph = brain.connectome
        self.topology = {"pre": graph.pre.tolist(), "post": graph.post.tolist(),
                         "populations": {k: list(v) for k, v in graph.populations.items()
                                         if "/" not in k}}
        self.config = {"gamma": actor.config.gamma, "lam": actor.config.lam,
                       "actor_eta": actor.config.eta, "actor_eta_bias": actor.config.eta_bias,
                       "beta": brain.learner.config.beta, "temperature": brain.learner.config.temperature,
                       "critic_signal": actor.config.critic_target,
                       "working_decay": brain.working_memory.decay,
                       "working_amplitude": brain.working_memory.amplitude}
        choose, live, wait, apply = brain._choose, brain.live, brain.wait, brain.learner.apply

        def observed_choose(x, drive, free, *, greedy, temperature=None):
            # These are the actual free state and drive passed to the original chooser.
            self.emit("input", "观察进入神经图", observation=vector(x), drive=vector(drive),
                      action_space="street" if x[0, 2] else "alley")
            self.emit("neural", "反馈神经图达到自由态", activity=vector(free.activation),
                      observation=vector(x), drive=vector(drive), sweeps=int(free.steps))
            action = choose(x, drive, free, greedy=greedy, temperature=temperature)
            self.original_observation = x.copy()
            self.current_action = int(action[0])
            self.current_space = "street" if x[0, 2] else "alley"
            self.decision_frames(x, drive, free, int(action[0]), temperature, greedy,
                                 decision_id=int(brain.arousal.age + 1), phases_only=True)
            return action

        def observed_live(observations, *, reward=None, done=None, decision_id=None):
            self.credit_frames = []
            before_updates = actor.updates
            old_critic = np.r_[actor.w_critic.copy(), actor.b_critic]
            old_memory = brain.hippocampus.consolidated.copy()
            outcome = None
            old_id = brain.decision_id
            old_value = 0.0 if actor.state is None else float(actor.value(actor.state)[0])
            if brain.pending_feedback:
                outcome = self.emit("reward", "实际奖励到达原动作", reward=float(0 if reward is None else reward[0]),
                                    terminal=bool(False if done is None else done[0]),
                                    decision_id=old_id, action=self.current_action,
                                    action_space=self.current_space,
                                    observation=vector(self.original_observation), value_before=old_value)
            result = live(observations, reward=reward, done=done, decision_id=decision_id)
            if outcome is not None:
                learned = actor.updates != before_updates
                outcome["learned"] = learned
                outcome["td_error_abs"] = float(brain.last_arousal["error"])
                outcome["memory_delta"] = vector(brain.hippocampus.consolidated - old_memory)
                if learned:
                    report = dict(brain.last_learning)
                    # The report's td_error is unsigned; dopamine carries the sign in
                    # this pinned configuration (center=0, floor=0, positive cap).
                    delta = float(np.sign(report["dopamine"]) * report["td_error"])
                    for frame in [outcome, *self.credit_frames]:
                        frame.update(td_error=delta, modulation=float(report["dopamine"]),
                                     value_before=float(report["value"]),
                                     critic_delta=vector(np.r_[actor.w_critic, actor.b_critic] - old_critic),
                                     memory_delta=outcome["memory_delta"])
            return result

        def observed_wait(observations):
            before = self.capture()
            drive = brain.stimulus(observations)  # a pure read, not another settlement
            self.emit("input", "等待时接收新观察", observation=vector(observations), drive=vector(drive),
                      waiting=True, decision_id=brain.decision_id)
            result = wait(observations)
            sensed = brain._awaited()
            self.emit("wait", "活动变化，待奖动作与资格保留", activity=vector(sensed.activation),
                      observation=vector(observations), drive=vector(drive),
                      decision_id=brain.decision_id, working_before=before["working_trace"],
                      unchanged_parameters=True, sweeps=int(sensed.steps))
            return result

        def observed_apply(delta_scale, delta_bias):
            before = brain.brain.efficacy.copy()
            before_bias = brain.brain.bias.copy()
            credited = self.emit("credit", "奖励误差调制累积资格", decision_id=self.feedback_id,
                                 action=self.current_action, action_space=self.current_space,
                                 observation=vector(self.original_observation),
                                 old_eligibility=self.old_eligibility,
                                 contrast=self.feedback_contrast)
            result = apply(delta_scale, delta_bias)
            after = brain.brain.efficacy.copy()
            difference = after - before
            indices = np.argsort(-np.abs(difference), kind="stable")[:8]
            updated = self.emit("update", "连接、偏置与价值参数更新", decision_id=self.feedback_id,
                                action=self.current_action, action_space=self.current_space,
                                observation=vector(self.original_observation),
                                weight_delta=vector(difference), bias_delta=vector(brain.brain.bias - before_bias),
                                weights_before=vector(before), weights_after=vector(after),
                                changed_weights=int(np.count_nonzero(difference)),
                                max_weight_delta=float(np.max(np.abs(difference))),
                                top_weights=[{"edge": int(i), "pre": int(graph.pre[i]),
                                              "post": int(graph.post[i]), "before": float(before[i]),
                                              "after": float(after[i]), "delta": float(difference[i]),
                                              "eligibility": float(actor.trace[0, i]),
                                              "requested_delta": float(delta_scale[i])} for i in indices])
            self.credit_frames.extend([credited, updated])
            return result

        learn = brain.learn

        def observed_learn(reward, done, next_observations, **kwargs):
            self.feedback_id = brain.decision_id
            self.old_eligibility = vector(self.eligibility())
            self.feedback_contrast = self.contrast()
            result = learn(reward, done, next_observations, **kwargs)
            if done[0]:
                self.emit("terminal", "终点清理资格，学到的参数保留", terminal=True,
                          decision_id=self.feedback_id, observation=vector(next_observations))
            return result

        brain._choose, brain.live, brain.wait, brain.learn = observed_choose, observed_live, observed_wait, observed_learn
        brain.learner.apply = observed_apply

    def eligibility(self):
        return np.zeros(self.brain.connectome.synapses) if self.actor.trace is None else self.actor.trace[0]

    def contrast(self):
        pending = self.actor._pending
        if pending is None:
            return None
        _, plus, minus, _ = pending
        # Actual saved +/- states. This read-only library method does not train.
        return vector(self.brain.learner.contrast(self.actor.state, plus, minus)[0])

    def capture(self):
        actor, brain = self.actor, self.brain
        return {"activity": vector(np.zeros(brain.connectome.n) if actor.state is None else actor.state.activation),
                "working_trace": vector(brain.working_memory.trace if len(brain.working_memory.trace)
                                         else np.zeros(len(brain.association_index))),
                "eligibility": vector(self.eligibility()),
                "eligibility_norm": norm(self.eligibility()),
                "actor_updates": actor.updates, "memory_writes": brain.hippocampus.writes,
                "feedback_pending": brain.pending_feedback,
                "decision_id": brain.decision_id,
                "action": self.current_action if actor.state is not None else None,
                "action_space": self.current_space}

    def emit(self, kind, label, **details):
        self.serial += 1
        frame = {"id": self.serial, "tick": self.tick, "episode": self.episode,
                 "kind": kind, "label": label, **self.capture(), **details}
        self.frames.append(frame)
        return frame

    def decision_frames(self, x, drive, free, action, temperature, greedy,
                        phases_only=False, decision_id=None):
        owned = decision_id
        space = "street" if x[0, 2] else "alley"
        if not phases_only:
            self.emit("input", "街口观察进入神经图", observation=vector(x), drive=vector(drive),
                      decision_id=owned, action_space=space)
            self.emit("neural", "反馈神经图达到自由态", observation=vector(x),
                      activity=vector(free.activation), sweeps=int(free.steps), decision_id=owned)
        probs = np.eye(2)[action] if greedy else self.actor.probabilities(free, temperature)[0]
        self.emit("choice", "贪心沿用动作" if greedy else "按真实概率抽样动作",
                  observation=vector(x), action=action, action_space=space,
                  probabilities=vector(probs), greedy=greedy, temperature=temperature,
                  decision_id=owned)
        if self.actor._pending is not None:
            _, plus, minus, _ = self.actor._pending
            self.emit("eligibility", "保存正负扰动，等待该动作的结果", observation=vector(x),
                      action=action, action_space=space, decision_id=owned,
                      contrast=self.contrast(), plus=vector(plus.activation), minus=vector(minus.activation),
                      plus_steps=int(plus.steps), minus_steps=int(minus.steps),
                      probabilities=vector(probs))

    def snapshot(self):
        return {"schema": "cadence-algorithm-frames/1", "limit": self.limit,
                "total_frames": self.serial, "topology": self.topology, "config": self.config,
                "frames": list(self.frames),
                "scope": "real free/nudged-state snapshots; each observed method called once"}


class TracedRouteExperiment(RouteExperiment):
    """The same environment, with bounded observational frames for web sessions."""

    def __init__(self, *args, **kwargs):
        self.recorder = None
        super().__init__(*args, **kwargs)
        # Recreate only the initial, unused controller with the exact same seed and
        # configuration, so observers are attached before its first live call.
        # No environment tick or score has occurred yet; baselines stay untouched.
        previous = self.controllers["cadence"]
        controller = type(previous).__new__(type(previous))
        controller.config = previous.config.copy()
        controller.brain = cd.Brain.compose(8, 2, seed=self.seed, **controller.config)
        controller.next_action, controller.waits = 0, 0
        self.controllers["cadence"] = controller
        self.recorder = BrainRecorder(controller)
        controller.next_action = int(controller.brain.live(np.asarray(self.next_observations["cadence"]))[0])

    def step(self, count=1):
        for _ in range(count):
            if self.finished:
                break
            rec = self.recorder
            rec.tick, rec.episode = self.tick + 1, self.episodes + 1
            q, rule = self.controllers["q"], self.controllers["rule"]
            old_q, old_key, old_action, old_updates = q.q.copy(), q.key, q.next_action, q.updates
            old_routes = rule.routes.copy()
            if self.stage == 1:
                rec.emit("travel", "动作已执行，结果仍未知", observation=vector(self.next_observations["cadence"]))
            super().step(1)
            index = (*old_key, old_action)
            rec.emit("baseline", "同一环境时刻的规则与 Q 对照",
                     comparison={"q": {"state": list(old_key), "action": int(old_action),
                                         "updated": q.updates != old_updates,
                                         "before": float(old_q[index]), "after": float(q.q[index]),
                                         "delta": float(q.q[index] - old_q[index]),
                                         "table": q.q.tolist()},
                                 "rule": {"before": old_routes, "after": rule.routes.copy(),
                                          "remembered_cue": rule.cue}})
        return self.snapshot()

    def snapshot(self):
        state = super().snapshot()
        if self.recorder is not None:
            state["algorithm"] = self.recorder.snapshot()
        return state
