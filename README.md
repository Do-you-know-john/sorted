# Sorted – Household Planner

A cross-platform mobile app (iOS & Android) for managing shared household to-dos. Built with React Native (Expo) and Firebase.

---

## Features

- **Multi-household support** — create or join households via a 6-digit invite code; switch between households on the home screen
- **To-Do management** — create, assign, and track tasks per household; filter by assignee, completion status, or due date
- **Smart home screen** — shows your due/overdue tasks and a "recently completed" section (tasks finished within the last 24 h)
- **Just-completed status** — completed tasks stay visible for 24 h before disappearing from the default view
- **Push notifications** — notified when a task assigned to you is overdue or marked as done (via Firebase Cloud Messaging)
- **Avatar indicators** — each task card shows who it's assigned to; unassigned tasks are clearly marked
- **Household deletion** — admin-only, two-step confirmation (member/todo count warning + name confirmation)
- **Profile management** — change display name, password, and app language (DE / EN)
- **Avatars** — choose from 12 preset emoji avatars or upload a custom photo; shown on task cards and the profile button
- **Localisation** — German and English, auto-detected from the device

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native · Expo SDK 54 · Expo Router v6 |
| State | Zustand |
| Backend | Firebase Firestore (real-time) · Firebase Auth · Cloud Functions v2 |
| Push | Firebase Cloud Messaging (FCM HTTP v1) |
| Localisation | i18next · react-i18next · expo-localization |
| Date handling | date-fns |

---

## Project Structure

```
sorted/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout – auth guard & routing
│   ├── (auth)/             # Login & registration screens
│   └── (app)/              # Authenticated app
│       ├── _layout.tsx     # Tab navigator
│       ├── (home)/         # Home screen
│       ├── todos/          # To-Do list & create screens
│       ├── household/      # Household settings & setup
│       └── profile.tsx     # Profile modal
├── src/
│   ├── components/         # Shared UI components (TodoCard, AvatarButton, …)
│   ├── components/ui/      # Design-system primitives (Button, TextInput)
│   ├── hooks/              # Custom React hooks (useTodos, useAllHouseholds, …)
│   ├── services/           # Firebase service layer (auth, todos, households)
│   ├── stores/             # Zustand stores (authStore, householdStore)
│   ├── types/              # TypeScript types
│   ├── constants/          # Colours, spacing, app constants
│   └── i18n/               # Translation files (de, en)
├── functions/              # Firebase Cloud Functions (Node 20 / TypeScript)
│   └── src/index.ts        # Scheduled overdue checks · onTodoCompleted · onHouseholdDeleted
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite index definitions
└── .env.example            # Required environment variables (copy to .env)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo`)
- A Firebase project with **Firestore**, **Authentication (Email/Password)**, and **Cloud Messaging** enabled

### 1 — Clone & install

```bash
git clone https://github.com/Do-you-know-john/sorted.git
cd sorted
npm install
```

### 2 — Environment variables

```bash
cp .env.example .env
```

Fill in your Firebase project values from the Firebase Console → Project Settings → Your apps:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 3 — Firestore & security rules

```bash
firebase deploy --only firestore
```

### 4 — Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 5 — Run

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app, or press `i` / `a` for a simulator.

---

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `checkOverdueTodos` | Every 60 min (scheduled) | Sends push notifications for overdue tasks |
| `onTodoCompleted` | Firestore write | Notifies members when a task is marked done |
| `onHouseholdDeleted` | Firestore delete | Cleans up household references in all member profiles |

---

## Firestore Data Model

```
users/{uid}
  uid, email, displayName, fcmToken
  householdIds: string[]
  activeHouseholdId: string | null
  avatarId: string | null      // preset emoji avatar ID
  photoURL: string | null      // Firebase Storage URL for custom photo

households/{householdId}
  name, createdBy, inviteCode, inviteCodeExpiresAt
  members: { [uid]: { uid, displayName, email, role, joinedAt,
                      avatarId?, photoURL? } }  // denormalized for card rendering

todos/{todoId}
  householdId, title, description?
  assignedTo: string[]    // uids; empty = unassigned
  visibleTo: string[]     // uids; empty = visible to all members
  notifyOnComplete: string[]
  notifyOnOverdue: string[]
  dueDate: Timestamp | null
  status: 'pending' | 'completed'
  completedAt: Timestamp | null
  completedBy: string | null
  createdBy: string
```

---

## Licence

Private — all rights reserved.
