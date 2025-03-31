let db;
const DB_NAME = 'LocalNotesDB';
const DB_VERSION = 2; // Increase version to trigger database upgrade
const NOTES_STORE = 'notes';
const TAGS_STORE = 'tags';
const APP_VERSION = '1.1.1'; // Application version - updated for GitHub integration
const APP_VERSION_KEY = 'appVersion'; // Key for storing version in local storage
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/username/LocalNotesApp/main/version.json'; // Replace with your actual GitHub or hosting URL

// App versioning system
const VersionControl = {
    // Current app version
    version: APP_VERSION,
    
    // Last updated timestamp
    lastUpdated: new Date().toISOString(),
    
    // GitHub repository information
    githubRepo: {
        owner: 'bjgilberd',
        repo: 'LocalNotesApp',
        apiUrl: 'https://api.github.com/repos/bjgilberd/LocalNotesApp',
        // Enable or disable GitHub version checking
        enabled: true,
        // GitHub API token for authentication (optional but recommended to avoid rate limits)
        token: '',
        // Whether to use token authentication
        useToken: false
    },
    
    // Initialize version control system
    init: function() {
        // Store current version and timestamp in localStorage
        this.saveCurrentVersion();
        
        // Display version in the UI
        this.displayVersion();
        
        // Check for updates against GitHub only if enabled
        if (this.githubRepo.enabled) {
            this.checkForUpdates();
        }
        
        Logger.log('Version control initialized: v' + this.version);
    },
    
    // Save current version to localStorage
    saveCurrentVersion: function() {
        const versionData = {
            version: this.version,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(APP_VERSION_KEY, JSON.stringify(versionData));
    },
    
    // Get version data from storage
    getVersionData: function() {
        const data = localStorage.getItem(APP_VERSION_KEY);
        return data ? JSON.parse(data) : null;
    },
    
    // Display version in the UI
    displayVersion: function() {
        const versionData = this.getVersionData();
        if (!versionData) return;
        
        // Create version display element if it doesn't exist
        let versionDisplay = document.getElementById('version-display');
        if (!versionDisplay) {
            versionDisplay = document.createElement('div');
            versionDisplay.id = 'version-display';
            versionDisplay.className = 'version-display';
            
            // Add to footer
            const sidebarFooter = document.querySelector('.sidebar-footer');
            if (sidebarFooter) {
                sidebarFooter.appendChild(versionDisplay);
            }
        }
        
        // Update version text
        versionDisplay.textContent = 'v' + versionData.version;
        
        // Check if we have update information and GitHub integration is enabled
        if (this.githubRepo.enabled) {
            const updateInfo = localStorage.getItem('updateInfo');
            if (updateInfo) {
                const updateData = JSON.parse(updateInfo);
                if (updateData.newVersionAvailable) {
                    versionDisplay.innerHTML = `v${versionData.version} <span class="update-available" title="Update available: v${updateData.latestVersion}">●</span>`;
                }
            }
        }
        
        // Always update the title with the timestamp
        versionDisplay.title = 'Last updated: ' + new Date(versionData.timestamp).toLocaleString();
    },
    
    // Check for updates from GitHub
    checkForUpdates: async function() {
        // If GitHub integration is disabled, return early
        if (!this.githubRepo.enabled) {
            return { success: false, error: "GitHub integration is disabled" };
        }
        
        try {
            Logger.log('Checking for updates from GitHub...');
            
            // Fetch the latest release from GitHub
            const response = await fetch(`${this.githubRepo.apiUrl}/releases/latest`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch latest release');
            }
            
            const releaseData = await response.json();
            
            // Extract version from tag name (typically in format 'v1.2.3')
            const latestVersion = releaseData.tag_name.replace(/^v/, '');
            
            // Compare with current version
            const updateAvailable = this.compareVersion(latestVersion) < 0;
            
            // Store update information
            const updateInfo = {
                latestVersion: latestVersion,
                newVersionAvailable: updateAvailable,
                releaseUrl: releaseData.html_url,
                releaseDate: releaseData.published_at,
                lastChecked: new Date().toISOString()
            };
            
            localStorage.setItem('updateInfo', JSON.stringify(updateInfo));
            
            // Update the version display to show update indicator if needed
            this.displayVersion();
            
            // Update settings modal version info if it's open
            updateVersionInfo();
            
            return { success: true, data: updateInfo };
        } catch (error) {
            Logger.error('Error checking for updates:', error);
            
            // Store failure information but don't show error to user in UI
            const updateInfo = {
                error: error.message,
                lastChecked: new Date().toISOString(),
                checkFailed: true
            };
            localStorage.setItem('updateInfo', JSON.stringify(updateInfo));
            
            return { success: false, error: error };
        }
    },
    
    // Include version in backups
    includeInBackup: function(backup) {
        backup.appVersion = this.version;
        backup.backupDate = new Date().toISOString();
        return backup;
    },
    
    // Compare versions
    compareVersion: function(otherVersion) {
        if (!otherVersion) return 1; // Current is newer if other doesn't exist
        
        const current = this.version.split('.').map(Number);
        const other = otherVersion.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (current[i] > other[i]) return 1;  // Current is newer
            if (current[i] < other[i]) return -1; // Other is newer
        }
        
        return 0; // Same version
    }
};

// Logger utility for better control over console logging
const Logger = {
    // Set to true for development/debugging
    enabled: true,
    
    log: function(message, ...args) {
        if (this.enabled) console.log(message, ...args);
    },
    
    error: function(message, ...args) {
        console.error(message, ...args);
    },
    
    warn: function(message, ...args) {
        console.warn(message, ...args);
    },
    
    info: function(message, ...args) {
        if (this.enabled) console.info(message, ...args);
    }
};

// Constants for masonry layout
const MASONRY_COLUMN_WIDTH = 280; // Default column width in pixels
const MASONRY_GAP = 16; // Gap between notes in pixels

// DOM elements
const notesContainer = document.getElementById('notes-container');
const emptyState = document.getElementById('empty-state');
const createNoteCompact = document.getElementById('create-note-compact');
const createNoteExpanded = document.getElementById('create-note');
const createNoteTitle = document.getElementById('create-note-title');
const createNoteContent = document.getElementById('create-note-content');
const createNoteBtn = document.getElementById('create-note-btn');
const closeCreateNoteBtn = document.getElementById('close-create-note-btn');
const noteModal = document.getElementById('note-modal');
const editNoteTitle = document.getElementById('edit-note-title');
const editNoteContent = document.getElementById('edit-note-content');
const saveNoteBtn = document.getElementById('save-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const archiveNoteBtn = document.getElementById('archive-note-btn');
const printPdfBtn = document.getElementById('print-pdf-btn');
const tagList = document.getElementById('tag-list');
const allNotesCount = document.getElementById('all-notes-count');
const searchInput = document.getElementById('search-input');
const unsavedIndicator = document.getElementById('unsaved-indicator');
const imageUploadInput = document.getElementById('image-upload');

// Current state
let currentNoteId = null;
let searchTerm = '';
let selectedTags = ['all']; // Replace currentFilter with an array of selected tags
let viewMode = 'active'; // 'active' or 'archived'
let originalNoteContent = ''; // Store original content to detect changes
let originalNoteTitle = ''; // Store original title to detect changes
let hasUnsavedChanges = false;

// Global variables for tag suggestions
let tagSuggestionActive = false;
let tagSuggestionStart = null;
let tagSuggestionContainer = null;
let currentTagText = '';
let selectedSuggestionIndex = 0;

// Default settings (will be overridden by saved settings)
let settings = {
    masonry: true,
    noteWidth: 280
};

// Settings functionality
let defaultSettings = {
    accentColor: '#bb86fc',
    sidebarWidth: 250,
    noteWidth: 280
};

// Define the missing detectChanges function
function detectChanges() {
    const editNoteContent = document.getElementById('edit-note-content');
    const createNoteContent = document.getElementById('create-note-content');
    
    if (editNoteContent) {
        editNoteContent.addEventListener('input', () => {
            hasUnsavedChanges = true;
            const unsavedIndicator = document.querySelector('.unsaved-indicator');
            if (unsavedIndicator) {
                unsavedIndicator.style.display = 'inline-block';
            }
        });
    }
    
    if (createNoteContent) {
        createNoteContent.addEventListener('input', () => {
            hasUnsavedChanges = true;
        });
    }
}

/**
 * Initializes the IndexedDB database
 * @returns {Promise} A promise that resolves when the database is initialized
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = event => {
            console.error('IndexedDB error:', event.target.error);
            alert('Error opening database. Your browser might not support IndexedDB or has restricted permissions.');
            reject(event.target.error);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            
            // Create notes store
            if (!db.objectStoreNames.contains(NOTES_STORE)) {
                const notesStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('timestamp', 'timestamp', { unique: false });
                notesStore.createIndex('createdAt', 'createdAt', { unique: false });
                notesStore.createIndex('archived', 'archived', { unique: false });
            }
            
            // Create tags store
            if (!db.objectStoreNames.contains(TAGS_STORE)) {
                const tagsStore = db.createObjectStore(TAGS_STORE, { keyPath: 'name' });
                tagsStore.createIndex('count', 'count', { unique: false });
            }
            
            // Handle DB version upgrades
            if (oldVersion < 2 && db.objectStoreNames.contains(TAGS_STORE)) {
                Logger.log("Upgrading database to version 2 - adding color to tags");
                
                // Get transaction
                const transaction = event.target.transaction;
                const tagsStore = transaction.objectStore(TAGS_STORE);
                
                // Add color field to existing tags
                tagsStore.openCursor().onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Get current value
                        const tag = cursor.value;
                        if (!tag.color) {
                            // Add default color (random pastel color)
                            tag.color = getRandomPastelColor();
                            cursor.update(tag);
                        }
                        cursor.continue();
                    }
                };
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            
            // Set up event handlers for the creating note UI
            const createNoteCompact = document.getElementById('create-note-compact');
            const closeCreateNoteBtn = document.getElementById('close-create-note-btn');
            const createNoteBtn = document.getElementById('create-note-btn');
            
            if (createNoteCompact) {
                createNoteCompact.addEventListener('click', expandCreateNote);
            }
            
            if (closeCreateNoteBtn) {
                closeCreateNoteBtn.addEventListener('click', closeCreateNote);
            }
            
            if (createNoteBtn) {
                createNoteBtn.addEventListener('click', createNote);
            }
            
            // Set up change detection
            detectChanges();
            
            // Load data
            loadNotes();
            loadTags();
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', function(event) {
                // Ctrl+Alt+R triggers tag repair
                if (event.ctrlKey && event.altKey && event.key === 'r') {
                    event.preventDefault();
                    if (confirm('Repair all tag counts? This will scan all notes and update tag counts accordingly.')) {
                        recalculateTagCounts();
                    }
                }
            });
            
            resolve();
        };
    });
}

// Initialize the application
async function initApp() {
    // Set up event listeners and UI
    Logger.log('Initializing app...');
    
    // Initialize version control
    VersionControl.init();
    
    // Check if it's the first load of the app
    if (!localStorage.getItem('firstLoadDone')) {
        localStorage.setItem('firstLoadDone', 'true');
    }
    
    // Remove any existing filter status element since we're no longer using it
    const existingFilterStatus = document.getElementById('filter-status');
    if (existingFilterStatus) {
        existingFilterStatus.remove();
    }
    
    // Set up all event handlers and UI components
    setupSidebarToggle();
    setupViewToggleButtons();
    setupTagFilter();
    setupTagMultiSelectHandlers();
    setupPasteHandlers();
    addSearchHelpTooltip();
    
    // Add keyboard shortcut for tag repair (Ctrl+Shift+R)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            recalculateTagCounts();
        }
    });
    
    // Load existing notes
    await loadNotes();
    await loadTags();
    
    // Initialize settings
    initSettings();
    
    // Initialize Tag Manager
    initTagManager();
    
    // Initialize search
    document.getElementById('search-input').addEventListener('input', handleSearch);
    
    // Initialize rich text editing
    initializeToolbars();
    setupFormatting();
    
    // Monitor storage usage
    initStorageMonitoring();
    
    // Add click listener to create note button
    const createNoteBtn = document.getElementById('create-note-btn');
    if (createNoteBtn) createNoteBtn.addEventListener('click', createNote);
    
    // Add click listener to close button
    const closeCreateNoteBtn = document.getElementById('close-create-note-btn');
    if (closeCreateNoteBtn) closeCreateNoteBtn.addEventListener('click', closeCreateNote);
    
    // Add click listener to new close button in the top right
    const createNoteClose = document.getElementById('create-note-close');
    if (createNoteClose) createNoteClose.addEventListener('click', closeCreateNote);
    
    // Add click listener to expand compact note creation
    const createNoteCompact = document.getElementById('create-note-compact');
    if (createNoteCompact) createNoteCompact.addEventListener('click', expandCreateNote);
    
    // Initialize event handlers for note editing
    const saveNoteBtn = document.getElementById('save-note-btn');
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
    
    // Add event listener for the delete note button
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', deleteNote);
    
    // Add event listener for the archive note button
    const archiveNoteBtn = document.getElementById('archive-note-btn');
    if (archiveNoteBtn) archiveNoteBtn.addEventListener('click', archiveNote);
    
    // Add event listener for the print to PDF button
    const printPdfBtn = document.getElementById('print-pdf-btn');
    if (printPdfBtn) printPdfBtn.addEventListener('click', printToPdf);
    
    // Display status on first load 
    displayStatusOnLoad();
}

/**
 * Initializes storage monitoring and persistence
 */
async function initStorageMonitoring() {
    try {
        // Request persistence for IndexedDB storage
        await requestStoragePersistence();
        
        // Check initial storage usage
        await checkStorageUsage();
        
        // Create the storage indicator
        await createStorageIndicator();
    } catch (error) {
        Logger.error('Error initializing storage monitoring:', error);
    }
}

/**
 * Requests persistent storage for this origin
 * Persistent storage is less likely to be cleared by the browser
 */
async function requestStoragePersistence() {
    // Check if persistence is already granted
    if (navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persisted();
            if (isPersisted) {
                Logger.log('Storage is already persistent');
                return true;
            }
            
            // Request persistence
            const success = await navigator.storage.persist();
            if (success) {
                Logger.log('Successfully set storage to persistent mode');
                return true;
            } else {
                // This is expected in many browsers/contexts, so we'll just log it at info level
                Logger.log('Browser did not grant persistent storage. Data may be cleared by the browser when storage is low.');
                return false;
            }
        } catch (e) {
            // Only log this as a warning, not an error since it's non-critical
            Logger.log('Storage persistence request failed but app will continue to work:', e);
            return false;
        }
    } else {
        Logger.log('Storage persistence not supported in this browser');
        return false;
    }
}

/**
 * Check storage usage and quota
 */
async function checkStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            
            // Prevent division by zero
            if (quota === 0) {
                Logger.warn('Storage quota is reported as 0, cannot calculate percentage');
                return {
                    usage: 0,
                    quota: 0,
                    percent: 0,
                    remaining: 0
                };
            }
            
            const usageInMB = Math.round(usage / (1024 * 1024) * 10) / 10; // Convert to MB with 1 decimal
            const quotaInMB = Math.round(quota / (1024 * 1024) * 10) / 10; // Convert to MB with 1 decimal
            const percentUsed = Math.round((usage / quota) * 100);
            const remainingInMB = Math.round((quota - usage) / (1024 * 1024) * 10) / 10;
            
            Logger.info(`Storage usage: ${usageInMB}MB out of ${quotaInMB}MB (${percentUsed}%)`);
            Logger.info(`Remaining storage: ${remainingInMB}MB`);
            
            return {
                usage: usageInMB,
                quota: quotaInMB,
                percent: percentUsed,
                remaining: remainingInMB
            };
        } catch (error) {
            Logger.error('Error estimating storage:', error);
            return {
                usage: 0,
                quota: 0,
                percent: 0,
                remaining: 0
            };
        }
    } else {
        Logger.warn('Storage estimation API not supported in this browser');
        return {
            usage: 0,
            quota: 0,
            percent: 0,
            remaining: 0
        };
    }
}

/**
 * Creates the storage indicator in the header
 */
async function createStorageIndicator() {
    try {
        const storageInfo = await checkStorageUsage();
        
        // Create indicator if it doesn't exist yet in the header
        let indicator = document.getElementById('storage-indicator-header');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'storage-indicator-header';
            indicator.className = 'storage-indicator-header';
            
            // Get the header actions div to add the indicator
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                // Insert at the beginning of header actions
                if (headerActions.firstChild) {
                    headerActions.insertBefore(indicator, headerActions.firstChild);
                } else {
                    headerActions.appendChild(indicator);
                }
            }
        }
        
        // Update the indicator with current storage info
        updateStorageIndicatorUI(indicator, storageInfo);
    } catch (error) {
        console.error('Error creating storage indicator:', error);
    }
}

/**
 * Updates the storage indicator with current usage data
 */
async function updateStorageIndicator() {
    const indicator = document.getElementById('storage-indicator-header');
    if (!indicator) return;
    
    const storageInfo = await checkStorageUsage();
    updateStorageIndicatorUI(indicator, storageInfo);
}

/**
 * Updates the UI of the storage indicator with the given storage info
 */
function updateStorageIndicatorUI(indicator, storageInfo) {
    // Define the color based on usage percentage
    let textColor = '#4CAF50'; // Green
    if (storageInfo.percent > 70) {
        textColor = '#FFC107'; // Yellow
    }
    if (storageInfo.percent > 90) {
        textColor = '#F44336'; // Red
    }
    
    // Create detailed tooltip
    const tooltipText = `Used: ${storageInfo.usage}MB / Total: ${storageInfo.quota}MB (${storageInfo.remaining}MB free)`;
    
    // Set the title attribute for the tooltip
    indicator.setAttribute('title', tooltipText);
    
    // Just display the percentage with appropriate color
    indicator.innerHTML = `<span class="storage-percent" style="color: ${textColor}">${Math.round(storageInfo.percent)}%</span>`;
}

