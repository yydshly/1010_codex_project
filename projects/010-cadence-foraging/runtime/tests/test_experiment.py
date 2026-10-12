import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment import Experiment, QController, Q_CONFIG, RuleController


def test_moving_reward_preserves_all_policies_and_pending_action():
    experiment = Experiment(7)
    experiment.step(8)
    brain = experiment.controllers["cadence"].brain
    params = brain.brain.efficacy.copy()
    memory = brain.hippocampus.writes
    q = experiment.controllers["q"].q.copy()
    actions = [controller.next_action for controller in experiment.controllers.values()]
    experiment.move_food(2)
    assert experiment.controllers["cadence"].brain is brain
    np.testing.assert_array_equal(params, brain.brain.efficacy)
    np.testing.assert_array_equal(q, experiment.controllers["q"].q)
    assert brain.hippocampus.writes == memory
    assert actions == [controller.next_action for controller in experiment.controllers.values()]
    assert not experiment.automatic


def test_history_is_scored_from_the_executed_actions():
    experiment = Experiment(8)
    result = experiment.step(12)
    for row in result["history"]:
        for key, action in row["actions"].items():
            assert row["hits"][key] == int(action == row["target"])
    for key, agent in result["agents"].items():
        hits = sum(row["hits"][key] for row in result["history"])
        assert hits == agent["hits"]
        assert agent["reward"] == hits - .25 * (12 - hits)
        assert sum(agent["details"]["probabilities"]) == pytest.approx(1)
    assert result["provenance"]["observation"] == [[1., 0., 0., 0.]]


def test_same_seed_produces_the_same_action_sequence():
    first, second = Experiment(15), Experiment(15)
    assert first.step(10)["history"] == second.step(10)["history"]


def test_automatic_changes_apply_to_the_next_executed_round_and_keep_one_brain():
    experiment = Experiment(3, phase_length=100)
    brain = experiment.controllers["cadence"].brain
    result = experiment.step(101)
    assert result["history"][99]["target"] == 0
    assert result["history"][100]["target"] == 2
    assert experiment.controllers["cadence"].brain is brain
    assert result["changes"][1]["tick"] == 100


def test_rule_follows_its_declared_reward_only_logic():
    rule = RuleController(0)
    rule.feedback(0, 1)
    assert rule.next_action == 0
    rule.feedback(0, -.25)
    assert rule.next_action == 1
    rule.feedback(3, -.25)
    assert rule.next_action == 0


def test_q_update_uses_reward_and_existing_values_without_a_target_location():
    q = QController(0)
    q.q[:] = [2, 1, 0, 0]
    q.feedback(1, -.25)
    assert q.q[1] == pytest.approx(1 + Q_CONFIG["alpha"] * (-.25 + Q_CONFIG["gamma"] * 2 - 1))
    assert q.updates == 1
