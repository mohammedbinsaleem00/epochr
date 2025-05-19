// Renderer process for Kanban board
// Will handle UI, drag-and-drop, and IPC for board file operations

// Placeholder for initial board data
let boardData = {
  tasks: [], // { id, title, desc, priority, tags, section }
  tags: []   // { name, color }
};

let filterState = {
  priorities: [],
  tags: []
};

const { ipcRenderer, remote } = require('electron');

function resetBoard() {
  boardData = { tasks: [], tags: [] };
  renderBoard();
}

function loadBoardFromData(data) {
  try {
    boardData = JSON.parse(data);
    renderBoard();
  } catch (e) {
    alert('Failed to load board: Invalid file format.');
  }
}

function saveBoard() {
  ipcRenderer.send('board:save', JSON.stringify(boardData));
}

function autosaveBoard() {
  saveBoard();
}

ipcRenderer.on('board:new', () => {
  resetBoard();
});
ipcRenderer.on('board:load', (event, data, filePath) => {
  if (filePath) window.currentFilePath = filePath;
  updateCurrentBoardPath(window.currentFilePath);
  loadBoardFromData(data);
});
ipcRenderer.on('board:requestSave', () => {
  saveBoard();
});
ipcRenderer.on('tags:open', () => {
  openTagsModal();
});
ipcRenderer.on('filter:open', () => {
  openFilterModal();
});
ipcRenderer.on('set-current-file', (event, filePath) => {
  window.currentFilePath = filePath;
  updateCurrentBoardPath(window.currentFilePath);
});

function updateCurrentBoardPath(path) {
  const el = document.getElementById('current-board-path');
  if (el) el.textContent = path || 'None';
}

function renderTaskTagsButtons(selectedTags = []) {
  const tagContainer = document.getElementById('task-tags-btns');
  tagContainer.innerHTML = '';
  boardData.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = tag.name;
    btn.style.background = tag.color || '#b2bec3';
    btn.setAttribute('data-value', tag.name);
    if (selectedTags.includes(tag.name)) btn.classList.add('selected');
    btn.onclick = () => {
      btn.classList.toggle('selected');
    };
    tagContainer.appendChild(btn);
  });
}

function getSelectedTaskTags() {
  return Array.from(document.querySelectorAll('#task-tags-btns .filter-btn.selected')).map(btn => btn.getAttribute('data-value'));
}

document.getElementById('new-tag-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const newTag = this.value.trim();
    if (!newTag) return;
    if (!boardData.tags.some(t => t.name === newTag)) {
      boardData.tags.push({ name: newTag, color: '#b2bec3' });
      autosaveBoard();
      renderTagsList();
    }
    renderTaskTagsButtons(getSelectedTaskTags().concat(newTag));
    this.value = '';
  }
});

function openTaskModal(editTask = null) {
  document.getElementById('task-modal').style.display = 'block';
  document.getElementById('modal-title').textContent = editTask ? 'Edit Task' : 'Add Task';
  document.getElementById('task-id').value = editTask ? editTask.id : '';
  document.getElementById('task-title').value = editTask ? editTask.title : '';
  document.getElementById('task-desc').value = editTask ? (editTask.desc || '') : '';
  document.getElementById('task-priority').value = editTask ? editTask.priority : 'normal';
  renderTaskTagsButtons(editTask ? (editTask.tags || []) : []);
  document.getElementById('new-tag-input').value = '';
  document.getElementById('task-section').value = editTask ? (editTask.section || 'tasks') : 'tasks';
  // Ensure the modal is interactive and focus the first input
  setTimeout(() => {
    document.getElementById('task-title').focus();
  }, 0);
}

function closeTaskModal() {
  document.getElementById('task-modal').style.display = 'none';
}

document.getElementById('add-task-btn').onclick = () => openTaskModal();
document.getElementById('close-modal').onclick = closeTaskModal;
window.onclick = function(event) {
  if (event.target === document.getElementById('task-modal')) closeTaskModal();
};