// Completely revised function to create and initialize toolbars
function initializeToolbars() {
    console.log("Initializing toolbars");
    
    // Get all toolbars
    const toolbars = document.querySelectorAll('.toolbar');
    if (toolbars.length === 0) {
        console.log("No toolbars found");
        return;
    }
    
    console.log(`Found ${toolbars.length} toolbars`);
    
    // Process each toolbar
    toolbars.forEach(toolbar => {
        if (toolbar.dataset.initialized === 'true') {
            console.log("Toolbar already initialized, skipping");
            return;
        }
        
        console.log("Processing toolbar:", toolbar);
        createToolbar(toolbar);
        toolbar.dataset.initialized = 'true';
    });
    
    // Set up observer for dynamically added toolbars
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const newToolbars = node.querySelectorAll ? node.querySelectorAll('.toolbar') : [];
                        newToolbars.forEach(toolbar => {
                            if (!toolbar.dataset.initialized) {
                                console.log("New toolbar detected:", toolbar);
                                createToolbar(toolbar);
                                toolbar.dataset.initialized = 'true';
                            }
                        });
                        
                        if (node.classList && node.classList.contains('toolbar') && !node.dataset.initialized) {
                            console.log("New toolbar element detected:", node);
                            createToolbar(node);
                            node.dataset.initialized = 'true';
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also check for toolbars after a short delay in case they're added dynamically
    setTimeout(() => {
        const newToolbars = document.querySelectorAll('.toolbar:not([data-initialized])');
        newToolbars.forEach(toolbar => {
            console.log("Found toolbar after delay:", toolbar);
            createToolbar(toolbar);
            toolbar.dataset.initialized = 'true';
        });
    }, 500);
}

// Function to create a standardized toolbar with the specified buttons
function createToolbar(toolbar) {
    console.log("Creating toolbar content");
    
    // Clear existing content
    toolbar.innerHTML = '';
    
    // Create text style group
    const textStyleGroup = document.createElement('div');
    textStyleGroup.className = 'toolbar-group';
    
    // Add text formatting buttons with Material Icons
    textStyleGroup.appendChild(createToolbarButton(null, 'Bold', 'bold', 'material-icons', 'format_bold'));
    textStyleGroup.appendChild(createToolbarButton(null, 'Italic', 'italic', 'material-icons', 'format_italic'));
    textStyleGroup.appendChild(createToolbarButton(null, 'Underline', 'underline', 'material-icons', 'format_underlined'));
    textStyleGroup.appendChild(createToolbarButton(null, 'Strikethrough', 'strikeThrough', 'material-icons', 'format_strikethrough'));
    
    toolbar.appendChild(textStyleGroup);
    toolbar.appendChild(createSeparator());
    
    // Create heading group
    const headingGroup = document.createElement('div');
    headingGroup.className = 'toolbar-group';
    
    // Add heading buttons with Material Icons
    headingGroup.appendChild(createToolbarButton(null, 'Heading 1', 'h1', 'material-icons', 'looks_one'));
    headingGroup.appendChild(createToolbarButton(null, 'Heading 2', 'h2', 'material-icons', 'looks_two'));
    headingGroup.appendChild(createToolbarButton(null, 'Heading 3', 'h3', 'material-icons', 'looks_3'));
    headingGroup.appendChild(createToolbarButton(null, 'Normal text', 'p', 'material-icons', 'text_fields'));
    
    toolbar.appendChild(headingGroup);
    toolbar.appendChild(createSeparator());
    
    // Create list group
    const listGroup = document.createElement('div');
    listGroup.className = 'toolbar-group';
    
    // Add list buttons with Material Icons
    listGroup.appendChild(createToolbarButton(null, 'Bulleted List', 'insertUnorderedList', 'material-icons', 'format_list_bulleted'));
    listGroup.appendChild(createToolbarButton(null, 'Numbered List', 'insertOrderedList', 'material-icons', 'format_list_numbered'));
    
    toolbar.appendChild(listGroup);
    toolbar.appendChild(createSeparator());
    
    // Create alignment group
    const alignGroup = document.createElement('div');
    alignGroup.className = 'toolbar-group';
    
    // Add alignment buttons with Material Icons
    alignGroup.appendChild(createToolbarButton(null, 'Align Left', 'justifyLeft', 'material-icons', 'format_align_left'));
    alignGroup.appendChild(createToolbarButton(null, 'Align Center', 'justifyCenter', 'material-icons', 'format_align_center'));
    
    toolbar.appendChild(alignGroup);
    toolbar.appendChild(createSeparator());
    
    // Add dictation button with Material Icon
    const dictationGroup = document.createElement('div');
    dictationGroup.className = 'toolbar-group';
    dictationGroup.appendChild(createToolbarButton(null, 'Voice Dictation', 'voiceDictation', 'material-icons', 'mic'));
    toolbar.appendChild(dictationGroup);
    toolbar.appendChild(createSeparator());
    
    // Add link button with Material Icon
    toolbar.appendChild(createToolbarButton(null, 'Insert Link', 'createLink', 'material-icons', 'link'));
    
    console.log("Toolbar creation complete");
}

// Helper function to create toolbar button
function createToolbarButton(text, title, command, iconClass = null, iconName = null) {
    const button = document.createElement('button');
    button.className = 'toolbar-btn';
    button.setAttribute('title', title);
    button.setAttribute('data-command', command);
    
    if (iconClass && iconName) {
        // For Material Icons
        const icon = document.createElement('span');
        icon.className = iconClass;
        icon.textContent = iconName;  // Material Icons uses text content for the icon
        button.appendChild(icon);
        
        // Add hidden span with text for screen readers
        const srText = document.createElement('span');
        srText.className = 'sr-only';
        srText.textContent = title;
        srText.style.position = 'absolute';
        srText.style.width = '1px';
        srText.style.height = '1px';
        srText.style.padding = '0';
        srText.style.margin = '-1px';
        srText.style.overflow = 'hidden';
        srText.style.clip = 'rect(0, 0, 0, 0)';
        srText.style.whiteSpace = 'nowrap';
        srText.style.border = '0';
        button.appendChild(srText);
    } else if (iconClass) {
        // For Font Awesome icons (legacy support)
        const icon = document.createElement('i');
        icon.className = iconClass;
        button.appendChild(icon);
    } else {
        button.textContent = text;
    }
    
    // Improved event listener with better context detection
    button.addEventListener('click', function(event) {
        // Prevent default button behavior
        event.preventDefault();
        
        console.log("Button clicked:", command);
        
        // Determine which editing context we're in
        const inCreateNote = this.closest('#create-note') !== null;
        const inEditNote = this.closest('#note-modal') !== null;
        
        if (inCreateNote) {
            formatText(command);
        } else if (inEditNote) {
            formatTextEdit(command);
        } else {
            console.warn("Button clicked outside of editing context");
        }
    });
    
    return button;
}

// Helper function to create separator
function createSeparator() {
    const separator = document.createElement('div');
    separator.className = 'toolbar-separator';
    return separator;
}

// Fixing the formatting functions
function formatText(command) {
    console.log("Formatting command:", command);
    
    const editor = document.getElementById('create-note-content');
    if (!editor) {
        console.error("Editor element not found");
        return;
    }
    
    // Ensure the editor is editable
    editor.contentEditable = 'true';
    
    // Focus the editor explicitly 
    editor.focus();
    
    // Special handling for voice dictation
    if (command === 'voiceDictation') {
        startVoiceDictation(editor);
        return;
    }
    
    // Give the browser a moment to establish focus
    setTimeout(() => {
        try {
            // For link command, we need a URL
            if (command === 'createLink') {
                const url = prompt('Enter the link URL:', 'https://');
                if (url) {
                    // If there's no selection, insert a new link
                    const selection = window.getSelection();
                    if (selection.isCollapsed) {
                        // Insert a link with default text
                        const linkText = document.createTextNode('link');
                        const range = document.createRange();
                        range.setStart(editor, 0);
                        range.collapse(true);
                        range.insertNode(linkText);
                        
                        // Select the newly inserted text
                        range.selectNodeContents(linkText);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    // Now create the link on the selection
                    document.execCommand('createLink', false, url);
                }
            }
            // For heading commands
            else if (command.startsWith('h') || command === 'p') {
                document.execCommand('formatBlock', false, `<${command}>`);
            }
            // For all other commands
            else {
                document.execCommand(command, false, null);
            }
            
            // Update toolbar state after command execution
            updateToolbarState(editor);
            
            // Mark as having unsaved changes
            markUnsavedChanges();
            
        } catch (e) {
            console.error("Error applying formatting:", e);
        }
    }, 10);
}

function formatTextEdit(command) {
    console.log("Formatting edit command:", command);
    
    const editor = document.getElementById('edit-note-content');
    if (!editor) {
        console.error("Edit note content element not found");
        return;
    }
    
    // Ensure the editor is editable
    editor.contentEditable = 'true';
    
    // Focus the editor explicitly
    editor.focus();
    
    // Special handling for voice dictation
    if (command === 'voiceDictation') {
        startVoiceDictation(editor);
        return;
    }
    
    // Give the browser a moment to establish focus
    setTimeout(() => {
        try {
            // For link command, we need a URL
            if (command === 'createLink') {
                const url = prompt('Enter the link URL:', 'https://');
                if (url) {
                    // If there's no selection, insert a new link
                    const selection = window.getSelection();
                    if (selection.isCollapsed) {
                        // Insert a link with default text
                        const linkText = document.createTextNode('link');
                        const range = document.createRange();
                        range.setStart(editor, 0);
                        range.collapse(true);
                        range.insertNode(linkText);
                        
                        // Select the newly inserted text
                        range.selectNodeContents(linkText);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                    
                    // Now create the link on the selection
                    document.execCommand('createLink', false, url);
                }
            }
            // For heading commands
            else if (command.startsWith('h') || command === 'p') {
                document.execCommand('formatBlock', false, `<${command}>`);
            }
            // For all other commands
            else {
                document.execCommand(command, false, null);
            }
            
            // Update toolbar state after command execution
            updateToolbarState(editor);
            
            // Mark as having unsaved changes
            markUnsavedChanges();
            
        } catch (e) {
            console.error("Error applying formatting:", e);
        }
    }, 10);
}

// Modify expandCreateNote to add the Save button if not present
function expandCreateNote() {
    console.log("expandCreateNote called");
    
    if (createNoteCompact && createNoteExpanded) {
        createNoteCompact.style.display = 'none';
        createNoteExpanded.classList.add('active');
        
        // Create Save button if it doesn't exist
        const existingSaveBtn = document.getElementById('create-note-btn');
        if (!existingSaveBtn || existingSaveBtn.style.display === 'none') {
            // Look for a container for the save button
            const actionContainer = createNoteExpanded.querySelector('.note-modal-actions') || 
                                  createNoteExpanded.querySelector('.create-note-actions');
            
            // If no container exists, create one
            let buttonContainer = actionContainer;
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'note-modal-actions';
                buttonContainer.style.display = 'flex';
                buttonContainer.style.justifyContent = 'flex-end';
                buttonContainer.style.padding = '10px';
                buttonContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
                createNoteExpanded.appendChild(buttonContainer);
            }
            
            // If save button doesn't exist in the container, create it
            if (!buttonContainer.querySelector('#create-note-btn')) {
                console.log("Creating new save button");
                const saveBtn = document.createElement('button');
                saveBtn.id = 'create-note-btn';
                saveBtn.className = 'primary';
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Note';
                saveBtn.addEventListener('click', createNote);
                
                // Add the save button to the container
                buttonContainer.appendChild(saveBtn);
            }
        }
        
        setTimeout(() => {
            // Focus on the content area and ensure it's editable
            if (createNoteContent) {
                createNoteContent.contentEditable = 'true';
                createNoteContent.focus();
                
                // Set up paste handlers for image support
                setupPasteHandlers();
            }
        }, 300);
    } else {
        console.error("Note creation elements not found:", {
            createNoteCompact: createNoteCompact,
            createNoteExpanded: createNoteExpanded
        });
    }
}

// Handle image upload button click
function handleImageUpload() {
    window.currentEditContext = 'create';
    imageUploadInput.click();
}

// Handle image upload in edit mode
function handleImageUploadEdit() {
    // Store the current editor context
    window.currentEditContext = 'edit';
    imageUploadInput.click();
}

// Insert image into edit mode
function insertImageIntoEdit(file) {
    console.log(`Processing image for insertion into editor: ${file.name || 'unnamed'} (${file.size} bytes)`);
    
    // Create a processing flag for this file to prevent duplicates
    if (window.currentlyProcessingImage) {
        console.log('Already processing an image, skipping this one');
        return;
    }
    
    // Set processing flag
    window.currentlyProcessingImage = true;
    
    // Set a safety timeout to reset the flag if something goes wrong
    const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout: Resetting image processing flag');
        window.currentlyProcessingImage = false;
    }, 10000); // 10 seconds safety timeout
    
    try {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Compress and insert image
                compressImage(e.target.result, function(compressedDataUrl) {
                    try {
                        const editNoteContent = document.getElementById('edit-note-content');
                        if (!editNoteContent) {
                            console.error('Edit note content element not found');
                            window.currentlyProcessingImage = false;
                            clearTimeout(safetyTimeout);
                            return;
                        }
                        
                        // Create a paragraph to wrap the image
                        const paragraph = document.createElement('p');
                        paragraph.style.margin = '10px 0';
                        
                        // Create image element
                        const img = document.createElement('img');
                        img.src = compressedDataUrl;
                        img.style.maxWidth = '80%';
                        img.style.height = 'auto';
                        img.className = 'note-image';
                        
                        // Add image to paragraph
                        paragraph.appendChild(img);
                        
                        // Insert at cursor position
                        editNoteContent.focus();
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            
                            // Insert the paragraph with image
                            range.insertNode(paragraph);
                            
                            // Create a new paragraph for text after the image
                            const textParagraph = document.createElement('p');
                            textParagraph.innerHTML = '<br>';  // Empty paragraph with line break
                            
                            // Insert the text paragraph after the image paragraph
                            if (paragraph.nextSibling) {
                                paragraph.parentNode.insertBefore(textParagraph, paragraph.nextSibling);
                            } else {
                                paragraph.parentNode.appendChild(textParagraph);
                            }
                            
                            // Move cursor to the new paragraph
                            range.setStartAfter(textParagraph);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        } else {
                            console.log('No selection range found, appending image to editor');
                            editNoteContent.appendChild(paragraph);
                        }
                        
                        // Make image resizable
                        makeImageResizable(img);
                        
                        // Mark as having unsaved changes
                        markUnsavedChanges();
                        
                        console.log('Image inserted successfully into edit mode');
                    } catch (error) {
                        console.error('Error inserting compressed image:', error);
                    } finally {
                        window.currentlyProcessingImage = false;
                        clearTimeout(safetyTimeout);
                    }
                });
            } catch (error) {
                console.error('Error compressing image:', error);
                window.currentlyProcessingImage = false;
                clearTimeout(safetyTimeout);
            }
        };
        
        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            window.currentlyProcessingImage = false;
            clearTimeout(safetyTimeout);
        };
        
        // Read the file as data URL
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error in insertImageIntoEdit:', error);
        window.currentlyProcessingImage = false;
        clearTimeout(safetyTimeout);
    }
}

// Insert an image into note
function insertImageIntoNote(file) {
    console.log(`Processing image for insertion into note: ${file.name || 'unnamed'} (${file.size} bytes)`);
    
    // Create a processing flag for this file to prevent duplicates
    if (window.currentlyProcessingImage) {
        console.log('Already processing an image, skipping this one');
        return;
    }
    
    // Set processing flag
    window.currentlyProcessingImage = true;
    
    // Set a safety timeout to reset the flag if something goes wrong
    const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout: Resetting image processing flag');
        window.currentlyProcessingImage = false;
    }, 10000); // 10 seconds safety timeout
    
    try {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Compress and insert image
                compressImage(e.target.result, function(compressedDataUrl) {
                    try {
                        // Determine where to insert the image
                        const createNoteContent = document.getElementById('create-note-content');
                        if (!createNoteContent) {
                            console.error('Create note content element not found');
                            window.currentlyProcessingImage = false;
                            clearTimeout(safetyTimeout);
                            return;
                        }
                        
                        const targetEditor = document.activeElement.closest('.editable') || createNoteContent;
                        console.log('Inserting image into editor:', targetEditor.id || 'unnamed editor');
                        
                        // Create a paragraph to wrap the image (prevents column layout issues)
                        const paragraph = document.createElement('p');
                        paragraph.style.margin = '10px 0';
                        
                        // Create image element directly (without resizable container for now)
                        const img = document.createElement('img');
                        img.src = compressedDataUrl;
                        img.style.maxWidth = '80%';
                        img.style.height = 'auto';
                        img.className = 'note-image';
                        
                        // Add image to paragraph
                        paragraph.appendChild(img);
                        
                        // Insert at cursor position
                        targetEditor.focus();
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            
                            // Insert the paragraph with image
                            range.insertNode(paragraph);
                            
                            // Create a new paragraph for text after the image
                            const textParagraph = document.createElement('p');
                            textParagraph.innerHTML = '<br>';  // Empty paragraph with line break
                            
                            // Insert the text paragraph after the image paragraph
                            if (paragraph.nextSibling) {
                                paragraph.parentNode.insertBefore(textParagraph, paragraph.nextSibling);
                            } else {
                                paragraph.parentNode.appendChild(textParagraph);
                            }
                            
                            // Move cursor to the new paragraph
                            range.setStartAfter(textParagraph);
                            range.collapse(true);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        } else {
                            console.log('No selection range found, appending image to editor');
                            targetEditor.appendChild(paragraph);
                        }
                        
                        // Make image resizable
                        makeImageResizable(img);
                        
                        console.log('Image inserted successfully into create note');
                    } catch (error) {
                        console.error('Error inserting compressed image:', error);
                    } finally {
                        window.currentlyProcessingImage = false;
                        clearTimeout(safetyTimeout);
                    }
                });
            } catch (error) {
                console.error('Error compressing image:', error);
                window.currentlyProcessingImage = false;
                clearTimeout(safetyTimeout);
            }
        };
        
        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            window.currentlyProcessingImage = false;
            clearTimeout(safetyTimeout);
        };
        
        // Read the file as data URL
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error in insertImageIntoNote:', error);
        window.currentlyProcessingImage = false;
        clearTimeout(safetyTimeout);
    }
}

// Make image resizable
function makeImageResizable(imgElement) {
    // Store original dimensions
    const originalWidth = imgElement.width;
    
    // Make image resizable using CSS
    imgElement.style.resize = 'both';
    imgElement.style.overflow = 'hidden';
    imgElement.style.maxWidth = '100%';
    
    // Add resize handle indicator (visual only)
    imgElement.style.borderBottomRight = '10px solid var(--accent)';
    
    // After image is resized, update the masonry layout
    refreshMasonryLayout();
}

// Close the create note area
function closeCreateNote() {
    // Check if there's content to save
    const hasTitle = createNoteTitle.textContent.trim();
    const hasContent = createNoteContent.innerHTML.trim();
    
    if (hasTitle || hasContent) {
        if (confirm('Do you want to save your note?')) {
            createNote();
        } else {
            // Clear form
            createNoteTitle.innerHTML = '';
            createNoteContent.innerHTML = '';
        }
    }
    
    // Hide expanded form with animation
    createNoteExpanded.classList.remove('active');
    
    // Wait for the transition to complete before showing compact form
    setTimeout(() => {
        createNoteCompact.style.display = 'flex';
    }, 300);
}

// Load notes from IndexedDB
function loadNotes() {
    return new Promise((resolve) => {
        console.log('Loading notes');
        
        if (!db) {
            console.error('Database not initialized');
            resolve([]);
            return;
        }
        
        const transaction = db.transaction(NOTES_STORE, 'readonly');
        const store = transaction.objectStore(NOTES_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const notes = request.result;
            console.log(`Loaded ${notes.length} notes from database`);
            
            // Filter based on current view mode (regular/archived)
            const filteredNotes = notes.filter(note => {
                if (viewMode === 'archived') {
                    return note.isArchived === true || note.archived === true;
                } else {
                    return note.isArchived !== true && note.archived !== true;
                }
            });
            
            // Sort notes by timestamp (newest first)
            filteredNotes.sort((a, b) => b.timestamp - a.timestamp);
            
            // Display the filtered notes
            displayNotes(filteredNotes);
            resolve(filteredNotes);
        };
        
        request.onerror = event => {
            console.error('Error loading notes:', event.target.error);
            resolve([]);
        };
    });
}

// Update notes count - modified to properly handle total vs filtered counts
function updateNotesCount(totalCount) {
    // Update the "All Notes" count with the total number of notes
    const allNotesItem = document.querySelector('[data-tag="all"] .tag-count');
    if (allNotesItem) {
        allNotesItem.textContent = totalCount;
    }
    
    // If we have the all notes count element elsewhere, update it too
    if (allNotesCount) {
        allNotesCount.textContent = totalCount;
    }
    
    // If we're filtering by a tag, update the active tag's displayed count separately
    if (!selectedTags.includes('all')) {
        // Count only notes with the current tag filter
        const filteredCount = document.querySelectorAll('.note').length;
        
        // Update the count for the currently selected tag
        const currentTagItem = document.querySelector(`[data-tag="${selectedTags[0]}"] .tag-count`);
        if (currentTagItem) {
            // No need to update the tag count as it's already set correctly from the database
            // This ensures consistency with the actual count in the database
        }
    }
}

// Load tags from IndexedDB specifically for the current view mode
function loadTags() {
    console.log("Loading tags from database");
    if (!db) return;

    const transaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readonly');
    const notesStore = transaction.objectStore(NOTES_STORE);
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Get all tags from the tags store
    const tagsRequest = tagsStore.getAll();
    
    tagsRequest.onsuccess = () => {
        // Get all tags
        const allTagsData = tagsRequest.result;
        console.log(`Found ${allTagsData.length} tags in database`);
        
        // Now get ALL notes first, then filter them
        const getAllNotesRequest = notesStore.getAll();
        
        getAllNotesRequest.onsuccess = () => {
            const allNotes = getAllNotesRequest.result;
            console.log(`Found ${allNotes.length} total notes in database`);
            
            // Filter notes manually based on archived status (handling undefined/null values)
            const archivedMode = viewMode === 'archived';
            const filteredNotes = allNotes.filter(note => {
                // In normal view mode, show notes with archived=false or undefined/null
                if (!archivedMode) {
                    return note.archived !== true;
                } 
                // In archived view mode, only show notes with archived=true
                return note.archived === true;
            });
            
            console.log(`After filtering by archived=${archivedMode}: ${filteredNotes.length} notes`);
            
            // Extract all unique tags from the current view's notes
            const viewTags = new Set();
            filteredNotes.forEach(note => {
                if (note.tags && Array.isArray(note.tags)) {
                    note.tags.forEach(tag => viewTags.add(tag));
                }
            });
            
            console.log(`Found ${viewTags.size} unique tags in the current view's notes`);
            
            // Option 1: Show only tags that are in the current notes view
            // const filteredTags = allTagsData.filter(tag => viewTags.has(tag.name));
            
            // Option 2: Show all tags, including those with 0 count
            const filteredTags = allTagsData;
            
            console.log(`Displaying ${filteredTags.length} tags in sidebar`);
            
            // Store tags and display them
            allTags = filteredTags;
            displayTags(filteredTags);
        };
    };

    transaction.onerror = event => {
        console.error('Transaction error:', event.target.error);
    };
}

// Masonry layout implementation - updated to handle image loading
function applyMasonryLayout() {
    console.log('Applying masonry layout');
    if (!notesContainer) return;
    
    // Get all note elements
    const noteElements = Array.from(notesContainer.querySelectorAll('.note'));
    if (noteElements.length === 0) {
        console.log('No notes to layout');
        notesContainer.style.height = 'auto';
        return;
    }
    
    // Calculate number of columns based on container width
    const containerWidth = notesContainer.clientWidth;
    const columnWidth = defaultNoteWidth || MASONRY_COLUMN_WIDTH; // Use defaultNoteWidth with fallback
    const columnCount = Math.max(1, Math.floor((containerWidth + MASONRY_GAP) / (columnWidth + MASONRY_GAP)));
    
    console.log(`Container width: ${containerWidth}px, Column count: ${columnCount}, Note width: ${columnWidth}px`);
    
    // Initialize arrays to track column heights
    const columnHeights = Array(columnCount).fill(0);
    
    // Calculate actual column width (to fill container)
    let calculatedColumnWidth;
    if (columnCount === 1) {
        calculatedColumnWidth = Math.min(containerWidth, 600); // Limit single column width
    } else {
        calculatedColumnWidth = (containerWidth - (MASONRY_GAP * (columnCount - 1))) / columnCount;
    }
    
    // Set width to match column width
    noteElements.forEach(noteEl => {
        noteEl.style.width = `${calculatedColumnWidth}px`;
    });
    
    // Wait for all images to load for accurate height calculation
    const imagePromises = [];
    const noteImages = notesContainer.querySelectorAll('.note img');
    
    noteImages.forEach(img => {
        if (!img.complete) {
            const promise = new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Still resolve even if image fails
            });
            imagePromises.push(promise);
        }
    });
    
    // Once all images are loaded, position the notes
    Promise.all(imagePromises).then(() => {
        // Position each note element
        noteElements.forEach(noteEl => {
            // Find the shortest column
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
            
            // Calculate position
            const leftPosition = shortestColumnIndex * (calculatedColumnWidth + MASONRY_GAP);
            const topPosition = columnHeights[shortestColumnIndex];
            
            // Set note position
            noteEl.style.left = `${leftPosition}px`;
            noteEl.style.top = `${topPosition}px`;
            
            // Make note visible with a slight delay for animation
            setTimeout(() => {
                noteEl.classList.add('visible');
            }, 10);
            
            // Update column height
            columnHeights[shortestColumnIndex] += noteEl.offsetHeight + MASONRY_GAP;
        });
        
        // Set the container height to the tallest column
        const maxHeight = Math.max(...columnHeights);
        notesContainer.style.height = `${maxHeight > 0 ? maxHeight : 500}px`;
        
        console.log('Masonry layout applied successfully');
    });
}

// Update displayNotes function to use masonry layout
function displayNotes(notes) {
    console.log(`Displaying ${notes ? notes.length : 0} notes`);
    
    // Ensure notesContainer exists
    if (!notesContainer) {
        console.error('Notes container element not found');
        return;
    }
    
    // Clear the notes container (except empty state)
    if (emptyState && emptyState.parentNode === notesContainer) {
        Array.from(notesContainer.children).forEach(child => {
            if (child !== emptyState) {
                notesContainer.removeChild(child);
            }
        });
    } else {
        // If emptyState doesn't exist or is not a child of notesContainer, clear all children
        notesContainer.innerHTML = '';
        // Try to get a fresh reference to the empty state element
        const emptyStateTemp = document.getElementById('empty-state');
        if (emptyStateTemp) {
            notesContainer.appendChild(emptyStateTemp);
        }
    }

    // Filter notes based on current filter and search term
    let filteredNotes = notes;
    
    if (!selectedTags.includes('all')) {
        console.log(`Filtering by tags: ${selectedTags.join(', ')}`);
        filteredNotes = notes.filter(note => {
            // Note must contain ALL selected tags (AND logic)
            if (!note.tags) return false;
            return selectedTags.every(tag => note.tags.includes(tag));
        });
        console.log(`Notes after tag filter: ${filteredNotes.length}`);
    }
    
    if (searchTerm) {
        console.log(`Filtering by search term: ${searchTerm}`);
        const term = searchTerm.toLowerCase();
        
        // Check if it's a date search (format: date:yyyy-mm-dd or created:yyyy-mm-dd)
        const dateMatch = term.match(/^(date|created):(\d{4}-\d{1,2}-\d{1,2})$/);
        
        if (dateMatch) {
            // It's a date search
            const searchDate = new Date(dateMatch[2]);
            // Set to beginning of the day
            searchDate.setHours(0, 0, 0, 0);
            
            // Get end of the day
            const endDate = new Date(searchDate);
            endDate.setHours(23, 59, 59, 999);
            
            // Filter notes by creation date
            filteredNotes = filteredNotes.filter(note => {
                if (!note.createdAt) return false;
                
                const noteDate = new Date(note.createdAt);
                return noteDate >= searchDate && noteDate <= endDate;
            });
        } else {
            // Regular text search
            filteredNotes = filteredNotes.filter(note => {
                // Create temporary element to extract text without data URLs
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.content;
                
                // Remove all image data URLs to avoid searching in binary data
                const images = tempDiv.querySelectorAll('img');
                images.forEach(img => {
                    if (img.src.startsWith('data:')) {
                        img.setAttribute('src', '');
                    }
                });
                
                // Get text content for searching
                const textContent = tempDiv.textContent || tempDiv.innerText;
                
                // Also check created date in human-readable format for matches
                let dateMatch = false;
                if (note.createdAt) {
                    const noteDate = new Date(note.createdAt);
                    const formattedDate = formatDate(noteDate);
                    dateMatch = formattedDate.toLowerCase().includes(term);
                }
                
                return textContent.toLowerCase().includes(term) || dateMatch;
            });
        }
    }

    // Show or hide empty state based on filtered notes
    if (filteredNotes.length === 0) {
        createEmptyState(searchTerm, selectedTags);
    } else {
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Add all notes to the container first (invisible)
        filteredNotes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesContainer.appendChild(noteElement);
        });
        
        // Apply masonry layout to position and show the notes
        applyMasonryLayout();
    }
    
    // Update note count display
    updateNotesCount(filteredNotes.length);
    
    // Highlight search terms if any
    if (searchTerm && !searchTerm.startsWith('date:') && !searchTerm.startsWith('created:')) {
        highlightSearchTerm();
    }
}

