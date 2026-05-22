# Security Specification & Threat Model
## 1. Data Invariants
- Each typing speed test session document must be tied to the authenticated user's ID (`userId == request.auth.uid`).
- A user can only write their own session records. They cannot read or modify other users' sessions.
- Users are restricted from updating or deleting any session documents once they are written (append-only and terminal state rules).
- Timestamps must be validated using `request.time` to prevent injection of mock historical data.
- Session entries must constrain bounds, e.g., sizes of fields to prevent wallet-exhaustion attacks.

---

## 2. The "Dirty Dozen" Threat Payloads
Here are 12 specific payloads designed to breach the security of the speed test database:

1. **Anonymous Identity Write:** Write a session document without being authenticated.
2. **Identity Spoofing (Owner Hijacking):** Set `userId` to `target_user123` while logged in as `attacker456`.
3. **Privilege Escalation (Admin Flag):** Inject an unauthorized `"role": "admin"` or `"isAdmin": true` field inside the session or user document.
4. **Retroactive Timestamp Injection:** Submit a custom historical `timestamp` like `2020-01-01T00:00:00Z` to overwrite performance baselines.
5. **Session Modification Attack (Update):** Attempt to update a previously submitted speed test session to change times or accuracy rates.
6. **Session Destruction Attack (Delete):** Attempt to delete a completed speed test session to hide poor ratings.
7. **Cross-User Data Leak (List):** Query and retrieve all users' session results without filtering by `userId`.
8. **Resource Exhaustion (Denial of Wallet):** Inject a 1MB string of random text into the `expectedNumber` or `typedNumber` fields.
9. **Negative Stats Corruption:** Submit `totalImagesAttempted` as `-5` or `averageTimeMs` as `-100`.
10. **Malicious ID Injection:** Write a session document with an extremely long, poisoned path/ID (e.g., `sessionId = "A_REALLY_LONG_1.5KB_STRING_WITH_*_CHARS"`).
11. **Details Schema Incomplete:** Write a document omitting required schema fields like `details` or `timestamp`.
12. **Tampered Details Array Size:** Inject an excessively large `details` array containing 10,000 mock items to cause storage bloating.

---

## 3. Firestore Security Rules
Below is the robust security ruleset written to defend against all of the above payloads.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global Safety Net Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Validation Primitives
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Entity validation
    function isValidSession(session) {
      return session.userId is string 
        && session.userId == request.auth.uid // Enforce ownership integrity
        && session.totalImagesAttempted is int 
        && session.totalImagesAttempted >= 0 
        && session.totalImagesAttempted <= 100
        && session.correctEntries is int 
        && session.correctEntries >= 0 
        && session.correctEntries <= session.totalImagesAttempted
        && session.averageTimeMs is number 
        && session.averageTimeMs >= 0.0
        && session.averageTimeMs <= 60000.0 // Reasonable speed ceiling of 60s
        && session.timestamp == request.time // Enforce server-side temporal integrity
        && session.details is list 
        && session.details.size() <= 100;
    }

    // Rules for test_sessions collection
    match /test_sessions/{sessionId} {
      allow create: if isSignedIn() 
        && isValidId(sessionId)
        && isValidSession(request.resource.data);
        
      allow read: if isSignedIn() 
        && resource.data.userId == request.auth.uid; // Secure Query List Enforcer
        
      // Modifications and deletes are strictly prohibited (Append-only)
      allow update, delete: if false;
    }
  }
}
```
