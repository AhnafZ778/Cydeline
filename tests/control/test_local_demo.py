"""Password-free role switching is an explicit local runner capability only."""
import pytest
import threading
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from services.range_runtime.api import create_control
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.common import digest
from services.range_runtime.target import create_target
from tests.control.test_live_control import TestAgent

@pytest.fixture
def demo(tmp_path):
    target = TestClient(create_target(tmp_path / 'target.db', 'test'), headers={'x-range-secret': 'test'})
    app = create_control(tmp_path / 'control.db', HttpTargetAdapter(target), TestAgent(), auto=False, local_demo=True, instructor_pin='normal-code')
    client = TestClient(app, base_url='http://127.0.0.1:5188', client=('127.0.0.1', 42000))
    yield app, client, target
    client.close(); target.close()

def test_switch_rotates_and_preserves_owner(demo):
    app, client, _ = demo
    identity = client.get('/api/session').json()
    assert identity['local_demo'] is True
    run = client.post('/api/runs', json={}).json()['run_id']
    old = client.cookies.get('cydeline_session')
    result = client.post('/api/session/demo', json={'role':'instructor'})
    assert result.status_code == 200
    assert result.json()['id'] == identity['id']
    assert result.json()['role'] == 'instructor'
    assert '_demo' not in result.json()
    assert client.cookies.get('cydeline_session') != old
    assert app.state.engine.store.get('sessions', digest(old))['expires'] == 0
    assert client.get('/api/instructor').status_code == 200
    assert client.post('/api/session/demo', json={'role':'learner'}).json()['id'] == identity['id']
    assert client.get('/api/instructor').status_code == 403
    assert client.get('/api/runs/'+run).status_code == 200
    assert client.get('/api/observer/runs/'+run).status_code == 403

@pytest.mark.parametrize('peer,host', [('192.0.2.2','127.0.0.1'), ('127.0.0.1','example.com'), ('127.0.0.1','127.0.0.1.attacker.test')])
def test_rejects_nonlocal_peer_or_host(demo,peer,host):
    app, _, _ = demo
    with TestClient(app, base_url='http://'+host, client=(peer,42001)) as c:
        assert c.get('/api/session').json()['local_demo'] is False
        assert c.post('/api/session/demo',json={'role':'instructor'},headers={'X-Forwarded-For':'127.0.0.1'}).status_code == 403

def test_origin_and_schema_validation(demo):
    _, c, _ = demo
    assert c.post('/api/session/demo',json={'role':'instructor'},headers={'Origin':'https://attacker.test'}).status_code == 403
    assert c.post('/api/session/demo',json={'role':'observer'}).status_code == 422
    assert c.post('/api/session/demo',json={'role':'instructor','id':'another'}).status_code == 422
    assert c.get('/api/instructor').status_code == 403

def test_default_disabled_and_normal_login_remains(demo,tmp_path):
    _, _, target = demo
    app = create_control(tmp_path/'normal.db',HttpTargetAdapter(target),TestAgent(),auto=False,instructor_pin='normal-code')
    with TestClient(app,base_url='http://127.0.0.1',client=('127.0.0.1',42000)) as c:
        assert c.get('/api/session').json()['local_demo'] is False
        assert c.post('/api/session/demo',json={'role':'instructor'}).status_code == 403
        assert c.post('/api/session',json={'code':'normal-code'}).json()['role'] == 'instructor'
        assert c.get('/api/instructor').status_code == 200

def test_persisted_demo_privilege_revoked_when_disabled(demo,tmp_path):
    app,c,target=demo
    c.post('/api/session/demo',json={'role':'instructor'})
    cookie=c.cookies.get('cydeline_session')
    restarted=create_control(tmp_path/'control.db',HttpTargetAdapter(target),TestAgent(),auto=False,local_demo=False)
    with TestClient(restarted,base_url='http://127.0.0.1',client=('127.0.0.1',42000)) as other:
        other.cookies.set('cydeline_session',cookie)
        assert other.get('/api/instructor').status_code==403
        assert other.get('/api/session').json()['role']=='learner'
        assert app.state.engine.store.get('sessions',digest(cookie))['expires']==0

def test_demo_privilege_revoked_with_nonlocal_host(demo):
    _,c,_=demo
    c.post('/api/session/demo',json={'role':'instructor'})
    assert c.get('/api/instructor',headers={'host':'remote.example'}).status_code==403
    assert c.get('/api/session').json()['role']=='learner'

def test_observer_cannot_elevate(demo):
    app,c,_=demo
    c.post('/api/session/demo',json={'role':'instructor'})
    run=c.post('/api/runs',json={}).json()['run_id']
    grant=c.post('/api/instructor/runs/'+run+'/observers',json={'name':'Observer'}).json()
    with TestClient(app,base_url='http://127.0.0.1',client=('127.0.0.1',42002)) as o:
        assert o.post('/api/session',json={'code':grant['access_code']}).status_code==200
        assert o.post('/api/session/demo',json={'role':'instructor'}).status_code==403

@pytest.mark.parametrize('role', ['instructor', 'learner'])
def test_inflight_response_cannot_restore_rotated_cookie(demo, role):
    """A slow request must not reissue the credential invalidated by a role switch."""
    app, client, _ = demo
    if role == 'learner':
        assert client.post('/api/session/demo', json={'role': 'instructor'}).status_code == 200
    else:
        client.get('/api/session')
    old = client.cookies.get('cydeline_session')
    entered, release = threading.Event(), threading.Event()

    @app.get('/api/review-slow')
    def slow_request():
        entered.set()
        assert release.wait(timeout=5)
        return {'ok': True}

    with TestClient(app, base_url='http://127.0.0.1', client=('127.0.0.1', 42003)) as background:
        background.cookies.set('cydeline_session', old)
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending = executor.submit(background.get, '/api/review-slow')
            try:
                assert entered.wait(timeout=3)
                changed = client.post('/api/session/demo', json={'role': role})
                assert changed.status_code == 200
                assert changed.json()['role'] == role
                assert app.state.engine.store.get('sessions', digest(old))['expires'] == 0
            finally:
                release.set()
            assert pending.result(timeout=5).status_code == 401

    assert app.state.engine.store.get('sessions', digest(old))['expires'] == 0
    with TestClient(app, base_url='http://127.0.0.1', client=('127.0.0.1', 42004)) as replay:
        replay.cookies.set('cydeline_session', old)
        assert replay.get('/api/instructor').status_code == 403
    assert client.get('/api/instructor').status_code == (200 if role == 'instructor' else 403)