// Add window resize event listener to reapply masonry layout when window size changes
window.addEventListener('resize', debounce(() => {
    applyMasonryLayout();
}, 200));

// Create HTML element for a note
function createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.setAttribute('data-id', note.id);
    noteElement.setAttribute('data-created', note.created || note.timestamp || '');
    
    // Add the title and content
    const contentElement = document.createElement('div');
    contentElement.className = 'note-content';
    
    // Always show title if it exists
    if (note.title && note.title.trim() !== '') {
        const titleElement = document.createElement('div');
        titleElement.className = 'note-title';
        titleElement.textContent = note.title;
        contentElement.appendChild(titleElement);
    }
    
    // Create wrapper for the content
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'note-text';
    
    // IMPORTANT CHANGE: Use innerHTML instead of textContent to preserve formatting
    contentWrapper.innerHTML = note.content;
    
    // Apply special styles to any headings
    const headings = contentWrapper.querySelectorAll('h1, h2, h3');
    
    headings.forEach((heading, index) => {
        // Apply styling based on heading tag
        switch(heading.tagName) {
            case 'H1':
                heading.style.fontSize = '1.8rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '10px 0';
                heading.style.color = 'var(--text-primary)';
                break;
            case 'H2':
                heading.style.fontSize = '1.5rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '8px 0';
                heading.style.color = 'var(--text-primary)';
                break;
            case 'H3':
                heading.style.fontSize = '1.3rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '6px 0';
                heading.style.color = 'var(--text-primary)';
                break;
        }
    });
    
    // Apply styles to lists to ensure they display correctly in note cards
    const lists = contentWrapper.querySelectorAll('ul, ol');
    lists.forEach(list => {
        list.style.paddingLeft = '20px';
        list.style.margin = '5px 0';
        
        const items = list.querySelectorAll('li');
        items.forEach(item => {
            item.style.margin = '3px 0';
        });
    });
    
    contentElement.appendChild(contentWrapper);

    // Add tags section if note has tags
    const tagsElement = document.createElement('div');
    tagsElement.className = 'note-tags';
    
    if (note.tags && note.tags.length > 0) {
        // Get all tags data to apply colors
        const transaction = db.transaction([TAGS_STORE], 'readonly');
        const tagsStore = transaction.objectStore(TAGS_STORE);
        
        // Create a promise to handle async tag loading
        const tagPromises = note.tags.map(tag => {
            return new Promise((resolve) => {
                const getTagRequest = tagsStore.get(tag);
                
                getTagRequest.onsuccess = () => {
                    const tagData = getTagRequest.result;
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = `#${tag}`;
                    
                    // Apply tag color if available
                    if (tagData && tagData.color) {
                        tagElement.style.backgroundColor = tagData.color;
                        tagElement.style.color = getContrastingTextColor(tagData.color);
                    }
                    
                    // Add click event to filter by this tag
                    tagElement.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent opening the note
                        filterByTag(tag);
                    });
                    
                    resolve(tagElement);
                };
                
                getTagRequest.onerror = () => {
                    // If error, create tag without color
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = `#${tag}`;
                    resolve(tagElement);
                };
            });
        });
        
        // When all tags are loaded, add them to the note
        Promise.all(tagPromises).then(tagElements => {
            tagElements.forEach(tagElement => {
                tagsElement.appendChild(tagElement);
            });
        });
    }
    
    // Add timestamp display - show timestamp regardless of whether title exists
    // Using created or timestamp property, whichever is available
    const dateToShow = note.created || note.timestamp;
    if (dateToShow) {
        const timestampElement = document.createElement('div');
        timestampElement.className = 'note-timestamp';
        timestampElement.textContent = formatDate(dateToShow);
        timestampElement.style.fontSize = '0.75rem';
        timestampElement.style.marginTop = '5px';
        timestampElement.style.color = '#888888';
        timestampElement.style.fontStyle = 'italic';
        timestampElement.style.opacity = '0.7';
        tagsElement.appendChild(timestampElement);
    }

    // Add click event to open note
    noteElement.addEventListener('click', () => openNoteModal(note));

    // Assemble note element
    noteElement.appendChild(contentElement);
    noteElement.appendChild(tagsElement);

    return noteElement;
}


// Display tags in the sidebar
function displayTags(tags) {
    const tagList = document.getElementById('tag-list');
    if (!tagList) return;
    
    // Clear existing tags except the "All Notes" item
    const allNotesItem = tagList.querySelector('[data-tag="all"]');
    tagList.innerHTML = '';
    
    // Create or recreate the "All Notes" item
    const allItem = document.createElement('li');
    allItem.className = 'tag-item';
    if (selectedTags.includes('all')) {
        allItem.classList.add('active');
    }
    allItem.setAttribute('data-tag', 'all');
    
    const allNameSpan = document.createElement('span');
    allNameSpan.textContent = 'All Notes';
    
    const allCountSpan = document.createElement('span');
    allCountSpan.className = 'tag-count';
    allCountSpan.id = 'all-notes-count';
    allCountSpan.textContent = allNotesCount ? allNotesCount.textContent : '0';
    
    allItem.appendChild(allNameSpan);
    allItem.appendChild(allCountSpan);
    
    // Add special click event listener to always reset to All Notes view
    allItem.addEventListener('click', function() {
        // Always clear all filters and switch to "all" view regardless of Ctrl key
        selectedTags = ['all'];
        filterByTag('all');
    });
    
    tagList.appendChild(allItem);
    
    // Sort tags by name
    tags.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create a tag element for each tag
    tags.forEach(tag => {
        const isLongTag = tag.name.length > 20; // Consider tags longer than 20 chars as "long"
        const isManualTag = tag.count === 0; // Check if this is a manually created tag
        
        const li = document.createElement('li');
        li.className = 'tag-item';
        if (isManualTag) {
            li.classList.add('manual-tag'); // Add class for styling if needed
        }
        if (selectedTags.includes(tag.name)) {
            li.classList.add('active');
        }
        li.setAttribute('data-tag', tag.name);
        
        // Create name span
        const nameSpan = document.createElement('span');
        // Apply special class for very long tags
        if (isLongTag) {
            nameSpan.className = 'long-tag';
            nameSpan.title = tag.name; // Add tooltip for full name
        }
        
        // Apply color to the tag text like in notes instead of just coloring the text
        if (tag.color) {
            // Create a span for the tag name with background color like in notes
            const tagSpan = document.createElement('span');
            tagSpan.className = 'sidebar-tag';
            tagSpan.textContent = `#${tag.name}`;
            tagSpan.style.backgroundColor = tag.color;
            tagSpan.style.color = getContrastingTextColor(tag.color);
            tagSpan.style.padding = '2px 6px';
            tagSpan.style.borderRadius = '4px';
            tagSpan.style.display = 'inline-block';
            
            nameSpan.innerHTML = '';
            nameSpan.appendChild(tagSpan);
        } else {
            nameSpan.textContent = `#${tag.name}`;
        }
        
        const countSpan = document.createElement('span');
        countSpan.className = 'tag-count';
        countSpan.textContent = `(${tag.count})`;
        
        li.appendChild(nameSpan);
        li.appendChild(countSpan);
        
        // Add click event listener
        li.addEventListener('click', function(event) {
            // Check if CTRL key is pressed (for multi-select)
            const isCtrlPressed = event.ctrlKey || event.metaKey;
            filterByTag(tag.name, isCtrlPressed);
        });
        
        tagList.appendChild(li);
    });
}

// Create a new note
function createNote() {
    console.log('Creating new note from toolbar');
    
    // Get the title and content from the create note form
    const titleInput = document.getElementById('create-note-title');
    const contentInput = document.getElementById('create-note-content');
    
    if (!titleInput || !contentInput) {
        console.error('Create note form elements not found');
        return;
    }
    
    // Get title and content - trim to check if they're empty
    // For contenteditable, we need to use textContent/innerHTML instead of value
    const title = titleInput.textContent.trim();
    const content = contentInput.innerHTML.trim();
    
    // Don't create empty notes
    if (!title && !content) {
        console.log('Note is empty, not creating');
        closeCreateNote();
        return;
    }
    
    // Extract hashtags from content and title
    const contentTags = extractTags(content);
    const titleTags = extractTags(title);
    let noteTags = [...new Set([...contentTags, ...titleTags])]; // Combine unique tags
    
    console.log(`Creating note with tags: ${noteTags.join(', ')}`);
    
    // Create note object
    const newNote = {
        id: Date.now().toString(),
        title: title,
        content: content,
        timestamp: Date.now(),
        tags: noteTags,
        isArchived: false
    };
    
    // Add note to database
    const transaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readwrite');
    const notesStore = transaction.objectStore(NOTES_STORE);
    
    notesStore.add(newNote).onsuccess = () => {
        console.log('Note added to database:', newNote);
        
        // Update tags in the database (if any)
        if (noteTags.length > 0) {
            updateTagsStore(noteTags, transaction);
        }
        
        // Reset note form
        titleInput.textContent = '';
        contentInput.innerHTML = '';
        
        // Close create note form
        closeCreateNote();
        
        // Refresh notes display to include the new note
        loadNotes().then(() => {
            // Refresh masonry layout after notes are loaded and displayed
            refreshMasonryLayout();
        });
    };
}

// Open the note modal for editing - Google Keep style
function openNoteModal(note) {
    console.log('Opening note modal for note:', note.id);
    currentNote = note;
    
    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.getElementById('note-modal');
    const editNoteTitle = document.getElementById('edit-note-title');
    const editNoteContent = document.getElementById('edit-note-content');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const archiveNoteBtn = document.getElementById('archive-note-btn');
    const printPdfBtn = document.getElementById('print-pdf-btn'); // Get reference
    const noteCreatedDate = document.querySelector('.note-created-date');

    // --- Add Event Listener for Print Button ---
    if (printPdfBtn) {
        // Remove potential old listener first to be safe
        const newPrintPdfBtn = printPdfBtn.cloneNode(true);
        printPdfBtn.parentNode.replaceChild(newPrintPdfBtn, printPdfBtn);
        // Add the listener to the new button
        newPrintPdfBtn.addEventListener('click', printToPdf);
        console.log('Added printToPdf event listener');
    } else {
        console.error('Print to PDF button not found!');
    }
    // --- End Add Event Listener ---
    
    // Set the current note ID as a data attribute on the modal
    modal.dataset.noteId = note.id;
    
    // Set the note content
    editNoteTitle.textContent = note.title || '';
    editNoteContent.innerHTML = note.content || '';
    
    // Format the date
    const dateToUse = note.created ? new Date(note.created) : new Date();
    const formattedDate = formatDate(dateToUse);
    noteCreatedDate.textContent = `Created on ${formattedDate}`;
    
    // Show the modal
    modalOverlay.classList.add('active');
    
    // Update the archive button text based on archived status
    archiveNoteBtn.textContent = note.archived ? 'Unarchive' : 'Archive';
    
    // Setup formatting and event listeners for the editor
    setupFormatting();
    
    // Make images resizable
    setupImageResizeHandles();
    
    // Store original content to detect changes
    originalNoteContent = editNoteContent.innerHTML;
    originalNoteTitle = editNoteTitle.textContent;
    
    // Reset unsaved changes flag
    hasUnsavedChanges = false;
    
    // Turn off unsaved indicator
    const unsavedIndicator = document.querySelector('.unsaved-indicator');
    if (unsavedIndicator) {
        unsavedIndicator.style.display = 'none';
    }
    
    // Set up editor to detect changes
    editNoteContent.addEventListener('input', markUnsavedChanges);
    editNoteTitle.addEventListener('input', markUnsavedChanges);
}

// Add the missing setupImageResizeHandles function
function setupImageResizeHandles() {
    console.log("Setting up image resize handles");
    
    // Find all images in the current note
    const images = editNoteContent.querySelectorAll('img');
    
    images.forEach(img => {
        // Skip images that already have resize functionality
        if (img.closest('.resizable-image-container')) {
            return;
        }
        
        // Make the image resizable
        makeImageResizable(img);
        
        // Check if the image is inside a paragraph
        if (!img.parentElement || img.parentElement.tagName !== 'P') {
            // Wrap in paragraph if not already wrapped
            const paragraph = document.createElement('p');
            paragraph.style.margin = '10px 0';
            img.parentNode.insertBefore(paragraph, img);
            paragraph.appendChild(img);
        }
    });
    
    // Set up event listeners for the resize handles
    const resizeHandles = editNoteContent.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.removeEventListener('mousedown', startResize);
        handle.addEventListener('mousedown', startResize);
    });
}

// Format a date in a human-readable format
function formatDate(date) {
    // Check if date is undefined or not a valid date
    if (!date || isNaN(new Date(date).getTime())) {
        return 'Unknown date';
    }
    
    // Convert timestamp to Date object if it's a number
    if (typeof date === 'number') {
        date = new Date(date);
    }
    
    // Ensure we have a Date object
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
}

// Close the note modal - with confirmation if changes are unsaved
function closeNoteModal() {
    if (hasUnsavedChanges) {
        // Ask if user wants to save changes before closing
        if (confirm('You have unsaved changes. Do you want to save before closing?')) {
            // If they choose "OK", save the note and then close
            saveNote();
            // Modal will close via the saveNote function
        } else {
            // If they choose "Cancel", just close without saving
            closeModalWithoutSaving();
        }
    } else {
        closeModalWithoutSaving();
    }
}

// Actually close the modal
function closeModalWithoutSaving() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    
    // Reset state
    currentNoteId = null;
    editNoteTitle.innerHTML = '';
    editNoteContent.innerHTML = '';
    originalNoteTitle = '';
    originalNoteContent = '';
    hasUnsavedChanges = false;
    
    // Make sure the unsaved indicator is hidden
    if (unsavedIndicator) {
        unsavedIndicator.style.display = 'none';
    }
    
    // We're no longer loading notes automatically when closing the modal
    // This avoids race conditions when saving notes
}

// Save edited note
function saveNote() {
    console.log('Saving note...');
    
    const modal = document.getElementById('note-modal');
    const noteId = modal.dataset.noteId;
    const title = document.getElementById('edit-note-title').textContent.trim();
    let content = document.getElementById('edit-note-content').innerHTML;
    
    console.log('Note ID:', noteId); // Debug log
    console.log('Title:', title); // Debug log
    console.log('Content length:', content.length); // Debug log
    
    // Don't save empty notes
    if (!title.trim() && !content.trim()) {
        console.log('Note is empty, not saving');
        closeNoteModal();
        return;
    }
    
    // Preserve heading formatting
    const preservedContent = preserveHeadingFormatting(content);
    
    // Extract tags from both content and title
    const contentTags = extractTags(preservedContent);
    const titleTags = extractTags(title);
    
    // Combine tags from both sources, removing duplicates
    const tags = [...new Set([...contentTags, ...titleTags])];
    
    console.log('Extracted tags:', tags);
    
    // Get a transaction
    const transaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readwrite');
    
    // Get the notes object store
    const notesStore = transaction.objectStore(NOTES_STORE);
    
    // If noteId exists, update the existing note, otherwise create a new note
    if (noteId) {
        // Get the existing note to preserve creation date
        // First try to get by ID directly (without conversion)
        const getRequest = notesStore.get(noteId);
        
        getRequest.onsuccess = function(event) {
            let existingNote = event.target.result;
            
            // If not found, try with the ID as a number
            if (!existingNote && !isNaN(noteId)) {
                const numericId = Number(noteId);
                const getNumericRequest = notesStore.get(numericId);
                
                getNumericRequest.onsuccess = function(numericEvent) {
                    existingNote = numericEvent.target.result;
                    
                    if (!existingNote) {
                        console.error('Note not found with ID:', noteId);
                        alert('Error: Could not find the note to update. Please try again.');
                        return;
                    }
                    
                    // Continue with note update using the new transaction
                    updateExistingNote(existingNote, noteId, title, preservedContent, tags);
                };
                
                return; // Exit the original onsuccess handler
            }
            
            // Continue with note update
            updateExistingNote(existingNote, noteId, title, preservedContent, tags);
        };
        
        // Helper function to update an existing note
        function updateExistingNote(existingNote, noteId, title, preservedContent, tags) {
            // Create a new transaction for the actual update
            const updateTransaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readwrite');
            const updateStore = updateTransaction.objectStore(NOTES_STORE);
            
            // --- Fix: Ensure 'created' date is always preserved or set --- 
            // Use original created date if valid, otherwise use the modified date as fallback
            const modificationTime = Date.now(); // Store modification time
            let creationDate = existingNote.created;
            
            // Validate original created date
            if (!creationDate || isNaN(new Date(creationDate).getTime())) {
                Logger.warn(`Invalid or missing created date for note ${existingNote.id}. Falling back to modification time.`);
                creationDate = modificationTime; // Fallback to modification time
            }
            
            // Update the note object
            const updatedNote = {
                id: existingNote.id, // Keep the original ID type
                title: title,
                content: preservedContent,
                modified: modificationTime, // Use stored modification time
                created: creationDate, // Use the determined (or fallback) creation date
                tags: tags,
                archived: existingNote.archived === true 
            };
            
            // --- Debug Log: Log the object being saved --- 
            console.log('>>> Saving updatedNote object:', JSON.stringify(updatedNote));
            // --- End Debug Log ---
            
            // Save to the database
            const updateRequest = updateStore.put(updatedNote);
            
            updateRequest.onsuccess = function() {
                console.log('Note updated successfully');
                
                // Update tags
                updateTagsStore(tags, updateTransaction, existingNote.tags || []);
                
                // Reset unsaved changes flag BEFORE closing the modal
                hasUnsavedChanges = false;
                const unsavedIndicator = document.querySelector('.unsaved-indicator');
                if (unsavedIndicator) {
                    unsavedIndicator.style.display = 'none';
                }
                
                // Close the modal first
                closeModalWithoutSaving();
                
                // Ensure we're in normal view mode, not archived
                viewMode = 'active';
                
                // Clear any filters that might prevent the note from showing
                selectedTags = ['all'];
                searchTerm = '';
                
                // Clear the search input
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
                
                // Update filter UI
                document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('active'));
                const allTagElement = document.querySelector('[data-tag="all"]');
                if (allTagElement) {
                    allTagElement.classList.add('active');
                }
                
                // Reload the notes and wait for them to be displayed
                loadNotes()
                    .then(notes => {
                        console.log(`Successfully loaded ${notes.length} notes after saving`);
                        
                        // Reload tags to ensure the sidebar is updated
                        loadTags();
                        
                        // Refresh masonry layout after notes are loaded and displayed
                        refreshMasonryLayout();
                    })
                    .catch(error => {
                        console.error('Error loading notes after save:', error);
                        alert('There was an error loading your notes after saving. Please refresh the page.');
                    });
            };
        };
    } else {
        // Create a new note
        console.log('Creating a new note from the modal');
        
        const newNote = {
            id: Date.now(),
            title: title,
            content: preservedContent,
            timestamp: Date.now(),
            created: Date.now(),
            tags: tags,
            archived: false
        };
        
        // Save to the database
        const addRequest = notesStore.add(newNote);
        
        addRequest.onsuccess = function() {
            console.log('New note created successfully');
            
            // Update tags
            updateTagsStore(tags, transaction, []);
            
            // Reset unsaved changes flag BEFORE closing the modal
            hasUnsavedChanges = false;
            const unsavedIndicator = document.querySelector('.unsaved-indicator');
            if (unsavedIndicator) {
                unsavedIndicator.style.display = 'none';
            }
            
            // Close the modal first
            closeModalWithoutSaving();
            
            // Ensure we're in normal view mode, not archived
            viewMode = 'active';
            
            // Clear any filters that might prevent the note from showing
            selectedTags = ['all'];
            searchTerm = '';
            
            // Clear the search input
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Update filter UI
            document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('active'));
            const allTagElement = document.querySelector('[data-tag="all"]');
            if (allTagElement) {
                allTagElement.classList.add('active');
            }
            
            // Reload the notes and wait for them to be displayed
            loadNotes()
                .then(notes => {
                    console.log(`Successfully loaded ${notes.length} notes after saving`);
                    
                    // Reload tags to ensure the sidebar is updated
                    loadTags();
                    
                    // Refresh masonry layout after notes are loaded and displayed
                    refreshMasonryLayout();
                })
                .catch(error => {
                    console.error('Error loading notes after save:', error);
                    alert('There was an error saving your note. Please try again.');
                });
        };
        
        addRequest.onerror = function(event) {
            console.error('Error creating new note:', event.target.error);
            alert('There was an error saving your note. Please try again.');
        };
    }
}

function preserveHeadingFormatting(htmlContent) {
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Ensure all heading tags have explicit styling
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
        // Add data attribute to ensure we know what type it is
        heading.setAttribute('data-heading-level', heading.tagName.substring(1));
        
        // Apply explicit styling based on heading level
        switch(heading.tagName) {
            case 'H1':
                heading.style.fontSize = '1.8rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '10px 0';
                heading.style.color = 'var(--text-primary)';
                break;
            case 'H2':
                heading.style.fontSize = '1.5rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '8px 0';
                heading.style.color = 'var(--text-primary)';
                break;
            case 'H3':
                heading.style.fontSize = '1.3rem';
                heading.style.fontWeight = 'bold';
                heading.style.margin = '6px 0';
                heading.style.color = 'var(--text-primary)';
                break;
        }
    });
    
    return tempDiv.innerHTML;
}

function cleanupHeadingTags(htmlContent) {
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Ensure all heading tags are properly formatted
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
        // Make sure the heading has proper formatting
        heading.style.margin = heading.tagName === 'H1' ? '10px 0' : '8px 0';
        heading.style.color = 'var(--text-primary)';
        
        // Set appropriate font sizes based on heading level
        switch(heading.tagName) {
            case 'H1':
                heading.style.fontSize = '1.8rem';
                break;
            case 'H2':
                heading.style.fontSize = '1.5rem';
                break;
            case 'H3':
                heading.style.fontSize = '1.3rem';
                break;
            default:
                // Other heading levels
                break;
        }
    });
    
    return tempDiv.innerHTML;
}

