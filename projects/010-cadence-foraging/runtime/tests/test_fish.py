import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fish_experiment import (FishExperiment, DT, GUN, HISTORY, HORIZONS,
                             KEYS, baselines, features, first_contact, shot, trajectory)


def test_position_features_and_analytic_baselines():
    t = np.arange(HISTORY + 1) * DT
    v, a = np.array([80., -20.]), np.array([30., 40.])
    history = np.array([500., 280.]) + t[:, None] * v + .5 * t[:, None] ** 2 * a
    observed_v = (history[-1] - history[-2]) / DT
    future = HORIZONS * DT
    results = baselines(history)
    np.testing.assert_allclose(results['velocity'], history[-1] + future[:, None] * observed_v)
    np.testing.assert_allclose(results['acceleration'], results['velocity'] + .5 * future[:, None] ** 2 * a)
    np.testing.assert_allclose(features(history)[..., 2:], np.tile(a / 400, (7, 1)))
    np.testing.assert_allclose(features(history + [1234, -777]), features(history), atol=1e-11)


def test_swept_collision_detects_contact_between_frames_and_miss():
    # Bullet advances 35 px in one frame; endpoint-only tests would miss.
    fish = np.array([GUN + [17.5, 0], GUN + [17.5, 0]])
    contact = first_contact(fish, np.array([1., 0.]))
    assert contact is not None and 0 < contact < DT
    assert first_contact(fish + [0, 40], np.array([1., 0.])) is None


def test_intercept_inside_segment_with_both_endpoint_gaps_positive():
    origin = np.array([500., 280.])
    prediction = np.tile([500., 900.], (12, 1))
    actual = np.tile(origin, (25, 1))
    result = shot(origin, prediction, actual)
    # First predicted segment passes through the gun. Endpoint-only sign
    # bracketing would miss the first root and shoot in the opposite direction.
    assert np.isclose(result['planned_time'], 295 / (6200 + 700))
    assert result['direction'][1] < 0 and result['hit']


def test_no_future_input_no_evaluation_updates_and_seed_reproducibility():
    experiment = FishExperiment(7)
    clip = trajectory(77, 'inertia')
    np.testing.assert_array_equal(clip, trajectory(77, 'inertia'))
    changed = clip.copy()
    changed[HISTORY + 1:] += 10000
    before = experiment.parameter_hash()
    prediction = experiment.predict(clip[:HISTORY + 1])
    np.testing.assert_array_equal(prediction, experiment.predict(changed[:HISTORY + 1]))
    experiment.evaluate()
    assert before == experiment.parameter_hash()
    assert not set(experiment.train_seeds) & set(experiment.test_seeds)


def test_real_training_keeps_test_paths_and_baselines_fixed_and_metrics_auditable():
    experiment = FishExperiment(7)
    before = experiment.snapshot()
    after = experiment.train(8)
    assert after['updates'] == 8 and after['parameter_sha256'] != before['parameter_sha256']
    assert after['last_training']['final_loss'] < after['last_training']['initial_loss']
    assert set(after['last_training']['train_seed_ids']) <= set(after['provenance']['training_seeds'])
    for old, new in zip(before['cases'], after['cases']):
        assert old['positions'] == new['positions']
        for key in ('velocity', 'acceleration', 'stationary'):
            assert old['forecasts'][key] == new['forecasts'][key]
            assert old['shots'][key] == new['shots'][key]
    for key in (*KEYS, 'stationary'):
        distances = []
        hits = 0
        for case in after['cases']:
            actual = np.array(case['positions'])[HISTORY + HORIZONS]
            errors = np.linalg.norm(np.array(case['forecasts'][key]) - actual, axis=1)
            np.testing.assert_allclose(errors, case['errors'][key])
            distances.append(errors)
            hits += case['shots'][key]['hit']
        assert np.isclose(np.mean(distances), after['metrics'][key]['ade'])
        assert after['metrics'][key]['hits'] == hits
        assert after['metrics'][key]['hit_rate'] == hits / 48
    assert after['parameter_count'] == sum(v.size for v in experiment.net.parameters().values())
    json.dumps(after, allow_nan=False)
