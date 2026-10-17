# Crampo

**Beat the deadline rush.**

Crampo is an Android app for university students that turns a pasted class notice into a deadline in a few seconds, then reminds you before it is due. It understands how students actually write: *"ML CT on Sunday"*, *"dbms lab test 25 Oct"*, *"kal DSA 2 quiz"*, not just course codes.

> Screenshots: add 3 to 4 images here (the deadline list, the Add deadline sheet, a notice being read, a reminder notification).

## Download

[Download the Android APK](https://expo.dev/accounts/sameerr35/projects/crampo/builds/ee4c7be3-558d-4f9b-bba8-23ab8c2a2a58)

Open the link on an Android phone, tap **Install**, and allow installing apps from unknown sources if Android asks. The app updates itself when you reopen it.

## Why I built it

Class deadlines arrive as messages in group chats and screenshots. They get buried, and adding them to a calendar by hand is slower than just trusting your memory. Crampo makes capture fast enough to actually use: paste the notice, check the result, save.

## Features

- **Paste a notice, get a deadline.** Course, type (quiz, assignment, exam, presentation, project, lab), due date and details are filled in for you.
- **Reads English, Banglish and Bangla.** Handles dates like `Sunday`, `kal`, `porshu`, `আগামীকাল`, `25 Oct`, `12/11/2026` and Bangla digits.
- **Knows the course list.** Full names and short forms both work (`ML`, `DBMS`, `OS lab`, `database management system`, `CSE 3521`). Based on the UIU CSE course catalog.
- **Check before saving.** Anything ambiguous shows a "Check these" note instead of guessing silently.
- **Local reminders.** 8 PM the day before and 8 AM on the due day. Exams also get one 3 days before. They work offline.
- **Organised by type.** Tabs for quizzes, assignments, presentations and so on, with a red-margin "days left" column that circles what is urgent.
- **Private by design.** No account and no server. Everything stays on the phone.

## How the notice reader works

The reader is rule-based and runs entirely on the device (`src/extract.ts`). It works in this order:

1. **Course.** Matches the notice against a catalog of about 70 courses (`src/courses.ts`), each with full names, short forms and codes.
2. **Course words are masked out** so that "Project Management quiz" is read as a quiz, and the 2 in "DSA 2" is not read as a date.
3. **Date.** Patterns for explicit dates, weekdays, relative words in English and Banglish, and Bangla digits.
4. **Type.** The first assessment keyword in the notice wins.
5. **Details.** Things like `Quiz 2` or `ch 3-4`.

Some design decisions:

- **Ambiguity is shown, not hidden.** `dsa` or `calculus` could be more than one course, so Crampo picks the likely one and says so.
- **Short forms need context.** `se`, `os`, `ai` and `cn` are also ordinary words and letters. They only count when written in capitals or placed next to words like quiz, CT, lab or exam.
- **Reminders are scheduled on the phone,** so they do not depend on a server or an internet connection.

### Examples

| Notice | Result |
|---|---|
| `ML CT on Sunday` | Machine Learning, Quiz, next Sunday |
| `dbms lab test 25 Oct` | Database Management Systems, Lab, 25 Oct |
| `Project Management quiz on Sunday` | Project Management, Quiz, next Sunday |
| `os lab on Tuesday` | Operating Systems, Lab, next Tuesday |
| `dsa quiz tomorrow` | DSA I, Quiz, tomorrow, with a "Check these" note |

## Tech stack

- React Native with Expo, TypeScript
- `expo-notifications` for local reminders
- AsyncStorage for on-device storage
- EAS Build and EAS Update for APK builds and over-the-air updates

## Project structure

```
App.tsx              Screens, add sheet, tabs, list
src/types.ts         Deadline and type definitions
src/storage.ts       Saving and loading deadlines on the device
src/extract.ts       Notice reader (course, date, type, details)
src/courses.ts       Course catalog with names, short forms and codes
src/reminders.ts     Scheduling and cancelling reminders
```

## Run it locally

```bash
npm install
npx expo start --dev-client
```

Reminders do not run inside Expo Go. Use a development build:

```bash
eas build --profile development --platform android
```

To build an APK you can share:

```bash
eas build --profile preview --platform android
```

## Status and limitations

- Android only for now.
- Data lives on one phone. There is no sync or shared class yet.
- The reader is rule-based, so it can misread unusual wording. Misspelled course names (like "databse") are not matched yet.
- Some phone brands stop background apps aggressively, which can delay reminders.

## Evaluation

Accuracy on real class notices: **coming soon** (collecting and labelling real notices from classmates, with names removed).

## Roadmap

- [ ] Share a notice straight from WhatsApp or Messenger into Crampo
- [ ] Progress checkpoints per deadline, with a readiness score
- [ ] Shared class spaces
- [ ] Published accuracy numbers on a labelled set of real notices
- [ ] Fuzzy matching for misspelled course names
