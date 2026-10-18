"""Fixed product questions, provenance and optional model boundary; no inference."""
import json
import sys
from pathlib import Path
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'webapp'))
import assistant
import suvana_assistant as engine
CASES=json.loads((Path(__file__).parent/'assistant-questions.json').read_text(encoding='utf-8'))
CASES+=json.loads((Path(__file__).parent/'assistant-held-out.json').read_text(encoding='utf-8'))

@pytest.mark.parametrize('case',CASES,ids=[c['question'] for c in CASES])
def test_shared_questions(case):
    result=assistant.local_answer(case['question'])
    assert result['intent']==case['intent']
    for text in case.get('contains',[]): assert text in result['text']
    if case.get('card'): assert result['cards'][0]['label']==case['card']
    if case.get('url'): assert any(link['url']==case['url'] for link in result['links'])
    if case.get('noCards'): assert not result['cards']
    if case.get('hasCards'): assert result['cards']
    if 'recognize' in case: assert bool(result['cards'][0]['recognizeLabel'])==case['recognize']
    if case.get('refused'): assert result['refused']
    for phrase in engine.POLICY['forbiddenPhrases']: assert phrase not in json.dumps(result,ensure_ascii=False).lower()
    assert 'No verified English meaning' not in result['text']
    if result['intent']=='unknown':
        assert result['chips']==engine.POLICY['fallbackChips'] and result['links']
        assert len(result['cards'])<=3

def test_no_repeated_or_sign_form_tips():
    for sign in engine.SIGNS:
        assert engine.card(sign)['tips']==[]
        for phrase in engine.POLICY['forbiddenPhrases']: assert phrase not in json.dumps(engine.card(sign)).lower()

def test_declined_requests_do_not_call_a_model(monkeypatch):
    def forbidden(*args,**kwargs): raise AssertionError('must not call model')
    monkeypatch.setattr(assistant,'_resolve_model',forbidden)
    monkeypatch.setattr(assistant,'_call_llm',forbidden)
    for question in ['describe the handshape for A','translate my name is Daham to SSL']:
        result=assistant.assistant_chat(assistant.ChatRequest(message=question,provider='gemini',apiKey='synthetic-key'))
        assert result['refused'] and result['engine']=='local'

def test_optional_model_cannot_add_facts_or_signing_instructions(monkeypatch):
    monkeypatch.setattr(assistant,'_resolve_model',lambda *args:('test-model',None))
    def model(provider,key,model,system,history,message):
        assert 'APPROVED_ANSWER' in system and 'Never translate into SSL' in system
        assert history==[]
        return 'move your hand to your chest'
    monkeypatch.setattr(assistant,'_call_llm',model)
    question='how do I sign hello'
    result=assistant.assistant_chat(assistant.ChatRequest(message=question,provider='gemini',apiKey='synthetic-key'))
    assert result['text']==assistant.local_answer(question)['text']
    assert result['links']==assistant.local_answer(question)['links']

def test_local_is_default_and_metadata_is_union(monkeypatch):
    monkeypatch.setattr(assistant,'_call_llm',lambda *args:pytest.fail('local default must not call model'))
    assert assistant.assistant_chat(assistant.ChatRequest(message='how do I sign hello'))['engine']=='local'
    assert assistant.assistant_meta()['signCount']==530

def test_reverse_lookup_and_category_priority():
    assert engine.local_answer('teach me greetings')['intent']=='browse'
    assert engine.local_answer('teach me numbers')['intent']=='browse'
    for title in ['First numbers','Months 1']:
        unit=next(u for u in engine.KNOWLEDGE['units'] if u['title']==title)
        assert [c['label'] for c in engine.local_answer(f'teach me {title}')['cards']]==unit['signs']
    assert engine.local_answer('what is the sinhala for sit')['cards'][0]['sinhala']=='වාඩි වෙනවා'
    assert engine.local_answer('sign for eat')['cards'][0]['label']=='EAT'
    assert engine.local_answer('what is the sinhala for eat')['cards'][0]['label']=='KANAWA'
    assert engine.local_answer('අඬනවා')['cards'][0]['label']=='ANDANAWA'
    for word in ['mother','water','head','wa','MOTHER']:
        assert engine.local_answer(f'what is the sinhala for {word}')['intent']=='unknown'