document.getElementById('task-form').onsubmit = function(e) {
  e.preventDefault();
  const id = document.getElementById('task-id').value || Date.now().toString();
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const tags = getSelectedTaskTags();
  const section = document.getElementById('task-section').value;
  const existingIdx = boardData.tasks.findIndex(t => t.id === id);
  const task = { id, title, desc, priority, tags, section };
  if (existingIdx >= 0) {
    boardData.tasks[existingIdx] = task;
  } else {
    boardData.tasks.push(task);
  }
  closeTaskModal();
  renderBoard();
  autosaveBoard();
};

function onTaskCardClick(taskId) {
  const task = boardData.tasks.find(t => t.id === taskId);
  if (task) openTaskModal(task);
}

// Tag management modal logic
function openTagsModal() {
  document.getElementById('tags-modal').style.display = 'block';
  renderTagsList();
}
function closeTagsModal() {
  document.getElementById('tags-modal').style.display = 'none';
}
document.getElementById('manage-tags-btn').onclick = openTagsModal;
document.getElementById('close-tags-modal').onclick = closeTagsModal;
window.addEventListener('click', function(event) {
  if (event.target === document.getElementById('tags-modal')) closeTagsModal();
});

function renderTagsList() {
  const tagsList = document.getElementById('tags-list');
  tagsList.innerHTML = '';
  boardData.tags.forEach((tag, idx) => {
    const li = document.createElement('li');
    // Color box
    const colorBox = document.createElement('input');
    colorBox.type = 'color';
    colorBox.className = 'tag-color-box';
    colorBox.value = tag.color || '#b2bec3';
    colorBox.onchange = (e) => {
      tag.color = e.target.value;
      autosaveBoard();
      renderTagsList();
      renderBoard();
    };
    li.appendChild(colorBox);
    // Tag name
    const nameSpan = document.createElement('span');
    nameSpan.textContent = tag.name;
    nameSpan.style.marginRight = '8px';
    li.appendChild(nameSpan);
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-tag-btn';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      boardData.tags.splice(idx, 1);
      // Remove tag from all tasks
      boardData.tasks.forEach(task => {
        if (task.tags) task.tags = task.tags.filter(t => t !== tag.name);
      });
      autosaveBoard();
      renderTagsList();
      renderBoard();
    };
    li.appendChild(delBtn);
    tagsList.appendChild(li);
  });
}

document.getElementById('add-tag-form').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('new-tag-name').value.trim();
  const color = document.getElementById('new-tag-color').value;
  if (!name || boardData.tags.some(t => t.name === name)) {
    alert('Tag name must be unique and not empty.');
    return;
  }
  boardData.tags.push({ name, color });
  document.getElementById('new-tag-name').value = '';
  document.getElementById('new-tag-color').value = '#b2bec3';
  autosaveBoard();
  renderTagsList();
  renderBoard();
};

function renderFilterButtons() {
  // Priorities
  const priorities = [
    { value: 'normal', label: 'Normal', color: '#3498db' },
    { value: 'low', label: 'Low', color: '#27ae60' },
    { value: 'high', label: 'High', color: '#e74c3c' }
  ];
  const prioContainer = document.getElementById('filter-priority-btns');
  prioContainer.innerHTML = '';
  priorities.forEach(prio => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = prio.label;
    btn.style.background = prio.color;
    btn.setAttribute('data-value', prio.value);
    if ((filterState.priorities || []).includes(prio.value)) btn.classList.add('selected');
    btn.onclick = () => {
      filterState.priorities = filterState.priorities || [];
      if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
        filterState.priorities = filterState.priorities.filter(v => v !== prio.value);
      } else {
        btn.classList.add('selected');
        filterState.priorities.push(prio.value);
      }
    };
    prioContainer.appendChild(btn);
  });
  // Tags
  const tagContainer = document.getElementById('filter-tags-btns');
  tagContainer.innerHTML = '';
  boardData.tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn';
    btn.textContent = tag.name;
    btn.style.background = tag.color || '#b2bec3';
    btn.setAttribute('data-value', tag.name);
    if ((filterState.tags || []).includes(tag.name)) btn.classList.add('selected');
    btn.onclick = () => {
      filterState.tags = filterState.tags || [];
      if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
        filterState.tags = filterState.tags.filter(v => v !== tag.name);
      } else {
        btn.classList.add('selected');
        filterState.tags.push(tag.name);
      }
    };
    tagContainer.appendChild(btn);
  });
}