// Delete a note
function deleteNote() {
    if (!currentNote) {
        console.error('No note to delete');
        return;
    }
    
    console.log(`Deleting note: ${currentNote.id}`);
    
    // Ask for confirmation
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }
    
    const transaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readwrite');
    const notesStore = transaction.objectStore(NOTES_STORE);
    
    // First get the note to access its tags
    const getRequest = notesStore.get(currentNote.id);
    
    getRequest.onsuccess = () => {
        const noteToDelete = getRequest.result;
        if (!noteToDelete) {
            console.error('Note not found');
            return;
        }
        
        // Get the tags from the note
        const noteTags = noteToDelete.tags || [];
        
        // Delete note from database
        notesStore.delete(currentNote.id).onsuccess = () => {
            console.log('Note deleted successfully');
            
            // Update tag counts by decrementing each tag used in the note
            if (noteTags.length > 0) {
                // Use updateTagsStore with empty array for newTags to decrement all old tags
                updateTagsStore([], transaction, noteTags);
                console.log('Tag counts updated after note deletion');
            }
            
            // Close the modal
            closeNoteModal();
            
            // Load notes to refresh the display
            loadNotes().then(() => {
                // Refresh masonry layout after notes are reloaded
                refreshMasonryLayout();
            });
        };
    };
    
    getRequest.onerror = (error) => {
        console.error('Error getting note to delete:', error);
    };
}

// Archive or unarchive a note
function archiveNote() {
    if (!currentNote) {
        console.error('No note to archive');
        return;
    }
    
    // Toggle archived status
    const newStatus = !currentNote.isArchived;
    console.log(`${newStatus ? 'Archiving' : 'Unarchiving'} note: ${currentNote.id}`);
    
    const transaction = db.transaction([NOTES_STORE], 'readwrite');
    const notesStore = transaction.objectStore(NOTES_STORE);
    
    // Get the note first
    notesStore.get(currentNote.id).onsuccess = event => {
        const note = event.target.result;
        if (!note) {
            console.error('Note not found');
            return;
        }
        
        // Update archived status
        note.isArchived = newStatus;
        // Also update the 'archived' property for compatibility with older code
        note.archived = newStatus;
        
        // Save updated note
        notesStore.put(note).onsuccess = () => {
            console.log(`Note ${newStatus ? 'archived' : 'unarchived'} successfully`);
            
            // Update UI
            const archiveButton = document.querySelector('.archive-btn');
            if (archiveButton) {
                archiveButton.textContent = newStatus ? 'Unarchive' : 'Archive';
            }
            
            // Update current note reference
            currentNote = note;
            
            // Always close the modal after archiving/unarchiving
            closeNoteModal();
            
            // Reload notes to refresh the display
            loadNotes().then(() => {
                // Refresh masonry layout after notes are reloaded
                refreshMasonryLayout();
            });
        };
    };
}

