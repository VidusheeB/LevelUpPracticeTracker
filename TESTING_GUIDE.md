# Teacher-Student Interaction Testing Guide

## Quick Setup

1. **Start the backend:**
   ```bash
   cd backend
   python seed.py        # Load demo data (creates teachers and students)
   python main.py        # Start the server on http://localhost:8000
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev           # Runs on http://localhost:5173
   ```

---

## Testing Scenario: Teacher & Students Setup

### Step 1: Create a Teacher Account

1. Go to http://localhost:5173
2. Click "Create Account"
3. Fill in the form:
   - **Name:** Any teacher name (e.g., "Mr. Johnson")
   - **Email:** Any email (e.g., "teacher@demo.com")
   - **Instrument:** Any instrument
   - **Section:** Any section
   - **Role:** Select **"Teacher"**
   - Click "Create Account"
4. **Note:** Your teacher code will be displayed (e.g., "ABC123"). Copy this code.

### Step 2: Create Student Accounts (or use demo students)

**Option A: Use existing demo students**
- Login as demo students with these emails:
  - `alex@demo.com`
  - `jordan@demo.com`
  - `sam@demo.com`
  - `casey@demo.com`

**Option B: Create new student accounts**
1. Click "Create Account"
2. Fill in the form:
   - **Name:** Student name (e.g., "Emma Davis")
   - **Email:** Student email (e.g., "emma@demo.com")
   - **Instrument:** Any instrument
   - **Section:** Any section
   - **Role:** Select **"Student"**
   - **Teacher Code:** Paste the teacher code from Step 1
   - Click "Create Account"

### Step 3: Test Teacher Dashboard

1. **Login as teacher** (using email from Step 1)
2. Click on **"Teacher Dashboard"** in the navigation
3. You should see:
   - **Teacher Code Display:** Your unique 6-digit code at the top
   - **Students List:** All students linked to you with their stats:
     - Practice streak
     - Weekly minutes completed
     - Level/XP
     - Current readiness

### Step 4: Test Student Details & Communication

1. **In Teacher Dashboard**, click on any student card
2. A modal should open showing:
   - **Student Summary:** Their stats (streak, points, level)
   - **Activity Log:** Their recent practice sessions
   - **Notes Section:** Conversation history with the student

### Step 5: Send Notes to Student

1. In the student detail modal, scroll down to the **Notes** section
2. Type a message in the text box (e.g., "Great practice today! Keep up the streak!")
3. Click **"Send Note"**
4. The note should appear in the conversation thread with timestamp

### Step 6: Test Student Receiving Notes

1. **Logout from teacher account**
2. **Login as a student** linked to that teacher
3. Click on **"Dashboard"**
4. In the top right, look for **"Notes"** indicator or notification
5. Click on **"Messages"** or **"Notes"** to see:
   - Teacher's message
   - Mark as read option
   - Reply capability (if implemented)

---

## Demo Student Credentials

Pre-seeded students (run `python seed.py` first):

| Name | Email | Instrument | Section | Streak | Level |
|------|-------|-----------|---------|--------|-------|
| Alex Rivera | alex@demo.com | Trumpet | brass | 12 | 9 |
| Jordan Kim | jordan@demo.com | Alto Sax | woodwind | 5 | 5 |
| Sam Chen | sam@demo.com | Piano | rhythm | 28 | 13 |
| Taylor Johnson | taylor@demo.com | Drums | rhythm | 0 | 2 |
| Casey Williams | casey@demo.com | Trombone | brass | 3 | 4 |

**Note:** These demo students are NOT linked to any teacher initially. Create a teacher and use their code to link them, OR create new student accounts with the teacher code.

---

## Testing Checklist

### Teacher Functions
- [ ] Teacher can see their unique code
- [ ] Teacher can see all linked students
- [ ] Teacher can click on a student to view details
- [ ] Teacher can see student's practice sessions
- [ ] Teacher can send notes to student
- [ ] Notes appear with timestamp
- [ ] Teacher can view conversation history

### Student Functions
- [ ] Student can join teacher using code during registration
- [ ] Student can see they have a teacher
- [ ] Student can view notes from teacher
- [ ] Student can see notification about unread notes
- [ ] Student can mark notes as read

### Data Verification
- [ ] API endpoints return correct data:
  - `GET /api/teachers/{teacher_id}/students` → list of students
  - `GET /api/teachers/{teacher_id}/students/{student_id}/summary` → student summary
  - `GET /api/teachers/{teacher_id}/students/{student_id}/activity` → practice sessions
  - `POST /api/notes` → create note
  - `GET /api/notes/...` → retrieve notes

---

## Troubleshooting

### Students not appearing in teacher dashboard
- Verify students were created with the teacher's code
- Check database: `SELECT teacher_id FROM users WHERE id = <student_id>`

### Notes not sending
- Check browser console for errors (F12)
- Verify teacher_id and student_id are correct
- Check backend logs for API errors

### Cannot see teacher code
- Make sure you're logged in as a teacher (role = "teacher")
- Check the UserRole enum in models.py

### "Failing to fetch" errors
- Ensure backend is running: `python main.py` in backend directory
- Verify API_BASE in `frontend/src/utils/api.js` is set to `http://localhost:8000/api`
- Check browser console (F12) → Network tab for failed requests

---

## Manual API Testing (Postman/cURL)

### Get all students for a teacher:
```bash
curl http://localhost:8000/api/teachers/1/students
```

### Get student summary:
```bash
curl http://localhost:8000/api/teachers/1/students/2/summary
```

### Send a note:
```bash
curl -X POST http://localhost:8000/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "from_user_id": 1,
    "to_user_id": 2,
    "message": "Great work!",
    "is_teacher_note": true
  }'
```

---

## Next Steps After Testing

1. **Verify all endpoints work** - Use the testing checklist above
2. **Test edge cases** - Empty students list, long messages, special characters
3. **Check notifications** - Are unread note counts accurate?
4. **Test updates** - After marking as read, does UI update?
5. **Performance** - Load 50+ students and check performance
