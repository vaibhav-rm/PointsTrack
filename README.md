# 🏆 PointsTrack System Overview

PointsTrack is a comprehensive, dual-platform ecosystem designed to gamify, manage, and track student engagement across college clubs and events. By leveraging a unified Firebase backend, the system seamlessly connects student attendees on mobile devices with event organizers operating on a powerful web dashboard.

---

## 🏛 Ecosystem Architecture

The mono-workspace is divided into two primary sub-projects:

1. **`PointsTrack` (Mobile Student App)** 📱
2. **`pointstrack-admin` (Web Organizer Dashboard)** 💻

Both applications synchronize in real-time using a shared **Firebase (Firestore + Authentication)** backend, ensuring that when an organizer creates an event or awards points on the web, students instantly see those updates on their phones.

---

## 📱 1. PointsTrack (Mobile App)

The mobile application is the primary interface for **Students**. It allows them to discover events, track their awarded activity points, and manage their digital certificates.

### 🛠 Tech Stack
- **Framework**: React Native / Expo
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation (Native Stack & Bottom Tabs)
- **Backend/Auth**: Firebase v12
- **Data Visualization**: React Native Chart Kit

### ✨ Key Features
- **Event Discovery Feed**: View upcoming college-internal activities as well as "Open to All" external events.
- **Activity Points Wallet**: A gamified dashboard showing accumulated points from attended events.
- **QR Check-in**: Streamlined digital attendance tracking (implicitly assumed based on standard engagement flows).
- **Profile Management**: Track personal college, club affiliations, and engagement history.

---

## 💻 2. pointstrack-admin (Web Dashboard)

The administrative web panel is the control center for **Event Organizers** and **Club Managers**. It provides a sleek, dark-themed interface to broadcast events and analyze attendance data.

### 🛠 Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `lucide-react` for iconography
- **Animations**: Framer Motion
- **UI Components**: Radix UI primitives (Dialogs, Toasts, Dropdowns)
- **Backend/Auth**: Firebase v12

### ✨ Key Features
- **Landing Page**: A stunning, modern landing page with 3D scroll-linked smartphone mockups showcasing the mobile app's capabilities to prospective colleges.
- **Event Broadcasting**: A comprehensive form to create new events, define Expected Capacity, assign **Activity Points**, and toggle whether the event is restricted to internal students or "Open to other colleges".
- **Real-time Analytics Dashboard**: Live metrics tracking Total Check-ins, College-Only vs Open events, and total Points distributed.
- **Attendee Management**: A live-updating roster of students who have registered for or successfully checked into the organizer's hosted events.

---

## 🗄️ Database Schema (Firestore Architecture)

The system relies on NoSQL collections structured for fast, real-time querying:

1. **`organizers`**: Stores club/manager profiles (linked to Auth UIDs) including their `college` and `clubName`.
2. **`upcoming_events`**: Stores the broadcasted events. Key fields include:
   - `organizerId` (UID of the creator)
   - `openToAll` (Boolean flag for inter-college visibility)
   - `points` (Number of activity points awarded)
   - `capacity`, `location`, `date`, `title`.
3. **`attendees`**: Tracks individual student event registrations and check-ins. Key fields include:
   - `organizerId` (To map back to the club's dashboard)
   - `status` (e.g., 'checked-in', 'pending')
   - `checkInTimestamp` (For sorting real-time feeds).

---

## 🚀 Getting Started

To run the system locally, you will need to start both development servers.

### Prerequisites
- Node.js environment
- Firebase project credentials configured in a `.env.local` file in both directories.

### Running the Web Admin (Port 3000)
```bash
cd pointstrack-admin
npm install
npm run dev
```

### Running the Mobile App (Expo Metro Bundler)
```bash
cd PointsTrack
npm install
npm start
# Press 'a' to open on Android emulator, or 'i' for iOS simulator.
```
