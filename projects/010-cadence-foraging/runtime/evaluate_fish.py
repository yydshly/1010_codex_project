"""Reproducible four-seed development holdout; retain all forecasts and shots."""
import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import cadence
from fish_experiment import CONFIG, FishExperiment, KEYS, MODES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='../notes/fish-evaluation-results.json')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    runs = []
    for mode in MODES:
        for seed in (7, 41, 42, 43):
            experiment = FishExperiment(seed, mode)
            cold = experiment.snapshot()
            for target in (32, 64, 128, 192):
                experiment.train(target - experiment.attempts)
            trained = experiment.snapshot()
            runs.append({'mode': mode, 'seed': seed, 'cold': cold, 'trained': trained})
            print(mode, seed, {k: (round(v['ade'], 2), v['hits']) for k, v in trained['metrics'].items()}, flush=True)
    aggregate = {}
    for mode in MODES:
        selected = [r for r in runs if r['mode'] == mode]
        aggregate[mode] = {}
        for key in (*KEYS, 'stationary'):
            rows = [r['trained']['metrics'][key] for r in selected]
            aggregate[mode][key] = {k: float(np.mean([r[k] for r in rows])) for k in ('ade', 'fde', 'at_02', 'at_06', 'at_12')}
            hits = sum(r['hits'] for r in rows)
            aggregate[mode][key].update(hits=hits, shots=192, hit_rate=hits / 192)
        aggregate[mode]['cold_cadence'] = {'ade': float(np.mean([r['cold']['metrics']['cadence']['ade'] for r in selected])),
                                         'hits': sum(r['cold']['metrics']['cadence']['hits'] for r in selected), 'shots': 192}
    result = {'schema': 'fish-evaluation/1', 'date': '2026-10-11', 'config': CONFIG,
              'seeds': [7, 41, 42, 43], 'scope': 'development holdout, not an independent confirmation set',
              'versions': {'python': platform.python_version(), 'numpy': np.__version__, 'cadence': cadence.__version__},
              'source_sha256': {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
                                for name in ('fish_experiment.py', 'evaluate_fish.py')},
              'aggregate': aggregate, 'runs': runs}
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