// Print note to PDF - Fixed version
function printToPdf() {
    const modal = document.getElementById('note-modal');
    const noteId = modal ? modal.dataset.noteId : null; // Get ID from modal dataset

    console.log('printToPdf called for note ID:', noteId); // Log the ID being used

    if (!noteId) {
        console.error('Could not determine note ID for printing.');
        return;
    }

    // Get title and content directly from the DOM to ensure we have the latest content
    const titleElement = document.getElementById('edit-note-title');
    const contentElement = document.getElementById('edit-note-content');

    if (!titleElement || !contentElement) {
        console.error('Could not find title or content elements for printing');
        return;
    }

    const title = titleElement.textContent.trim(); // Use textContent for title
    let content = contentElement.innerHTML;

    // Clean up content for printing
    content = cleanContentForPrinting(content);

    console.log('Attempting to open print window for:', title);
    console.log('Cleaned content length:', content.length);

    // Create a new window with just the note content
    const printWindow = window.open('', '_blank', 'width=800,height=600'); // Added size suggestion

    if (!printWindow) {
        console.error('Failed to open print window. Possible popup blocker?');
        alert('Could not open print window. Please check if your browser is blocking popups for this page.');
        return;
    }

    console.log('Print window opened successfully.'); // Log success

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title || 'Note'} - Print Preview</title>
            <style>
                /* ... (keep existing styles) ... */
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    line-height: 1.5;
                    max-width: 800px;
                    margin: 0 auto;
                    -webkit-print-color-adjust: exact; /* Ensure background colors print */
                    print-color-adjust: exact;
                }
                h1 {
                    font-size: 1.5rem;
                    margin-bottom: 16px;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 8px;
                }
                img {
                    max-width: 100%;
                    height: auto;
                    display: block; /* Prevent extra space below images */
                    margin: 10px 0;
                }
                ul, ol {
                    margin-left: 20px; /* Adjusted margin */
                    padding-left: 20px; /* Add padding for bullets/numbers */
                }
                li {
                    margin-bottom: 5px; /* Space between list items */
                }
                a {
                    color: #0066cc;
                    text-decoration: underline;
                }
                .note-content {
                    margin-top: 20px;
                }
                pre { /* Added pre styling */
                    background-color: #f0f0f0;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto; /* Handle long lines */
                    white-space: pre-wrap; /* Wrap lines */
                    word-wrap: break-word;
                }
                code {
                    background-color: #f0f0f0; /* Consistent background */
                    border-radius: 3px;
                    padding: 2px 4px;
                    font-family: 'Courier New', monospace; /* Monospace font */
                    font-size: 0.9em;
                }
                blockquote {
                    border-left: 4px solid #ccc; /* Thicker border */
                    padding: 10px 15px; /* More padding */
                    color: #555; /* Darker text */
                    margin: 15px 0; /* More margin */
                    background-color: #f9f9f9; /* Subtle background */
                }
                /* Ensure content takes up space */
                 p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre {
                   margin-bottom: 1em; /* Standard bottom margin */
                 }
                 p:last-child, h1:last-child /* etc */ {
                   margin-bottom: 0; /* No margin on last element */
                 }
            </style>
            <script>
                function printWhenReady() {
                    console.log('Print window content loaded.');
                    // Use requestAnimationFrame for smoother rendering before print
                    requestAnimationFrame(() => {
                         // A small delay can sometimes help ensure rendering completes
                        setTimeout(() => {
                            try {
                                console.log('Executing window.print()...');
                                window.print();
                                console.log('window.print() executed.');
                                // Close might happen too fast, let's delay it slightly after print
                                setTimeout(() => { window.close(); }, 100);
                            } catch (e) {
                                console.error('Error during print:', e);
                                // Optionally close even if print fails
                                // window.close();
                            }
                        }, 150); // Slightly increased delay
                    });
                }

                // Use DOMContentLoaded for faster script execution
                document.addEventListener('DOMContentLoaded', function() {
                     console.log('Print window DOMContentLoaded.');
                     // Check images, similar to before, but simplified
                     const images = document.querySelectorAll('img');
                     let loadedImages = 0;
                     const totalImages = images.length;

                     if (totalImages === 0) {
                         printWhenReady();
                     } else {
                         console.log('Waiting for ' + totalImages + ' image(s) to load...');
                         images.forEach(img => {
                             if (img.complete) {
                                 loadedImages++;
                             } else {
                                 img.onload = img.onerror = () => {
                                     loadedImages++;
                                     console.log('Image loaded/error (' + loadedImages + '/' + totalImages + ')');
                                     if (loadedImages === totalImages) {
                                         console.log('All images loaded/processed.');
                                         printWhenReady();
                                     }
                                 };
                             }
                         });
                         // If all images were already complete in the loop
                         if (loadedImages === totalImages) {
                              console.log('All images were already complete.');
                              printWhenReady();
                         }
                         // Add a timeout failsafe in case onload/onerror doesn't fire
                         setTimeout(() => {
                             if (loadedImages < totalImages) {
                                 console.warn('Image load timeout reached, attempting print anyway.');
                                 printWhenReady();
                             }
                         }, 5000); // 5 second timeout
                     }
                 });

                // Fallback if DOMContentLoaded doesn't cover everything
                window.onload = function() {
                    console.log('Print window full load event fired.');
                    // Potentially call printWhenReady() again if needed,
                    // but DOMContentLoaded should be sufficient usually.
                };

                // Removed onafterprint as it's less reliable
                // window.onafterprint = function() { window.close(); };
            </script>
        </head>
        <body>
            ${title ? `<h1>${title}</h1>` : ''}
            <div class="note-content">${content}</div>
        </body>
        </html>
    `);

    printWindow.document.close();
    console.log('Print window document closed.');
}

// Helper function to clean up content for printing
function cleanContentForPrinting(html) {
    // Create a temporary div to manipulate the content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove any contenteditable attributes
    const editableElements = tempDiv.querySelectorAll('[contenteditable]');
    editableElements.forEach(el => {
        el.removeAttribute('contenteditable');
    });
    
    // Remove any resize handles
    const resizeHandles = tempDiv.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.remove();
    });
    
    // Remove any data attributes
    const elementsWithData = tempDiv.querySelectorAll('[data-placeholder]');
    elementsWithData.forEach(el => {
        el.removeAttribute('data-placeholder');
    });
    
    // Make sure all images have max-width set
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
    });
    
    return tempDiv.innerHTML;
}

// Filter notes by tag
function filterByTag(tag, isCtrlPressed = false) {
    // Handle ctrl+click for multi-selection
    if (isCtrlPressed && tag !== 'all') {
        // If 'all' is currently selected and user ctrl+clicks a tag, start fresh with just that tag
        if (selectedTags.includes('all')) {
            selectedTags = [tag];
        } else {
            // Toggle the tag - add if not present, remove if already selected
            const tagIndex = selectedTags.indexOf(tag);
            if (tagIndex === -1) {
                // Add tag to selection
                selectedTags.push(tag);
            } else {
                // Remove tag from selection if it's already there
                selectedTags.splice(tagIndex, 1);
                // If no tags left, revert to 'all'
                if (selectedTags.length === 0) {
                    selectedTags = ['all'];
                }
            }
        }
    } else {
        // Without Ctrl key, just select the single tag
        selectedTags = [tag];
    }
    
    // Update active tags in sidebar
    const tagItems = tagList.querySelectorAll('.tag-item');
    tagItems.forEach(item => {
        item.classList.remove('active', 'multi-selected');
        if (selectedTags.includes(item.dataset.tag)) {
            item.classList.add('active');
            // Add multi-selected class if more than one tag is selected
            if (selectedTags.length > 1 && selectedTags[0] !== 'all') {
                item.classList.add('multi-selected');
            }
        }
    });
    
    // Remove call to updateFilterStatus since we're removing that feature
    
    // Update notes display
    loadNotes();
}

// Handle search function
function handleSearch(event) {
    searchTerm = event.target.value.trim();
    loadNotes();
}

// Add a function to recalculate tag counts
function recalculateTagCounts() {
    // Show a loading notification
    showStatusNotification("Repairing tags, please wait...");
    
    // Check if database is available
    if (!db) {
        console.error('Database not available');
        showStatusNotification("Database not available, can't repair tags", "error");
        return;
    }
    
    const tagsToPreserve = {}; // Store for preserving custom colors
    const tagCaseMap = {}; // Map to track case variations of the same tag
    
    // First, collect existing tags with their colors
    const collectTagsTransaction = db.transaction([TAGS_STORE], 'readonly');
    const tagsStore = collectTagsTransaction.objectStore(TAGS_STORE);
    
    tagsStore.getAll().onsuccess = function(event) {
        const existingTags = event.target.result;
        
        // Build a lookup of tag names to their colors
        existingTags.forEach(tag => {
            const lowerCaseTagName = tag.name.toLowerCase();
            if (tag.color) {
                // Store the color with the lowercase version of the tag name
                tagsToPreserve[lowerCaseTagName] = tag.color;
            }
            
            // Track the lowercase mapping for this tag
            tagCaseMap[tag.name] = lowerCaseTagName;
        });
        
        // Now proceed with tag repair
        const transaction = db.transaction([NOTES_STORE, 'archivedNotes', TAGS_STORE], 'readwrite');
        const notesStore = transaction.objectStore(NOTES_STORE);
        const archivedStore = transaction.objectStore('archivedNotes');
        const repairTagsStore = transaction.objectStore(TAGS_STORE);
        
        // Clear the tags store
        repairTagsStore.clear().onsuccess = function() {
            const tagCount = {};
            const notesToUpdate = [];
            
            // Get all active notes
            notesStore.getAll().onsuccess = function(event) {
                const notes = event.target.result;
                
                // Count tags in active notes and normalize case
                notes.forEach(note => {
                    if (note.tags && Array.isArray(note.tags)) {
                        let tagsModified = false;
                        const normalizedTags = [];
                        
                        note.tags.forEach(tag => {
                            // Convert tag to lowercase
                            const lowerCaseTag = tag.toLowerCase();
                            
                            // Add to normalized tags list
                            if (!normalizedTags.includes(lowerCaseTag)) {
                                normalizedTags.push(lowerCaseTag);
                            }
                            
                            // Count the lowercase version
                            tagCount[lowerCaseTag] = (tagCount[lowerCaseTag] || 0) + 1;
                            
                            // Check if the tag was modified (case change)
                            if (tag !== lowerCaseTag) {
                                tagsModified = true;
                            }
                        });
                        
                        // If any tag was modified, update the note
                        if (tagsModified) {
                            note.tags = normalizedTags;
                            notesToUpdate.push({ store: notesStore, note: note });
                        }
                    }
                });
                
                // Get all archived notes
                archivedStore.getAll().onsuccess = function(event) {
                    const archivedNotes = event.target.result;
                    
                    // Count tags in archived notes and normalize case
                    archivedNotes.forEach(note => {
                        if (note.tags && Array.isArray(note.tags)) {
                            let tagsModified = false;
                            const normalizedTags = [];
                            
                            note.tags.forEach(tag => {
                                // Convert tag to lowercase
                                const lowerCaseTag = tag.toLowerCase();
                                
                                // Add to normalized tags list
                                if (!normalizedTags.includes(lowerCaseTag)) {
                                    normalizedTags.push(lowerCaseTag);
                                }
                                
                                // Count the lowercase version
                                tagCount[lowerCaseTag] = (tagCount[lowerCaseTag] || 0) + 1;
                                
                                // Check if the tag was modified (case change)
                                if (tag !== lowerCaseTag) {
                                    tagsModified = true;
                                }
                            });
                            
                            // If any tag was modified, update the note
                            if (tagsModified) {
                                note.tags = normalizedTags;
                                notesToUpdate.push({ store: archivedStore, note: note });
                            }
                        }
                    });
                    
                    // Update any notes with case-normalized tags
                    notesToUpdate.forEach(item => {
                        item.store.put(item.note);
                    });
                    
                    // Rebuild the tags store with counts
                    for (const [tagName, count] of Object.entries(tagCount)) {
                        const tagObject = {
                            name: tagName, // Always lowercase
                            count: count
                        };
                        
                        // Preserve the color if it existed
                        if (tagsToPreserve[tagName]) {
                            tagObject.color = tagsToPreserve[tagName];
                        }
                        
                        repairTagsStore.add(tagObject);
                    }
                    
                    transaction.oncomplete = function() {
                        loadTags();
                        const updatedNotesCount = notesToUpdate.length;
                        if (updatedNotesCount > 0) {
                            showStatusNotification(`Tags repaired successfully. Fixed case in ${updatedNotesCount} notes.`, "success");
                        } else {
                            showStatusNotification("Tags repaired successfully", "success");
                        }
                    };
                };
            };
        };
    };
    
    collectTagsTransaction.onerror = function(event) {
        showStatusNotification("Failed to repair tags", "error");
        console.error("Database error:", event.target.errorCode);
    };
}

// Helper function to create status element if it doesn't exist
function createStatusElement() {
    const statusElement = document.createElement('div');
    statusElement.id = 'status-message';
    statusElement.style.position = 'fixed';
    statusElement.style.top = '10px';
    statusElement.style.left = '50%';
    statusElement.style.transform = 'translateX(-50%)';
    statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    statusElement.style.color = 'white';
    statusElement.style.padding = '10px 20px';
    statusElement.style.borderRadius = '5px';
    statusElement.style.zIndex = '1000';
    statusElement.style.display = 'none';
    document.body.appendChild(statusElement);
    return statusElement;
}

// Set up event listeners for view toggle buttons
function setupViewToggleButtons() {
    const viewToggle = document.getElementById('view-toggle');
    if (!viewToggle) {
        console.warn('View toggle not found');
        return;
    }
    
    const viewButtons = viewToggle.querySelectorAll('button');
    
    // Ensure correct button is highlighted based on current viewMode
    viewButtons.forEach(button => {
        if (button.getAttribute('data-view') === viewMode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            viewButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Set view mode
            viewMode = this.getAttribute('data-view');
            console.log(`Switching to ${viewMode} view mode`);
            
            // Reload notes with new view mode
            loadNotes();
        });
    });
    console.log('View toggle buttons initialized');
}

// Add Repair Tags button to the sidebar
function addRepairTagsButton() {
    // The repair tags button is now in the header, so this function is a no-op
    console.log("Repair Tags button is now in the header, no need to add it to sidebar");
    return;
}

// Create a repair button by directly targeting the export area
function createDirectRepairButton() {
    // Based on the screenshot, try to find the export container more directly
    const exportContainer = document.querySelector('.sidebar > div:last-child') || 
                           document.querySelector('#sidebar > div:last-child');
    
    if (exportContainer) {
        const repairButton = document.createElement('button');
        repairButton.id = 'repair-tags-btn';
        repairButton.className = 'backup-btn'; // Use the same class as other buttons
        
        repairButton.innerHTML = '<i class="fas fa-tools"></i> Repair Tags';
        repairButton.title = 'Recalculate all tag counts';
        
        repairButton.addEventListener('click', function() {
            if (confirm('Repair all tag counts? This will scan all notes and update tag counts accordingly.')) {
                recalculateTagCounts();
            }
        });
        
        exportContainer.appendChild(repairButton);
        console.log("Repair Tags button added to export container");
    } else {
        // Last resort, create a floating button
        createFloatingRepairButton();
    }
}

// Create a floating button if we can't find the sidebar
function createFloatingRepairButton() {
    if (!document.getElementById('floating-repair-btn')) {
        const floatingBtn = document.createElement('button');
        floatingBtn.id = 'floating-repair-btn';
        floatingBtn.innerHTML = '<i class="fas fa-tools"></i> Repair Tags';
        floatingBtn.title = 'Recalculate all tag counts';
        floatingBtn.style.position = 'fixed';
        floatingBtn.style.bottom = '20px';
        floatingBtn.style.right = '20px';
        floatingBtn.style.padding = '10px 15px';
        floatingBtn.style.backgroundColor = '#4CAF50';
        floatingBtn.style.color = 'white';
        floatingBtn.style.border = 'none';
        floatingBtn.style.borderRadius = '4px';
        floatingBtn.style.cursor = 'pointer';
        floatingBtn.style.zIndex = '1000';
        floatingBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        
        floatingBtn.addEventListener('click', function() {
            if (confirm('Repair all tag counts? This will scan all notes and update tag counts accordingly.')) {
                recalculateTagCounts();
            }
        });
        
        document.body.appendChild(floatingBtn);
        console.log("Floating Repair Tags button added");
    }
}

// Highlight search terms in notes
function highlightSearchTerm() {
    if (!searchTerm) return;
    
    const term = searchTerm.toLowerCase();
    const noteContents = document.querySelectorAll('.note-content');
    
    noteContents.forEach(content => {
        // Get text nodes only (not inside HTML tags)
        const walkTree = document.createTreeWalker(
            content, 
            NodeFilter.SHOW_TEXT, 
            node => {
                // Don't process text in script or style tags
                if (node.parentNode.tagName === 'SCRIPT' || 
                    node.parentNode.tagName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                // Only process text nodes that contain our search term
                if (node.textContent.toLowerCase().includes(term)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        );
        
        // Collect all matching text nodes
        const matchingNodes = [];
        let currentNode;
        while (currentNode = walkTree.nextNode()) {
            matchingNodes.push(currentNode);
        }
        
        // Process nodes in reverse order to avoid messing up the tree walker
        for (let i = matchingNodes.length - 1; i >= 0; i--) {
            const node = matchingNodes[i];
            const text = node.textContent;
            const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
            
            // Create a document fragment with highlighted terms
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                // Add text before the match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(
                        text.substring(lastIndex, match.index)
                    ));
                }
                
                // Add the highlighted match
                const span = document.createElement('span');
                span.className = 'highlight';
                span.style.backgroundColor = 'var(--accent-light)';
                span.style.color = 'var(--accent)';
                span.style.padding = '0 2px';
                span.style.borderRadius = '2px';
                span.textContent = match[0];
                fragment.appendChild(span);
                
                lastIndex = match.index + match[0].length;
            }
            
            // Add any remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(
                    text.substring(lastIndex)
                ));
            }
            
            // Replace the original node with our fragment
            node.parentNode.replaceChild(fragment, node);
        }
    });
}

// Add search help tooltip
function addSearchHelpTooltip() {
    // Create the search help button
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    const helpButton = document.createElement('button');
    helpButton.className = 'search-help-button';
    helpButton.innerHTML = '?';
    helpButton.title = 'Search Help';
    
    // Create the tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'search-help-tooltip';
    tooltip.innerHTML = `
        <h4>Search Tips</h4>
        <p>Search by text: Just type any word</p>
        <p>Search by date: Type "date:yyyy-mm-dd"</p>
        <p>Example: date:2023-12-25</p>
    `;
    
    // Append elements
    helpButton.appendChild(tooltip);
    searchContainer.appendChild(helpButton);
    
    // Show/hide tooltip on click
    helpButton.addEventListener('click', function(e) {
        e.stopPropagation();
        tooltip.classList.toggle('active');
    });
    
    // Hide tooltip when clicking elsewhere
    document.addEventListener('click', function() {
        tooltip.classList.remove('active');
    });
}

// Extract tags from content (#tag)
function extractTags(content) {
    // Create a temporary div to extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Replace all HTML block elements with spaces to ensure tag boundaries
    const html = tempDiv.innerHTML;
    const processedHtml = html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<div>/gi, ' ')
        .replace(/<\/div>/gi, ' ')
        .replace(/<p>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<h[1-6]>/gi, ' ')
        .replace(/<\/h[1-6]>/gi, ' ');
        
    tempDiv.innerHTML = processedHtml;
    
    // Get text with proper spaces
    const text = tempDiv.textContent || tempDiv.innerText;
    
    // Find hashtags followed by word characters, ensuring they end properly
    const tagRegex = /#(\w+)(?=\s|$)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
        // Convert tag to lowercase for consistent storage
        const tagLowerCase = match[1].toLowerCase();
        if (!tags.includes(tagLowerCase)) {
            tags.push(tagLowerCase);
        }
    }
    
    return tags;
}

// Add these helper functions at the top of your script
function updateToolbarState(editor) {
    // Find the toolbar associated with this editor
    let toolbar;
    if (editor === document.getElementById('create-note-content')) {
        toolbar = document.getElementById('create-toolbar');
    } else if (editor === document.getElementById('edit-note-content')) {
        toolbar = document.getElementById('edit-toolbar');
    } else {
        return; // No matching editor found
    }

    // If no toolbar found, exit
    if (!toolbar) return;

    // Get all formatting buttons in the toolbar
    const buttons = toolbar.querySelectorAll('button[data-command]');
    
    // Check each button's command state
    buttons.forEach(button => {
        const command = button.getAttribute('data-command');
        
        try {
            // Special handling for heading commands since they're not standard execCommand
            if (command.startsWith('h') || command === 'p') {
                // Get current selection parent element
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const parentElement = range.commonAncestorContainer.parentElement || range.commonAncestorContainer;
                    
                    // Check if the current element or any parent is the heading type
                    let currentElement = parentElement;
                    let foundHeading = false;
                    
                    while (currentElement && currentElement !== editor) {
                        if (currentElement.tagName && currentElement.tagName.toLowerCase() === command) {
                            button.classList.add('active');
                            foundHeading = true;
                            break;
                        }
                        currentElement = currentElement.parentElement;
                    }
                    
                    if (!foundHeading) {
                        button.classList.remove('active');
                    }
                }
            } 
            // Standard execCommand states
            else if (command !== 'createLink') { // Skip link button
                // Check if the command is currently active
                const isActive = document.queryCommandState(command);
                
                // Update button state
                if (isActive) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        } catch (e) {
            // Silent catch - don't log errors for state checking
        }
    });
}

// Ensure our custom toolbar code is executed on page load
document.addEventListener('DOMContentLoaded', function() {
    Logger.log("Setting up application");
    
    // Initialize database first, then call original initApp
    initDB().then(() => {
        initApp().catch(err => {
            Logger.error('Error during app initialization:', err);
        });
        
        // Apply masonry layout after initialization
        setTimeout(() => {
            applyMasonryLayout();
        }, 100);
        
        // Initialize settings
        initSettings();
        
        // Add event listener for Reset Database button in settings
        const resetDbBtn = document.getElementById('reset-database-btn');
        if (resetDbBtn) {
            resetDbBtn.addEventListener('click', deleteDatabase);
        }
    }).catch(err => {
        Logger.error('Database initialization failed:', err);
    });
});

// Helper function to escape special characters in regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Add event listeners for selection changes
function setupFormatting() {
    console.log("Setting up formatting and tag suggestions");
    
    // Clean up any existing tag suggestion container to avoid duplicates
    if (tagSuggestionContainer) {
        if (tagSuggestionContainer.parentNode) {
            tagSuggestionContainer.parentNode.removeChild(tagSuggestionContainer);
        }
        tagSuggestionContainer = null;
    }
    
    // Reset tag suggestion state
    tagSuggestionActive = false;
    tagSuggestionStart = null;
    currentTagText = '';
    selectedSuggestionIndex = 0;
    
    // Set up event listeners for the create note editor
    const createNoteContent = document.getElementById('create-note-content');
    if (createNoteContent) {
        createNoteContent.addEventListener('keyup', debounce(() => {
            updateToolbarState(createNoteContent);
        }, 100));
        
        createNoteContent.addEventListener('mouseup', debounce(() => {
            updateToolbarState(createNoteContent);
        }, 100));
        
        // Update toolbar on click - helps with button state when clicking in text
        createNoteContent.addEventListener('click', debounce(() => {
            updateToolbarState(createNoteContent);
        }, 100));
        
        // Clean up old event listeners to prevent duplicates
        createNoteContent.removeEventListener('keydown', handleTagSuggestions);
        createNoteContent.removeEventListener('keyup', checkForTagStart);
        
        // Add tag suggestion event listeners
        createNoteContent.addEventListener('keydown', handleTagSuggestions);
        createNoteContent.addEventListener('keyup', checkForTagStart);
    }
    
    // Set up event listeners for the edit note editor
    const editNoteContent = document.getElementById('edit-note-content');
    if (editNoteContent) {
        editNoteContent.addEventListener('keyup', debounce(() => {
            updateToolbarState(editNoteContent);
        }, 100));
        
        editNoteContent.addEventListener('mouseup', debounce(() => {
            updateToolbarState(editNoteContent);
        }, 100));
        
        // Update toolbar on click - helps with button state when clicking in text
        editNoteContent.addEventListener('click', debounce(() => {
            updateToolbarState(editNoteContent);
        }, 100));
        
        // Clean up old event listeners to prevent duplicates
        editNoteContent.removeEventListener('keydown', handleTagSuggestions);
        editNoteContent.removeEventListener('keyup', checkForTagStart);
        
        // Add tag suggestion event listeners
        editNoteContent.addEventListener('keydown', handleTagSuggestions);
        editNoteContent.addEventListener('keyup', checkForTagStart);
    }
    
    // Set up a global click handler to close tag suggestions when clicking outside
    document.removeEventListener('mousedown', closeSuggestionsOnOutsideClick);
    document.addEventListener('mousedown', closeSuggestionsOnOutsideClick);
}

// Function to close tag suggestions when clicking outside the editor and suggestions
function closeSuggestionsOnOutsideClick(event) {
    if (!tagSuggestionActive || !tagSuggestionContainer) return;
    
    const createNoteContent = document.getElementById('create-note-content');
    const editNoteContent = document.getElementById('edit-note-content');
    
    // Check if click is outside both the editor and suggestions container
    const isOutsideEditor = 
        (!createNoteContent || !createNoteContent.contains(event.target)) && 
        (!editNoteContent || !editNoteContent.contains(event.target));
    const isOutsideSuggestions = !tagSuggestionContainer.contains(event.target);
    
    if (isOutsideEditor && isOutsideSuggestions) {
        closeSuggestions();
    }
}

// Simple debounce function to limit how often a function can be called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Helper function to mark unsaved changes
function markUnsavedChanges() {
    // Check if we're in edit mode by checking if the note modal is active
    if (document.querySelector('.note-modal.active')) {
        if (!hasUnsavedChanges) {
            hasUnsavedChanges = true;
            if (unsavedIndicator) {
                unsavedIndicator.style.display = 'inline-block';
            }
        }
    }
}

// Update tags store
function updateTagsStore(newTags, transaction, oldTags) {
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Ensure arrays are defined
    newTags = Array.isArray(newTags) ? newTags : [];
    oldTags = Array.isArray(oldTags) ? oldTags : [];
    
    console.log('Updating tag counts:', { oldTags, newTags });
    
    // 1. Handle removed tags - decrement counts for tags that were removed
    oldTags.forEach(tag => {
        if (!newTags.includes(tag)) {
            console.log(`Tag removed: ${tag}, decrementing count`);
            const tagRequest = tagsStore.get(tag);
            
            tagRequest.onsuccess = () => {
                const existingTag = tagRequest.result;
                if (existingTag) {
                    existingTag.count--;
                    
                    // If count reaches 0, delete the tag
                    if (existingTag.count <= 0) {
                        console.log(`Removing tag ${tag} as count is 0`);
                        tagsStore.delete(tag);
                    } else {
                        // Otherwise update the count
                        console.log(`Updating tag ${tag} count to ${existingTag.count}`);
                        tagsStore.put(existingTag);
                    }
                }
            };
        }
    });
    
    // Get all existing tags to check colors
    const getAllTagsRequest = tagsStore.getAll();
    
    getAllTagsRequest.onsuccess = () => {
        const allTags = getAllTagsRequest.result;
        const existingColors = allTags.map(tag => tag.color).filter(Boolean);
        
        // 2. Handle added tags - increment counts for new tags or create new tags
        newTags.forEach(tag => {
            if (!oldTags.includes(tag)) {
                console.log(`Tag added: ${tag}, incrementing count`);
                const tagRequest = tagsStore.get(tag);
                
                tagRequest.onsuccess = () => {
                    const existingTag = tagRequest.result;
                    if (existingTag) {
                        existingTag.count++;
                        console.log(`Updating tag ${tag} count to ${existingTag.count}`);
                        tagsStore.put(existingTag);
                    } else {
                        // Generate a unique color for the new tag
                        const uniqueColor = getUniqueRandomColor(existingColors);
                        console.log(`Creating new tag ${tag} with count 1 and unique color ${uniqueColor}`);
                        
                        // Add the new color to our tracking array for subsequent tags
                        existingColors.push(uniqueColor);
                        
                        // Create the new tag with a unique color
                        tagsStore.add({ 
                            name: tag, 
                            count: 1,
                            color: uniqueColor
                        });
                    }
                };
            }
        });
    };
    
    // Reload tags after the transaction completes
    transaction.oncomplete = function() {
        // Load tags to refresh the sidebar tag list
        loadTags();
    };
    
    // No need to return a Promise as we're using the transaction directly
    return transaction;
}

// Now let's add the missing exportBackup function
function exportBackup() {
    const exportRequest = indexedDB.open(DB_NAME);
    
    exportRequest.onsuccess = function(event) {
        const db = event.target.result;
        const version = db.version;
        db.close();
        
        openDatabaseAndExport(version);
    };
    
    exportRequest.onerror = function(event) {
        console.error('Error opening database for export:', event.target.error);
        alert('Could not export notes: ' + event.target.error);
    };
    
    function openDatabaseAndExport(version) {
        const request = indexedDB.open(DB_NAME, version);
        
        request.onsuccess = function(event) {
            const exportDb = event.target.result;
            const transaction = exportDb.transaction([NOTES_STORE, TAGS_STORE], 'readonly');
            const notesStore = transaction.objectStore(NOTES_STORE);
            const tagsStore = transaction.objectStore(TAGS_STORE);
            
            const notesRequest = notesStore.getAll();
            const tagsRequest = tagsStore.getAll();
            
            // When both requests complete, create the backup
            Promise.all([
                new Promise(resolve => { notesRequest.onsuccess = () => resolve(notesRequest.result); }),
                new Promise(resolve => { tagsRequest.onsuccess = () => resolve(tagsRequest.result); })
            ]).then(([notes, tags]) => {
                const backup = {
                    notes: notes,
                    tags: tags,
                    exportDate: new Date().toISOString(),
                    dbVersion: version
                };
                
                // Add version info to backup
                backup.appVersion = APP_VERSION;
                backup.versionTimestamp = new Date().toISOString();
                
                const jsonBackup = JSON.stringify(backup);
                
                // Try to use the File System Access API if available
                if ('showSaveFilePicker' in window) {
                    saveWithFileSystemAPI(jsonBackup);
                } else {
                    downloadBackupFile(jsonBackup);
                }
                
                exportDb.close();
            });
        };
        
        request.onerror = function(event) {
            console.error('Error opening database for export:', event.target.error);
            alert('Could not export notes: ' + event.target.error);
        };
    }
}

// New function to save using File System Access API
async function saveWithFileSystemAPI(jsonBackup) {
    try {
        // Request a file handle to save to
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `notes_backup_${new Date().toISOString().slice(0, 10)}.json`,
            types: [{
                description: 'JSON Files',
                accept: {'application/json': ['.json']}
            }]
        });
        
        // Create a writable stream and write the file
        const writable = await fileHandle.createWritable();
        await writable.write(jsonBackup);
        await writable.close();
        
        console.log('File saved successfully using File System Access API');
        alert('Backup saved successfully!');
    } catch (error) {
        console.error('Error saving with File System Access API:', error);
        
        // If user cancelled, don't show error
        if (error.name !== 'AbortError') {
            // Fall back to traditional download method
            console.log('Falling back to traditional download method');
            downloadBackupFile(jsonBackup);
        }
    }
}

// Original download method extracted to its own function
function downloadBackupFile(jsonBackup) {
    // Create a blob with the JSON data
    const blob = new Blob([jsonBackup], { type: 'application/json' });
    
    // Create a download link and trigger it
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    
    // Append to body, trigger the download and remove the link
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up by removing the link element and revoking the blob URL
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }, 100);
}

// Add import functionality
function importBackup(file) {
    if (!file) {
        console.error('No file selected');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const backup = JSON.parse(event.target.result);
            
            // Check for app version compatibility
            if (backup.appVersion) {
                // Compare versions for informational purposes
                const currentVersion = APP_VERSION.split('.').map(Number);
                const backupVersion = backup.appVersion.split('.').map(Number);
                
                // Log backup information
                console.log(`Importing backup from ${backup.appVersion} created on ${new Date(backup.versionTimestamp || backup.exportDate).toLocaleString()}`);
                
                // Check if backup is from a newer version and warn
                let isNewer = false;
                for (let i = 0; i < Math.min(currentVersion.length, backupVersion.length); i++) {
                    if (backupVersion[i] > currentVersion[i]) {
                        isNewer = true;
                        break;
                    } else if (backupVersion[i] < currentVersion[i]) {
                        break;
                    }
                }
                
                if (isNewer) {
                    // Backup is from a newer version
                    const proceed = confirm(`This backup was created with a newer version of the app (v${backup.appVersion}). Your current version is v${APP_VERSION}. Importing may cause compatibility issues. Continue anyway?`);
                    if (!proceed) return;
                }
                
                showStatusNotification(`Importing backup from v${backup.appVersion}`);
            }
            
            // Apply schema migrations to the backup data if needed
            migrateBackupData(backup);
            
            // Import notes with transformed data
            importNotes(backup.notes);
            
            // Import tags if they exist
            if (backup.tags && Array.isArray(backup.tags)) {
                const transaction = db.transaction([TAGS_STORE], 'readwrite');
                const tagsStore = transaction.objectStore(TAGS_STORE);
                
                // Clear existing tags
                tagsStore.clear();
                
                // Add imported tags
                backup.tags.forEach(tag => {
                    tagsStore.put(tag);
                });
                
                transaction.oncomplete = function() {
                    // Reload tags in UI
                    loadTags();
                    showStatusNotification('Import completed successfully');
                };
            } else {
                showStatusNotification('Import completed successfully');
            }
        } catch (error) {
            console.error('Error parsing backup:', error);
            showStatusNotification('Failed to import backup: Invalid format', 'error');
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        showStatusNotification('Failed to read backup file', 'error');
    };
    
    reader.readAsText(file);
}

/**
 * Applies necessary migrations to backup data based on version differences
 * This function transforms backup data to be compatible with the current schema
 */
function migrateBackupData(backup) {
    // If no version info, assume it's a very old backup
    const backupVersion = backup.appVersion || '0.0.0';
    
    // Apply migrations in sequence based on version
    // This allows for gradual upgrades across multiple versions
    
    // Example migration: Add color field to tags if missing (upgrade to v1.0.0+)
    if (versionLessThan(backupVersion, '1.0.0') && backup.tags) {
        backup.tags.forEach(tag => {
            if (!tag.color) {
                tag.color = getRandomPastelColor();
            }
        });
    }
    
    // If we implement schema changes in v1.1.0, add migration code here
    if (versionLessThan(backupVersion, '1.1.0')) {
        // Future migration code for v1.1.0 changes
        // Example: if we add categories to notes in v1.1.0
        // if (backup.notes) {
        //     backup.notes.forEach(note => {
        //         if (!note.category) note.category = 'default';
        //     });
        // }
    }
    
    // Add additional migrations for future versions
    
    return backup;
}

/**
 * Compares two version strings and returns true if version1 is less than version2
 */
function versionLessThan(version1, version2) {
    if (!version1 || !version2) return false;
    
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
        if (v1[i] < v2[i]) return true;
        if (v1[i] > v2[i]) return false;
    }
    
    return v1.length < v2.length;
}

/**
 * Displays initial status and loads notes and tags on app load
 * @returns {Promise} A promise that resolves when initial loading is complete
 */
async function displayStatusOnLoad() {
    // Create a status element to show loading
    const statusEl = createStatusElement('Loading notes...');
    document.body.appendChild(statusEl);
    
    try {
        // Load notes and tags
        await Promise.all([
            new Promise(resolve => {
                loadNotes();
                resolve();
            }),
            new Promise(resolve => {
                loadTags();
                resolve();
            })
        ]);
        
        // Update status to show completion
        statusEl.textContent = 'Ready!';
        statusEl.classList.add('success');
        
        // Remove the status element after a delay
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => {
                statusEl.remove();
            }, 500);
        }, 1000);
    } catch (error) {
        console.error('Error loading data:', error);
        statusEl.textContent = 'Error loading data';
        statusEl.style.backgroundColor = 'var(--error-color, #ff5252)';
        
        // Remove the status element after a longer delay
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => {
                statusEl.remove();
            }, 500);
        }, 3000);
    }
}

/**
 * Sets up the sidebar toggle functionality for responsive design
 * Shows/hides sidebar on small screens with a toggle button
 */
function setupSidebarToggle() {
    console.log("Setting up sidebar toggle functionality");
    
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    // --- Add overlay element --- 
    const overlay = document.querySelector('.sidebar-overlay'); // Get the overlay
    
    if (!sidebar || !toggleBtn || !overlay) { // Check for overlay too
        console.error("Sidebar, toggle button, or overlay element not found!");
        return;
    }
    
    // Prevent duplicate initialization
    if (toggleBtn.dataset.initialized === 'true') {
        console.log("Sidebar toggle already initialized, skipping");
        return;
    }
    
    console.log("Sidebar, toggle button, and overlay found, initializing toggle behavior");
    
    // Get the icon element inside the button
    const icon = toggleBtn.querySelector('i'); 
    if (!icon) {
        console.error("Icon element inside toggle button not found!");
        return; 
    }

    // Force initial state for mobile - always start collapsed (not open)
    if (window.innerWidth <= 768) {
        console.log("Mobile width detected, ensuring sidebar is closed");
        sidebar.classList.remove('open'); // Use 'open'
        overlay.classList.remove('visible');
        toggleBtn.style.display = 'flex'; // Use flex as per MD style
        icon.textContent = 'menu'; // Initial icon: menu
    } else {
        console.log("Desktop width detected, hiding toggle");
        sidebar.classList.remove('open'); // Ensure closed on desktop too
        overlay.classList.remove('visible');
        toggleBtn.style.display = 'none';
    }
    
    // Remove old event listeners by cloning the button
    const newToggleBtn = toggleBtn.cloneNode(true);
    // Re-fetch the icon from the *cloned* button
    const newIcon = newToggleBtn.querySelector('i'); 
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // Mark as initialized to prevent duplicate setup
    newToggleBtn.dataset.initialized = 'true';
    
    // --- Event Listener for Toggle Button --- 
    newToggleBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        
        console.log("Toggle button clicked");
        const isOpen = sidebar.classList.toggle('open'); // Toggle 'open' class
        overlay.classList.toggle('visible', isOpen); // Sync overlay visibility
        
        // Update the icon based on sidebar state
        if (isOpen) {
            console.log("Opening sidebar");
            newIcon.textContent = 'close'; // Icon when open: close
        } else {
            console.log("Closing sidebar");
            newIcon.textContent = 'menu'; // Icon when closed: menu
        }
    });

    // --- Event Listener for Overlay Click --- 
    overlay.addEventListener('click', function() {
        console.log("Overlay clicked");
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        newIcon.textContent = 'menu'; // Reset icon to menu
    });
    
    // --- Resize Handler --- 
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (window.innerWidth > 768) {
                // Reset state on larger screens
                console.log("Window resized to desktop width");
                sidebar.classList.remove('open'); // Use 'open'
                overlay.classList.remove('visible');
                newToggleBtn.style.display = 'none';
                // No need to change icon text here as button is hidden
            } else {
                // Ensure toggle button is visible on small screens
                console.log("Window resized to mobile width");
                newToggleBtn.style.display = 'flex'; // Use flex
                // Check current state and set icon accordingly
                if (sidebar.classList.contains('open')) {
                    newIcon.textContent = 'close';
                } else {
                    newIcon.textContent = 'menu';
                }
            }
        }, 250); // Debounce time
    });
    
    console.log("Sidebar toggle setup complete");
}

// Function to set up paste event handlers for the editors
function setupPasteHandlers() {
    console.log('Setting up paste handlers for image support');
    
    // Get the editor elements
    const createNoteContent = document.getElementById('create-note-content');
    const editNoteContent = document.getElementById('edit-note-content');
    
    // Only set up handlers if they haven't been set up already
    if (createNoteContent && !createNoteContent.hasAttribute('data-paste-handler-setup')) {
        createNoteContent.setAttribute('data-paste-handler-setup', 'true');
        
        createNoteContent.addEventListener('paste', function(e) {
            // Check if the paste event has any image items
            const hasImageItems = Array.from(e.clipboardData.items).some(item => 
                item.type.indexOf('image') === 0
            );
            
            if (hasImageItems) {
                // Prevent the default paste
                e.preventDefault();
                
                // Only process the first image item to prevent multiple processing
                let imageProcessed = false;
                Array.from(e.clipboardData.items).forEach(item => {
                    if (!imageProcessed && item.type.indexOf('image') === 0) {
                        const file = item.getAsFile();
                        if (file) {
                            insertImageIntoNote(file);
                            imageProcessed = true;
                        }
                    }
                });
            }
        });
    }
    
    // Set up paste handler for edit note
    if (editNoteContent && !editNoteContent.hasAttribute('data-paste-handler-setup')) {
        editNoteContent.setAttribute('data-paste-handler-setup', 'true');
        
        editNoteContent.addEventListener('paste', function(e) {
            // Check if the paste event has any image items
            const hasImageItems = Array.from(e.clipboardData.items).some(item => 
                item.type.indexOf('image') === 0
            );
            
            if (hasImageItems) {
                // Prevent the default paste
                e.preventDefault();
                
                // Only process the first image item to prevent multiple processing
                let imageProcessed = false;
                Array.from(e.clipboardData.items).forEach(item => {
                    if (!imageProcessed && item.type.indexOf('image') === 0) {
                        const file = item.getAsFile();
                        if (file) {
                            insertImageIntoEdit(file);
                            imageProcessed = true;
                        }
                    }
                });
            }
        });
    }
}

// Helper function to compress images before insertion
function compressImage(dataUrl, callback) {
    console.log('Compressing image');
    
    // Create an image element to load the data URL
    const img = new Image();
    img.onload = function() {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        
        // Set canvas dimensions to maintain aspect ratio but limit size
        let width = img.width;
        let height = img.height;
        
        // Max dimensions - adjust as needed
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        
        // Resize if necessary while maintaining aspect ratio
        if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
        }
        
        if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas with the new dimensions
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get compressed data URL (0.7 quality - adjust as needed)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Return the compressed data URL
        callback(compressedDataUrl);
    };
    
    // Set source of image to the original data URL
    img.src = dataUrl;
}

/**
 * Sets up the tag multi-select functionality
 * Adds visual indication when Ctrl key is pressed
 * and helps users understand they can select multiple tags
 */
function setupTagMultiSelectHandlers() {
    console.log("Setting up tag multi-select handlers");
    
    // Add event listeners for Ctrl key to show visual feedback
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Control') {
            // Add multi-select mode class to the tag list
            const tagList = document.getElementById('tag-list');
            if (tagList) {
                tagList.classList.add('multi-select-mode');
            }
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.key === 'Control') {
            // Remove multi-select mode class from the tag list
            const tagList = document.getElementById('tag-list');
            if (tagList) {
                tagList.classList.remove('multi-select-mode');
            }
        }
    });
    
    // Add blur event to handle when user switches to another window/tab
    window.addEventListener('blur', function() {
        // Remove multi-select mode class when window loses focus
        const tagList = document.getElementById('tag-list');
        if (tagList) {
            tagList.classList.remove('multi-select-mode');
        }
    });
    
    console.log("Tag multi-select handlers set up successfully");
}

// Create or update empty state display
function createEmptyState(searchTerm, selectedTags) {
    let emptyStateDiv = document.getElementById('empty-state');
    const notesContainer = document.getElementById('notes-container');

    if (!emptyStateDiv) {
        // Create empty state div if it doesn't exist
        emptyStateDiv = document.createElement('div');
        emptyStateDiv.id = 'empty-state';
        emptyStateDiv.className = 'empty-state';
        notesContainer.appendChild(emptyStateDiv);
    }

    // Ensure it's visible and styled correctly by CSS
    emptyStateDiv.style.display = 'flex'; 

    // Clear previous content
    emptyStateDiv.innerHTML = ''; 

    // Create and add the icon (Material Icons)
    const iconElement = document.createElement('i');
    iconElement.className = 'material-icons';
    // Choose an appropriate icon, e.g., 'description', 'notes', 'inbox'
    iconElement.textContent = 'description'; 
    emptyStateDiv.appendChild(iconElement);

    // Create and add the paragraph for the message
    const paragraphElement = document.createElement('p');
    emptyStateDiv.appendChild(paragraphElement);

    // Determine and set the message text
    if (viewMode === 'archived') {
        paragraphElement.textContent = 'The archive is empty.';
    } else if (selectedTags && !selectedTags.includes('all') || searchTerm) {
        paragraphElement.textContent = 'No notes match your current filter.';
    } else {
        paragraphElement.textContent = 'No notes yet. Create one!';
    }
}

// Function to trigger masonry layout refresh with a slight delay to ensure DOM updates
function refreshMasonryLayout() {
    setTimeout(() => {
        applyMasonryLayout();
    }, 50);
}

// Make sure window resize also triggers masonry layout update
window.addEventListener('resize', debounce(() => {
    refreshMasonryLayout();
}, 200));

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    Logger.log('DOM fully loaded, initializing app...');
    // Initialize database first, then initialize the application
    initDB().then(() => {
        initApp();
        
        // Apply masonry layout after initialization
        refreshMasonryLayout();
    }).catch(err => {
        console.error("Error initializing database:", err);
    });
});

// Apply masonry layout when all content is loaded
window.addEventListener('load', function() {
    console.log('Window load event fired, applying masonry layout with delay...');
    setTimeout(() => {
        applyMasonryLayout();
    }, 500);
});

// Add this function to your initialization
function setupTagFilter() {
    const tagFilter = document.getElementById('tag-filter');
    if (!tagFilter) return;
    
    tagFilter.addEventListener('input', function() {
        const filterValue = this.value.toLowerCase();
        const tagItems = document.querySelectorAll('.tag-list .tag-item');
        
        tagItems.forEach(item => {
            // Always show "All Notes"
            if (item.getAttribute('data-tag') === 'all') {
                item.style.display = 'flex';
                return;
            }
            
            const tagName = item.getAttribute('data-tag').toLowerCase();
            if (tagName.includes(filterValue)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // Add clear button functionality
    tagFilter.addEventListener('keydown', function(e) {
        // Clear on Escape key
        if (e.key === 'Escape') {
            this.value = '';
            // Trigger the input event to update the filter
            this.dispatchEvent(new Event('input'));
        }
    });
}

// Open settings modal
function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    
    // Load current settings
    const accentColorInput = document.getElementById('accent-color');
    const sidebarWidthInput = document.getElementById('sidebar-width');
    const noteWidthInput = document.getElementById('note-width');
    const sidebarWidthValue = document.getElementById('sidebar-width-value');
    const noteWidthValue = document.getElementById('note-width-value');
    
    // Set current values
    accentColorInput.value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    sidebarWidthInput.value = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim());
    noteWidthInput.value = settings.noteWidth || defaultSettings.noteWidth;
    
    // Update value displays
    sidebarWidthValue.textContent = sidebarWidthInput.value + 'px';
    noteWidthValue.textContent = noteWidthInput.value + 'px';
    
    // Update version information
    updateVersionInfo();
    
    // Setup range input value display updates
    sidebarWidthInput.addEventListener('input', function() {
        sidebarWidthValue.textContent = this.value + 'px';
    });
    
    noteWidthInput.addEventListener('input', function() {
        noteWidthValue.textContent = this.value + 'px';
    });
    
    // Show modal
    settingsModal.classList.add('active');
}

// Close settings modal
function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.remove('active');
    }
}

// Update version info in settings modal
function updateVersionInfo() {
    const appVersionDisplay = document.getElementById('app-version-display');
    const dbVersionDisplay = document.getElementById('db-version-display');
    const lastUpdatedDisplay = document.getElementById('last-updated-display');
    
    if (appVersionDisplay) {
        appVersionDisplay.textContent = APP_VERSION;
    }
    
    if (dbVersionDisplay) {
        dbVersionDisplay.textContent = DB_VERSION.toString();
    }
    
    if (lastUpdatedDisplay) {
        const versionData = VersionControl.getVersionData();
        if (versionData && versionData.timestamp) {
            lastUpdatedDisplay.textContent = new Date(versionData.timestamp).toLocaleString();
        } else {
            lastUpdatedDisplay.textContent = new Date().toLocaleString() + ' (current)';
        }
    }
    
    // Add GitHub update information if available
    const updateInfoContainer = document.getElementById('github-update-container');
    if (updateInfoContainer) {
        // If GitHub integration is disabled, show appropriate message
        if (!VersionControl.githubRepo.enabled) {
            updateInfoContainer.innerHTML = `
                <h4>Updates</h4>
                <p>GitHub version checking is disabled.</p>
                <p class="last-checked">Version updates are managed through the author's repository.</p>
            `;
            return;
        }
        
        const updateInfo = localStorage.getItem('updateInfo');
        if (updateInfo) {
            const updateData = JSON.parse(updateInfo);
            const updateStatusText = document.getElementById('update-status');
            
            if (updateStatusText) {
                if (updateData.checkFailed) {
                    // Handle update check failure
                    updateStatusText.innerHTML = `<span class="error">Error checking for updates</span>`;
                    updateStatusText.title = updateData.error || "Unknown error";
                } else if (updateData.newVersionAvailable) {
                    updateStatusText.innerHTML = `Update available: <strong class="update-version">v${updateData.latestVersion}</strong>`;
                    updateStatusText.classList.add('update-available');
                    
                    // Show update button if not already present
                    let updateButton = document.getElementById('get-update-button');
                    if (!updateButton) {
                        updateButton = document.createElement('a');
                        updateButton.id = 'get-update-button';
                        updateButton.className = 'github-update-button';
                        updateButton.href = updateData.releaseUrl;
                        updateButton.target = '_blank';
                        updateButton.innerHTML = '<i class="fas fa-download"></i> Get Update';
                        updateInfoContainer.appendChild(updateButton);
                    } else {
                        updateButton.href = updateData.releaseUrl;
                    }
                } else {
                    updateStatusText.innerHTML = '<span class="up-to-date">You have the latest version</span>';
                    updateStatusText.classList.remove('update-available');
                    
                    // Remove update button if exists
                    const updateButton = document.getElementById('get-update-button');
                    if (updateButton) {
                        updateButton.remove();
                    }
                }
            }
            
            // Add last checked time
            const lastCheckedText = document.getElementById('last-checked');
            if (lastCheckedText && updateData.lastChecked) {
                lastCheckedText.textContent = `Last checked: ${new Date(updateData.lastChecked).toLocaleString()}`;
            }
        }
    }
    
    // Add a check for updates button
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    if (checkUpdatesBtn) {
        // Remove existing event listeners by cloning and replacing the button
        const newCheckUpdatesBtn = checkUpdatesBtn.cloneNode(true);
        checkUpdatesBtn.parentNode.replaceChild(newCheckUpdatesBtn, checkUpdatesBtn);
        
        // Only add event listener if GitHub integration is enabled
        if (VersionControl.githubRepo.enabled) {
            newCheckUpdatesBtn.addEventListener('click', async function() {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
                this.disabled = true;
                
                try {
                    const result = await VersionControl.checkForUpdates();
                    this.innerHTML = '<i class="fas fa-sync"></i> Check for Updates';
                    this.disabled = false;
                    
                    if (!result.success) {
                        // Show error message
                        const updateStatus = document.getElementById('update-status');
                        if (updateStatus) {
                            updateStatus.innerHTML = '<span class="error">Error checking updates</span>';
                            updateStatus.title = result.error.message || "Unknown error";
                        }
                    }
                    
                    updateVersionInfo(); // Refresh the display
                } catch (error) {
                    this.innerHTML = '<i class="fas fa-sync"></i> Check for Updates';
                    this.disabled = false;
                    
                    // Show error message
                    const updateStatus = document.getElementById('update-status');
                    if (updateStatus) {
                        updateStatus.innerHTML = '<span class="error">Error checking updates</span>';
                        updateStatus.title = error.message || "Unknown error";
                    }
                }
            });
        } else {
            // Disable the button if GitHub integration is disabled
            newCheckUpdatesBtn.disabled = true;
            newCheckUpdatesBtn.title = "GitHub integration is disabled";
        }
    }
}

// Load settings from localStorage
function loadSettings() {
    try {
        const storedSettings = localStorage.getItem('appSettings');
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            
            // Validate and ensure all required properties exist
            const validatedSettings = {
                accentColor: parsedSettings.accentColor || defaultSettings.accentColor,
                sidebarWidth: parsedSettings.sidebarWidth || defaultSettings.sidebarWidth,
                noteWidth: parsedSettings.noteWidth || defaultSettings.noteWidth
            };
            
            // Ensure accent color is a valid hex color
            if (!validatedSettings.accentColor || !validatedSettings.accentColor.startsWith('#')) {
                validatedSettings.accentColor = defaultSettings.accentColor;
            }
            
            // Store as window.settings for global access
            window.settings = validatedSettings;
            
            return validatedSettings;
        }
    } catch (e) {
        console.error('Error loading settings:', e);
        // On error, reset to defaults
        window.settings = {...defaultSettings};
        localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
    }
    
    // If no settings found, use defaults
    window.settings = {...defaultSettings};
    return {...defaultSettings};
}

// Load current settings into the form
function loadSettingsToForm() {
    const currentSettings = loadSettings();
    
    // Set form values
    document.getElementById('accent-color').value = currentSettings.accentColor || defaultSettings.accentColor;
    document.getElementById('sidebar-width').value = currentSettings.sidebarWidth || defaultSettings.sidebarWidth;
    document.getElementById('note-width').value = currentSettings.noteWidth || defaultSettings.noteWidth;
    
    // Update range display values
    document.getElementById('sidebar-width-value').textContent = `${document.getElementById('sidebar-width').value}px`;
    document.getElementById('note-width-value').textContent = `${document.getElementById('note-width').value}px`;
}

// Apply settings to the UI
function applySettings(settings) {
    if (!settings) {
        settings = defaultSettings;
    }
    
    // Make sure we have proper settings properties, filling in with defaults when missing
    settings = {
        accentColor: settings.accentColor || defaultSettings.accentColor,
        sidebarWidth: settings.sidebarWidth || defaultSettings.sidebarWidth,
        noteWidth: settings.noteWidth || defaultSettings.noteWidth
    };
    
    // Ensure accent color is a valid hex color (starts with #)
    if (!settings.accentColor || !settings.accentColor.startsWith('#')) {
        settings.accentColor = defaultSettings.accentColor;
    }
    
    // Apply accent color
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    document.documentElement.style.setProperty('--accent-light', `${settings.accentColor}33`); // 33 is 20% opacity in hex
    
    // Apply sidebar width
    document.documentElement.style.setProperty('--sidebar-width', `${settings.sidebarWidth}px`);
    
    // Apply note width - this affects new notes
    defaultNoteWidth = settings.noteWidth;
    
    // Store the current settings in a global variable
    window.settings = settings;
    
    // Save to localStorage to ensure persistence
    localStorage.setItem('appSettings', JSON.stringify(settings));
}

// Save settings
function saveSettings() {
    const settings = {
        accentColor: document.getElementById('accent-color').value,
        sidebarWidth: parseInt(document.getElementById('sidebar-width').value),
        noteWidth: parseInt(document.getElementById('note-width').value)
    };
    
    // Save to localStorage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Apply the settings
    applySettings(settings);
    
    // Close the modal
    closeSettingsModal();
    
    // Show a success message
    showStatusNotification('Settings saved successfully!', 'success');
    
    // Refresh the masonry layout
    refreshMasonryLayout();
}

// Initialize settings
function initSettings() {
    // Load settings from local storage
    const settings = loadSettings();
    
    // Apply settings to UI
    applySettings(settings);
    
    // Add event listeners for settings elements
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        // Remove any existing event listeners to avoid duplicates
        const newSettingsBtn = settingsBtn.cloneNode(true);
        settingsBtn.parentNode.replaceChild(newSettingsBtn, settingsBtn);
        
        // Add new event listener
        newSettingsBtn.addEventListener('click', openSettingsModal);
    }
    
    // Reset database button
    const resetDatabaseBtn = document.getElementById('reset-database-btn');
    if (resetDatabaseBtn) {
        resetDatabaseBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the database? This will delete all notes and tags. This action cannot be undone.')) {
                deleteDatabase();
            }
        });
    }
    
    // Set up color picker reset button
    const resetAccentColorBtn = document.getElementById('reset-accent-color');
    if (resetAccentColorBtn) {
        resetAccentColorBtn.addEventListener('click', function() {
            const accentColorInput = document.getElementById('accent-color');
            if (accentColorInput) {
                accentColorInput.value = defaultSettings.accentColor;
            }
        });
    }
    
    // Log the current settings to verify they're correct
    Logger.log('Settings initialized:', window.settings);
}

// Call this function during app initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize database first
    initDB().then(() => {
        // ... existing initialization code
        
        // Initialize settings
        initSettings();
    }).catch(err => {
        console.error("Error initializing database:", err);
    });
});

// Show a status notification
function showStatusNotification(message, type = 'success') {
    // Check if there's already a notification and remove it
    const existingNotification = document.querySelector('.status-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create a new notification
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.textContent = message;
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Show the notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add this function somewhere in your code
function deleteDatabase() {
    // Create and show confirmation modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay active';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'settings-modal';
    modalContent.style.maxWidth = '450px';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-title">Reset Database</div>
            <button id="close-reset-modal" title="Close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-content">
            <div class="danger-zone" style="border: none; background-color: transparent; padding: 0;">
                <div class="danger-zone-description">
                    <p style="color: var(--error); font-weight: bold; font-size: 1.1rem;">WARNING: This action cannot be undone!</p>
                    <p>Resetting the database will permanently delete all notes and tags. Make sure you have exported a backup if you want to keep your data.</p>
                    <p style="margin-top: 15px;">To confirm, type "DELETE" in the field below:</p>
                    <input type="text" id="delete-confirmation" style="width: 100%; padding: 8px; margin-top: 10px; background-color: var(--bg-note); color: var(--text-primary); border: 1px solid var(--error);">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button id="cancel-reset" class="secondary-btn">Cancel</button>
            <button id="confirm-reset" class="danger" disabled>Reset Database</button>
        </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Handle close button
    document.getElementById('close-reset-modal').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Handle cancel button
    document.getElementById('cancel-reset').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Handle confirmation input
    const confirmInput = document.getElementById('delete-confirmation');
    const confirmButton = document.getElementById('confirm-reset');
    
    confirmInput.addEventListener('input', function() {
        confirmButton.disabled = this.value !== 'DELETE';
    });
    
    // Handle confirm button
    confirmButton.addEventListener('click', function() {
        // Close any existing connections
        if (db) {
            db.close();
        }
        
        // Request to delete the database
        document.body.removeChild(modalOverlay);
        const deleteRequest = indexedDB.deleteDatabase('notesDB');
        
        deleteRequest.onsuccess = function() {
            console.log('Database deleted successfully');
            showStatusNotification('Database deleted successfully. Refreshing page...', 'success');
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        };
        
        deleteRequest.onerror = function(event) {
            console.error('Error deleting database:', event);
            showStatusNotification('Failed to delete database', 'error');
        };
    });
}

// Function to check if the user typed '#' to start a tag
function checkForTagStart(event) {
    // Don't process special keys like Tab, Enter, etc.
    if (event.key === 'Tab' || event.key === 'Enter' || 
        event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
        event.key === 'Escape') {
        return;
    }
    
    // Ignore Shift key events to prevent closing suggestions right after opening
    if (event.key === 'Shift') {
        return;
    }

    // If right arrow is pressed while suggestions are inactive, check if we're next to a #
    if (event.key === 'ArrowRight' && !tagSuggestionActive) {
        const editor = event.target;
        const selection = window.getSelection();
        
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const position = range.startOffset;
        
        if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent;
            // Check if we just moved after a # character
            if (position > 0 && text.charAt(position - 1) === '#') {
                console.log('Right arrow after # detected, activating suggestions');
                tagSuggestionActive = true;
                tagSuggestionStart = {
                    node: textNode,
                    offset: position - 1
                };
                currentTagText = '';
                
                // Show suggestions
                showTagSuggestions(editor, '');
                return;
            }
        }
    }

    // For normal keys (not navigation)
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        const editor = event.target;
        const selection = window.getSelection();
        
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const position = range.startOffset;
        
        console.log('Check for tag start:', {
            nodeType: textNode.nodeType,
            position: position,
            key: event.key,
            active: tagSuggestionActive
        });
        
        // Handle different node types
        if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent;
            
            // Check if we're actively in a tag suggestion
            if (tagSuggestionActive) {
                // Find the current text of the tag being typed
                const textBeforeCursor = text.substring(0, position);
                const hashPos = textBeforeCursor.lastIndexOf('#');
                
                if (hashPos !== -1) {
                    currentTagText = textBeforeCursor.substring(hashPos + 1);
                    
                    // If the user deleted the # or added whitespace, close suggestions
                    if (hashPos === position - 1 && !currentTagText.length) {
                        closeSuggestions();
                        return;
                    }
                    
                    if (currentTagText.includes(' ')) {
                        closeSuggestions();
                        return;
                    }
                    
                    // Update suggestions based on current input
                    showTagSuggestions(editor, currentTagText);
                    return;
                } else {
                    // No # found before cursor, close suggestions
                    closeSuggestions();
                    return;
                }
            }
            
            // Check if we just typed a # to start a new tag
            if (event.key === '#' || (event.key === '3' && event.shiftKey)) {
                console.log('# key pressed, activating suggestions');
                // Initialize tag suggestion
                tagSuggestionActive = true;
                tagSuggestionStart = {
                    node: textNode,
                    offset: position - 1
                };
                currentTagText = '';
                
                // Show all tags as suggestions immediately
                showTagSuggestions(editor, '');
                
                // Prevent this event from being processed by other handlers
                event.stopImmediatePropagation();
            }
        } else if (textNode.nodeType === Node.ELEMENT_NODE) {
            // For element nodes (like empty divs)
            if (event.key === '#' || (event.key === '3' && event.shiftKey)) {
                console.log('# key pressed in element node, activating suggestions');
                // This is likely a new div with just #
                const childNodes = textNode.childNodes;
                let textNode;
                
                if (childNodes.length === 0 || childNodes[0].nodeType !== Node.TEXT_NODE) {
                    // Create a new text node if needed
                    textNode = document.createTextNode('#');
                    if (childNodes.length === 0) {
                        textNode.appendChild(textNode);
                    } else {
                        textNode.insertBefore(textNode, childNodes[0]);
                    }
                } else {
                    textNode = childNodes[0];
                }
                
                tagSuggestionActive = true;
                tagSuggestionStart = {
                    node: textNode,
                    offset: textNode.length - 1
                };
                currentTagText = '';
                
                // Show all tags as suggestions
                showTagSuggestions(editor, '');
                
                // Prevent this event from being processed by other handlers
                event.stopImmediatePropagation();
            }
        }
    }
}

// Function to handle keyboard navigation in tag suggestions
function handleTagSuggestions(event) {
    // Ignore Shift key events to prevent closing suggestions right after opening
    if (event.key === 'Shift') {
        event.stopPropagation();
        return;
    }
    
    // If suggestions are active, we need to handle navigation keys
    if (tagSuggestionActive && tagSuggestionContainer) {
        console.log('Key in active suggestions:', event.key);
        
        const suggestions = tagSuggestionContainer.querySelectorAll('.tag-suggestion');
        if (suggestions.length === 0) return;
        
        // Don't let these keys propagate when suggestions are active
        if (['ArrowDown', 'ArrowUp', 'Tab', 'Escape'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            
            switch (event.key) {
                case 'ArrowDown':
                    selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
                    highlightSelectedSuggestion(suggestions);
                    break;
                    
                case 'ArrowUp':
                    selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
                    highlightSelectedSuggestion(suggestions);
                    break;
                    
                case 'Tab':
                    // Apply the selected tag suggestion
                    const selectedTag = suggestions[selectedSuggestionIndex].textContent;
                    applyTagSuggestion(event.target, selectedTag);
                    break;
                    
                case 'Escape':
                    closeSuggestions();
                    break;
            }
        } else if (event.key === 'Enter') {
            // Don't apply suggestions on Enter - let the editor handle line breaks
            closeSuggestions();
        }
    }
}

// Function to display tag suggestions
function showTagSuggestions(editor, tagPrefix) {
    console.log('Showing tag suggestions for prefix:', tagPrefix);
    
    // Get all available tags
    if (!db) {
        console.error('Database not initialized, cannot show tag suggestions');
        return;
    }
    
    const transaction = db.transaction([TAGS_STORE], 'readonly');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    const tagsRequest = tagsStore.getAll();
    
    tagsRequest.onsuccess = () => {
        const tags = tagsRequest.result;
        console.log('Found tags:', tags.length);
        
        // Filter tags based on the prefix
        const filteredTags = tags.filter(tag => 
            tag.name.toLowerCase().startsWith(tagPrefix.toLowerCase())
        ).sort((a, b) => {
            // Sort by most used first, then alphabetically
            if (a.count !== b.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });
        
        console.log('Filtered tags:', filteredTags.length);
        
        // Determine the appropriate parent element based on the editor context
        let suggestionsParent = document.body;
        if (editor.id === 'edit-note-content') {
            // If we're in edit mode, we want to append to modal overlay
            suggestionsParent = document.querySelector('.modal-overlay.active') || document.body;
        }
        
        // Create or update the suggestions container
        if (!tagSuggestionContainer) {
            // First check if there's already a suggestions container in the DOM
            const existingContainer = document.querySelector('.tag-suggestions');
            if (existingContainer) {
                tagSuggestionContainer = existingContainer;
                tagSuggestionContainer.innerHTML = '';
            } else {
                tagSuggestionContainer = document.createElement('div');
                tagSuggestionContainer.className = 'tag-suggestions';
                suggestionsParent.appendChild(tagSuggestionContainer);
            }
            
            // Add event listener to prevent clicks inside the suggestions from closing it
            tagSuggestionContainer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        } else {
            // Clear the existing container
            tagSuggestionContainer.innerHTML = '';
        }
        
        // Set positioning style
        tagSuggestionContainer.style.position = 'absolute';
        
        // Position the suggestions container
        positionSuggestions(editor);
        
        // Create suggestion items
        if (filteredTags.length === 0) {
            const noTagsMessage = document.createElement('div');
            noTagsMessage.className = 'tag-suggestion no-suggestions';
            noTagsMessage.textContent = tagPrefix ? `No matching tags (${tagPrefix})` : 'No tags yet';
            tagSuggestionContainer.appendChild(noTagsMessage);
        } else {
            // Add tag suggestions
            filteredTags.slice(0, 10).forEach((tag, index) => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag-suggestion';
                tagElement.textContent = tag.name;
                tagElement.dataset.count = tag.count;
                
                if (index === selectedSuggestionIndex) {
                    tagElement.classList.add('selected');
                }
                
                // Handle mouse click on a suggestion
                tagElement.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyTagSuggestion(editor, tag.name);
                });
                
                // Handle mouse hover to change selection
                tagElement.addEventListener('mouseenter', () => {
                    selectedSuggestionIndex = index;
                    highlightSelectedSuggestion(tagSuggestionContainer.querySelectorAll('.tag-suggestion'));
                });
                
                tagSuggestionContainer.appendChild(tagElement);
            });
        }

        // Make the suggestions container visible
        tagSuggestionContainer.style.display = 'block';
    };
    
    tagsRequest.onerror = (error) => {
        console.error('Error fetching tags for suggestions:', error);
    };
}

// Function to close tag suggestions
function closeSuggestions() {
    console.log('Closing tag suggestions');
    tagSuggestionActive = false;
    tagSuggestionStart = null;
    currentTagText = '';
    selectedSuggestionIndex = 0;
    
    // Find and hide all tag suggestion containers
    const suggestionContainers = document.querySelectorAll('.tag-suggestions');
    suggestionContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // Reset the main reference
    if (tagSuggestionContainer) {
        tagSuggestionContainer.style.display = 'none';
    }
}

// Function to highlight the selected suggestion
function highlightSelectedSuggestion(suggestions) {
    suggestions.forEach((suggestion, index) => {
        if (index === selectedSuggestionIndex) {
            suggestion.classList.add('selected');
        } else {
            suggestion.classList.remove('selected');
        }
    });
}

// Function to position the suggestions container below the cursor
function positionSuggestions(editor) {
    if (!tagSuggestionContainer) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate available space below and above the cursor
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Default positioning below the cursor
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    
    // Width is either based on editor width or a reasonable minimum
    const minWidth = 200;
    const maxWidth = Math.min(editor.offsetWidth, 300);
    const width = Math.max(minWidth, maxWidth);
    
    // Set maximum height for scrolling if many suggestions
    const maxHeight = 200;
    
    // Check if we need to position above the cursor instead
    if (spaceBelow < 150 && spaceAbove > 150) {
        // Position above the cursor
        top = rect.top + window.scrollY - maxHeight;
    }
    
    // Ensure left position doesn't go off-screen
    if (left + width > viewportWidth) {
        left = viewportWidth - width - 10;
    }
    
    // Apply the calculated position
    tagSuggestionContainer.style.top = `${top}px`;
    tagSuggestionContainer.style.left = `${left}px`;
    tagSuggestionContainer.style.width = `${width}px`;
    tagSuggestionContainer.style.maxHeight = `${maxHeight}px`;
    
    // Ensure tag suggestion container is added to the right parent
    // If we're in edit mode (note-modal is active), append to modal overlay
    if (editor.id === 'edit-note-content') {
        // Move the suggestions container to the modal overlay for proper z-index stacking
        const modalOverlay = document.querySelector('.modal-overlay.active');
        if (modalOverlay && !modalOverlay.contains(tagSuggestionContainer)) {
            document.body.removeChild(tagSuggestionContainer);
            modalOverlay.appendChild(tagSuggestionContainer);
        }
    } else if (editor.id === 'create-note-content') {
        // Ensure it's in the body for create note
        if (!document.body.contains(tagSuggestionContainer)) {
            document.body.appendChild(tagSuggestionContainer);
        }
    }
}

// Function to apply the selected tag suggestion
function applyTagSuggestion(editor, tagName) {
    if (!tagSuggestionActive || !tagSuggestionStart) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    // Create a range from the start of the tag to the current cursor position
    const range = document.createRange();
    range.setStart(tagSuggestionStart.node, tagSuggestionStart.offset);
    range.setEnd(selection.getRangeAt(0).endContainer, selection.getRangeAt(0).endOffset);
    
    // Replace the tag text with the selected suggestion
    range.deleteContents();
    
    // Add tag with a space after it
    const tagWithSpace = document.createTextNode('#' + tagName + ' ');
    range.insertNode(tagWithSpace);
    
    // Move the cursor to after the space
    const newPosition = document.createRange();
    newPosition.setStartAfter(tagWithSpace);
    newPosition.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newPosition);
    
    // Close the suggestions
    closeSuggestions();
    
    // Fire input event to trigger unsaved changes detection
    const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true
    });
    editor.dispatchEvent(inputEvent);
}

/**
 * Opens the Tag Manager modal and loads all tags
 */
function openTagManagerModal() {
    const tagManagerModal = document.getElementById('tag-manager-modal');
    if (!tagManagerModal) return;
    
    // Display the modal using the active class
    tagManagerModal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // Load all tags from the database (not just the ones for the current view)
    loadAllTagsForManager();
    
    // Set up search functionality
    setupTagManagerSearch();
}

/**
 * Closes the Tag Manager modal
 */
function closeTagManagerModal() {
    const tagManagerModal = document.getElementById('tag-manager-modal');
    if (!tagManagerModal) return;
    
    tagManagerModal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

/**
 * Loads all tags from the database for the Tag Manager
 */
function loadAllTagsForManager() {
    if (!db) return;
    
    const transaction = db.transaction([TAGS_STORE], 'readonly');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Get all tags from the tags store
    const tagsRequest = tagsStore.getAll();
    
    tagsRequest.onsuccess = () => {
        // Get all tags
        const allTagsData = tagsRequest.result;
        Logger.log(`Found ${allTagsData.length} total tags in database for Tag Manager`);
        
        // Sort tags by name
        allTagsData.sort((a, b) => a.name.localeCompare(b.name));
        
        // Display tags in the Tag Manager
        displayTagsInManager(allTagsData);
    };
    
    transaction.onerror = event => {
        Logger.error('Transaction error when loading tags for manager:', event.target.error);
    };
}

/**
 * Displays tags in the Tag Manager
 */
function displayTagsInManager(tags) {
    const tagManagerList = document.getElementById('tag-manager-list');
    if (!tagManagerList) return;
    
    // Clear existing tags
    tagManagerList.innerHTML = '';
    
    // Add the "Add New Tag" button at the top
    const addNewTagButton = document.createElement('div');
    addNewTagButton.className = 'add-new-tag-button';
    addNewTagButton.innerHTML = '<i class="fas fa-plus"></i> Add New Tag';
    addNewTagButton.onclick = openAddNewTagDialog;
    tagManagerList.appendChild(addNewTagButton);
    
    if (tags.length === 0) {
        // Display a message if there are no tags
        const noTagsMessage = document.createElement('div');
        noTagsMessage.className = 'no-tags-message';
        noTagsMessage.textContent = 'No tags found.';
        tagManagerList.appendChild(noTagsMessage);
        return;
    }
    
    // Create a tag element for each tag
    tags.forEach(tag => {
        const isManualTag = tag.count === 0; // Check if this is a manually created tag
        
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-manager-item';
        if (isManualTag) {
            tagItem.classList.add('manual-tag'); // Add class for styling if needed
        }
        tagItem.setAttribute('data-tag', tag.name);
        
        // Create tag name element
        const tagName = document.createElement('div');
        tagName.className = 'tag-name';
        
        let tagHtml = '';
        
        // Add color preview dot if tag has color
        if (tag.color) {
            tagHtml += `<span class="color-preview" style="background-color:${tag.color}; display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:8px;"></span>`;
        }
        
        // Add the tag icon and name
        if (isManualTag) {
            tagHtml += `<span class="tag-icon"><i class="fas fa-lock" title="Manually created tag"></i></span>
                        <span>${tag.name}</span>
                        <span class="tag-count">(${tag.count})</span>`;
        } else {
            tagHtml += `<span class="tag-icon"><i class="fas fa-tag"></i></span>
                        <span>${tag.name}</span>
                        <span class="tag-count">(${tag.count})</span>`;
        }
        
        tagName.innerHTML = tagHtml;
        
        // Add sample tag display with color if available
        if (tag.color) {
            const tagPreview = document.createElement('div');
            tagPreview.className = 'tag-preview';
            tagPreview.style.marginLeft = 'auto';
            tagPreview.style.marginRight = '10px';
            tagPreview.innerHTML = `<span class="sample-tag" style="background-color:${tag.color}; color:${getContrastingTextColor(tag.color)}; padding:2px 6px; border-radius:4px; font-size:0.8em;">#${tag.name}</span>`;
            tagName.appendChild(tagPreview);
        }
        
        // Create tag actions element
        const tagActions = document.createElement('div');
        tagActions.className = 'tag-actions';
        
        // Add edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-tag';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Edit Tag';
        editButton.onclick = () => editTag(tag.name);
        
        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-tag';
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteButton.title = 'Delete Tag';
        deleteButton.onclick = () => confirmDeleteTag(tag.name);
        
        // Add buttons to tag actions
        tagActions.appendChild(editButton);
        tagActions.appendChild(deleteButton);
        
        // Add name and actions to tag item
        tagItem.appendChild(tagName);
        tagItem.appendChild(tagActions);
        
        // Add tag item to the list
        tagManagerList.appendChild(tagItem);
    });
}

