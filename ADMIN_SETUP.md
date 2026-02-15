# Quick Admin Setup Guide

## Method 1: Using API Endpoint (Recommended)

1. Open your browser console (F12)
2. Run this code:

```javascript
fetch('/api/set-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        email: 'nadeemalikalhoro310@gmail.com',
        secret: 'secret'  // From ADMIN_SECRET in .env.local
    })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

3. Check the console output - should see: `{ success: true, message: "User ... is now an admin" }`

4. Refresh the page and navigate to `/admin`

---

## Method 2: Using Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/lxyyugiwagokeatmedaf/sql

2. Run this SQL:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'nadeemalikalhoro310@gmail.com';
```

3. Verify:

```sql
SELECT email, role, coins FROM users 
WHERE email = 'nadeemalikalhoro310@gmail.com';
```

---

## About the Coins Issue

The code is set to give **3 coins** for new signups (both in `route.js` and `auth-helpers.js`).

**Possible causes for getting 2 coins:**
1. Database has a different default value (check with SQL in `fix-admin-and-coins.sql`)
2. User was created before the 3-coin update was deployed
3. Database trigger is overriding the value

**To fix existing users:**
Run the full `fix-admin-and-coins.sql` script in Supabase to diagnose and fix.
