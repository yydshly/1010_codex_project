"""Cross-check UI downloads against offline outcomes and actual step/reward ownership."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from math import isclose
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEYS = ('cadence', 'rule', 'q')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(path, offline):
    browser = json.loads(path.read_text(encoding='utf-8'))
    life = next(item for item in offline['lives'] if
                item['seed'] == browser['seed'] and item['cue_mode'] == browser['cue_mode']
                and item['reward_mode'] == browser['reward_mode'] and item['trace_amplitude'] == .3)
    assert browser['finished'] and browser['automatic']
    assert browser['history'] == life['history'], '浏览器与离线路线历史不同'
    trips, steps = browser['episodes'], browser['action_history']
    assert trips == offline['phase_length'] * 3
    assert browser['tick'] == len(steps) == trips * 4
    phase = browser['phase_length']
    assert [change['episode'] for change in browser['changes']] == [0, phase, phase * 2]
    assert browser['provenance']['commit'] == life['provenance']['commit']
    assert browser['provenance']['cadence_version'] == life['provenance']['cadence_version']
    for index, trip in enumerate(browser['history']):
        events = steps[index * 4:index * 4 + 4]
        assert [e['stage'] for e in events] == [0, 1, 2, 3]
        assert all(e['cue'] == trip['cue'] and e['target'] == trip['target'] for e in events)
        for key in KEYS:
            actions = [e['agents'][key] for e in events]
            first, second = actions[0]['action'], actions[1]['action']
            route = first * 2 + second
            assert route == trip['routes'][key]
            hit = int(route == trip['target'])
            assert hit == trip['hits'][key]
            assert [a['action'] for a in actions[2:]] == [None, None]
            assert [a['outcome_received'] for a in actions] == [True, False, False, True]
            assert [a['operation'] for a in actions] == ['transition', 'travel', 'wait', 'transition']
            waypoint = 0 if browser['reward_mode'] == 'sparse' else .2 if first == trip['target'] // 2 else -.2
            assert actions[0]['reward'] == waypoint
            assert [a['reward'] for a in actions[1:3]] == [0, 0]
            assert actions[3]['reward'] == (1 if hit else -.25)
            assert isclose(sum(a['reward'] for a in actions), trip['rewards'][key], abs_tol=1e-9)
            for stage, action in enumerate(actions):
                obs = action['observation'][0]
                assert len(obs) == 8
                expected_cue = [int(trip['cue'] == 0), int(trip['cue'] == 1)]
                if browser['cue_mode'] == 'brief' and stage > 0:
                    expected_cue = [0, 0]
                assert obs[:2] == expected_cue
    for key in KEYS:
        agent = browser['agents'][key]
        assert agent['hits'] == sum(row['hits'][key] for row in browser['history'])
        assert agent['hits'] == life['controllers'][key]['hits']
        assert isclose(agent['reward'], sum(row['rewards'][key] for row in browser['history']), abs_tol=1e-7)
        assert len(agent['details']['probabilities']) == 2
    assert browser['agents']['cadence']['details']['waits'] == trips * 2
    assert browser['agents']['q']['details']['updates'] == trips * 2
    return {'file': path.name, 'sha256': sha(path), 'seed': browser['seed'],
            'cue_mode': browser['cue_mode'], 'reward_mode': browser['reward_mode'],
            'trips': trips, 'world_steps': len(steps), 'offline_history_equal': True,
            'actions_rewards_observations_verified': True,
            'hits': {k: browser['agents'][k]['hits'] for k in KEYS},
            'cadence_waits': browser['agents']['cadence']['details']['waits'],
            'q_updates': browser['agents']['q']['details']['updates']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', type=Path, nargs='+', required=True)
    parser.add_argument('--out', type=Path, default=ROOT / 'notes/route-browser-verification.json')
    args = parser.parse_args()
    offline_path = ROOT / 'notes/route-evaluation-results.json'
    offline = json.loads(offline_path.read_text(encoding='utf-8'))
    for file, expected in offline['source_sha256'].items():
        assert sha(ROOT / 'runtime' / file) == expected, f'运行代码已变化：{file}'
    results = [verify(path, offline) for path in args.browser]
    receipt = {'schema': 'sakura-route-browser-verification/1',
               'verified_at_utc': datetime.now(timezone.utc).isoformat(),
               'offline_sha256': sha(offline_path), 'source_sha256': offline['source_sha256'],
               'browser': results}
    args.out.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))