/**
 * Opens the dialog to add a new tag
 */
function openAddNewTagDialog() {
    // Create a new dialog within the tag manager modal
    const tagManagerModal = document.getElementById('tag-manager-modal');
    const tagManagerContent = tagManagerModal.querySelector('.tag-manager-modal');
    
    // First get all existing tags to check colors
    const transaction = db.transaction([TAGS_STORE], 'readonly');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    const getAllTagsRequest = tagsStore.getAll();
    
    getAllTagsRequest.onsuccess = () => {
        const allTags = getAllTagsRequest.result;
        const existingColors = allTags.map(tag => tag.color).filter(Boolean);
        
        // Generate a unique random color for the new tag
        const randomColor = getUniqueRandomColor(existingColors);
        
        // Create the dialog container
        const newTagDialog = document.createElement('div');
        newTagDialog.className = 'confirmation-dialog';
        newTagDialog.id = 'new-tag-dialog';
        
        // Add the dialog content
        newTagDialog.innerHTML = `
            <div class="confirmation-dialog-content">
                <div class="confirmation-header">
                    <div class="confirmation-title">Add New Tag</div>
                </div>
                <div class="confirmation-body">
                    <div class="form-field">
                        <label for="new-tag-name">Tag Name (without # symbol):</label>
                        <input type="text" id="new-tag-name" class="tag-input" placeholder="Enter tag name">
                    </div>
                    <div class="form-field">
                        <label for="new-tag-color">Tag Color:</label>
                        <div class="color-picker-container">
                            <input type="color" id="new-tag-color" value="${randomColor}">
                            <div class="color-preview-container">
                                <div class="color-preview-label">Preview:</div>
                                <div class="tag-preview" id="new-tag-preview">
                                    <span class="sample-tag" style="background-color:${randomColor}; color:${getContrastingTextColor(randomColor)}; padding:3px 8px; border-radius:4px;">#tagname</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-field checkbox-field">
                        <input type="checkbox" id="scan-existing-notes" checked>
                        <label for="scan-existing-notes">Find and tag existing words in notes</label>
                    </div>
                    <p class="form-help-text">If checked, we'll search for this word in your notes and convert it to a tag by adding a # symbol.</p>
                </div>
                <div class="confirmation-footer">
                    <button id="cancel-new-tag" class="secondary-btn">Cancel</button>
                    <button id="create-new-tag" class="primary">Create Tag</button>
                </div>
            </div>
        `;
        
        // Add the dialog to the Tag Manager modal
        tagManagerContent.appendChild(newTagDialog);
        
        // Make the dialog visible
        newTagDialog.style.display = 'flex';
        
        // Focus the input
        setTimeout(() => {
            document.getElementById('new-tag-name').focus();
        }, 100);
        
        // Handle live preview updates when tag name or color changes
        const tagNameInput = document.getElementById('new-tag-name');
        const colorInput = document.getElementById('new-tag-color');
        const tagPreview = document.getElementById('new-tag-preview');
        
        // Update preview when name changes
        tagNameInput.addEventListener('input', updateTagPreview);
        
        // Update preview when color changes
        colorInput.addEventListener('input', updateTagPreview);
        
        // Function to update the tag preview
        function updateTagPreview() {
            const tagName = tagNameInput.value.trim() || 'tagname';
            const color = colorInput.value;
            const textColor = getContrastingTextColor(color);
            tagPreview.innerHTML = `<span class="sample-tag" style="background-color:${color}; color:${textColor}; padding:3px 8px; border-radius:4px;">#${tagName}</span>`;
        }
        
        // Handle Enter key in the input field
        tagNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-new-tag').click();
            }
        });
        
        // Handle cancel button
        document.getElementById('cancel-new-tag').addEventListener('click', () => {
            // Remove the dialog
            tagManagerContent.removeChild(newTagDialog);
        });
        
        // Handle create button
        document.getElementById('create-new-tag').addEventListener('click', () => {
            const tagName = tagNameInput.value.trim();
            const tagColor = colorInput.value;
            const scanExistingNotes = document.getElementById('scan-existing-notes').checked;
            
            if (!tagName) {
                showStatusNotification('Please enter a tag name', 'error');
                return;
            }
            
            // Check for invalid characters - allow both uppercase and lowercase letters
            if (!/^[a-zA-Z0-9_]+$/.test(tagName)) {
                showStatusNotification('Tag names can only contain letters, numbers, and underscores', 'error');
                return;
            }
            
            // Create the new tag with the selected color, preserving case
            createNewTag(tagName, scanExistingNotes, tagColor);
            
            // Remove the dialog
            tagManagerContent.removeChild(newTagDialog);
        });
    };
    
    transaction.onerror = (error) => {
        Logger.error('Error getting tags for color selection:', error);
        // Fallback to simple random color if we can't get existing colors
        showAddNewTagDialogWithColor(getRandomPastelColor());
    };
}