function openFilterModal() {
  document.getElementById('filter-modal').style.display = 'block';
  renderFilterButtons();
}

function closeFilterModal() {
  document.getElementById('filter-modal').style.display = 'none';
}
document.getElementById('close-filter-modal').onclick = closeFilterModal;
window.addEventListener('click', function(event) {
  if (event.target === document.getElementById('filter-modal')) closeFilterModal();
});

document.getElementById('filter-form').onsubmit = function(e) {
  e.preventDefault();
  // filterState.priorities and filterState.tags are already set by button clicks
  closeFilterModal();
  renderBoard();
};
document.getElementById('clear-filter-btn').onclick = function() {
  filterState = { priorities: [], tags: [] };
  closeFilterModal();
  renderBoard();
};

function taskMatchesFilter(task) {
  // Multi-priority
  if (filterState.priorities && filterState.priorities.length > 0 && !filterState.priorities.includes(task.priority)) return false;
  // Multi-tag (show if task has ANY of the selected tags)
  if (filterState.tags && filterState.tags.length > 0) {
    if (!task.tags || !task.tags.some(tag => filterState.tags.includes(tag))) return false;
  }
  return true;
}

let dragState = null;

function enableCustomDrag() {
  document.querySelectorAll('.task-card').forEach(card => {
    let dragStarted = false;
    let startX = 0, startY = 0;
    let mouseMoveHandler, mouseUpHandler;
    card.onmousedown = function(e) {
      if (e.button !== 0) return; // Only left mouse
      dragStarted = false;
      startX = e.clientX;
      startY = e.clientY;
      // Mouse move handler
      mouseMoveHandler = function(e2) {
        if (!dragStarted && (Math.abs(e2.clientX - startX) > 4 || Math.abs(e2.clientY - startY) > 4)) {
          dragStarted = true;
          // Start drag logic
          const taskId = card.getAttribute('data-task-id');
          const rect = card.getBoundingClientRect();
          dragState = {
            taskId,
            originSection: card.closest('.task-list').id.replace('-list', ''),
            offsetX: e2.clientX - rect.left,
            offsetY: e2.clientY - rect.top,
            floating: null,
            originalCard: card
          };
          card.style.opacity = '0';
          const floating = card.cloneNode(true);
          floating.style.position = 'fixed';
          floating.style.left = rect.left + 'px';
          floating.style.top = rect.top + 'px';
          floating.style.width = rect.width + 'px';
          floating.style.pointerEvents = 'none';
          floating.style.opacity = getComputedStyle(document.documentElement).getPropertyValue('--drag-floating-opacity') || '1';
          floating.style.zIndex = 9999;
          floating.classList.add('dragging');
          const rotate = getComputedStyle(document.documentElement).getPropertyValue('--drag-floating-rotate') || '5deg';
          const scale = getComputedStyle(document.documentElement).getPropertyValue('--drag-floating-scale') || '1.1';
          floating.style.transform = `rotate(${rotate}) scale(${scale})`;
          document.body.appendChild(floating);
          dragState.floating = floating;
          document.body.style.userSelect = 'none';
        }
        if (dragStarted) {
          onDragMove(e2);
        }
      };
      mouseUpHandler = function(e2) {
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
        if (!dragStarted) {
          // Treat as click
          const taskId = card.getAttribute('data-task-id');
          onTaskCardClick(taskId);
        } else {
          onDragEnd(e2);
        }
      };
      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('mouseup', mouseUpHandler);
    };
    // Remove default click handler
    card.onclick = null;
  });
}

