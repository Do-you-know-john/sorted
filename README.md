# Sorted – Household Planner

A cross-platform mobile app (iOS & Android) for managing shared household life. Built with React Native (Expo) and Firebase.

---

## Features

### To-Dos
- Create, assign, and track tasks per household
- Filter by assignee, completion status, or due date
- Due date windows (from / until), recurring tasks (daily / weekly / monthly), and urgent flag
- Just-completed tasks stay visible for 24 h before disappearing from the default view

### Calendar
- Shared household calendar with personal and household-wide events
- Month view with dot indicators per day; tap a day to see the event list
- Conflict detection: days with overlapping events show a `!` badge in month view; conflicting event cards show a `⚠` warning
- Conflict warning when creating a new event if a participant is already busy
- Pre-fills the selected calendar date when opening the create-event screen
- Resets to today's date whenever you switch to the calendar tab

### Shopping List
- Shared household shopping list with categories
- Bought items move to a virtual "Bought" section at the bottom and disappear after 24 h
- Drag-and-drop items between categories via a drag handle
- Dragging a bought item back to a regular category marks it as not bought

### Push Notifications (local, fires even when app is closed)
- **Morning summary** — daily push notification at a configurable time (default 07:30) listing all events for the day
- **Pre-event reminder** — push notification N minutes before each event starts (default 30 min, configurable)
- Both settings are configurable per user in the Profile screen

### Home Screen
- Shows due/overdue to-dos and a "recently completed" section
- Household switcher with overdue/due-today badge counts per household

### Multi-Household
- Create or join households via a 6-digit invite code
- Switch between households; each has its own members, to-dos, calendar, and shopping list

### Profile & Settings
- Change display name, password, and app language (DE / EN)
- Choose from 12 preset emoji avatars, upload a custom photo, or pick an avatar background colour
- Appearance: system / light / dark theme
- Configure notification time and pre-event reminder duration

### Avatars
- Avatar shown on to-do cards, event cards, and the profile button
- Household members' avatars shown on shared content

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native · Expo SDK 54 · Expo Router v6 |
| State | Zustand |
| Backend | Firebase Firestore (real-time) · Firebase Auth · Cloud Functions v2 · Firebase Storage |
| Push (remote) | Firebase Cloud Messaging (FCM HTTP v1) |
| Push (local) | expo-notifications — scheduled local notifications |
| Localisation | i18next · react-i18next · expo-localization |
| Date handling | date-fns |
| Build | EAS Build (Expo Application Services) |

---

## Project Structure

```
sorted/
├── app/                      # Expo Router file-based routes
│   ├── _layout.tsx           # Root layout – auth guard & routing
│   ├── (auth)/               # Login & registration screens
│   └── (app)/                # Authenticated app
│       ├── _layout.tsx       # Notification scheduler + push registration
│       ├── (tabs)/
│       │   ├── (home)/       # Home screen
│       │   ├── calendar/     # Calendar (month view + day event list)
│       │   ├── shopping/     # Shopping list with drag-and-drop
│       │   └── todos/        # To-Do list & create screens
│       ├── events/           # Create / edit event screens
│       ├── household/        # Household settings & setup
│       └── profile.tsx       # Profile modal
├── src/
│   ├── components/           # Shared UI components (EventCard, TodoCard, Avatar, …)
│   ├── components/ui/        # Design-system primitives (Button, TextInput)
│   ├── hooks/                # Custom React hooks
│   │   ├── useNotificationScheduler.ts  # Debounced local notification scheduler
│   │   └── …
│   ├── services/             # Firebase service layer
│   │   ├── notifications.ts  # scheduleAllNotifications + registerForPushNotifications
│   │   └── …
│   ├── stores/               # Zustand stores (authStore, householdStore, eventsStore)
│   ├── types/                # TypeScript types
│   ├── constants/            # Colours, spacing, app constants
│   └── i18n/                 # Translation files (de, en)
├── functions/                # Firebase Cloud Functions (Node 20 / TypeScript)
│   └── src/index.ts          # checkOverdueTodos · onTodoCompleted · onHouseholdDeleted
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Composite index definitions
├── eas.json                  # EAS Build profiles (simulator, development, production)
└── .env.example              # Required environment variables (copy to .env)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- A Firebase project with **Firestore**, **Authentication (Email/Password)**, **Cloud Messaging**, and **Storage** enabled

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

### 5 — Run (development)

```bash
npx expo start --go
```

Scan the QR code with the **Expo Go** app (iOS: use the camera app; Android: use Expo Go directly), or press `i` / `a` for a local simulator.

> **Note:** Local push notifications require a physical device. In Expo Go on a real device, the morning summary and pre-event reminders will work. Remote push notifications (FCM) require a development build.

### 6 — Build (EAS)

```bash
# iOS simulator build (no Apple Developer account required)
eas build -p ios --profile simulator

# iOS development build for a real device (requires Apple Developer account)
eas build -p ios --profile development
```

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
  avatarId: string | null                 // preset emoji avatar ID
  photoURL: string | null                 // Firebase Storage URL for custom photo
  avatarColor: string | null              // avatar background colour ID
  themePreference: 'system' | 'light' | 'dark'
  notificationMorningHour: number         // default 7
  notificationMorningMinute: number       // default 30
  notificationPreEventMinutes: number     // default 30

households/{householdId}
  name, createdBy, inviteCode, inviteCodeExpiresAt
  members: { [uid]: { uid, displayName, email, role, joinedAt,
                      avatarId?, photoURL?, avatarColor? } }

todos/{todoId}
  householdId, title, description?
  assignedTo: string[]        // uids; empty = unassigned
  visibleTo: string[]         // uids; empty = visible to all members
  notifyOnComplete: string[]
  notifyOnOverdue: string[]
  dueFrom: Timestamp | null
  dueDate: Timestamp | null
  status: 'pending' | 'completed'
  completedAt: Timestamp | null
  completedBy: string | null
  createdBy: string
  isUrgent: boolean
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'

events/{eventId}
  householdId, title, description?, location?
  startDate: Timestamp
  endDate: Timestamp
  allDay: boolean
  color: string
  visibility: 'private' | 'household' | 'contacts' | 'custom'
  assignedTo: string[]
  createdBy: string
  isBlocker: boolean

shoppingItems/{itemId}
  householdId, name, categoryId
  bought: boolean
  boughtAt: Timestamp | null
  createdBy: string
  order: number

shoppingCategories/{categoryId}
  householdId, name, order
```

---

## Licence

Private — all rights reserved.
