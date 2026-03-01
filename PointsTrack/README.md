# PointsTrack Mobile App

PointsTrack is a mobile application built with **React Native** and **Expo** that allows students to track events, earn points, and manage their college club activities. This is the client-facing application that pairs with the **PointsTrack Admin Dashboard** (a Next.js web platform for organizers).

## 🚀 Tech Stack

- **Framework:** React Native + Expo (`expo` SDK 54)
- **Styling:** NativeWind (Tailwind CSS for React Native) & `react-native-reanimated`
- **Navigation:** React Navigation (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- **Backend / Database:** Firebase (`firebase` SDK - Auth, Firestore, Storage)
- **Forms & State:** `react-hook-form`, `@react-native-async-storage/async-storage`
- **UI Components:** Expo Vector Icons, Safe Area Context, DateTimePicker
- **Language:** TypeScript

## 📂 Project Structure

- `/src`: Contains the main application source code.
  - `/src/firebase/config.ts`: Firebase client initialization.
  - `/src/screens`: UI screens (Home, Events, Profile, etc.).
  - `/src/navigation`: App routing configurations.
  - `/src/components`: Reusable UI components.
- `app.json` / `package.json`: Expo and project configuration files.
- `tailwind.config.js`: NativeWind stylistic themes.

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js and npm installed. You also need the [Expo Go](https://expo.dev/client) app installed on your iOS or Android device to preview the app.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd PointsTrack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:

```bash
npm start
```

This will open an Expo Developer Tools dashboard in your terminal and browser. You can then:
- Scan the QR code using the Expo Go app on your physical device.
- Press `a` to open the app on an Android Emulator.
- Press `i` to open the app on an iOS Simulator.
- Press `w` to run the app in a web browser.

## 🔗 Related Projects
- **PointsTrack Admin:** The Next.js dashboard located in `../pointstrack-admin` for organizers to create and publish events that are fetched by this mobile app.
