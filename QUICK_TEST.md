# 🎵 Teacher-Student Testing: Quick Start

## ✅ Database is Ready

Your database has been seeded with:
- **1 Teacher**: `teacher@demo.com` (Teacher Code: **704922**)
- **5 Students** linked to the teacher:
  - `alex@demo.com` (Trumpet, 12-day streak)
  - `jordan@demo.com` (Alto Sax, 5-day streak)
  - `sam@demo.com` (Piano, 28-day streak - top performer!)
  - `taylor@demo.com` (Drums - needs practice)
  - `casey@demo.com` (Trombone, 3-day streak)

## 🚀 Quick Test Flow (5 minutes)

### 1. **Login as Teacher**
- Email: `teacher@demo.com`
- Go to **Teacher Dashboard**
- You should see all 5 students with their stats

### 2. **View Student Details**
- Click on any student (e.g., Alex)
- See their:
  - Practice streak
  - Weekly progress
  - Recent practice sessions

### 3. **Send a Note**
- In the student detail modal, scroll to **Notes**
- Type: "Great practice session! Keep it up! 🎵"
- Click **Send Note**
- Note appears in conversation

### 4. **Login as Student & Receive Note**
- Logout (Ctrl+C or menu)
- Login as: `alex@demo.com`
- Go to **Dashboard**
- Look for **Messages** or **Notes** indicator
- Click to see teacher's message

## 🔧 Start the App

From the workspace root:

```bash
# Option 1: Using start.sh (one command does it all)
./start.sh

# Option 2: Manual startup (two terminals)
# Terminal 1 - Backend
cd backend && python main.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Then visit: **http://localhost:5173**

## 🧪 Testing Checklist

Teacher view:
- [ ] Can see Teacher Code (704922)
- [ ] Can see all 5 students listed
- [ ] Can click student to view details
- [ ] Can see student's practice sessions
- [ ] Can send notes to students

Student view:
- [ ] Can see they have a teacher (Dr. Maria Santos)
- [ ] Can receive/view notes from teacher
- [ ] Notes show timestamp & sender name
- [ ] Can mark notes as read

## 📊 API Endpoints Being Tested

```
GET  /api/teachers/{teacher_id}/students
GET  /api/teachers/{teacher_id}/students/{student_id}/summary
GET  /api/teachers/{teacher_id}/students/{student_id}/activity
POST /api/notes
GET  /api/notes/...
```

## 🐛 Troubleshooting

**"Cannot find students" in teacher dashboard?**
- Verify in browser DevTools (F12) that the API response includes student data
- Check backend logs for errors

**"Cannot send note"?**
- Check browser console for error messages
- Verify note text is not empty
- Check backend logs

**Still "failing to fetch"?**
- Make sure backend is running: `python main.py` in backend folder
- Check that port 8000 is available
- Verify CORS is enabled (check main.py)

## 📝 Full Testing Guide

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed scenarios and edge cases.

---

**Happy Testing! 🎸🎹🥁**
