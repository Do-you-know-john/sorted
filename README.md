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
- Shared household shopping list organised by **categories** (primary grouping) and **labels** (coloured dot, secondary grouping)
- Within each category, items are automatically sub-grouped by label; sub-groups can be reordered via drag-and-drop
- Dragging an item into a different label sub-group reassigns the item's label; dropping it outside any labelled group removes the label
- Dragging or adding an item that would create a duplicate (same name, same label, same category — case-insensitive) merges quantities instead
- Bought items move to a virtual "Bought" section at the bottom and disappear after 24 h; dragging a bought item back marks it as not bought
- **Shopping templates**: save a named list of items (with quantity and optional label) and apply it to any category in one tap; applying also merges with existing items

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
│       │   ├── shopping/     # Shopping list with drag-and-drop and templates
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
│   │   ├── shopping.ts       # Shopping items, categories, labels, templates
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

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **EAS CLI** (for building only) — `npm install -g eas-cli`
- A **Firebase project** with the following services enabled:
  - Firestore Database
  - Authentication (Email/Password provider)
  - Cloud Messaging (FCM)
  - Storage (only needed for custom profile photo upload)

> You do **not** need to install `expo-cli` globally. All Expo commands are run via `npx expo`.

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

Open `.env` and fill in your Firebase project credentials. Find them in the Firebase Console under **Project Settings → Your apps → SDK setup and configuration**:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### 3 — Firestore rules & indexes

```bash
firebase deploy --only firestore
```

### 4 — Cloud Functions

```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### 5 — Run in development

```bash
npx expo start
```

- Press **`i`** to open in the iOS Simulator, **`a`** for the Android Emulator.
- Or scan the QR code with the **Expo Go** app on a physical device (iOS: use the Camera app; Android: open Expo Go directly).

> **Note:** Local push notifications (morning summary, pre-event reminders) require a physical device. They work in Expo Go on real hardware. Remote push notifications (FCM) require a development or production build via EAS.

### 6 — Build with EAS

```bash
# iOS simulator build (no Apple Developer account needed)
eas build -p ios --profile simulator

# iOS device build (requires Apple Developer account)
eas build -p ios --profile development

# Android APK
eas build -p android --profile development
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
  priority: 'normal' | 'urgent'
  completedAt: Timestamp | null
  completedBy: string | null
  createdBy: string
  recurrence?: { type: 'daily' | 'weekly' | 'monthly', days?, dayOfMonth? }

events/{eventId}
  householdId, title, description?, location?
  startDate: Timestamp
  endDate: Timestamp
  allDay: boolean
  color: string
  visibility: 'private' | 'household' | 'contacts' | 'custom'
  visibleToHouseholds: string[]
  visibleToUsers: string[]
  viewerIds: string[]
  blockerIds: string[]
  assignedTo: string[]
  authorId: string

shoppingCategories/{categoryId}
  householdId, name
  sortOrder: number

shoppingLabels/{labelId}
  householdId, name, color
  sortOrder: number

shoppingItems/{itemId}
  householdId, name
  quantity: number
  categoryId: string | null
  labelId: string | null
  labelSortOrder: number        // sort position within its label sub-group
  bought: boolean
  boughtAt: Timestamp | null
  createdBy: string

shoppingTemplates/{templateId}
  householdId, name, createdBy
  items: [{ name, quantity, labelId? }]

shoppingHistory/{householdId}
  names: string[]               // autocomplete history for item names
```

---

## Licence

Private — all rights reserved.
