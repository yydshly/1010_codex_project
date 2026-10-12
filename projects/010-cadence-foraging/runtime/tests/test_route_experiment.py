import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment import Q_CONFIG
from route_experiment import RouteExperiment, RouteQ, observation


def test_delayed_outcome_is_consumed_once_and_wait_preserves_pending_choice():
    experiment = RouteExperiment(7)
    cadence = experiment.controllers['cadence']
    assert len(cadence.report()['probabilities']) == 2
    q = experiment.controllers['q']
    initial_updates = cadence.report()['updates']
    experiment.step(1)
    assert cadence.report()['updates'] == initial_updates + 1
    assert q.updates == 1
    assert not np.asarray(experiment.next_observations['cadence'])[0, :2].any()
    brain = cadence.brain
    pending = brain.decision_id
    params = brain.brain.efficacy.copy()
    values = q.q.copy()
    updates = cadence.report()['updates']
    action = cadence.next_action
    experiment.step(2)
    assert brain.decision_id == pending
    assert cadence.next_action == action
    assert cadence.waits == 1
    assert cadence.report()['updates'] == updates
    np.testing.assert_array_equal(brain.brain.efficacy, params)
    np.testing.assert_array_equal(q.q, values)
    assert not experiment.history
    result = experiment.step(1)
    assert result['episodes'] == 1 and result['tick'] == 4
    assert cadence.waits == 2
    assert cadence.report()['updates'] == updates + 1
    assert q.updates == 2
    assert [row['agents']['cadence']['outcome_received'] for row in result['action_history']] == [True, False, False, True]
    assert [row['agents']['cadence']['reward'] for row in result['action_history'][:3]] == [0, 0, 0]


@pytest.mark.parametrize('mode', ['sparse', 'waypoints'])
def test_trip_scores_match_both_executed_choices_and_actual_rewards(mode):
    experiment = RouteExperiment(42, reward_mode=mode)
    result = experiment.step(48)
    for trip_index, trip in enumerate(result['history']):
        steps = result['action_history'][trip_index * 4:trip_index * 4 + 4]
        for key in experiment.controllers:
            branch, alley = [row['agents'][key]['action'] for row in steps[:2]]
            assert trip['routes'][key] == branch * 2 + alley
            hit = int(trip['routes'][key] == trip['target'])
            assert trip['hits'][key] == hit
            waypoint = 0 if mode == 'sparse' else .2 if branch == trip['target'] // 2 else -.2
            assert trip['rewards'][key] == pytest.approx(waypoint + (1 if hit else -.25))
            assert sum(row['agents'][key]['reward'] for row in steps) == pytest.approx(trip['rewards'][key])
    for key, agent in result['agents'].items():
        assert agent['hits'] == sum(trip['hits'][key] for trip in result['history'])
        assert agent['reward'] == pytest.approx(sum(trip['rewards'][key] for trip in result['history']))


def test_manual_migration_is_queued_and_does_not_recreate_or_inform_policies():
    experiment = RouteExperiment(7)
    before = experiment.step(1)
    brain = experiment.controllers['cadence'].brain
    params = brain.brain.efficacy.copy()
    values = experiment.controllers['q'].q.copy()
    experiment.move_food(1)
    after = experiment.snapshot()
    assert not after['automatic']
    assert after['queued_target'] == 1 and after['mapping'] == [0, 3]
    assert before['agents'] == after['agents']
    assert before['observations'] == after['observations']
    np.testing.assert_array_equal(brain.brain.efficacy, params)
    np.testing.assert_array_equal(experiment.controllers['q'].q, values)
    ended = experiment.step(3)
    assert ended['history'][0]['target'] == [0, 3][ended['history'][0]['cue']]
    following = experiment.step(1)
    assert following['mapping'] == [1, 3] and following['queued_target'] is None
    assert following['action_history'][-1]['target'] == [1, 3][following['cue']]
    assert experiment.controllers['cadence'].brain is brain


def test_automatic_single_cue_migration_retains_brain_and_balances_cues():
    experiment = RouteExperiment(3, phase_length=4)
    brain = experiment.controllers['cadence'].brain
    result = experiment.step(48)
    assert result['finished'] and result['episodes'] == 12
    assert experiment.controllers['cadence'].brain is brain
    for phase in range(3):
        rows = result['history'][phase * 4:phase * 4 + 4]
        assert sorted(row['cue'] for row in rows) == [0, 0, 1, 1]
        mapping = [1, 3] if phase == 1 else [0, 3]
        assert all(row['target'] == mapping[row['cue']] for row in rows)
    assert [change['episode'] for change in result['changes']] == [0, 4, 8]
    assert experiment.step(8)['tick'] == 48


def test_q_latches_its_own_observed_cue_and_does_not_bootstrap_across_trips():
    q = RouteQ(7, observation(1, 0))
    q.transition(observation(1, 1, 0), 0, False)
    assert q.key == (1, 1)
    action = q.next_action
    old = q.q[1, 1, action] = 2
    q.q[0, 0, :] = 100
    q.wait(observation(1, 2, 0))
    assert q.cue == 1
    q.transition(observation(0, 0), 1, True)
    assert q.q[1, 1, action] == pytest.approx(old + Q_CONFIG['alpha'] * (1 - old))
    assert q.key == (0, 0)
    np.testing.assert_array_equal(q.q[0, 0], [100, 100])


def test_public_observations_do_not_include_food_map_and_q_latch_is_explicit():
    first, second = RouteExperiment(7), RouteExperiment(7, cue_mode='visible')
    initial = first.snapshot()
    first.move_food(2)
    assert first.snapshot()['observations'] == initial['observations']
    brief, visible = first.step(32), second.step(32)
    assert [row['cue'] for row in brief['history']] == [row['cue'] for row in visible['history']]
    assert initial['provenance']['q_values'] == 12
    for row in visible['action_history']:
        public = [agent['observation'][0] for agent in row['agents'].values()]
        assert all(len(obs) == 8 for obs in public)
        assert all(obs[:4] == public[0][:4] for obs in public)
    # With identical maps, making the cue visible does not alter latched Q actions.
    third = RouteExperiment(7)
    brief_same_map = third.step(32)
    assert [row['routes']['q'] for row in brief_same_map['history']] == [row['routes']['q'] for row in visible['history']]


@pytest.mark.parametrize('kwargs', [{'phase_length': 3}, {'phase_length': 0}, {'cue_mode': 'fake'}, {'reward_mode': 'fake'}])
def test_invalid_route_protocol_is_rejected(kwargs):
    with pytest.raises(ValueError):
        RouteExperiment(**kwargs)
