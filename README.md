# UOP Academic Portal — Student & Course Registration System

A full-stack university academic portal built with **Node.js**, **Express**, **MongoDB (Mongoose)**, **Firebase Google OAuth 2.0**, **JSON Web Tokens (JWT)**, and **EJS** with a responsive modern UI.

## Key Features

- **Unified Authentication (Google OAuth 2.0 + JWT + MongoDB)**:
  - One-click **Sign in with Google** powered by Firebase Authentication and verified on the server via `firebase-admin`.
  - Automatic synchronization between Firebase/Google accounts and MongoDB `User` documents.
  - Session management secured with signed **JWT (JSON Web Tokens)**.
- **Course Catalog & Real-Time Search**:
  - Browse university courses grouped by subject with live client-side search filtering.
  - Automatic database seeding of university courses when launched on a fresh MongoDB instance.
- **Section Enrollment & Personal Timetable**:
  - Inspect individual lecture sections, instructors, and schedules (`startTime` – `endTime`).
  - One-click course enrollment and removal synced directly with MongoDB.
- **Student Academic Profile Dashboard**:
  - Displays student credentials, verification status, GPA progress, credit hour metrics, and active semester timetable.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose ODM
- **Authentication & Security**: Firebase Admin SDK, Firebase Client Auth (Google OAuth 2.0), JSON Web Tokens (`jsonwebtoken`), `express-session`
- **Frontend**: EJS Templates, Bootstrap 5.3, Bootstrap Icons, Custom Modern CSS

## Getting Started Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```env
   PORT=8880
   MONGO_URI=mongodb://localhost:27017/students
   SESSION_SECRET=your_session_secret_here
   JWT_SECRET=your_jwt_secret_key_here
   ```
   *(Optional)* For server-side Firebase Admin strict verification, place your Firebase `serviceAccountKey.json` in the project root (automatically ignored by `.gitignore`).

3. **Run the Application**:
   ```bash
   npm start
   ```
   Open `http://localhost:8880` in your browser.
