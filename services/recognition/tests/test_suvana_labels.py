"""D-A36 overlay, immutable upstream labels and text-aware TTS caching."""
import ast
import json
import subprocess
import sys
import time
import types
from pathlib import Path
import pytest

SERVICE=Path(__file__).resolve().parents[1]
REPO=SERVICE.parents[1]
WEBAPP=SERVICE/'webapp'
sys.path.insert(0,str(WEBAPP))
from suvana_labels import load_sinhala_labels, tts_cache_name

EXPECTED={
 '100 meters':'මීටර් 100','50 meters':'මීටර් 50','ambaranawa':'අඹරනවා','andanawa':'අඬනවා',
 'bag eka':'බෑග් එක','nurse':'හෙදිය/නර්ස්','peenawa':'පේනවා','phone eka':'ෆෝන් එක',
 'pigana hodanawa':'පිඟාන හෝදනවා','randu karagannawa':'රණ්ඩු කරනවා','waadi wenawa':'වාඩි වෙනවා',
 'wamaata harenna':'වමට හැරෙන්න','wamata U turn eken harenna':'වමට යූ ටර්න් එකෙන් හැරෙන්න',
}

@pytest.mark.parametrize('relative',['webapp/data/sinhala_labels.json','data/processed/labels.npy'])
def test_original_labels_byte_identical_to_origin_main(relative):
    path=f'services/recognition/{relative}'
    expected=subprocess.check_output(['git','show',f'origin/main:{path}'],cwd=REPO)
    actual=(SERVICE/relative).read_bytes()
    # This existing Windows checkout predates the LF attributes and has CRLF
    # for JSON. Preserve it too: allow only the exact origin bytes in that EOL
    # representation, never parse/reserialize the protected data.
    checkout_expected=expected.replace(b'\n',b'\r\n') if relative.endswith('.json') and b'\r\n' in actual else expected
    assert actual==checkout_expected
    assert subprocess.check_output(['git','hash-object',path],cwd=REPO)==subprocess.check_output(['git','rev-parse',f'origin/main:{path}'],cwd=REPO)

def test_exact_keys_fields_and_no_other_label_changes():
    base=json.loads((WEBAPP/'data/sinhala_labels.json').read_text(encoding='utf-8'))
    overlay=json.loads((WEBAPP/'data/sinhala-corrections.json').read_text(encoding='utf-8'))
    assert overlay['_source']['decision']=='D-A36'
    assert {k for k in overlay if k!='_source'}==set(EXPECTED)
    assert set(EXPECTED)<=base.keys()
    effective=load_sinhala_labels()
    assert list(effective)==list(base)
    for label, entry in base.items():
        if label in EXPECTED:
            fields={'sinhala':EXPECTED[label],'speakText':'හෙදිය' if label=='nurse' else EXPECTED[label]}
            assert overlay[label]==fields
            assert effective[label]=={**entry,**fields}
        else: assert effective[label]==entry
    knowledge=json.loads((WEBAPP/'static/suvana-knowledge.json').read_text(encoding='utf-8'))
    shell=json.loads((REPO/'apps/shell/public/data/signs.json').read_text(encoding='utf-8'))
    for label, entry in effective.items():
        record=next(s for s in knowledge['signs'] if s['recognizeLabel']==label)
        compat=next(s for s in shell['signs'] if s['label']==label)
        for field in ['sinhala','speakText']:
            assert record[field]==compat[field]==entry[field]

def test_unknown_correction_is_rejected(tmp_path):
    bad=tmp_path/'bad.json';bad.write_text(json.dumps({'not a label':{'sinhala':'x','speakText':'x'}}))
    with pytest.raises(ValueError): load_sinhala_labels(corrections_path=bad)

def isolated_functions(path,names,namespace):
    """Execute actual route/cache functions without importing TensorFlow/model."""
    tree=ast.parse(path.read_text(encoding='utf-8'))
    functions=[node for node in tree.body if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and node.name in names]
    assert len(functions)==len(names)
    for node in functions: node.decorator_list=[]
    exec(compile(ast.Module(body=functions,type_ignores=[]),str(path),'exec'),namespace)
    return namespace