function onDragMove(e) {
  if (!dragState) return;
  dragState.floating.style.left = (e.clientX - dragState.offsetX) + 'px';
  dragState.floating.style.top = (e.clientY - dragState.offsetY) + 'px';

  // Visual feedback: elongate section if not at max height
  let overSection = null;
  document.querySelectorAll('.task-list').forEach(list => {
    const rect = list.getBoundingClientRect();
    if (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    ) {
      overSection = list;
    }
  });
  // Remove all placeholders first
  document.querySelectorAll('.drop-placeholder').forEach(el => el.remove());
  if (overSection) {
    // Count visible tasks (exclude placeholders)
    const visibleTasks = Array.from(overSection.children).filter(
      el => !el.classList.contains('drop-placeholder')
    ).length;
    if (visibleTasks < 6) { // changed from 5 to 6
      // Add placeholder if not present
      const placeholder = document.createElement('div');
      placeholder.className = 'drop-placeholder';
      overSection.appendChild(placeholder);
    }
  }
}

function onDragEnd(e) {
  if (!dragState) return;
  // Check if mouse is over a .task-list
  let dropped = false;
  document.querySelectorAll('.task-list').forEach(list => {
    const rect = list.getBoundingClientRect();
    if (
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom
    ) {
      // Move task to this section
      const task = boardData.tasks.find(t => t.id === dragState.taskId);
      if (task) {
        task.section = list.id.replace('-list', '');
        renderBoard();
        autosaveBoard();
      }
      dropped = true;
    }
  });
  // Remove floating card
  if (dragState.floating) dragState.floating.remove();
  // Restore original card's opacity
  if (dragState.originalCard) dragState.originalCard.style.opacity = '';
  dragState = null;
  document.body.style.userSelect = '';
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
  // Remove all placeholders
  document.querySelectorAll('.drop-placeholder').forEach(el => el.remove());
  // If not dropped, just re-render to snap back
  if (!dropped) renderBoard();
}

function renderBoard() {
  // Backup all tasks for Sortable reference
  window._allTasksBackup = boardData.tasks.slice();
  ['tasks', 'doing', 'done'].forEach(section => {
    const list = document.getElementById(section + '-list');
    if (list) {
      list.innerHTML = '';
      list.ondragover = null;
      list.ondragleave = null;
      list.ondrop = null;
      list.style.minHeight = '40px';
      // Remove .scrolling logic
    }
  });
  boardData.tasks.forEach(task => {
    if (!taskMatchesFilter(task)) return;
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-priority', task.priority || 'normal');
    card.setAttribute('data-task-id', task.id);
    card.onclick = () => onTaskCardClick(task.id);
    // Priority pill
    if (task.priority) {
      const prio = document.createElement('span');
      prio.className = 'task-tag priority-' + task.priority;
      prio.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
      card.appendChild(prio);
    }
    // Title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'task-title';
    titleDiv.textContent = task.title;
    card.appendChild(titleDiv);
    // Description
    if (task.desc) {
      const descDiv = document.createElement('div');
      descDiv.className = 'task-desc';
      descDiv.textContent = task.desc;
      card.appendChild(descDiv);
    }
    // Tags with color
    if (task.tags && task.tags.length) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'task-tags';
      task.tags.forEach(tagName => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'task-tag';
        tagSpan.textContent = tagName;
        const tagObj = boardData.tags.find(t => t.name === tagName);
        if (tagObj && tagObj.color) {
          tagSpan.style.background = tagObj.color;
        }
        tagsDiv.appendChild(tagSpan);
      });
      card.appendChild(tagsDiv);
    }
    const sectionList = document.getElementById((task.section || 'tasks') + '-list');
    if (sectionList) sectionList.appendChild(card);
  });
  enableCustomDrag();
}

// Context menu logic
const contextMenu = document.getElementById('custom-context-menu');

