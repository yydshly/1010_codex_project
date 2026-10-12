import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fish_experiment import FishExperiment, CONFIG, features, HISTORY, HORIZONS, SCALE
from record_fish_ep import build_record


@pytest.fixture(scope="module")
def receipt():
    return build_record()


def test_record_matches_uninstrumented_real_observe(receipt):
    experiment = FishExperiment(7)
    clip = experiment.training[0:1]
    inputs = features(clip[:, :9])
    target = np.stack([(clip[:, t + HORIZONS] - clip[:, t, None]) / SCALE
                       for t in range(2, 9)], axis=1).reshape(1, 7, 24)
    experiment.net.reset()
    result = experiment.net.observe(inputs, target, beta=.003, rate=5., backtrack=True)
    for name, phase in (("free", result.free), ("plus", result.plus), ("minus", result.minus)):
        np.testing.assert_array_equal(receipt["phases"][name]["hidden"], phase.hidden[0])
        np.testing.assert_array_equal(receipt["phases"][name]["output"], phase.output[0])
    for key, value in experiment.net.parameters().items():
        np.testing.assert_array_equal(receipt["parameters"]["after"][key], value)
        np.testing.assert_array_equal(receipt["parameters"]["ep_delta"][key], result.delta[key])
    assert receipt["update"]["initial_loss"] == result.initial_loss
    assert receipt["update"]["final_loss"] == result.final_loss


def test_local_products_reconstruct_contrast_and_actual_update(receipt):
    params = receipt["parameters"]
    for key in ("A", "B", "C"):
        plus = np.asarray(params["local_gradients"]["plus"][key])
        minus = np.asarray(params["local_gradients"]["minus"][key])
        direction = (plus - minus) / (2 * receipt["update"]["beta"])
        np.testing.assert_allclose(direction, params["ep_delta"][key], atol=3e-14, rtol=2e-10)
        before, after = np.asarray(params["before"][key]), np.asarray(params["after"][key])
        np.testing.assert_allclose(after, before - receipt["update"]["accepted_rate"] * direction, atol=2e-13)
        np.testing.assert_array_equal(after - before, params["actual_change"][key])
    assert receipt["update"]["changed_count"] == 288
    assert np.isclose(receipt["phases"]["after"]["loss"], receipt["update"]["final_loss"])


def test_contrast_matches_independent_free_loss_finite_difference(receipt):
    # Independent causal recurrence, not a copy of the EP contrast implementation.
    params = {k: np.array(v) for k, v in receipt["parameters"]["before"].items()}
    inputs, target = np.array(receipt["input"]["features"]), np.array(receipt["targets"])
    def loss():
        previous = np.zeros(8)
        output = []
        for u in inputs:
            previous = params["A"] @ np.tanh(previous) + params["B"] @ u
            output.append(params["C"] @ np.tanh(previous))
        return .5 * np.mean((output - target) ** 2)
    for key, row, column in (("C", 2, 0), ("B", 0, 0), ("A", 0, 0)):
        original, epsilon = params[key][row, column], 1e-5
        params[key][row, column] = original + epsilon
        plus_loss = loss()
        params[key][row, column] = original - epsilon
        minus_loss = loss()
        params[key][row, column] = original
        finite_difference = (plus_loss - minus_loss) / (2 * epsilon)
        np.testing.assert_allclose(receipt["parameters"]["ep_delta"][key][row][column],
                                   finite_difference, rtol=2e-4, atol=2e-7)


def test_inputs_targets_and_after_replay_have_correct_time_and_no_label_input(receipt):
    experiment = FishExperiment(7)
    clip = np.asarray(receipt["training_positions"])
    inputs = features(clip[:9])
    np.testing.assert_array_equal(inputs, receipt["input"]["features"])
    targets = np.asarray(receipt["targets"]).reshape(7, 12, 2)
    for t in range(7):
        np.testing.assert_array_equal(targets[t], (clip[t + 2 + HORIZONS] - clip[t + 2]) / SCALE)
    assert receipt["trajectory_seed"] in receipt["provenance"]["train_seed_ids"]
    assert receipt["trajectory_seed"] not in receipt["provenance"]["test_seed_ids"]
    net = experiment.net
    net.set_parameters({k: np.asarray(v) for k, v in receipt["parameters"]["after"].items()})
    before = net.snapshot()
    replay = net.imagine(inputs[None], state=np.zeros((1, 8)))
    np.testing.assert_array_equal(replay.output[0], receipt["phases"]["after"]["output"])
    for key, value in before.items():
        np.testing.assert_array_equal(net.snapshot()[key], value)
    changed_future = clip.copy()
    changed_future[9:] += 10000
    np.testing.assert_array_equal(features(changed_future[:9]), inputs)


def test_saved_web_record_matches_fresh_real_calculation(receipt):
    saved = json.loads((Path(__file__).resolve().parents[2] / 'notes/fish-ep-sample.json').read_text(encoding='utf8'))
    assert saved['input'] == receipt['input']
    assert saved['targets'] == receipt['targets']
    assert saved['parameters'] == receipt['parameters']
    assert saved['phases'] == receipt['phases']
    assert saved['update'] == receipt['update']
    assert saved['parameter_probe'] == receipt['parameter_probe']
    assert saved['source_sha256'] == receipt['source_sha256']


def test_newton_diagnostic_replay_matches_actual_phase(receipt):
    free = np.asarray(receipt['phases']['free']['hidden'])
    for name in ('plus', 'minus'):
        phase = receipt['phases'][name]
        probe = phase['first_newton_step']
        assert probe['matches_actual_final_path'] and phase['iterations'] == 1
        reconstructed = free + probe['step_size'] * np.asarray(probe['direction'])
        np.testing.assert_array_equal(reconstructed, phase['hidden'])


def test_weight_probes_match_independent_causal_predictions_and_loss(receipt):
    # No EP solver or target-detuned phase is used for this independent reference.
    probe = receipt['parameter_probe']
    old = {k: np.asarray(v) for k, v in receipt['parameters']['before'].items()}
    inputs, target = np.asarray(receipt['input']['features']), np.asarray(receipt['targets'])
    for trial in probe['trials']:
        params = {k: v.copy() for k, v in old.items()}
        params['C'][2, 0] += trial['shift']
        previous = np.zeros(8)
        output = []
        for u in inputs:
            previous = params['A'] @ np.tanh(previous) + params['B'] @ u
            output.append(params['C'] @ np.tanh(previous))
        np.testing.assert_allclose(output, trial['output'], atol=2e-15, rtol=2e-15)
        assert np.isclose(.5 * np.mean((output - target) ** 2), trial['loss'], atol=1e-15, rtol=1e-14)
    assert probe['trials'][0]['loss'] > probe['trials'][1]['loss'] > probe['trials'][2]['loss']
    assert np.isclose(probe['finite_difference'], probe['exact_free_loss_gradient'], atol=2e-14, rtol=1e-10)
    assert np.isclose(probe['finite_difference'], receipt['parameters']['ep_delta']['C'][2][0], atol=2e-11, rtol=1e-7)
    # A single readout-weight change cannot explain the all-parameter replay.
    assert not np.array_equal(probe['trials'][3]['output'], receipt['phases']['after']['output'])

