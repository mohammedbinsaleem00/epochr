# Epochr

Epochr is a native Windows to-do list app with a clean, board-based interface for organizing tasks. It supports tags, priorities, and multi-board linking, all stored locally in portable .epchr files—no cloud, no accounts. Designed for speed, privacy, and simplicity, Epochr helps you stay organized with a minimal UI and smart, contextual feedback.

## Features
- **Task Management**: Add, edit, delete, and drag-and-drop tasks between sections.
- **Tags**: Create and assign colored tags to tasks for easy filtering and organization.
- **Priority Levels**: Set task priority (Normal, Low, High) with color-coded pills.
- **Board Files**: Save and load boards as `.epchr` files for easy sharing and backup.
- **Linked Boards**: Link tasks to other board files for multi-board navigation.
- **Remark Bar**: Motivational (and sarcastic) remarks based on your board's state.
- **Minimal UI**: Clean, distraction-free interface with custom theming.
- **No Cloud, No Account**: All data is local, private, and portable.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Git](https://git-scm.com/) (for cloning the repository)

### Steps
1. **Clone the repository:**
   ```sh
   git clone https://github.com/mohammedbinsaleem00/epochr.git
   cd epochr-build
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Run the app in development mode:**
   ```sh
   npm start
   ```
   The app will launch in a native window.

4. **Build a Windows installer (optional):**
   ```sh
   npm run build
   ```
   The installer will be created in the `dist/` folder.

## Usage
- Right-click anywhere for board actions (New, Load, Save, Tags, Filter).
- Click the `+` button to add a new task.
- Drag tasks between columns.
- Use the status bar to see the current board file.
- Link tasks to other boards for advanced workflows.
- Boards are saved as locally `.epchr` files (JSON format).


---

*Epochr is designed for privacy, speed, and simplicity. No accounts, no cloud, just your boards.*