/**
 * Fallback function to show the add new tag dialog with a simple random color
 */
function showAddNewTagDialogWithColor(randomColor) {
    const tagManagerModal = document.getElementById('tag-manager-modal');
    const tagManagerContent = tagManagerModal.querySelector('.tag-manager-modal');
    
    // Create the dialog container
    const newTagDialog = document.createElement('div');
    newTagDialog.className = 'confirmation-dialog';
    newTagDialog.id = 'new-tag-dialog';
    
    // Add the dialog content
    newTagDialog.innerHTML = `
        <div class="confirmation-dialog-content">
            <div class="confirmation-header">
                <div class="confirmation-title">Add New Tag</div>
            </div>
            <div class="confirmation-body">
                <div class="form-field">
                    <label for="new-tag-name">Tag Name (without # symbol):</label>
                    <input type="text" id="new-tag-name" class="tag-input" placeholder="Enter tag name">
                </div>
                <div class="form-field">
                    <label for="new-tag-color">Tag Color:</label>
                    <div class="color-picker-container">
                        <input type="color" id="new-tag-color" value="${randomColor}">
                        <div class="color-preview-container">
                            <div class="color-preview-label">Preview:</div>
                            <div class="tag-preview" id="new-tag-preview">
                                <span class="sample-tag" style="background-color:${randomColor}; color:${getContrastingTextColor(randomColor)}; padding:3px 8px; border-radius:4px;">#tagname</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-field checkbox-field">
                    <input type="checkbox" id="scan-existing-notes" checked>
                    <label for="scan-existing-notes">Find and tag existing words in notes</label>
                </div>
                <p class="form-help-text">If checked, we'll search for this word in your notes and convert it to a tag by adding a # symbol.</p>
            </div>
            <div class="confirmation-footer">
                <button id="cancel-new-tag" class="secondary-btn">Cancel</button>
                <button id="create-new-tag" class="primary">Create Tag</button>
            </div>
        </div>
    `;
    
    // Add the dialog to the Tag Manager modal
    tagManagerContent.appendChild(newTagDialog);
    
    // Make the dialog visible
    newTagDialog.style.display = 'flex';
    
    // Focus the input
    setTimeout(() => {
        document.getElementById('new-tag-name').focus();
    }, 100);
    
    // Handle live preview updates when tag name or color changes
    const tagNameInput = document.getElementById('new-tag-name');
    const colorInput = document.getElementById('new-tag-color');
    const tagPreview = document.getElementById('new-tag-preview');
    
    // Update preview when name changes
    tagNameInput.addEventListener('input', updateTagPreview);
    
    // Update preview when color changes
    colorInput.addEventListener('input', updateTagPreview);
    
    // Function to update the tag preview
    function updateTagPreview() {
        const tagName = tagNameInput.value.trim() || 'tagname';
        const color = colorInput.value;
        const textColor = getContrastingTextColor(color);
        tagPreview.innerHTML = `<span class="sample-tag" style="background-color:${color}; color:${textColor}; padding:3px 8px; border-radius:4px;">#${tagName}</span>`;
    }
    
    // Handle Enter key in the input field
    tagNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('create-new-tag').click();
        }
    });
    
    // Handle cancel button
    document.getElementById('cancel-new-tag').addEventListener('click', () => {
        // Remove the dialog
        tagManagerContent.removeChild(newTagDialog);
    });
    
    // Handle create button
    document.getElementById('create-new-tag').addEventListener('click', () => {
        const tagName = tagNameInput.value.trim();
        const tagColor = colorInput.value;
        const scanExistingNotes = document.getElementById('scan-existing-notes').checked;
        
        if (!tagName) {
            showStatusNotification('Please enter a tag name', 'error');
            return;
        }
        
        // Check for invalid characters - allow both uppercase and lowercase letters
        if (!/^[a-zA-Z0-9_]+$/.test(tagName)) {
            showStatusNotification('Tag names can only contain letters, numbers, and underscores', 'error');
            return;
        }
        
        // Create the new tag with the selected color, preserving case
        createNewTag(tagName, scanExistingNotes, tagColor);
        
        // Remove the dialog
        tagManagerContent.removeChild(newTagDialog);
    });
}

/**
 * Creates a new tag and optionally scans existing notes
 */
function createNewTag(tagName, scanExistingNotes = false, tagColor = null) {
    if (!db) {
        Logger.error('Database not available');
        return;
    }
    
    Logger.log(`Creating new tag: ${tagName}, scanning notes: ${scanExistingNotes}`);
    
    // Create a transaction for both notes and tags stores
    const transaction = db.transaction([NOTES_STORE, TAGS_STORE], 'readwrite');
    const notesStore = transaction.objectStore(NOTES_STORE);
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Check if tag already exists
    const getTagRequest = tagsStore.get(tagName);
    getTagRequest.onsuccess = () => {
        if (getTagRequest.result) {
            showStatusNotification(`Tag #${tagName} already exists`, 'error');
            return;
        }
        
        let tagCount = 0;
        
        if (scanExistingNotes) {
            // Get all notes to scan for the word
            const getAllNotesRequest = notesStore.getAll();
            getAllNotesRequest.onsuccess = (event) => {
                const notes = event.target.result;
                let modifiedNotesCount = 0;
                
                // Regular expression to find the word with word boundaries
                // Use case-insensitive match to find any case version of the word
                const wordRegex = new RegExp(`\\b${escapeRegExp(tagName)}\\b(?!\\s*[a-zA-Z0-9_#])`, 'gi');
                
                notes.forEach(note => {
                    let noteModified = false;
                    
                    // Check content for instances of the word
                    if (note.content) {
                        // Replace instances of the word with #word
                        const updatedContent = note.content.replace(wordRegex, `#${tagName}`);
                        if (updatedContent !== note.content) {
                            note.content = updatedContent;
                            noteModified = true;
                        }
                    }
                    
                    // Check title as well
                    if (note.title) {
                        const updatedTitle = note.title.replace(wordRegex, `#${tagName}`);
                        if (updatedTitle !== note.title) {
                            note.title = updatedTitle;
                            noteModified = true;
                        }
                    }
                    
                    if (noteModified) {
                        modifiedNotesCount++;
                        tagCount++;
                        
                        // Extract and update tags for the note
                        const contentTags = extractTags(note.content || '');
                        const titleTags = note.title ? extractTags(note.title) : [];
                        const allTags = [...new Set([...contentTags, ...titleTags])];
                        
                        note.tags = allTags;
                        
                        // Save the modified note
                        notesStore.put(note);
                    }
                });
                
                
                Logger.log(`Modified ${modifiedNotesCount} notes to add tag #${tagName}`);
                
                // Add the new tag to the tags store with the count and COLOR
                const addTagRequest = tagsStore.add({
                    name: tagName,
                    count: tagCount,
                    color: tagColor // --- Fix: Added color property ---
                });
                
                addTagRequest.onsuccess = () => {
                    Logger.log(`Tag #${tagName} added successfully with count ${tagCount} and color ${tagColor}`); // Log color too
                    
                    // Refresh tag displays
                    loadAllTagsForManager();
                    loadTags();
                    
                    // Reload notes to reflect changes if any were modified
                    if (modifiedNotesCount > 0) {
                        loadNotes();
                    }
                    
                    // Show success message
                    if (modifiedNotesCount > 0) {
                        showStatusNotification(`Tag #${tagName} created and added to ${modifiedNotesCount} notes`, 'success');
                    } else {
                        showStatusNotification(`Tag #${tagName} created`, 'success');
                    }
                };
                
                addTagRequest.onerror = (error) => {
                    Logger.error(`Error adding tag ${tagName}:`, error);
                    showStatusNotification(`Error creating tag: ${error}`, 'error');
                };
            };
            
            getAllNotesRequest.onerror = (error) => {
                Logger.error(`Error getting notes to scan for ${tagName}:`, error);
                showStatusNotification(`Error scanning notes: ${error}`, 'error');
            };
        } else {
            // Just add the tag with count 0 and COLOR without scanning notes
            const addTagRequest = tagsStore.add({
                name: tagName,
                count: 0,
                color: tagColor // --- Fix: Added color property ---
            });
            
            addTagRequest.onsuccess = () => {
                Logger.log(`Tag #${tagName} added successfully with count 0 and color ${tagColor}`); // Log color too
                
                // Refresh tag displays
                loadAllTagsForManager();
                loadTags();
                
                // Show success message
                showStatusNotification(`Tag #${tagName} created`, 'success');
            };
            
            addTagRequest.onerror = (error) => {
                Logger.error(`Error adding tag ${tagName}:`, error);
                showStatusNotification(`Error creating tag: ${error}`, 'error');
            };
        }
    };
    
    getTagRequest.onerror = (error) => {
        Logger.error(`Error checking if tag ${tagName} exists:`, error);
        showStatusNotification(`Error checking tag: ${error}`, 'error');
    };
}

