# PointsTrack Identity & Onboarding V2 — API Documentation

**Version:** 2.0  
**Base URL:** `/`

---

## 1. Authentication Endpoints

### `POST /auth/register/organizer`
Creates an account, club profile, and owner membership without synthesizing a fake student profile.

**Request Body:**
```json
{
  "email": "organizer@example.com",
  "password": "secretpassword",
  "fullName": "Priya Sharma",
  "clubName": "Robotics Club",
  "college": "R.V. COLLEGE OF ENGINEERING",
  "collegeId": "uuid-optional",
  "bio": "Building cool robots"
}
```

**Response (201 Created):**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "token...",
  "user": { "id": "uuid", "email": "organizer@example.com", "role": "organizer" },
  "profile": null,
  "club": { "id": "uuid", "clubName": "Robotics Club", "college": "R.V. COLLEGE OF ENGINEERING" },
  "clubs": [{ "id": "uuid", "name": "Robotics Club", "role": "owner" }],
  "memberships": [{ "clubId": "uuid", "role": "owner", "status": "active" }]
}
```

---

### `POST /auth/register/student`
Creates a student account, student profile, and student academic record snapshot.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "secretpassword",
  "name": "Rahul Kumar",
  "phone": "9876543210",
  "college": "R.V. COLLEGE OF ENGINEERING",
  "collegeCode": "1RV",
  "region": "Bangalore",
  "usn": "1RV22CS001",
  "year": 2,
  "semester": 4,
  "lateralEntry": false
}
```

---

### `GET /auth/me`
Returns current user session, student profile (if any), legacy club profile (if any), active V2 clubs list, and club memberships.

---

## 2. Colleges Endpoints

### `GET /colleges`
Search and filter normalized college directory.

**Query Parameters:**
- `search`: Name, short name, or VTU code query (e.g. `RVCE`, `1RV`).
- `region`: Region filter (`Bangalore`, `Mysuru`, `Belagavi`, `Kalaburgi`).

---

### `GET /colleges/:id`
Fetch single college by UUID or VTU code.

---

## 3. Clubs Endpoints

### `POST /clubs`
Authenticated user creates a new club. Creates `clubs` row, `club_memberships` (owner role), and default `club_branding`.

### `GET /clubs`
Public directory of active clubs.

### `GET /clubs/my-memberships`
List all clubs the authenticated caller belongs to.

### `GET /clubs/:id`
Fetch single club details, branding, social links, gallery, and announcements.

### `PATCH /clubs/:id`
Update club details. Requires `club.update` permission (`owner` or `admin` role).

### `GET /clubs/:id/members`
List members of a club. Requires `club.view` permission.

### `POST /clubs/:id/members/invite`
Invite/add member to club. Requires `club.manage_members` permission (`owner` or `admin`).

### `PATCH /clubs/:id/branding`
Update club branding (colors, logo, cover style). Requires `club.manage_branding` permission.
