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
  updateLinkedBoardField(editTask ? editTask.linkedBoard : '');
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
  const linkedBoard = currentLinkedBoardPath || '';
  const existingIdx = boardData.tasks.findIndex(t => t.id === id);
  const task = { id, title, desc, priority, tags, section };
  if (linkedBoard) task.linkedBoard = linkedBoard;
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
    let mouseDownTarget = null; // Track where mousedown started

    card.onmousedown = function(e) {
      mouseDownTarget = e.target; // Track the original target
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
          // If click was on jump area, jump directly
          if (mouseDownTarget && mouseDownTarget.closest('.linked-board-jump-area')) {
            // Find the jump area element and get the linked board path
            const jumpArea = mouseDownTarget.closest('.linked-board-jump-area');
            // Find the parent card and get the task id
            const cardElem = jumpArea.closest('.task-card');
            if (cardElem) {
              const taskId = cardElem.getAttribute('data-task-id');
              const task = boardData.tasks.find(t => t.id === taskId);
              if (task && task.linkedBoard) {
                // Normalize path for Windows
                let boardPath = task.linkedBoard;
                if (typeof boardPath === 'string') {
                  boardPath = boardPath.replace(/\\/g, '/');
                }
                // Check if file exists before jumping
                try {
                  const fs = require('fs');
                  if (fs.existsSync(boardPath)) {
                    jumpToLinkedBoard(boardPath);
                  } else {
                    alert('Linked board file not found: ' + boardPath);
                  }
                } catch (err) {
                  alert('Error accessing linked board: ' + err.message);
                }
              } else {
                alert('No linked board path found for this task.');
              }
            }
            return;
          }
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
    // Right arrow for linked board
    if (task.linkedBoard) {
      const jumpArea = document.createElement('div');
      jumpArea.className = 'linked-board-jump-area';
      jumpArea.title = 'Jump to linked board';
      jumpArea.style.cssText = `position:absolute;top:0;right:0;height:100%;width:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;background:none;`;
      jumpArea.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" style="display:block;" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 4l5 5-5 5" stroke="#6d5c4d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      jumpArea.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        jumpToLinkedBoard(task.linkedBoard);
        return false;
      });
      card.appendChild(jumpArea);
      card.style.position = 'relative';
    }
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
    card.addEventListener('click', function(e) {
      if (e && e.target && e.target.closest('.linked-board-jump-area')) {
        // Let the jumpArea handler handle it
        return;
      }
      onTaskCardClick(task.id);
    });
  });
  enableCustomDrag();
  updateAIRemark();
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
  //Seperator
  const separator = document.createElement('div');
  separator.className = 'context-separator';
  contextMenu.appendChild(separator);
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
  //Seperator
  const separator2 = document.createElement('div');
  separator2.className = 'context-separator';
  contextMenu.appendChild(separator2);
  // Toggle Status Bar
  const statusBarVisible = getStatusBarVisible();
  const toggleStatusBtn = document.createElement('div');
  toggleStatusBtn.className = 'context-item';
  toggleStatusBtn.textContent = statusBarVisible ? 'Hide Status Bar' : 'Show Status Bar';
  toggleStatusBtn.setAttribute('data-action', 'toggle-status-bar');
  contextMenu.appendChild(toggleStatusBtn);
  // Toggle AI Remark
  const aiRemarkVisible = getAIRemarkVisible();
  const toggleAIRemarkBtn = document.createElement('div');
  toggleAIRemarkBtn.className = 'context-item';
  toggleAIRemarkBtn.textContent = aiRemarkVisible ? 'Hide Remark' : 'Show Remark';
  toggleAIRemarkBtn.setAttribute('data-action', 'toggle-ai-remark');
  contextMenu.appendChild(toggleAIRemarkBtn);
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
      const demoBoard = {
        tasks: [
          {
            id: 'demo-' + Date.now(),
            title: 'Welcome to Epochr!',
            desc: 'This is your first task. Edit or delete me.',
            priority: 'normal',
            tags: [],
            section: 'tasks'
          }
        ],
        tags: []
      };
      ipcRenderer.invoke('dialog:saveBoard', JSON.stringify(demoBoard), null).then(filePath => {
        if (filePath) {
          window.currentFilePath = filePath;
          ipcRenderer.send('set-current-file', filePath); // keep main process in sync
          ipcRenderer.send('request:autoopen', filePath); // ask main process to load the new board
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
    case 'toggle-ai-remark':
      const currentlyVisibleAI = getAIRemarkVisible();
      setAIRemarkVisible(!currentlyVisibleAI);
      break;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
  updateCurrentBoardPath(window.currentFilePath);
  setStatusBarVisible(getStatusBarVisible());
  setAIRemarkVisible(getAIRemarkVisible());
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
function setAIRemarkVisible(visible) {
  const el = document.getElementById('ai-remark');
  if (el) el.style.display = visible ? '' : 'none';
  localStorage.setItem('aiRemarkVisible', visible ? '1' : '0');
}
function getAIRemarkVisible() {
  return localStorage.getItem('aiRemarkVisible') !== '0';
}

// --- Linked Board field logic for task modal ---
let currentLinkedBoardPath = '';

function updateLinkedBoardField(path) {
  const input = document.getElementById('linked-board-path');
  const clearBtn = document.getElementById('clear-linked-board-btn');
  currentLinkedBoardPath = path || '';
  input.value = path || '';
  clearBtn.style.display = path ? '' : 'none';
}

document.getElementById('select-linked-board-btn').onclick = function() {
  ipcRenderer.invoke('dialog:openBoard').then(result => {
    if (result && result.filePath) {
      updateLinkedBoardField(result.filePath);
    }
  });
};
document.getElementById('clear-linked-board-btn').onclick = function() {
  updateLinkedBoardField('');
};

// Update openTaskModal to set linked board field
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
  updateLinkedBoardField(editTask ? editTask.linkedBoard : '');
  // Ensure the modal is interactive and focus the first input
  setTimeout(() => {
    document.getElementById('task-title').focus();
  }, 0);
}

// --- Linked Board Navigation ---
function jumpToLinkedBoard(path) {
  if (!path) return;
  if (!window.boardNavStack) window.boardNavStack = [];
  if (window.currentFilePath) window.boardNavStack.push(window.currentFilePath);
  jumpToBoardFile(path);
  showBackButton(window.boardNavStack.length > 0);
}

function jumpToBoardFile(path) {
  const fs = require('fs');
  try {
    const data = fs.readFileSync(path, 'utf-8');
    window.currentFilePath = path;
    ipcRenderer.send('set-current-file', path);
    updateCurrentBoardPath(path);
    loadBoardFromData(data);
    // Optionally: showBackButton(boardNavStack && boardNavStack.length > 0);
  } catch (e) {
    alert('Failed to load linked board: ' + e.message);
  }
}

// Add a back button to the top left corner
const backButton = document.createElement('button');
backButton.id = 'back-board-btn';
backButton.title = 'Back to previous board';
backButton.style.cssText = `
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 200001;
  background: #f3efe7;
  border: 1.5px solid #e2d9cb;
  border-radius: 7px;
  padding: 6px 14px 6px 10px;
  font-family: inherit;
  font-size: 1em;
  color: #6d5c4d;
  display: none;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  cursor: pointer;
  transition: background 0.18s cubic-bezier(.4,1.3,.6,1), box-shadow 0.18s cubic-bezier(.4,1.3,.6,1);
`;
backButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="vertical-align:middle;" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 13L5.5 8L10.5 3" stroke="#6d5c4d" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg> <span style="font-size:0.98em; color:#6d5c4d;">Back</span>`;
document.body.appendChild(backButton);

// Board navigation stack
window.boardNavStack = [];

function showBackButton(show) {
  backButton.style.display = show ? 'flex' : 'none';
}

backButton.onclick = function() {
  if (window.boardNavStack && window.boardNavStack.length > 0) {
    const prevPath = window.boardNavStack.pop();
    if (prevPath) {
      jumpToBoardFile(prevPath);
      showBackButton(window.boardNavStack.length > 0);
    }
  }
};
backButton.onmouseenter = function() {
  backButton.style.background = '#e2d9cb';
  backButton.style.boxShadow = '0 4px 16px rgba(109,92,77,0.10)';
};
backButton.onmouseleave = function() {
  backButton.style.background = '#f3efe7';
  backButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
};

// --- Task-only context menu for deleting a task ---
const taskContextMenu = document.createElement('div');
taskContextMenu.className = 'custom-context-menu';
taskContextMenu.style.display = 'none';
taskContextMenu.innerHTML = `\
  <button class="context-item" data-action="delete-task">Delete Task</button>\
`;
document.body.appendChild(taskContextMenu);
let contextTaskId = null;

document.addEventListener('contextmenu', function(e) {
  const card = e.target.closest('.task-card');
  if (card) {
    e.preventDefault();
    contextTaskId = card.getAttribute('data-task-id');
    // Position and show the task context menu
    taskContextMenu.style.display = 'block';
    taskContextMenu.style.left = e.clientX + 'px';
    taskContextMenu.style.top = e.clientY + 'px';
    // Hide the main context menu if open
    const mainMenu = document.getElementById('custom-context-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    return;
  }
  // Show the normal context menu for non-task right-clicks
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});

taskContextMenu.addEventListener('click', function(e) {
  if (!e.target.classList.contains('context-item')) return;
  const action = e.target.getAttribute('data-action');
  taskContextMenu.style.display = 'none';
  if (action === 'delete-task' && contextTaskId) {
    const idx = boardData.tasks.findIndex(t => t.id === contextTaskId);
    if (idx !== -1) {
      boardData.tasks.splice(idx, 1);
      renderBoard();
      autosaveBoard();
    }
  }
});

document.addEventListener('mousedown', function(e) {
  if (taskContextMenu.style.display === 'block' && !taskContextMenu.contains(e.target)) {
    taskContextMenu.style.display = 'none';
  }
});

function getWittyRemark(tasks, doing, done) {
  const remarks = {
    empty: [
      "Wow, nothing here. Did you even open the right app?",
      "This board is emptier than my motivation on a Monday.",
      "Nothing to see here. Go add some chaos!",
      "No tasks? No worries. Or maybe worry a little...",
      "It's so empty, I can hear the echo of your laziness.",
      "Clean slate? Or just pure avoidance?",
      "This could be inspiring. Or it's just sad.",
      "You sure this isn't just your brain on display?",
      "Zero tasks. Infinite procrastination potential.",
      "Even tumbleweeds are like, 'Damn, this is deserted.'"
    ],
    onlyTasks: [
      "Tasks are piling up. Maybe do something?",
      "Look at all those tasks! Procrastination level: expert.",
      "Your backlog called. It wants attention.",
      "So many tasks, so little action. Classic.",
      "Nice hoarding. Ever thought of doing one?",
      "This is a museum of unfulfilled ambition.",
      "You plan. You stack. But do you do?",
      "These tasks won't complete themselves... or will they?",
      "It's cute how you believe in future-you.",
      "Mount Procrastination is growing fast."
    ],
    onlyDoing: [
      "All hustle, no backlog. Who are you trying to impress?",
      "Everything's in progress. Are you a machine?",
      "No tasks left behind. Just a lot in limbo.",
      "You like living on the edge, huh?",
      "Work in progress? More like work in perpetual limbo.",
      "You’re juggling flaming swords. Bold move.",
      "Hope you enjoy cliffhangers — none of this is finished.",
      "You’re doing things... allegedly.",
      "This is either productivity or a cry for help.",
      "You put all your eggs in one chaotic basket."
    ],
    onlyDone: [
      "All done? Go outside, touch some grass.",
      "Nothing left to do. Overachiever alert!",
      "You finished everything? Show-off.",
      "Done and dusted. Time for a nap.",
      "What is this? The productivity Olympics?",
      "You beat the system... for now.",
      "Zero to-dos. Time to start questioning existence.",
      "You might be done, but are you fulfilled?",
      "Congratulations, you’re currently unemployed.",
      "This looks suspicious. Are you lying?"
    ],
    lotsDone: [
      "Overachiever alert! Or are you just avoiding new work?",
      "You could teach a productivity masterclass.",
      "So much done, but at what cost?",
      "You must really hate having a backlog.",
      "You’ve done more today than I’ve done all year.",
      "The to-do list is scared of you now.",
      "Burnout speedrun champion, congrats!",
      "You powered through. Now what, hero?",
      "Keep going and you’ll unlock ‘Existential Crisis’ mode.",
      "This energy is suspicious. Are you okay?"
    ],
    multitask: [
      "Multitasking? Or just making a mess?",
      "You have more in progress than a software update.",
      "Octopus mode: activated.",
      "Are you sure you know what you're doing?",
      "You're everywhere. And also nowhere.",
      "Jack of all trades, master of ‘eh’.",
      "Multitasking: because why fail one thing at a time?",
      "This looks like chaos. Because it is.",
      "You're spreading thinner than my paycheck.",
      "You’re doing the most. But are you doing it well?"
    ],
    balanced: [
      "A balanced board. Or maybe you just got bored.",
      "Some to do, some doing, some done. Adulting 101.",
      "This board is healthier than my diet.",
      "Nice balance! Or is it just luck?",
      "Equilibrium achieved. For now.",
      "You're riding the productivity seesaw.",
      "This might actually be functional. Weird.",
      "Balanced like a caffeinated monk.",
      "This is what stable chaos looks like.",
      "Don’t get too comfy. That balance won’t last."
    ],
    progress: [
      "Progress? Or just moving things around?",
      "Tasks are moving! Or are they?",
      "At least something's happening.",
      "Keep it up, or at least pretend to.",
      "Forward-ish momentum detected.",
      "You’re faking progress like a pro.",
      "Productivity cosplay. Nice.",
      "The illusion of progress is still progress, right?",
      "Shuffling tasks like it's a card trick.",
      "You're doing stuff! Maybe! Hopefully?"
    ],
    waiting: [
      "Tasks waiting, but hey, at least you finished something.",
      "Backlog is jealous of your done pile.",
      "You finish things, but the list never ends.",
      "Done pile growing, but so is the backlog.",
      "One step forward, two tasks added.",
      "You slay tasks, but the beast keeps growing.",
      "Like doing dishes — it never ends.",
      "This is the productivity treadmill.",
      "Sisyphus called. He gets it.",
      "You’re doing great, but so is your chaos."
    ],
    noNew: [
      "No new tasks? Are you on vacation or just lazy?",
      "Momentum is real, but so is burnout.",
      "No new tasks, just pure momentum!",
      "You must be waiting for something to break.",
      "Cruise control mode: engaged.",
      "Enjoy the calm before the next storm of tasks.",
      "You’re either efficient or dangerously idle.",
      "This feels like the eye of the storm.",
      "Do nothing long enough and it'll feel earned.",
      "You’re free... for now."
    ],
    oneTask: [
      "One lonely task. Even your to-do list is sad.",
      "Just one? Don't mess it up.",
      "One task to rule them all.",
      "A single task. The chosen one.",
      "This is either focus or fear of commitment.",
      "Even this task feels awkward.",
      "One task. Big responsibility. Good luck.",
      "You vs. that one task. Place your bets.",
      "Don’t let this task become a legacy problem.",
      "If this fails, it’s 100% your fault."
    ],
    oneDoing: [
      "One task in progress. Try not to mess it up.",
      "Focus mode: ON. Distraction mode: also ON?",
      "All eggs in one basket. Good luck.",
      "One thing at a time. Revolutionary.",
      "You're walking the productivity tightrope.",
      "Just one? This is either zen or delusion.",
      "Don’t blink, it might disappear.",
      "Slow and steady. But like, hurry up.",
      "This is intense for no reason.",
      "Don’t let it sit there forever. We see you."
    ],
    oneDone: [
      "One task done. Want a medal or something?",
      "Small wins matter. Or so they say.",
      "One done. Celebrate the little things.",
      "You did it! Now do it again.",
      "One step at a time. Baby steps... or crawling?",
      "Progress so small, it needs a magnifying glass.",
      "Congrats, now back to work.",
      "Nice! Now double it.",
      "You’re statistically productive. Barely.",
      "Don't strain yourself with all that effort."
    ],
    default: [
      "Tasks: " + tasks + ", Doing: " + doing + ", Done: " + done + ". Try harder.",
      "Is this your best? The board thinks not.",
      "Keep going, or at least keep pretending.",
      "You call this productivity?",
      "Not the worst. But definitely not the best.",
      "Mediocrity called. It wants its crown back.",
      "Your board has commitment issues.",
      "It's a mess, but it's *your* mess.",
      "Somehow functional. Mostly chaos.",
      "Keep grinding. Or keep scrolling. Up to you."
    ]
  };

  // Pick the state
  let remarkCategory = 'default';
  if (tasks === 0 && doing === 0 && done === 0) remarkCategory = 'empty';
  else if (tasks > 0 && doing === 0 && done === 0) remarkCategory = 'onlyTasks';
  else if (doing > 0 && tasks === 0 && done === 0) remarkCategory = 'onlyDoing';
  else if (done > 0 && tasks === 0 && doing === 0) remarkCategory = 'onlyDone';
  else if (done >= tasks + doing && done > 2) remarkCategory = 'lotsDone';
  else if (doing > 1) remarkCategory = 'multitask';
  else if (tasks > 0 && doing > 0 && done > 0) remarkCategory = 'balanced';
  else if (tasks > 0 && done > 0 && doing === 0) remarkCategory = 'waiting';
  else if (doing > 0 && done > 0 && tasks === 0) remarkCategory = 'noNew';
  else if (tasks === 1 && doing === 0 && done === 0) remarkCategory = 'oneTask';
  else if (doing === 1 && tasks === 0 && done === 0) remarkCategory = 'oneDoing';
  else if (done === 1 && tasks === 0 && doing === 0) remarkCategory = 'oneDone';
  else if (doing > 0 || done > 0) remarkCategory = 'progress';

  // Pick a random remark from the chosen category
  const options = remarks[remarkCategory] || remarks['default'];
  return options[Math.floor(Math.random() * options.length)];
}


function updateAIRemark() {
  const tasks = boardData.tasks.filter(t => (t.section || 'tasks') === 'tasks').length;
  const doing = boardData.tasks.filter(t => t.section === 'doing').length;
  const done = boardData.tasks.filter(t => t.section === 'done').length;
  const remark = getWittyRemark(tasks, doing, done);
  const el = document.getElementById('ai-remark');
  if (el) el.textContent = remark;
  setAIRemarkVisible(getAIRemarkVisible());
}