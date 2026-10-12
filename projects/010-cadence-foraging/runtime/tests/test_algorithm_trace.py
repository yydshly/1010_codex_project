import json
import sys
from dataclasses import replace
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from algorithm_trace import TracedRouteExperiment
from route_experiment import RouteExperiment


@pytest.mark.parametrize('seed, cue, reward', [(7, 'brief', 'sparse'), (42, 'brief', 'waypoints'),
                                               (41, 'visible', 'sparse'), (43, 'visible', 'waypoints')])
def test_recording_does_not_change_actions_learning_memory_or_random_state(seed, cue, reward):
    plain = RouteExperiment(seed, phase_length=4, cue_mode=cue, reward_mode=reward)
    traced = TracedRouteExperiment(seed, phase_length=4, cue_mode=cue, reward_mode=reward)
    plain.step(48)
    result = traced.step(48)
    assert traced.action_history == plain.action_history
    assert traced.history == plain.history
    first, second = [x.controllers['cadence'].brain for x in (plain, traced)]
    for left, right in [(first.brain.efficacy, second.brain.efficacy), (first.brain.bias, second.brain.bias),
                        (first.basal_ganglia.w_critic, second.basal_ganglia.w_critic),
                        (first.working_memory.trace, second.working_memory.trace),
                        (first.hippocampus.consolidated, second.hippocampus.consolidated),
                        (first.hippocampus.strength, second.hippocampus.strength)]:
        np.testing.assert_array_equal(left, right)
    assert first.basal_ganglia.rng.bit_generator.state == second.basal_ganglia.rng.bit_generator.state
    assert first.arousal.to_dict() == second.arousal.to_dict()
    assert len(result['algorithm']['frames']) == traced.recorder.limit
    json.dumps(result, allow_nan=False)


def test_credit_is_witnessed_before_terminal_reset_and_changes_are_actual_parameters():
    experiment = TracedRouteExperiment(7)
    result = experiment.step(4)
    frames = result['algorithm']['frames']
    credits = [f for f in frames if f['kind'] == 'credit']
    assert [f['decision_id'] for f in credits] == [1, 2]
    for frame in credits:
        expected = .72 * np.asarray(frame['old_eligibility']) + np.asarray(frame['contrast'])
        np.testing.assert_allclose(frame['eligibility'], expected, atol=1e-14)
    update = [f for f in frames if f['kind'] == 'update'][-1]
    assert update['td_error'] == 1 and update['modulation'] == 1
    np.testing.assert_array_equal(np.asarray(update['weights_after']) - update['weights_before'],
                                  update['weight_delta'])
    np.testing.assert_array_equal(update['weights_after'], experiment.controllers['cadence'].brain.brain.efficacy)
    assert update['changed_weights'] > 0
    terminal = next(f for f in frames if f['kind'] == 'terminal')
    assert terminal['eligibility_norm'] == 0
    waits = [f for f in frames if f['kind'] == 'wait']
    assert len(waits) == 2 and all(f['decision_id'] == 2 for f in waits)
    np.testing.assert_array_equal(waits[0]['eligibility'], waits[1]['eligibility'])
    np.testing.assert_array_equal(waits[0]['eligibility'], credits[0]['eligibility'])
    assert waits[0]['working_trace'] != waits[0]['working_before']
    choices = [f for f in frames if f['kind'] == 'choice']
    assert [f['decision_id'] for f in choices] == [1, 2, 3]
    assert all(sum(f['probabilities']) == pytest.approx(1) for f in choices)


def test_calm_outcome_does_not_claim_an_actor_update_or_new_eligibility():
    experiment = TracedRouteExperiment(7)
    brain = experiment.controllers['cadence'].brain
    brain.arousal.config = replace(brain.arousal.config, youth=0, threshold=1e6)
    experiment.step(1)  # Consume the original sampled action, then issue a calm action.
    start = experiment.recorder.serial
    old = brain.brain.efficacy.copy()
    result = experiment.step(3)
    recent = [f for f in result['algorithm']['frames'] if f['id'] > start]
    outcome = next(f for f in recent if f['kind'] == 'reward')
    assert outcome['learned'] is False
    assert not any(f['kind'] in ('credit', 'update', 'eligibility') for f in recent)
    assert next(f for f in recent if f['kind'] == 'choice')['greedy'] is True
    np.testing.assert_array_equal(old, brain.brain.efficacy)
