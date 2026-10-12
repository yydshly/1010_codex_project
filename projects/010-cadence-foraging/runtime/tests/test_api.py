import json
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler


@pytest.fixture(scope="module")
def endpoint():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    server.server_close()
    thread.join()


def post(endpoint, path, body):
    request = Request(endpoint + path, data=json.dumps(body).encode(),
                      headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def test_api_feedback_move_export_data_and_immediate_duplicate_retry(endpoint):
    session = post(endpoint, "/api/sessions", {"seed": 7})
    route = f"/api/sessions/{session['session']}"
    request = {"count": 8, "request_id": "integration-one"}
    result = post(endpoint, route + "/step", request)
    duplicate = post(endpoint, route + "/step", request)
    assert result == duplicate
    assert result["tick"] == 8
    moved = post(endpoint, route + "/move", {"target": 2, "request_id": "integration-move"})
    assert moved["agents"] == result["agents"]
    assert moved["target"] == 2
    assert moved["history"] == result["history"]
    following = post(endpoint, route + "/step", {"count": 1, "request_id": "integration-two"})
    assert following["history"][-1]["target"] == 2
    for key in following["agents"]:
        assert following["history"][-1]["hits"][key] == int(following["history"][-1]["actions"][key] == 2)
    assert following["provenance"]["cadence_version"] == "0.80.0"


@pytest.mark.parametrize("body", [{"seed": True}, {"seed": -1}, {"phase_length": 0}])
def test_invalid_session_input_returns_a_client_error(endpoint, body):
    with pytest.raises(HTTPError) as error:
        post(endpoint, "/api/sessions", body)
    assert error.value.code == 400


def test_missing_session_does_not_substitute_a_fake_engine(endpoint):
    with pytest.raises(HTTPError) as error:
        post(endpoint, "/api/sessions/00000000-0000-0000-0000-000000000000/step", {"count": 1, "request_id": "absent"})
    assert error.value.code == 404


def test_route_api_keeps_delayed_outcome_and_queued_move_order(endpoint):
    session = post(endpoint, '/api/sessions', {'scenario': 'route', 'seed': 7, 'reward_mode': 'waypoints'})
    path = f"/api/sessions/{session['session']}"
    assert session['provenance']['decisions_per_trip'] == 2
    assert session['algorithm']['schema'] == 'cadence-algorithm-frames/1'
    assert [f['kind'] for f in session['algorithm']['frames']] == ['input', 'neural', 'choice', 'eligibility']
    request = {'count': 1, 'request_id': 'route-one'}
    first = post(endpoint, path + '/step', request)
    assert post(endpoint, path + '/step', request) == first
    assert first['tick'] == 1 and first['episodes'] == 0
    moved = post(endpoint, path + '/move', {'target': 1, 'request_id': 'route-move'})
    assert moved['queued_target'] == 1 and moved['mapping'] == [0, 3]
    assert moved['agents'] == first['agents']
    completed = post(endpoint, path + '/step', {'count': 3, 'request_id': 'route-complete'})
    assert completed['episodes'] == 1
    assert completed['agents']['cadence']['details']['waits'] == 2
    assert len([f for f in completed['algorithm']['frames'] if f['kind'] == 'wait']) == 2
    assert any(f['kind'] == 'update' and len(f['weights_after']) == 450 for f in completed['algorithm']['frames'])
    assert completed['history'][0]['target'] == [0, 3][completed['history'][0]['cue']]
    following = post(endpoint, path + '/step', {'count': 1, 'request_id': 'route-following'})
    assert following['mapping'] == [1, 3] and following['queued_target'] is None


@pytest.mark.parametrize('body', [
    {'scenario': 'invalid'}, {'scenario': 'route', 'phase_length': 41},
    {'scenario': 'route', 'cue_mode': 'invalid'}, {'scenario': 'route', 'reward_mode': 'invalid'},
])
def test_invalid_route_session_is_a_client_error(endpoint, body):
    with pytest.raises(HTTPError) as error:
        post(endpoint, '/api/sessions', body)
    assert error.value.code == 400


def test_fishing_api_real_train_and_duplicate_retry(endpoint):
    initial = post(endpoint, '/api/fishing', {'seed': 7, 'mode': 'independent'})
    path = f"/api/fishing/{initial['session']}/train"
    request = {'count': 8, 'request_id': 'fish-one'}
    result = post(endpoint, path, request)
    assert result == post(endpoint, path, request)
    assert result['batches'] == 8 and result['updates'] > 0
    assert result['parameter_sha256'] != initial['parameter_sha256']
    assert result['provenance']['engine'] == 'real-cadence-TemporalPatchNet'
    with pytest.raises(HTTPError) as error:
        post(endpoint, path, {**request, 'count': 9})
    assert error.value.code == 400
    with pytest.raises(HTTPError) as error:
        post(endpoint, path, {'count': 0, 'request_id': 'invalid'})
    assert error.value.code == 400


@pytest.mark.parametrize('body', [{'seed': True}, {'seed': -1}, {'mode': 'oracle'}])
def test_fishing_invalid_input(endpoint, body):
    with pytest.raises(HTTPError) as error:
        post(endpoint, '/api/fishing', body)
    assert error.value.code == 400
