from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class PredictionResponse(BaseModel):
    student_id: int
    student_name: str
    student_code: str
    risk_level: str
    dropout_probability: float
    predicted_grade_band: Optional[str]
    pass_probability: Optional[float]
    predicted_score: Optional[float]
    top_factors: Optional[List[dict]]
    model_version: Optional[str]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class BatchPredictionRequest(BaseModel):
    student_ids: List[int]

class ModelMetrics(BaseModel):
    algorithm: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: Optional[List[List[int]]]

class ModelComparisonResponse(BaseModel):
    models: List[ModelMetrics]
    best_model: str
    feature_importance: Optional[List[dict]]

class TrainRequest(BaseModel):
    force_retrain: bool = False

class TrainResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_version: str
    metrics: ModelMetrics
    training_samples: int


class SimulationRequest(BaseModel):
    student_id: Optional[int] = None
    attendance_percentage: Optional[float] = None
    avg_marks: Optional[float] = None
    assignment_submission_rate: Optional[float] = None
    study_hours: Optional[float] = None
    stress_score: Optional[float] = None
    motivation_score: Optional[float] = None


class SimulationResult(BaseModel):
    dropout_probability: float
    risk_level: str
    grade_band: str
    pass_probability: Optional[float] = None
    predicted_score: Optional[float] = None


class SimulationResponse(BaseModel):
    student_id: int
    original: SimulationResult
    simulated: SimulationResult
    base_features: Optional[dict] = None
    applied_overrides: Optional[dict] = None


class PredictionHistoryItem(BaseModel):
    id: int
    student_id: int
    risk_level: str
    dropout_probability: float
    predicted_grade_band: Optional[str] = None
    pass_probability: Optional[float] = None
    predicted_score: Optional[float] = None
    created_at: Optional[str] = None
