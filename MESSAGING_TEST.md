# 🎵 Testing Teacher-Student Messaging

## ✅ All Data Persists

- **Database**: SQLite (persistent local file)
- **Authentication**: Saved in browser localStorage
- **Messages**: Stored in database and synced in real-time

## 🧪 How to Test Messaging Between Two Accounts

### Option 1: **Using Private/Incognito Windows** (Recommended - Easiest)

1. **Window 1 - Teacher:**
   - Open new Private/Incognito window (Cmd+Shift+N on Mac)
   - Go to http://localhost:5173
   - Login as: `teacher@demo.com`
   - Go to **"Students"** tab
   - Click on any student (e.g., "Alex Rivera")
   - You see their details and activity

2. **Window 2 - Student:**
   - Open another Private/Incognito window (Cmd+Shift+N on Mac)
   - Go to http://localhost:5173
   - Login as: `alex@demo.com`
   - Stay on the **Dashboard**

3. **Send Message from Teacher:**
   - In Window 1 (teacher), scroll down in the student modal
   - Find the **"Notes"** section
   - Type: "Great practice today! Keep up the streak! 🎵"
   - Click **"Send Note"**
   - You should see it appear in the conversation

4. **View Message on Student Side:**
   - In Window 2 (student), look for **notifications** or **messages indicator**
   - Or go to **"Team"** tab or look for a **"Messages"** section
   - Click to view notes from teacher
   - You should see the message you just sent!

### Option 2: **Using Different Browsers**

- Chrome: Teacher account
- Firefox: Student account
- Safari: Different student account
- (Same steps as Option 1 above)

### Option 3: **Using Browser DevTools (Advanced)**

If you want to stay in same window:
1. Open Developer Tools (F12)
2. Open Console tab
3. Run: `localStorage.clear()` - clears current login
4. Refresh page and login as different user
5. Right-click → Inspect on student modal, keep it open
6. Clear localStorage again and login as teacher
7. Send note from teacher, then back to student to see it

---

## 🔍 What to Test

### Teacher Perspective:
- [ ] Can see all 5 students listed with stats
- [ ] Can click on a student to open details modal
- [ ] Can see student's recent practice sessions
- [ ] Can type and send a note
- [ ] Note appears in conversation thread
- [ ] Note shows timestamp

### Student Perspective:
- [ ] Can see they have a teacher (Dr. Maria Santos)
- [ ] Can access notes/messages section
- [ ] Receives teacher's notes
- [ ] Can see the message content and timestamp
- [ ] Can mark as read (if implemented)
- [ ] Can reply to notes (if implemented)

### Data Persistence:
- [ ] After sending a note, refresh the page
- [ ] Message should still be visible (not lost)
- [ ] Close and reopen the app
- [ ] Message persists (stored in database)

---

## 📱 Quick Account Reference

**Teacher:**
- Email: `teacher@demo.com`
- Name: Dr. Maria Santos
- Role: Teacher
- Teacher Code: 704922

**Students** (all linked to teacher):
| Email | Name | Instrument | Streak | Level |
|-------|------|-----------|--------|-------|
| alex@demo.com | Alex Rivera | Trumpet | 12 | 9 |
| jordan@demo.com | Jordan Kim | Alto Sax | 5 | 5 |
| sam@demo.com | Sam Chen | Piano | 28 | 13 |
| taylor@demo.com | Taylor Johnson | Drums | 0 | 2 |
| casey@demo.com | Casey Williams | Trombone | 3 | 4 |

---

## 🐛 Troubleshooting

### "Cannot see students in teacher dashboard"
- Verify you logged in as `teacher@demo.com`
- Check DevTools (F12) → Network tab to see if API call to `/api/teachers/1/students` succeeded
- Backend should return array of 5 students

### "Cannot send note"
- Make sure recipient exists: check student's ID matches
- Check browser console (F12 → Console) for error messages
- Verify teacher-student relationship exists in database

### "Cannot see note on student side"
- In student account, refresh the page
- Check for **Messages** tab or notification
- Go to Dashboard and look for **Notes** section
- If still not visible, check backend logs for errors

### "Backend won't start"
```bash
# Kill any existing process on port 8000
lsof -i :8000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Restart backend
cd backend
python main.py
```

### "Lost all my data"
- Data is saved in SQLite database
- If you ran `python seed.py` again, it clears and resets
- Check database file exists: `backend/practicebeats.db`

---

## 💡 Tips

- **Use Incognito/Private windows** - Easiest way to test multiple accounts
- **Keep Developer Tools open** (F12) to see any errors
- **Backend URL should be** `http://localhost:8000` (check CORS in api.js)
- **Data persists** even after closing browser (it's in the database)
- **Each browser tab/window has separate localStorage** - perfect for testing!

---

**Ready to test messaging? Open two incognito windows and give it a shot! 🎸**
