import pytest
from brain import OrionAssistant

@pytest.fixture
def assistant():
    # Mocking integrations to avoid real connections during tests
    import unittest.mock as mock
    with mock.patch('integrations.iot_manager.IoTManager.connect'), \
         mock.patch('integrations.google_assistant.GoogleAssistantIntegrator._authenticate'):
        return OrionAssistant()

def test_classify_intent(assistant):
    assert assistant._classify_intent("quero ver um vídeo no youtube") == "media_video"
    assert assistant._classify_intent("tocar música animada") == "media_music"
    assert assistant._classify_intent("ligue a luz") == "iot_control"
    assert assistant._classify_intent("status do robô") == "ros2_robot"
    assert assistant._classify_intent("coisas aleatórias") == "unknown"

def test_media_rules_youtube_priority(assistant):
    # Test YouTube priority for music
    res = assistant.process_with_google_enhancement("tocar coldplay")
    assert res["platform"] == "YouTube"
    assert "https://www.youtube.com/results?search_query=coldplay" in res["url"]

    # Test YouTube priority for video
    res = assistant.process_with_google_enhancement("ver clipe do luan santana")
    assert res["platform"] == "YouTube"
    assert "luan+santana" in res["url"]

def test_media_rules_explicit_platform(assistant):
    # If Spotify is mentioned, it should NOT return a YouTube action from _check_media_rules
    # (Currently brain.py returns None for _check_media_rules if spotify is in query,
    # then proceeds to direct actions or fallback)
    res = assistant._check_media_rules("tocar spotify", "media_music")
    assert res is None

def test_get_status(assistant):
    status = assistant.get_status()
    assert status["online"] is True
    assert status["version"] == "3.0.0"
    assert "active_integrations" in status
    assert "intent_patterns" in status
