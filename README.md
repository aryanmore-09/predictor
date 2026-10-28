# Student Academic Performance & Dropout Risk Predictor
### MIT School of Computing — Department of Computer Science & Engineering

An early intervention and retention intelligence platform that predicts student academic outcomes, identifies dropout risk tiers early, dispatches proactive alerts, and delivers actionable faculty mentoring workflows.

---

## 🏛️ System Architecture

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 ORM, SQLite database, Pydantic v2 schemas.
- **Machine Learning**: Scikit-Learn training pipeline comparing 4 algorithms (Logistic Regression, SVM, Random Forest, Gradient Boosting) with ROC-AUC model selection, StandardScaler feature scaling, and explainable top contributing factors.
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS v4, Lucide icons, React Router v6, Axios, Zustand auth store.
- **Testing**: Pytest test suite covering preprocessing, predictions, and auth/API endpoints.

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Administrator** | `admin@mit.edu` | `Admin@123` | Full institutional management, model registry, retraining & data uploads |
| **Faculty Mentor** | `prof.sharma@mit.edu` | `Faculty@123` | Class risk overview, student directory, mentoring messages & counselor referrals |
| **Faculty Mentor** | `prof.desai@mit.edu` | `Faculty@123` | Class risk overview & student directory |
| **Student** | `student1@mit.edu` | `Student@123` | Personal standing, risk tier, grade band, alerts, self-survey & recommendations |
| **Student** | `student2@mit.edu` | `Student@123` | Student portal (through student5) |

---

## 🚀 Running the Project Locally

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m data.seed       # Populates 520 students, demo users, trains ML models
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API Docs: `http://localhost:8000/api/docs`

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
- App UI: `http://localhost:5173`

### Run Pytest Test Suite
```bash
cd backend
python -m pytest
```

---

## 🐳 Running via Docker Compose
```bash
docker-compose up --build
```
