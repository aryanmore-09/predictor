import pytest
from app.ml.predict import get_risk_level, get_grade_band, get_pass_probability, get_recommendations


def test_get_risk_level():
    assert get_risk_level(0.70) == "high"
    assert get_risk_level(0.45) == "medium"
    assert get_risk_level(0.20) == "low"


def test_get_grade_band():
    assert get_grade_band(85.0) == "A"
    assert get_grade_band(65.0) == "B"
    assert get_grade_band(55.0) == "C"
    assert get_grade_band(42.0) == "D"
    assert get_grade_band(30.0) == "F"


def test_get_pass_probability():
    prob_high = get_pass_probability(80.0)
    prob_low = get_pass_probability(30.0)
    assert 0.0 <= prob_high <= 1.0
    assert 0.0 <= prob_low <= 1.0
    assert prob_high > prob_low


def test_get_recommendations():
    features = {
        "attendance_percentage": 60.0,
        "avg_marks": 40.0,
        "stress_score": 5,
    }
    recs = get_recommendations(features, "high")
    assert len(recs) > 0
    assert any("attendance" in r.lower() for r in recs)
