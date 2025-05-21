# Epochr

Native Windows Kanban board-based todo list app built with Electron.

## Features
- **Kanban Board**: Organize tasks into Tasks, Doing, and Done columns.
- **Task Management**: Add, edit, delete, and drag-and-drop tasks between sections.
- **Tags**: Create and assign colored tags to tasks for easy filtering and organization.
- **Priority Levels**: Set task priority (Normal, Low, High) with color-coded pills.
- **Board Files**: Save and load boards as `.epchr` files for easy sharing and backup.
- **Linked Boards**: Link tasks to other board files for multi-board navigation.
- **Context Menus**: Right-click for quick board and task actions.
- **Witty AI Remark Bar**: Motivational (and sarcastic) remarks based on your board's state.
- **Minimal UI**: Clean, distraction-free interface with custom theming.
- **No Cloud, No Account**: All data is local, private, and portable.

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Git](https://git-scm.com/) (for cloning the repository)

### Steps
1. **Clone the repository:**
   ```sh
   git clone <your-repo-url> epochr-build
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

## File Format
- Boards are saved as `.epchr` files (JSON format).
- Each board contains tasks and tags.

## License
MIT

---

*Epochr is designed for privacy, speed, and simplicity. No accounts, no cloud, just your boards.*