// Add Tag Manager button to the sidebar
function addTagManagerButton() {
    Logger.log('Adding Tag Manager button to sidebar');
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader) {
        Logger.error('Could not find sidebar header element to add Tag Manager button');
        return;
    }
    
    // Create a container for the header that includes both the title and the button
    const headerContainer = document.createElement('div');
    headerContainer.className = 'sidebar-header-container';
    
    // Create the title element and set its text
    const titleElement = document.createElement('div');
    titleElement.className = 'sidebar-title';
    titleElement.textContent = 'Tags';
    
    // Create the button
    const manageButton = document.createElement('button');
    manageButton.className = 'tag-manager-btn';
    manageButton.innerHTML = '<i class="fas fa-cog"></i>';
    manageButton.title = 'Manage Tags';
    
    // Add click handler with a named function for debugging
    manageButton.addEventListener('click', function tagManagerBtnClick(e) {
        e.preventDefault();
        Logger.log('Tag Manager button clicked');
        openTagManagerModal();
    });
    
    // Add the title and button to the container
    headerContainer.appendChild(titleElement);
    headerContainer.appendChild(manageButton);
    
    // Replace the sidebar header content with our new container
    sidebarHeader.innerHTML = '';
    sidebarHeader.appendChild(headerContainer);
    
    Logger.log('Tag Manager button added successfully');
}

// Init function for the Tag Manager
function initTagManager() {
    Logger.log('Initializing Tag Manager');
    
    // Make sure the sidebar header exists before adding the button
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader) {
        Logger.warn('Sidebar header not found during initTagManager, will retry in 1 second');
        // Retry after a delay to allow DOM to fully load
        setTimeout(function() {
            addTagManagerButton();
        }, 1000);
        return;
    }
    
    // Add the button
    addTagManagerButton();
    
    Logger.log('Tag Manager initialized');
}

// Global function to open Tag Manager directly (for debugging via console)
window.openTagManager = function() {
    Logger.log('Manually opening Tag Manager from console');
    openTagManagerModal();
};

/**
 * Generate a random pastel color
 * @returns {string} A hex color code for a pastel color
 */
function getRandomPastelColor() {
    // Generate pastel color by using higher base values 
    // and limiting the range
    const r = Math.floor((Math.random() * 55) + 200).toString(16).padStart(2, '0');
    const g = Math.floor((Math.random() * 55) + 200).toString(16).padStart(2, '0');
    const b = Math.floor((Math.random() * 55) + 200).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Determines whether to use black or white text based on background color
 * Uses the YIQ formula for color contrast
 * @param {string} hexcolor - The background color in hex format
 * @returns {string} - Either "black" or "white"
 */
function getContrastingTextColor(hexcolor) {
    // If no color or invalid format, default to black text
    if (!hexcolor || hexcolor === 'undefined' || !hexcolor.startsWith('#')) {
        return "black";
    }
    
    // Remove # if present
    hexcolor = hexcolor.replace('#', '');
    
    // Convert 3-char hex to 6-char
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }
    
    // Convert hex to RGB
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    
    // Calculate luminance (YIQ formula)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // Use black for bright colors, white for dark colors
    return yiq >= 128 ? "black" : "white";
}

/**
 * Opens a dialog to edit a tag's properties (including color)
 */
function editTag(tagName) {
    if (!db) {
        Logger.error('Database not available');
        return;
    }
    
    // Get current tag data
    const transaction = db.transaction([TAGS_STORE], 'readonly');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    const getTagRequest = tagsStore.get(tagName);
    
    getTagRequest.onsuccess = () => {
        const tag = getTagRequest.result;
        if (!tag) {
            showStatusNotification(`Tag "${tagName}" not found.`, 'error');
            return;
        }
        
        // Create a dialog within the tag manager modal
        const tagManagerModal = document.getElementById('tag-manager-modal');
        const tagManagerContent = tagManagerModal.querySelector('.tag-manager-modal');
        
        // Create the dialog container
        const editTagDialog = document.createElement('div');
        editTagDialog.className = 'confirmation-dialog';
        editTagDialog.id = 'edit-tag-dialog';
        
        // Get random color if tag doesn't have one
        const tagColor = tag.color || getRandomPastelColor();
        
        // Add the dialog content
        editTagDialog.innerHTML = `
            <div class="confirmation-dialog-content">
                <div class="confirmation-header">
                    <div class="confirmation-title">Edit Tag</div>
                </div>
                <div class="confirmation-body">
                    <div class="form-field">
                        <label>Tag Name:</label>
                        <div class="tag-name-display"><strong>#${tag.name}</strong></div>
                    </div>
                    <div class="form-field">
                        <label for="tag-color">Tag Color:</label>
                        <div class="color-picker-container">
                            <input type="color" id="tag-color" value="${tagColor}">
                            <div class="color-preview-container">
                                <div class="color-preview-label">Preview:</div>
                                <div class="tag-preview" id="tag-preview">
                                    <span class="sample-tag" style="background-color:${tagColor}; color:${getContrastingTextColor(tagColor)}; padding:3px 8px; border-radius:4px;">#${tag.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="confirmation-footer">
                    <button id="cancel-edit-tag" class="secondary-btn">Cancel</button>
                    <button id="save-tag-edit" class="primary">Save Changes</button>
                </div>
            </div>
        `;
        
        // Add the dialog to the Tag Manager modal
        tagManagerContent.appendChild(editTagDialog);
        
        // Make the dialog visible
        editTagDialog.style.display = 'flex';
        
        // Handle color input change for live preview
        const colorInput = document.getElementById('tag-color');
        const tagPreview = document.getElementById('tag-preview');
        
        colorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            const textColor = getContrastingTextColor(color);
            tagPreview.innerHTML = `<span class="sample-tag" style="background-color:${color}; color:${textColor}; padding:3px 8px; border-radius:4px;">#${tag.name}</span>`;
        });
        
        // Handle cancel button
        document.getElementById('cancel-edit-tag').addEventListener('click', () => {
            // Remove the dialog
            tagManagerContent.removeChild(editTagDialog);
        });
        
        // Handle save button
        document.getElementById('save-tag-edit').addEventListener('click', () => {
            const color = document.getElementById('tag-color').value;
            
            // Save the updated tag
            saveTagEdit(tagName, color);
            
            // Remove the dialog
            tagManagerContent.removeChild(editTagDialog);
        });
    };
    
    getTagRequest.onerror = (error) => {
        Logger.error(`Error getting tag ${tagName}:`, error);
        showStatusNotification(`Error getting tag: ${error}`, 'error');
    };
}

/**
 * Saves the edited tag properties
 */
function saveTagEdit(tagName, color) {
    if (!db) {
        Logger.error('Database not available');
        return;
    }
    
    Logger.log(`Saving edited tag: ${tagName}, Color: ${color}`);
    
    const transaction = db.transaction([TAGS_STORE], 'readwrite');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Get the current tag
    const getTagRequest = tagsStore.get(tagName);
    
    getTagRequest.onsuccess = () => {
        const tag = getTagRequest.result;
        if (!tag) {
            showStatusNotification(`Tag "${tagName}" not found.`, 'error');
            return;
        }
        
        // Update the tag's color
        tag.color = color;
        
        // Save the updated tag
        const updateTagRequest = tagsStore.put(tag);
        
        updateTagRequest.onsuccess = () => {
            Logger.log(`Tag ${tagName} updated successfully`);
            
            // Refresh the tag manager display
            loadAllTagsForManager();
            
            // Refresh the sidebar tags
            loadTags();
            
            // Refresh notes to show updated tag colors
            loadNotes();
            
            // Show success message
            showStatusNotification(`Tag #${tagName} updated successfully`, 'success');
        };
        
        updateTagRequest.onerror = (error) => {
            Logger.error(`Error updating tag ${tagName}:`, error);
            showStatusNotification(`Error updating tag: ${error}`, 'error');
        };
    };
    
    getTagRequest.onerror = (error) => {
        Logger.error(`Error getting tag ${tagName} for edit:`, error);
        showStatusNotification(`Error editing tag: ${error}`, 'error');
    };
}

/**
 * Generate a unique random pastel color that hasn't been used by other tags
 * @param {Array} existingColors - Array of colors already in use
 * @returns {string} A hex color code for a pastel color
 */
function getUniqueRandomColor(existingColors = []) {
    // Convert all existing colors to lowercase for case-insensitive comparison
    const normalizedExistingColors = existingColors.map(c => c.toLowerCase());
    
    // Maximum attempts to find a unique color
    const maxAttempts = 30;
    let attempts = 0;
    
    // Try to generate a unique color
    while (attempts < maxAttempts) {
        const newColor = getRandomPastelColor();
        
        // Check if this color is sufficiently different from existing colors
        if (!normalizedExistingColors.includes(newColor.toLowerCase()) && 
            !isColorTooSimilar(newColor, normalizedExistingColors)) {
            return newColor;
        }
        
        attempts++;
    }
    
    // If we couldn't find a unique color after max attempts, just return a random one
    return getRandomPastelColor();
}

/**
 * Check if a color is too similar to any of the existing colors
 * @param {string} newColor - The new color to check in hex format
 * @param {Array} existingColors - Array of existing colors in hex format
 * @returns {boolean} - True if the color is too similar to any existing color
 */
function isColorTooSimilar(newColor, existingColors) {
    // If there are no existing colors, it can't be too similar
    if (!existingColors || existingColors.length === 0) {
        return false;
    }
    
    // Convert hex to RGB
    const newRGB = hexToRGB(newColor);
    
    // Check similarity with each existing color
    for (const existingColor of existingColors) {
        const existingRGB = hexToRGB(existingColor);
        
        // Calculate color distance (Euclidean distance in RGB space)
        const distance = Math.sqrt(
            Math.pow(newRGB.r - existingRGB.r, 2) +
            Math.pow(newRGB.g - existingRGB.g, 2) +
            Math.pow(newRGB.b - existingRGB.b, 2)
        );
        
        // If the distance is less than this threshold, colors are too similar
        // Value between 0-255, higher means more different colors can be similar
        const similarityThreshold = 60;
        
        if (distance < similarityThreshold) {
            return true; // Too similar
        }
    }
    
    return false; // Different enough from all existing colors
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code
 * @returns {Object} - RGB color components
 */
function hexToRGB(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert 3-char hex to 6-char
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // Convert hex to RGB
    return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
    };
}

// Function to read and import a file
function readAndImportFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            // Check if we have a notes array in the backup
            if (data && data.notes && Array.isArray(data.notes)) {
                // First, check the current database version if the API is available
                if ('databases' in indexedDB) {
                    indexedDB.databases().then(databases => {
                        const dbInfo = databases.find(db => db.name === DB_NAME);
                        const currentVersion = dbInfo ? dbInfo.version : 2; // Use version 2 as fallback
                        console.log(`Opening database with version: ${currentVersion}`);
                        importNotes(data.notes, currentVersion);
                    }).catch(error => {
                        console.error("Error checking database version:", error);
                        importNotes(data.notes, 2); // Use version 2 as fallback
                    });
                } else {
                    // If the databases() API is not supported, use version 2 as fallback
                    importNotes(data.notes, 2);
                }
            } else {
                throw new Error('Invalid backup format');
            }
        } catch (error) {
            console.error('Error parsing backup file:', error);
            alert('Invalid backup file format. Please select a valid notes backup.');
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
}

// Function to import notes with the correct database version
function importNotes(notes, version) {
    // Open the database with the correct version
    const request = indexedDB.open(DB_NAME, version);
    
    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['notes'], 'readwrite');
        const notesStore = transaction.objectStore('notes');
        
        let successCount = 0;
        let errorCount = 0;
        let totalCount = notes.length;
        
        // Process notes in smaller batches to avoid transaction timeout
        processNotesInBatches(notes, notesStore)
            .then(result => {
                alert(`Import complete: ${result.success} notes imported successfully, ${result.error} failed.`);
                // Reload the notes list to reflect changes
                loadNotes();
                // Update tag counts
                recalculateTagCounts();
            })
            .catch(error => {
                console.error('Error during import:', error);
                alert('Error during import: ' + error.message);
            });
    };
    
    request.onerror = function(event) {
        console.error('Error opening database:', event.target.error);
        alert('Failed to open database. Please try again. Error: ' + event.target.error);
    };
}

// Helper to process notes in batches
async function processNotesInBatches(notes, objectStore) {
    const BATCH_SIZE = 25;
    let success = 0;
    let error = 0;
    
    for (let i = 0; i < notes.length; i += BATCH_SIZE) {
        const batch = notes.slice(i, i + BATCH_SIZE);
        
        // Process batch and wait for completion
        await new Promise((resolve, reject) => {
            let processed = 0;
            
            batch.forEach(note => {
                try {
                    // Use put instead of add to handle updates to existing notes
                    const request = objectStore.put(note);
                    
                    request.onsuccess = function() {
                        success++;
                        processed++;
                        if (processed === batch.length) resolve();
                    };
                    
                    request.onerror = function(e) {
                        console.error('Error importing note:', e.target.error);
                        error++;
                        processed++;
                        if (processed === batch.length) resolve();
                    };
                } catch (e) {
                    console.error('Error processing note:', e);
                    error++;
                    processed++;
                    if (processed === batch.length) resolve();
                }
            });
            
            // Handle empty batch case
            if (batch.length === 0) resolve();
        });
        
        // Short delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return { success, error };
}

// Voice dictation functionality
let recognition = null;
let isListening = false;

// Function to start voice dictation
function startVoiceDictation(editor) {
    // Check if the Web Speech API is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showStatusNotification("Voice dictation is not supported in this browser", "error");
        return;
    }
    
    // If already listening, stop it
    if (isListening) {
        stopDictation();
        return;
    }
    
    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // Configure the recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Set language to English
    
    // Variable to track whether any results were received
    let hasReceivedResults = false;
    let currentResult = '';
    
    // Create and show recording indicator
    const recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'recording-indicator';
    recordingIndicator.innerHTML = `
        <i class="material-icons pulse">mic</i>
        <span>Listening...</span>
        <button class="stop-recording" title="Stop Recording">
            <i class="material-icons">stop</i>
        </button>
    `;
    document.body.appendChild(recordingIndicator);
    
    // Add stop button event
    recordingIndicator.querySelector('.stop-recording').addEventListener('click', stopDictation);
    
    // Update UI states
    isListening = true;
    updateDictationButtonState(true);
    
    // Handle results
    recognition.onresult = function(event) {
        hasReceivedResults = true;
        const results = event.results;
        const latestResult = results[results.length - 1];
        
        // Use the most confident result
        currentResult = latestResult[0].transcript;
        
        // Process the text for better hashtag handling
        currentResult = processVoiceText(currentResult);
        
        if (latestResult.isFinal) {
            // Get cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Insert the recognized text at cursor
                const textNode = document.createTextNode(' ' + currentResult + ' ');
                range.insertNode(textNode);
                
                // Move cursor after inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Mark as having unsaved changes
                markUnsavedChanges();
            }
            
            // Reset current result
            currentResult = '';
            
            // Update the indicator with the inserted text
            recordingIndicator.querySelector('span').textContent = 'Listening...';
        } else {
            // Show the current recognition in progress
            recordingIndicator.querySelector('span').textContent = 'Listening: ' + currentResult;
        }
    };
    
    // Handle end of recognition
    recognition.onend = function() {
        stopDictation();
        
        // If no results were received, show a message
        if (!hasReceivedResults) {
            showStatusNotification("No speech detected. Try speaking louder or check your microphone.", "warning");
        }
    };
    
    // Handle errors
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        let errorMessage = "Speech recognition error";
        
        switch (event.error) {
            case 'no-speech':
                errorMessage = "No speech detected. Try speaking louder.";
                break;
            case 'aborted':
                errorMessage = "Speech recognition aborted";
                break;
            case 'audio-capture':
                errorMessage = "No microphone detected";
                break;
            case 'network':
                errorMessage = "Network error occurred";
                break;
            case 'not-allowed':
                errorMessage = "Microphone access denied";
                break;
            case 'service-not-allowed':
                errorMessage = "Speech recognition service not allowed";
                break;
            case 'bad-grammar':
                errorMessage = "Grammar error in speech recognition";
                break;
            case 'language-not-supported':
                errorMessage = "Language not supported";
                break;
        }
        
        showStatusNotification(errorMessage, "error");
        stopDictation();
    };
    
    // Start recognition
    try {
        recognition.start();
        showStatusNotification("Voice dictation started", "success");
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        showStatusNotification("Error starting speech recognition", "error");
        stopDictation();
    }
}

// Process voice text to handle special cases like hashtags
function processVoiceText(text) {
    if (!text) return text;
    
    // Convert hashtag phrases into actual hashtags
    // Match "hashtag" or "hash tag" followed by a word, and replace with "#word"
    let processed = text.replace(/hash\s*tag\s+(\w+)[\.\,\!\?\;\:]*\s*/gi, "#$1 ");
    
    // Also support the phrase "pound sign" for hashtags
    processed = processed.replace(/pound\s*sign\s+(\w+)[\.\,\!\?\;\:]*\s*/gi, "#$1 ");
    
    // Make sure any remaining hashtags don't have trailing punctuation
    processed = processed.replace(/#(\w+)[\.\,\!\?\;\:]+/g, "#$1");
    
    return processed;
}

// Function to stop dictation
function stopDictation() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.log('Error stopping recognition:', error);
        }
    }
    
    // Remove recording indicator
    const recordingIndicator = document.querySelector('.recording-indicator');
    if (recordingIndicator) {
        recordingIndicator.remove();
    }
    
    // Reset state
    isListening = false;
    updateDictationButtonState(false);
    recognition = null;
}

// Update the state of all dictation buttons
function updateDictationButtonState(isActive) {
    const dictationButtons = document.querySelectorAll('button[data-command="voiceDictation"]');
    dictationButtons.forEach(button => {
        if (isActive) {
            button.classList.add('active');
            button.querySelector('.material-icons').style.color = 'red';
        } else {
            button.classList.remove('active');
            button.querySelector('.material-icons').style.color = '';
        }
    });
}

/**
 * Shows a confirmation dialog for deleting a tag
 */
function confirmDeleteTag(tagName) {
    if (!db) {
        Logger.error('Database not available');
        return;
    }
    
    Logger.log(`Confirming deletion of tag: ${tagName}`);
    
    // Create a dialog within the tag manager modal
    const tagManagerModal = document.getElementById('tag-manager-modal');
    const tagManagerContent = tagManagerModal.querySelector('.tag-manager-modal');
    
    // Create the dialog container
    const deleteTagDialog = document.createElement('div');
    deleteTagDialog.className = 'confirmation-dialog';
    deleteTagDialog.id = 'delete-tag-dialog';
    
    // Add the dialog content
    deleteTagDialog.innerHTML = `
        <div class="confirmation-dialog-content">
            <div class="confirmation-header">
                <div class="confirmation-title">Delete Tag</div>
            </div>
            <div class="confirmation-body">
                <p>Are you sure you want to delete the tag <strong>#${tagName}</strong>?</p>
                <p>This action will remove the tag from the database, but it will not remove the tag from any notes where it's used.</p>
            </div>
            <div class="confirmation-footer">
                <button id="cancel-delete-tag" class="secondary-btn">Cancel</button>
                <button id="confirm-delete-tag" class="danger">Delete Tag</button>
            </div>
        </div>
    `;
    
    // Add the dialog to the Tag Manager modal
    tagManagerContent.appendChild(deleteTagDialog);
    
    // Make the dialog visible
    deleteTagDialog.style.display = 'flex';
    
    // Handle cancel button
    document.getElementById('cancel-delete-tag').addEventListener('click', () => {
        // Remove the dialog
        tagManagerContent.removeChild(deleteTagDialog);
    });
    
    // Handle confirm button
    document.getElementById('confirm-delete-tag').addEventListener('click', () => {
        // Delete the tag
        deleteTag(tagName);
        
        // Remove the dialog
        tagManagerContent.removeChild(deleteTagDialog);
    });
}

/**
 * Deletes a tag from the database
 */
function deleteTag(tagName) {
    if (!db) {
        Logger.error('Database not available');
        return;
    }
    
    Logger.log(`Deleting tag: ${tagName}`);
    
    const transaction = db.transaction([TAGS_STORE], 'readwrite');
    const tagsStore = transaction.objectStore(TAGS_STORE);
    
    // Delete the tag
    const deleteRequest = tagsStore.delete(tagName);
    
    deleteRequest.onsuccess = () => {
        Logger.log(`Tag ${tagName} deleted successfully`);
        
        // Refresh the tag manager display
        loadAllTagsForManager();
        
        // Refresh the sidebar tags
        loadTags();
        
        // Show success message
        showStatusNotification(`Tag #${tagName} deleted successfully`, 'success');
    };
    
    deleteRequest.onerror = (error) => {
        Logger.error(`Error deleting tag ${tagName}:`, error);
        showStatusNotification(`Error deleting tag: ${error}`, 'error');
    };
}

/**
 * Fetches all tags from the database.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of tag objects.
 */
function getAllTagsFromDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            Logger.error('Database not available for fetching tags.');
            return reject('Database not available');
        }
        const transaction = db.transaction([TAGS_STORE], 'readonly');
        const store = transaction.objectStore(TAGS_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        request.onerror = (event) => {
            Logger.error('Error fetching all tags:', event.target.error);
            reject('Error fetching all tags: ' + event.target.error);
        };
    });
}

/**
 * Sets up the event listener for the tag manager search input.
 */
async function setupTagManagerSearch() {
    const searchInput = document.getElementById('tag-manager-search-input');
    if (!searchInput) {
        Logger.error('Tag manager search input not found.');
        return;
    }

    // Debounce the input handler to avoid excessive filtering on rapid typing
    const debouncedFilter = debounce(async () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        try {
            Logger.log(`Filtering tag manager list for term: "${searchTerm}"`);
            const allTags = await getAllTagsFromDB(); // Fetch all tags
            // Filter tags based on the search term
            const filteredTags = allTags.filter(tag => 
                tag.name.toLowerCase().includes(searchTerm)
            );
            displayTagsInManager(filteredTags); // Display the filtered list
        } catch (error) {
            Logger.error("Error filtering tags in manager:", error);
            showStatusNotification('Error filtering tags', 'error');
            // Optionally display all tags again or show an error in the list
            displayTagsInManager([]); // Show empty list on error for clarity
        }
    }, 250); // 250ms debounce delay

    searchInput.addEventListener('input', debouncedFilter);
}

/**
 * Opens the tag manager modal and loads the tags.
 */
function openTagManagerModal() {
    Logger.log('Opening tag manager modal');
    const modalOverlay = document.getElementById('tag-manager-modal');
    modalOverlay.classList.add('active');
    loadAllTagsForManager(); // Load all tags initially
    setupTagManagerSearch(); // Setup the search functionality <<< Error was here
    
    // Add event listener for the Add New Tag button if it doesn't exist
    const tagListContainer = document.getElementById('tag-manager-list');
    if (tagListContainer && !tagListContainer.querySelector('.add-new-tag-button')) {
         const addNewTagButton = document.createElement('button');
         addNewTagButton.className = 'add-new-tag-button';
         addNewTagButton.innerHTML = '<i class="fas fa-plus"></i> Add New Tag';
         addNewTagButton.onclick = openAddNewTagDialog;
         // Prepend the button to the top of the list container
         tagListContainer.insertBefore(addNewTagButton, tagListContainer.firstChild);
    }

    // Focus the search input shortly after opening
    setTimeout(() => {
        const searchInput = document.getElementById('tag-manager-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }, 150);
}