def test_every_corrected_cache_key_changes_and_cannot_collide():
    base=json.loads((WEBAPP/'data/sinhala_labels.json').read_text(encoding='utf-8'))
    labels=load_sinhala_labels()
    keys=[]
    for label in EXPECTED:
        entry=labels[label];old=base[label]
        key=tts_cache_name(label,entry['speakText'],entry['speakLang'])
        assert key!=tts_cache_name(label,old['speakText'],old['speakLang'])
        keys.append(key)
    assert len(set(keys))==13
    assert tts_cache_name('a b','text','si')!=tts_cache_name('a_b','text','si')
    assert tts_cache_name('a','text','si')!=tts_cache_name('a','text','en')

def test_server_speak_and_warmup_and_builder_use_overlay_and_same_cache(tmp_path,monkeypatch):
    labels=load_sinhala_labels();calls=[]
    class FakeTTS:
        def __init__(self,text,lang): self.text=text;calls.append((text,lang))
        def save(self,path): Path(path).write_bytes(self.text.encode('utf-8'))
    monkeypatch.setitem(sys.modules,'gtts',types.SimpleNamespace(gTTS=FakeTTS))
    monkeypatch.setattr(time,'sleep',lambda _:None)
    common={'tts_cache_name':tts_cache_name,'TTS_CACHE_DIR':tmp_path,'config':{'speech':{'language':'en'}},'sinhala_labels':{k:labels[k] for k in EXPECTED},'FileResponse':lambda path,**_:Path(path)}
    server=isolated_functions(WEBAPP/'server.py',['speak','_warm_tts_cache','get_labels'],{**common,'unique_labels':list(EXPECTED),'JSONResponse':lambda result:result})
    # Seed old cache files with poison: neither old label-only nor old text-key audio may be read.
    base=json.loads((WEBAPP/'data/sinhala_labels.json').read_text(encoding='utf-8'))
    for label in EXPECTED:
        old=base[label]
        (tmp_path/tts_cache_name(label,old['speakText'],old['speakLang'])).write_bytes(b'OLD')
    (tmp_path/'andanawa_si.mp3').write_bytes(b'OLD LABEL CACHE')
    server['_warm_tts_cache']()
    assert len(calls)==13
    for label in EXPECTED:
        result=server['speak'](label)
        assert result.read_bytes()==labels[label]['speakText'].encode('utf-8')
    assert len(calls)==13  # request route reuses the corrected warm cache
    assert {e['label']:e['sinhala'] for e in server['get_labels']()['labels']}==EXPECTED
    # Actual offline builder must also skip the same 13 newly warm files.
    builder=isolated_functions(WEBAPP/'build_tts_cache.py',['main'],{**common,'load_sinhala_labels':lambda _:common['sinhala_labels'],'LABELS_PATH':None,'DEFAULT_LANG':'en','time':time,'gTTS':FakeTTS,'sys':sys})
    builder['main']();assert len(calls)==13

def test_recognition_payload_and_runtime_packaging_preserve_overlay():
    source=(WEBAPP/'server.py').read_text(encoding='utf-8')
    tree=ast.parse(source)
    assigned=[node.value for node in ast.walk(tree) if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='sinhala_labels' for target in node.targets)]
    assert any(isinstance(node,ast.Call) and getattr(node.func,'id',None)=='load_sinhala_labels' for node in assigned)
    ws=next(node for node in tree.body if isinstance(node,ast.AsyncFunctionDef) and node.name=='ws_recognize')
    gesture=next(node for node in ast.walk(ws) if isinstance(node,ast.Assign) and any(isinstance(t,ast.Subscript) and isinstance(t.slice,ast.Constant) and t.slice.value=='gestureSinhala' for t in node.targets))
    for label in EXPECTED:
        value=eval(compile(ast.Expression(gesture.value),'gestureSinhala','eval'),{'sinhala_labels':load_sinhala_labels(),'gesture_label':label})
        assert value==EXPECTED[label]
    assert 'COPY --chown=user webapp/data/sinhala-corrections.json webapp/data/sinhala-corrections.json' in (SERVICE/'Dockerfile').read_text()
