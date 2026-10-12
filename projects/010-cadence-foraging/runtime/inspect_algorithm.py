"""Inspect the pinned implementation and witness one real four-moment trip.

No controller configuration or training protocol is changed. Private readings are
used only for source/debug inspection, never to supply a decision or reward.
"""
import hashlib
import inspect
import json
from importlib.metadata import distribution
from pathlib import Path

import cadence as cd
import numpy as np
from cadence.arousal import Arousal
from cadence.brain import Brain as NeuralGraph
from cadence.learning import Learner
from cadence.memory import SynapticMemory
from cadence.plasticity import ActorCritic
from cadence.stream import Trace
from route_experiment import RouteExperiment, observation

ROOT = Path(__file__).resolve().parent.parent


def digest(*arrays):
    value = hashlib.sha256()
    for array in arrays:
        value.update(np.ascontiguousarray(array).tobytes())
    return value.hexdigest()


def location(function):
    file = Path(inspect.getsourcefile(function))
    return {'file': file.name, 'line': inspect.getsourcelines(function)[1],
            'source_sha256': hashlib.sha256(file.read_bytes()).hexdigest()}


def witness(experiment):
    controller = experiment.controllers['cadence']
    brain, actor = controller.brain, controller.brain.basal_ganglia
    return {'world_tick': experiment.tick, 'completed_trips': experiment.episodes,
            'next_stage': experiment.stage, 'decision_id': brain.decision_id,
            'next_action': controller.next_action, 'pending_feedback': brain.pending_feedback,
            'actor_updates': actor.updates, 'memory_writes': brain.hippocampus.writes,
            'waits': controller.waits, 'arousal_mode': brain.last_arousal['mode'],
            'graph_parameters_sha256': digest(brain.brain.efficacy, brain.brain.bias),
            'critic_parameters_sha256': digest(actor.w_critic, np.asarray(actor.b_critic)),
            'memory_parameters_sha256': digest(brain.hippocampus.consolidated,
                                               brain.hippocampus.strength),
            'working_trace_norm': float(np.linalg.norm(brain.working_memory.trace)),
            'eligibility_norm': 0 if actor.trace is None else float(np.linalg.norm(actor.trace)),
            'last_learning': dict(brain.last_learning),
            'public_observation': experiment.next_observations['cadence']}


if __name__ == '__main__':
    experiment = RouteExperiment(7)
    brain = experiment.controllers['cadence'].brain
    functions = {
        'composition': cd.Brain.compose, 'input_and_recall': cd.Brain.stimulus,
        'live': cd.Brain.live, 'wait': cd.Brain.wait, 'reward_dispatch': cd.Brain.learn,
        'witnessed_memory_write': cd.Brain._record, 'neural_settlement': NeuralGraph._run_numpy,
        'action_and_eligibility': ActorCritic.act, 'reward_update': ActorCritic._learn,
        'critic_update': ActorCritic._critic_candidate, 'local_parameter_application': Learner.apply,
        'working_trace': Trace.update, 'associative_memory': SynapticMemory.observe,
        'arousal_outcome': Arousal.outcome,
    }
    source = {name: location(function) for name, function in functions.items()}
    snapshots = [witness(experiment)]
    for _ in range(4):
        experiment.step(1)
        snapshots.append(witness(experiment))
    # Entry and travel add no fabricated outcome; the actual wait does not spend credit.
    waiting = snapshots[1:4]
    assert len({row['graph_parameters_sha256'] for row in waiting}) == 1
    assert len({row['critic_parameters_sha256'] for row in waiting}) == 1
    assert len({row['memory_parameters_sha256'] for row in waiting}) == 1
    assert len({row['decision_id'] for row in waiting}) == 1
    assert len({row['eligibility_norm'] for row in waiting}) == 1
    assert snapshots[4]['actor_updates'] == snapshots[1]['actor_updates'] + 1
    assert snapshots[4]['waits'] == 2
    # The default memory's public key aliases hidden cues at the same branch/stage.
    first, second = [observation(cue, 1, 0, 'brief') for cue in (0, 1)]
    assert np.array_equal(first, second)
    direct = json.loads(distribution('cadence-net').read_text('direct_url.json'))
    result = {
        'schema': 'sakura-cadence-algorithm-inspection/1', 'seed': 7,
        'cadence_version': cd.__version__, 'installed_git_commit': direct['vcs_info']['commit_id'],
        'graph': {'neurons': brain.connectome.n, 'synapses': brain.connectome.synapses,
                  'populations': {name: len(indices) for name, indices in brain.connectome.populations.items()}},
        'neuron_model': brain.brain.neuron_model.to_dict(),
        'learning_config': brain.learner.config.to_dict(),
        'actor_config': brain.basal_ganglia.config.to_dict(),
        'critic_target': brain.basal_ganglia.config.critic_target,
        'arousal_config': brain.arousal.config.to_dict(),
        'working_memory': brain.working_memory.to_dict(),
        'associative_memory': brain.hippocampus.to_dict(),
        'memory_key_scope': 'raw external observation; not the working trace',
        'aliased_fork_observations': [first.tolist(), second.tolist()],
        'source': source, 'one_trip': snapshots, 'events': experiment.action_history,
        'checks': {'wait_preserves_graph_critic_memory_pending_and_eligibility': True,
                   'terminal_feedback_consumed_once': True, 'brief_fork_keys_alias': True},
        'scope': 'source inspection and one witnessed seed-7 sparse trip; not a new benchmark',
    }
    output = ROOT / 'notes/algorithm-inspection.json'
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'graph': result['graph'], 'actor': result['actor_config'],
                      'critic_target': result['critic_target'],
                      'steps': [{k: row[k] for k in ('world_tick', 'decision_id', 'actor_updates', 'waits',
                                                    'working_trace_norm', 'eligibility_norm')} for row in snapshots]},
                     ensure_ascii=False))