function showContextMenu(x, y) {
  contextMenu.innerHTML = '';
  // New Board
  const newBoardItem = document.createElement('div');
  newBoardItem.className = 'context-item';
  newBoardItem.textContent = 'New Board';
  newBoardItem.setAttribute('data-action', 'new');
  contextMenu.appendChild(newBoardItem);
  // Load Board
  const loadBoardItem = document.createElement('div');
  loadBoardItem.className = 'context-item';
  loadBoardItem.textContent = 'Load Board';
  loadBoardItem.setAttribute('data-action', 'load');
  contextMenu.appendChild(loadBoardItem);
  // Save Board
  const saveBoardItem = document.createElement('div');
  saveBoardItem.className = 'context-item';
  saveBoardItem.textContent = 'Save Board';
  saveBoardItem.setAttribute('data-action', 'save');
  contextMenu.appendChild(saveBoardItem);
  // Tags
  const manageTagsItem = document.createElement('div');
  manageTagsItem.className = 'context-item';
  manageTagsItem.textContent = 'Manage Tags';
  manageTagsItem.setAttribute('data-action', 'tags');
  contextMenu.appendChild(manageTagsItem);
  // Filter
  const filterItem = document.createElement('div');
  filterItem.className = 'context-item';
  filterItem.textContent = 'Filter Tasks';
  filterItem.setAttribute('data-action', 'filter');
  contextMenu.appendChild(filterItem);
  // Toggle Status Bar
  const statusBarVisible = getStatusBarVisible();
  const toggleStatusBtn = document.createElement('div');
  toggleStatusBtn.className = 'context-item';
  toggleStatusBtn.textContent = statusBarVisible ? 'Hide Status Bar' : 'Show Status Bar';
  toggleStatusBtn.setAttribute('data-action', 'toggle-status-bar');
  contextMenu.appendChild(toggleStatusBtn);
  contextMenu.style.display = 'block';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
}
function hideContextMenu() {
  contextMenu.style.display = 'none';
}

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});
document.addEventListener('click', function(e) {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});

contextMenu.addEventListener('click', function(e) {
  if (!e.target.classList.contains('context-item')) return;
  const action = e.target.getAttribute('data-action');
  hideContextMenu();
  switch (action) {
    case 'new':
      // Prompt for file path before creating new board
      ipcRenderer.invoke('dialog:saveBoard', JSON.stringify({ tasks: [], tags: [] }), null).then(filePath => {
        if (filePath) {
          logToMain('log', '[DEBUG] About to emit board:load for file:', filePath);
          window.currentFilePath = filePath;
          ipcRenderer.send('set-current-file', filePath); // keep main process in sync
          const data = fs.readFileSync(filePath, 'utf-8');
          ipcRenderer.emit('board:load', null, data, filePath);
          // Notify main process to save this as last opened file for auto-load
          ipcRenderer.send('board:loaded', filePath);
        }
      });
      break;
    case 'load':
      ipcRenderer.invoke('dialog:openBoard').then(result => {
        if (result && result.data) {
          window.currentFilePath = result.filePath;
          ipcRenderer.send('set-current-file', result.filePath); // keep main process in sync
          updateCurrentBoardPath(result.filePath); // update status bar immediately
          loadBoardFromData(result.data);
        }
      });
      break;
    case 'save':
      ipcRenderer.invoke('dialog:saveBoard', JSON.stringify(boardData), window.currentFilePath).then(filePath => {
        if (filePath) window.currentFilePath = filePath;
      });
      break;
    case 'tags':
      openTagsModal();
      break;
    case 'filter':
      openFilterModal();
      break;
    case 'toggle-status-bar':
      const currentlyVisible = getStatusBarVisible();
      setStatusBarVisible(!currentlyVisible);
      break;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
  updateCurrentBoardPath(window.currentFilePath);
  setStatusBarVisible(getStatusBarVisible());
});

document.getElementById('min-btn').onclick = () => ipcRenderer.send('window:minimize');
document.getElementById('max-btn').onclick = () => ipcRenderer.send('window:maximize');
document.getElementById('close-btn').onclick = () => ipcRenderer.send('window:close');

function setStatusBarVisible(visible) {
  const bar = document.getElementById('status-bar');
  if (bar) bar.style.display = visible ? '' : 'none';
  localStorage.setItem('statusBarVisible', visible ? '1' : '0');
}
function getStatusBarVisible() {
  return localStorage.getItem('statusBarVisible') !== '0';
}