from pydantic import BaseModel
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

    class Config:
        from_attributes = True
        protected_namespaces = ()

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
    status: str
    model_version: str
    metrics: ModelMetrics
    training_samples: int
