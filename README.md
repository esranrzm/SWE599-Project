# Community Information Management Platform

A structured platform that helps communities collect, organize, and share information efficiently. Instead of relying on scattered chats, emails, or messages where important details get lost, this system brings everyone's contributions together in one organized place.

## 🎯 Project Overview

When communities unite for shared goals—like rebuilding after disasters, planning local activities, or coordinating support—they need more than just conversation. They need a clear and organized way to express what they can offer, what they need, and how they can contribute. This platform makes that process simpler, more efficient, and more meaningful for everyone involved.

### Why Information Management Matters

Traditional communication platforms (group chats, social media, emails) are built for talking, not organizing. As communities grow, valuable information gets buried under hundreds of messages. Coordinators waste time scrolling through conversations instead of focusing on real work. This platform solves these problems by providing structured, searchable, and scalable information management.

## ✨ Key Features

### Structured Data Collection
- Community organizers define exactly what type of information to collect
- Predefined formats ensure consistency across all contributions
- Automatic grouping and organization of related offers
- Easy filtering, sorting, and searching capabilities

### Scalability
- Built to grow with communities of any size
- Efficient handling of large datasets
- Fast search and filtering even with hundreds of contributions
- Organized structure that remains usable as participation increases

### Community Management
- Create and manage multiple communities
- Role-based access control (Admin, Organizer, Member)
- User profiles and authentication
- Contribution tracking and organization

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **JWT** - Authentication and authorization
- **Pydantic** - Data validation
- **Pytest** - Testing framework

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **CSS3** - Styling

## 📁 Project Structure

```
SWE599-Project/
├── backend/
│   ├── app/
│   │   ├── routers/        # API endpoints (auth, communities, admin)
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── database.py      # Database configuration
│   ├── main.py             # FastAPI application entry point
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Test suite
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   │   ├── auth/       # Login, Registration
    │   │   ├── community/  # Community management
    │   │   └── admin/      # Admin dashboard
    │   └── services/       # API service layer
    └── package.json        # Node dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.13+
- Node.js 18+
- PostgreSQL database

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Set up environment variables (create a `.env` file):
```env
DATABASE_URL=postgresql://user:password@localhost/dbname
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173
```

6. Run the application:
```bash
uvicorn main:app --reload
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` and the API at `http://localhost:8000`.

## 🧪 Testing

Run the backend test suite:
```bash
cd backend
cd tests
python run_all_tests.py
```
