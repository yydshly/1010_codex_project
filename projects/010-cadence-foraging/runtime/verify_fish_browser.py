"""Verify actual UI downloads against the retained full offline receipts."""
import hashlib
import json
from pathlib import Path

import numpy as np
from fish_experiment import DT, GUN, HISTORY, HORIZONS, first_contact

root = Path(__file__).resolve().parent.parent
evidence = json.loads((root / 'notes/fish-evaluation-results.json').read_text(encoding='utf-8'))
checks = []
for mode in ('inertia', 'independent'):
    path = root / f'notes/browser-fish-{mode}-seed-7.json'
    browser = json.loads(path.read_text(encoding='utf-8'))
    run = next(r for r in evidence['runs'] if r['mode'] == mode and r['seed'] == 7)
    assert browser['batches'] == 192 and browser['updates'] == 192
    assert browser['cases'] == run['trained']['cases']
    assert browser['metrics'] == run['trained']['metrics']
    assert browser['cold_cases'] == run['cold']['cases']
    assert browser['cold_metrics'] == run['cold']['metrics']['cadence']
    assert browser['parameter_sha256'] == run['trained']['parameter_sha256']
    assert not set(browser['provenance']['training_seeds']) & set(browser['provenance']['test_seeds'])
    assert browser['curve'][0]['batches'] == 0 and browser['curve'][-1]['batches'] == 192
    assert len(browser['curve']) == 25
    for key, metric in browser['metrics'].items():
        errors = []
        hits = 0
        for case in browser['cases']:
            actual = np.array(case['positions'])
            distance = np.linalg.norm(np.array(case['forecasts'][key]) - actual[HISTORY+HORIZONS], axis=1)
            np.testing.assert_allclose(case['errors'][key], distance)
            errors.append(distance)
            contact = first_contact(actual[HISTORY:], np.array(case['shots'][key]['direction']))
            assert contact == case['shots'][key]['hit_time']
            hits += contact is not None
        assert np.isclose(np.mean(errors), metric['ade'])
        assert metric['hits'] == hits and metric['hit_rate'] == hits / 48
    checks.append({'mode':mode, 'cases':48, 'all_forecasts_errors_shots_equal_offline':True,
                   'cold_forecasts_equal':True, 'metrics_and_parameters_equal':True,
                   'all_errors_and_collisions_recomputed':True, 'replay_does_not_train':True,
                   'file_sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
result = {'date':'2026-10-11','checks':checks,'source_sha256':{
    name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in (
        'runtime/fish_experiment.py','runtime/server.py','runtime/verify_fish_browser.py',
        'web/src/fishing-main.js','web/src/fishing-style.css')},
    'verification':'actual in-app browser downloads; frozen evaluation; replay kept 192 updates'}
(root/'notes/fish-browser-verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print('Both browser sessions: 48 complete cases each, cold predictions, metrics, parameters, errors and swept collisions verified.')
