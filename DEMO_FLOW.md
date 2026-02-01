# 🎵 Complete Demo Flow Guide

## Demo Accounts Setup

### Teacher Account
- **Email:** `teacher@demo.com`
- **Teacher Code (for students):** `203064`
- **Role:** Teacher (displays Students tab)
- **Initial State:** No students yet, blank slate

### Student Accounts (Unlinked - Ready to join)
- **alex@demo.com** (Trumpet)
- **jordan@demo.com** (Alto Sax)
- **sam@demo.com** (Piano)
- **taylor@demo.com** (Drums)
- **casey@demo.com** (Trombone)

---

## Tab 1: Teacher Demo Flow

### Step 1: Teacher Registration & Login
1. Go to http://localhost:5173 in **Tab 1**
2. Click "Create Account"
3. Fill in:
   - Name: Dr. Maria Santos
   - Email: teacher@demo.com
   - Instrument: Saxophone
   - Role: **Teacher** ✅
   - Click Create

### Step 2: View Teacher Dashboard
- You should see: "Your Students (0)" - empty slate
- Display the **Teacher Code: 203064**
- Show this code is what students use to join

### Step 3: Create a Task for Ensemble
- Go to **Tasks** tab
- Click "Create Task"
- Title: "Blues Scale Practice"
- Category: Technique
- Difficulty: 3
- Save ✅

### Step 4: Wait for Student (Use Tab 2)
- In Tab 2, student will register with the teacher code
- Student should appear in teacher dashboard
- Shows real-time sync!

### Step 5: Send Note to Student
- Click on the student in your Students list
- Scroll to Notes section
- Type: "Hi Alex! Great first practice session! Keep it up! 🎵"
- Send ✅

### Step 6: View Student Response
- Student will send a note back (from Tab 2)
- Refresh or watch notes appear in real-time

---

## Tab 2: Student Demo Flow

### Step 1: Student Registration with Teacher Code
1. Go to http://localhost:5173 in **Tab 2**
2. Click "Create Account"
3. Fill in:
   - Name: Alex Rivera
   - Email: alex@demo.com
   - Instrument: Trumpet
   - Role: **Student** ✅
   - **Teacher Code: 203064** (paste teacher code from Tab 1)
   - Click Create

### Step 2: See Student Dashboard
- No tasks yet (teacher hasn't assigned any)
- Empty Dashboard

### Step 3: Wait for Teacher to Create Task
- Teacher creates task in Tab 1
- Should appear on your Tasks tab

### Step 4: Complete a Task
- Go to Tasks tab
- Click "Blues Scale Practice" (created by teacher)
- Mark as "Ready" or log a practice session
- Click complete ✅

### Step 5: Send Note to Teacher
- Go to Dashboard
- Look for **Messages** or **Notes** indicator
- Send message: "Thanks for the motivation! Just finished the blues scales 🎶"

### Step 6: View Teacher's Note
- Wait for teacher to send note (from Tab 1)
- Notes appear in real-time

---

## Tab 3: Personal Account Demo (Optional)

### Step 1: Personal Registration
1. Go to http://localhost:5173 in **Tab 3**
2. Click "Create Account"
3. Fill in:
   - Name: Jordan Smith
   - Email: jordan@personal.com
   - Instrument: Piano
   - Role: **Personal** ✅
   - Click Create

### Step 2: Features Available
- ✅ Create personal tasks
- ✅ Create calendar events
- ✅ Create rehearsals
- ✅ Track practice sessions
- ❌ No teacher/ensemble features

### Step 3: Create Rehearsal
- Go to Calendar
- Click "Add Rehearsal"
- Date: Tomorrow
- Time: 7:00 PM
- Location: Band Room
- Click Create ✅
- Should appear in "Upcoming Rehearsals"

### Step 4: Create Personal Task
- Go to Tasks
- Create task: "Scales Practice"
- Practice and complete it

---

## Key Features to Demonstrate

### ✅ Already Working
- [x] Teacher/Student/Personal registration
- [x] Teacher dashboard with student list
- [x] Teacher-student messaging (notes)
- [x] Task creation and completion
- [x] Rehearsal creation
- [x] Student joining teacher (with teacher code)
- [x] Practice session logging
- [x] Streak tracking

### 🔴 Still Need to Implement
- [ ] Ensemble code joining (separate from teacher code)
- [ ] Show 3 most recent upcoming rehearsals
- [ ] Better personal vs ensemble separation

---

## Demo Script (5-10 minutes)

1. **Intro (30s)**
   - "This is PracticeBeats - an app for music students to track practice with teacher feedback"

2. **Teacher Setup (2 min)**
   - Show teacher registration
   - Display teacher code
   - Create a task
   
3. **Student Signup (1 min)**
   - Show student entering teacher code
   - Instant connection to teacher

4. **Messaging (2 min)**
   - Teacher sends note
   - Student receives and replies
   - Show real-time sync

5. **Task Management (2 min)**
   - Student completes task
   - Teacher sees update
   - Gamification elements (XP, streak)

6. **Personal Account (1 min)**
   - Show solo musician features
   - Create rehearsal
   - Create events

---

## Troubleshooting

### "Student doesn't appear in teacher dashboard"
- Verify student entered correct teacher code (203064)
- Check browser console for errors (F12)
- Refresh teacher dashboard

### "Note isn't appearing"
- Make sure both are registered with correct emails
- Check they're in teacher-student relationship
- Try refreshing page

### "Rehearsal not showing"
- Rehearsal must be in the future
- Check it appears in Calendar view
- In Dashboard, upcoming rehearsals show in Rehearsals card

### "Can't find the teacher code"
- Teacher code displays on teacher dashboard after login
- Or check top of TeacherDashboard component

---

## Next Steps After Demo

1. Implement ensemble code feature (separate 8-digit code)
2. Show 3 most recent rehearsals prominently
3. Add notifications for:
   - New students joining
   - Incoming notes
   - Task completions
4. Add progress tracking visualization
