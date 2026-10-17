/**
 * PromptBox - Modern Prompt Management System
 * Enhanced and Combined Version
 *
 * This script manages the full functionality of the PromptBox single-page application.
 * It handles local storage for persistence, UI rendering, event handling, and all
 * prompt-related operations (create, read, update, delete).
 */

let deferredPrompt;

class PromptBoxApp {
    constructor() {
        this.defaultEnhancementPrompt = 'You are an expert prompt engineer. Improve the prompt for clarity and effectiveness while preserving intent. Return only the improved prompt text.';
        this.defaultAiModel = 'openrouter/free';
        this.prompts = [];
        this.installPromptShown = false;
        this.filteredPrompts = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.editingPromptId = null;
        this.currentPromptId = null;
        this.previousPromptContent = null;
        this.aiSettings = {
            apiKey: '',
            model: this.defaultAiModel,
            enhancementPrompt: this.defaultEnhancementPrompt
        };
        this.lastFocusedElement = null;

        // Initialize DOM elements
            this.dom = {
                promptsGrid: document.getElementById('prompts-grid'),
                searchInput: document.getElementById('search-input'),
                searchClearBtn: document.getElementById('search-clear-btn'),
                newPromptBtn: document.getElementById('new-prompt-btn'),
                tagSelect: document.getElementById('tag-select'),
                sortSelect: document.getElementById('sort-select'),
                aiAssistantBtn: document.getElementById('ai-assistant-btn'),
                importExportBtn: document.getElementById('import-export-btn'),
                importExportModal: document.getElementById('import-export-modal'),
                importExportTabs: document.querySelectorAll('.import-export-tabs .tab-btn'),
                importExportSections: document.querySelectorAll('.import-export-section'),
                exportAllBtn: document.getElementById('export-all-btn'),
                importFileInput: document.getElementById('import-file-input'),
                importIncludeSettings: document.getElementById('import-include-settings'),
                importConfirmBtn: document.getElementById('import-confirm-btn'),
                importSummary: document.getElementById('import-summary'),
                importFileBtn: document.getElementById('import-file-btn'),
                importFileName: document.getElementById('import-file-name'),
                importBehaviorSelect: document.getElementById('import-behavior-select'),
                importBehaviorHelp: document.getElementById('import-behavior-help'),
                themeToggleBtn: document.getElementById('theme-toggle-btn'),
                exportIncludeSettings: document.getElementById('export-include-settings'),
                undoEnhanceBtn: document.getElementById('undo-enhance-btn'),
                aiAssistantModal: document.getElementById('ai-assistant-modal'),
                aiPromptInput: document.getElementById('ai-prompt-input'),
                aiPromptOutput: document.getElementById('ai-prompt-output'),
                aiPromptStatus: document.getElementById('ai-prompt-status'),
                aiPromptGenerate: document.getElementById('ai-prompt-generate'),
                aiPromptAccept: document.getElementById('ai-prompt-accept'),
                aiPromptRedo: document.getElementById('ai-prompt-redo'),
                aiPromptReject: document.getElementById('ai-prompt-reject'),
                newEditModal: document.getElementById('new-edit-prompt-modal'),
                newEditModalTitle: document.getElementById('new-edit-modal-title'),
                promptForm: document.getElementById('prompt-form'),
            promptTitleInput: document.getElementById('prompt-title'),
            promptContentInput: document.getElementById('prompt-content'),
            promptTagsInput: document.getElementById('prompt-tags'),
            savePromptBtn: document.getElementById('save-prompt-btn'),
            cancelPromptBtn: document.getElementById('cancel-prompt-btn'),
            promptDetailModal: document.getElementById('prompt-detail-modal'),
            detailTitle: document.getElementById('prompt-detail-title'),
            detailContent: document.getElementById('modal-prompt-content'),
            detailTags: document.getElementById('modal-prompt-tags'),
            detailUseBtn: document.getElementById('modal-use-prompt-btn'),
            detailEditBtn: document.getElementById('modal-edit-prompt-btn'),
            detailDeleteBtn: document.getElementById('modal-delete-prompt-btn'),
            emptyState: document.getElementById('empty-state'),
            notificationContainer: document.getElementById('notification-container'),
            closeModalBtns: document.querySelectorAll('.close-modal')
        };
        
        this.init();
    }

    init() {
        this.loadPrompts();
        this.applyTheme();
        this.bindEvents();
        this.renderTagDropdown();
        this.handleFilterAndSort();
        this.setupInstallPrompt();
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Check if already installed
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isAppInstalled = window.navigator.standalone || isStandalone;
            
            // Only show if not installed and not shown yet this session
            if (!isAppInstalled && !sessionStorage.getItem('installPromptShown')) {
                this.showInstallPrompt();
                sessionStorage.setItem('installPromptShown', 'true');
            }
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            // Clear the prompt state in both session and local storage
            sessionStorage.removeItem('installPromptShown');
            localStorage.removeItem('installPromptDismissed');
        });
    }

    showInstallPrompt() {
        if (deferredPrompt && !this.installPromptShown) {
            const installModal = document.createElement('div');
            installModal.className = 'install-modal';
            installModal.innerHTML = `
                <div class="install-modal-content">
                    <h3>Install PromptBox</h3>
                    <p>Add PromptBox to your home screen for quick access and offline use!</p>
                    <div class="install-actions">
                        <button id="install-button" class="action-btn primary">Install</button>
                        <button id="cancel-install" class="action-btn secondary">Not Now</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(installModal);
            
            document.getElementById('install-button').addEventListener('click', async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.installPromptShown = true;
                }
                installModal.remove();
            });
            
            document.getElementById('cancel-install').addEventListener('click', () => {
                this.installPromptShown = true;
                installModal.remove();
            });
        }
    }

    getPreferredTheme() {
        let storedTheme = null;
        try {
            storedTheme = localStorage.getItem('theme');
        } catch (err) {
            storedTheme = null;
        }

        if (storedTheme === 'default-light' || storedTheme === 'default-dark') {
            return storedTheme;
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'default-dark' : 'default-light';
    }

    applyTheme() {
        const theme = this.getPreferredTheme();
        document.documentElement.dataset.theme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'default-light' ? '#ffffff' : '#000000');
        }
        if (this.dom.themeToggleBtn) {
            this.dom.themeToggleBtn.innerHTML = theme === 'default-dark'
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme || 'default-dark';
        const newTheme = currentTheme === 'default-dark' ? 'default-light' : 'default-dark';
        document.documentElement.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', newTheme === 'default-light' ? '#ffffff' : '#000000');
        }
        if (this.dom.themeToggleBtn) {
            this.dom.themeToggleBtn.innerHTML = newTheme === 'default-dark'
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
        }
    }

    /**
     * Data Management (Local Storage)
     */
    loadPrompts() {
        const storedPrompts = localStorage.getItem('promptForgePrompts');
        if (storedPrompts) {
            const parsed = JSON.parse(storedPrompts);
            const normalized = PromptBoxImportExport.normalizeImportedData(parsed).prompts;
            this.prompts = normalized;
        } else {
            // Load sample data if local storage is empty
            this.prompts = this.loadSampleData();
            this.savePrompts();
        }
    }

    savePrompts() {
        localStorage.setItem('promptForgePrompts', JSON.stringify(this.prompts));
    }

    loadSampleData() {
        return [
            {
                id: "1",
                title: "Creative Writing Assistant",
                preview: "Help me write engaging stories with vivid descriptions and compelling characters. Focus on show don't tell techniques...",
                content: "You are a creative writing assistant. Help me write engaging stories with vivid descriptions and compelling characters. Focus on 'show don't tell' techniques, create immersive settings, and develop authentic dialogue. Always ask clarifying questions about genre, tone, and target audience before starting.",
                tags: ["writing", "creative"],
                createdAt: "2024-01-01T10:00:00.000Z",
                lastUsed: "2024-01-01T10:00:00.000Z",
                useCount: 23
            },
            {
                id: "2",
                title: "Code Review Expert",
                preview: "Analyze code for best practices, security vulnerabilities, and performance optimizations. Provide detailed feedback...",
                content: "You are an expert code reviewer with deep knowledge of multiple programming languages. Analyze code for best practices, security vulnerabilities, performance optimizations, and maintainability. Provide specific, actionable feedback with examples of improvements.",
                tags: ["coding", "analysis"],
                createdAt: "2024-01-02T11:30:00.000Z",
                lastUsed: "2024-01-02T11:30:00.000Z",
                useCount: 45
            },
            {
                id: "3",
                title: "Business Strategy Consultant",
                preview: "Provide strategic business advice with market analysis, competitive positioning, and growth recommendations...",
                content: "Act as a senior business strategy consultant. Provide strategic business advice with market analysis, competitive positioning, and growth recommendations. Use frameworks like SWOT, Porter's Five Forces, and Blue Ocean Strategy when relevant.",
                tags: ["business", "analysis"],
                createdAt: "2024-01-03T14:00:00.000Z",
                lastUsed: "2024-01-03T14:00:00.000Z",
                useCount: 12
            },
            {
                id: "4",
                title: "Python Debugging Helper",
                preview: "Debug Python code by identifying errors, suggesting fixes, and explaining best practices for clean code...",
                content: "You are a Python debugging expert. Help identify errors in Python code, suggest fixes, and explain best practices for writing clean, efficient Python code. Include explanations of common pitfalls and how to avoid them.",
                tags: ["coding", "python"],
                createdAt: "2024-01-04T16:45:00.000Z",
                lastUsed: "2024-01-04T16:45:00.000Z",
                useCount: 31
            }
        ];
    }

    /**
     * Event Binding
     */
    bindEvents() {
        this.dom.newPromptBtn.addEventListener('click', () => this.showNewPromptModal());
        // Debounced search for smoother typing
        const debounce = (fn, wait = 150) => {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn.apply(this, args), wait);
            };
        };
        this.dom.searchInput.addEventListener('input', debounce((e) => {
            this.searchTerm = e.target.value;
            this.toggleSearchClear();
            this.handleFilterAndSort();
        }, 150));
        if (this.dom.searchClearBtn) {
            this.dom.searchClearBtn.addEventListener('click', () => {
                this.dom.searchInput.value = '';
                this.searchTerm = '';
                this.toggleSearchClear();
                this.handleFilterAndSort();
                this.dom.searchInput.focus();
            });
        }
        
        // Restore and persist sort selection
        const savedSort = localStorage.getItem('pf_sort') || 'newest';
        if (this.dom.sortSelect) {
            this.dom.sortSelect.value = savedSort;
        }
        this.dom.sortSelect.addEventListener('change', () => {
            localStorage.setItem('pf_sort', this.dom.sortSelect.value);
            this.handleFilterAndSort();
        });
        if (this.dom.importExportBtn) {
            this.dom.importExportBtn.addEventListener('click', () => this.showImportExportModal('export'));
        }
        if (this.dom.importExportTabs) {
            this.dom.importExportTabs.forEach(tab => {
                tab.addEventListener('click', () => this.setActiveImportExportTab(tab.dataset.tab));
            });
        }
        if (this.dom.exportAllBtn) {
            this.dom.exportAllBtn.addEventListener('click', () => this.handleExportAll());
        }
        if (this.dom.importConfirmBtn) {
            this.dom.importConfirmBtn.addEventListener('click', () => this.handleImportConfirm());
        }
        if (this.dom.importBehaviorSelect) {
            this.dom.importBehaviorSelect.addEventListener('change', () => this.updateImportBehaviorHelp());
            this.updateImportBehaviorHelp();
        }
        if (this.dom.importFileBtn && this.dom.importFileInput) {
            this.dom.importFileBtn.addEventListener('click', () => this.dom.importFileInput.click());
            this.dom.importFileInput.addEventListener('change', () => this.updateImportFileName());
            this.updateImportFileName();
        }
        if (this.dom.importExportModal) {
            const overlay = this.dom.importExportModal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.closeModal(this.dom.importExportModal));
            }
            const modalContent = this.dom.importExportModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('dragover', (e) => this.handleImportDragOver(e));
                modalContent.addEventListener('dragleave', (e) => this.handleImportDragLeave(e));
                modalContent.addEventListener('drop', (e) => this.handleImportDrop(e));
            }
        }
        if (this.dom.aiAssistantBtn) {
            this.dom.aiAssistantBtn.addEventListener('click', () => this.showAiAssistantModal());
        }
        if (this.dom.aiAssistantModal) {
            const overlay = this.dom.aiAssistantModal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.closeModal(this.dom.aiAssistantModal));
            }
        }
        if (this.dom.aiPromptGenerate) {
            this.dom.aiPromptGenerate.addEventListener('click', () => this.generateAiPrompt());
        }
        if (this.dom.aiPromptAccept) {
            this.dom.aiPromptAccept.addEventListener('click', () => this.acceptAiPrompt());
        }
        if (this.dom.aiPromptRedo) {
            this.dom.aiPromptRedo.addEventListener('click', () => this.generateAiPrompt(true));
        }
        if (this.dom.aiPromptReject) {
            this.dom.aiPromptReject.addEventListener('click', () => this.rejectAiPrompt());
        }
        this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.dom.promptForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePromptFromForm();
        });
        this.dom.cancelPromptBtn.addEventListener('click', () => this.closeModal(this.dom.newEditModal));
        if (this.dom.tagSelect) {
            this.dom.tagSelect.addEventListener('change', () => {
                this.currentFilter = this.dom.tagSelect.value || 'all';
                localStorage.setItem('pf_selectedTag', this.currentFilter);
                this.handleFilterAndSort();
            });
        }

        this.dom.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.dom.importExportModal && this.dom.importExportModal.classList.contains('active')) {
                    this.closeModal(this.dom.importExportModal);
                }
                if (this.dom.aiAssistantModal && this.dom.aiAssistantModal.classList.contains('active')) {
                    this.closeModal(this.dom.aiAssistantModal);
                }
                return;
            }
            if (e.key === 'O' && e.shiftKey) {
                this.findHorizontalOverflow();
            }
        });

        const overflowCheck = () => this.findHorizontalOverflow();
        window.addEventListener('load', overflowCheck);
        window.addEventListener('resize', debounce(overflowCheck, 200));

        // Initialize AI Settings elements
        this.dom.aiSettingsModal = document.getElementById('ai-settings-modal');
        this.dom.aiSettingsForm = document.getElementById('ai-settings-form');
        this.dom.openrouterApiKey = document.getElementById('openrouter-api-key');
        this.dom.aiModelSelect = document.getElementById('ai-model-select');
        this.dom.enhancementPrompt = document.getElementById('enhancement-prompt');
        this.dom.modelLoadingSpinner = document.getElementById('model-loading-spinner');
        this.dom.saveAiSettings = document.getElementById('save-ai-settings');
        this.dom.enhancePromptBtn = document.getElementById('enhance-prompt-btn');

        // Initialize all DOM elements
        this.dom.settingsBtn = document.getElementById('settings-btn');
        
        // Load saved AI settings
        this.loadAiSettings();
        
        // Bind events
        if (this.dom.settingsBtn) {
            this.dom.settingsBtn.addEventListener('click', () => this.showAiSettingsModal());
        }
        if (this.dom.aiSettingsForm) {
            this.dom.aiSettingsForm.addEventListener('submit', (e) => this.saveAiSettings(e));
        }
        if (this.dom.enhancePromptBtn) {
            this.dom.enhancePromptBtn.addEventListener('click', () => this.enhancePrompt());
        }
        if (this.dom.undoEnhanceBtn) {
            this.dom.undoEnhanceBtn.addEventListener('click', () => this.undoEnhancement());
        }
        // Add API key change listener to fetch models
        if (this.dom.openrouterApiKey) {
            this.dom.openrouterApiKey.addEventListener('blur', () => {
                if (this.dom.openrouterApiKey.value.trim()) {
                    this.aiSettings.apiKey = this.dom.openrouterApiKey.value.trim();
                    this.fetchAiModels();
                }
            });
        }
    }

    handleFilterAndSort() {
        this.filterPrompts();
        this.sortPrompts();
        this.renderPrompts();
    }

    toggleSearchClear() {
        if (!this.dom.searchClearBtn || !this.dom.searchInput) return;
        const isVisible = Boolean(this.dom.searchInput.value);
        this.dom.searchClearBtn.classList.toggle('visible', isVisible);
    }
    
    setActiveFilter(activeFilter) {
        // Helper retained for potential future use
        if (this.dom.tagSelect) {
            this.dom.tagSelect.value = activeFilter || 'all';
        }
    }

    getExistingTags() {
        const counts = new Map();
        this.prompts.forEach(p => {
            (p.tags || []).forEach(t => {
                const tag = String(t).trim().toLowerCase();
                if (!tag) return;
                counts.set(tag, (counts.get(tag) || 0) + 1);
            });
        });
        // Sort alphabetically; could be by frequency if preferred
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([tag, count]) => ({ tag, count }));
    }

    renderTagDropdown() {
        if (!this.dom.tagSelect) return;
        const savedFilter = localStorage.getItem('pf_selectedTag') || localStorage.getItem('pf_filter');
        if (savedFilter && this.currentFilter === 'all') {
            this.currentFilter = savedFilter;
        }
        const tags = this.getExistingTags();
        if (this.currentFilter !== 'all' && !tags.some(t => t.tag === this.currentFilter)) {
            this.currentFilter = 'all';
            localStorage.setItem('pf_selectedTag', 'all');
        }
        const options = [
            `<option value="all">All tags</option>`,
            ...tags.map(({ tag, count }) => `<option value="${this.escapeHtml(tag)}">${this.escapeHtml(tag)} (${count})</option>`)
        ];
        this.dom.tagSelect.innerHTML = options.join('');
        this.dom.tagSelect.value = this.currentFilter;
    }

    /**
     * Core Application Logic
     */
    showNewPromptModal() {
        this.editingPromptId = null;
        this.previousPromptContent = null;
        if (this.dom.undoEnhanceBtn) {
            this.dom.undoEnhanceBtn.disabled = true;
        }
        this.dom.newEditModalTitle.textContent = 'New Prompt';
        this.dom.promptForm.reset();
        this.openModal(this.dom.newEditModal);
    }

    showEditPromptModal(id) {
        const promptToEdit = this.prompts.find(p => p.id === id);
        if (!promptToEdit) {
            this.showNotification('Prompt not found!', 'error');
            return;
        }

        this.currentPromptId = promptToEdit.id;
        this.previousPromptContent = null;
        if (this.dom.undoEnhanceBtn) {
            this.dom.undoEnhanceBtn.disabled = true;
        }
        this.editingPromptId = id;
        this.dom.newEditModalTitle.textContent = `Edit Prompt: ${promptToEdit.title}`;
        this.dom.promptTitleInput.value = promptToEdit.title;
        this.dom.promptContentInput.value = promptToEdit.content;
        this.dom.promptTagsInput.value = promptToEdit.tags.join(', ');
        this.openModal(this.dom.newEditModal);
        this.closeModal(this.dom.promptDetailModal);
    }

    savePromptFromForm() {
        const title = this.dom.promptTitleInput.value.trim();
        const content = this.dom.promptContentInput.value.trim();
        const tagsInput = this.dom.promptTagsInput.value.trim();
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag) : ['general'];

        if (!title || !content) {
            this.showNotification('Title and content are required!', 'error');
            return;
        }

        if (this.editingPromptId) {
            // Update existing prompt
            const index = this.prompts.findIndex(p => p.id === this.editingPromptId);
            if (index !== -1) {
                this.prompts[index] = {
                    ...this.prompts[index],
                    title,
                    preview: this.createPreview(content),
                    content,
                    tags
                };
                this.showNotification('Prompt updated successfully!', 'success');
            }
        } else {
            // Create new prompt
            const newPrompt = {
                id: crypto.randomUUID(),
                title,
                preview: this.createPreview(content),
                content,
                tags,
                createdAt: new Date().toISOString(),
                lastUsed: null,
                useCount: 0
            };
            this.prompts.unshift(newPrompt);
            this.showNotification('Prompt created successfully!', 'success');
        }

        this.savePrompts();
        this.renderTagDropdown();
        this.handleFilterAndSort();
        this.closeModal(this.dom.newEditModal);
    }

    deletePrompt(id) {
        if (!confirm('Are you sure you want to delete this prompt?')) return;
        this.prompts = this.prompts.filter(p => p.id !== id);
        if (this.currentPromptId === id) {
            this.currentPromptId = null;
        }
        this.savePrompts();
        this.renderTagDropdown();
        this.handleFilterAndSort();
        this.closeModal(this.dom.promptDetailModal);
        this.showNotification('Prompt deleted successfully!', 'success');
    }

    filterPrompts() {
        this.filteredPrompts = this.prompts.filter(prompt => {
            const matchesFilter = this.currentFilter === 'all' || prompt.tags.includes(this.currentFilter);
            const matchesSearch = this.searchTerm === '' ||
                                prompt.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                prompt.content.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                prompt.tags.some(tag => tag.includes(this.searchTerm.toLowerCase()));
            return matchesFilter && matchesSearch;
        });
    }

    sortPrompts() {
        switch (this.dom.sortSelect.value) {
            case 'newest':
                this.filteredPrompts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                this.filteredPrompts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'alphabetical':
                this.filteredPrompts.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'most-used':
                this.filteredPrompts.sort((a, b) => b.useCount - a.useCount);
                break;
        }
    }

    renderPrompts() {
        if (this.filteredPrompts.length === 0) {
            this.dom.promptsGrid.style.display = 'none';
            this.dom.emptyState.style.display = 'flex';
            return;
        }

        this.dom.promptsGrid.style.display = 'grid';
        this.dom.emptyState.style.display = 'none';

        this.dom.promptsGrid.innerHTML = this.filteredPrompts.map(prompt => this.createPromptCard(prompt)).join('');
        this.bindPromptCardEvents();
    }

    createPromptCard(prompt) {
        const tagsHtml = prompt.tags.map(tag => `<span class="prompt-tag">${this.escapeHtml(tag)}</span>`).join('');
        const lastUsed = this.formatDate(prompt.lastUsed);
        
        return `
            <div class="prompt-card" data-id="${prompt.id}">
                <div class="prompt-header">
                    <div>
                        <h3 class="prompt-title">${this.escapeHtml(prompt.title)}</h3>
                        <div class="prompt-meta">Used ${prompt.useCount} times • Last used ${lastUsed}</div>
                    </div>
                </div>
                <div class="prompt-tags">${tagsHtml}</div>
                <div class="prompt-preview">${this.escapeHtml(this.createPreview(prompt.content))}</div>
                <div class="prompt-actions">
                    <button class="action-btn primary use-prompt-btn"><i class="fas fa-copy"></i> Use</button>
                    <button class="action-btn secondary export-prompt-btn"><i class="fas fa-file-export"></i> Export</button>
                    <button class="action-btn secondary edit-prompt-btn"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
        `;
    }

    bindPromptCardEvents() {
        document.querySelectorAll('.prompt-card').forEach(card => {
            const id = card.dataset.id;
            const useBtn = card.querySelector('.use-prompt-btn');
            const exportBtn = card.querySelector('.export-prompt-btn');
            const editBtn = card.querySelector('.edit-prompt-btn');

            card.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) return;
                this.showPromptDetailModal(id);
            });
            useBtn.addEventListener('click', () => this.usePrompt(id));
            exportBtn.addEventListener('click', () => this.exportSinglePromptById(id));
            editBtn.addEventListener('click', () => this.showEditPromptModal(id));
        });
    }
    
    showPromptDetailModal(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) return;
        this.currentPromptId = prompt.id;

        this.dom.detailTitle.textContent = this.escapeHtml(prompt.title);
        this.dom.detailContent.textContent = prompt.content;
        this.dom.detailTags.innerHTML = prompt.tags.map(tag => `<span class="prompt-tag">${this.escapeHtml(tag)}</span>`).join('');
        
        this.dom.detailUseBtn.onclick = () => this.usePrompt(id);
        this.dom.detailEditBtn.onclick = () => this.showEditPromptModal(id);
        this.dom.detailDeleteBtn.onclick = () => this.deletePrompt(id);
        
        this.openModal(this.dom.promptDetailModal);
    }

    usePrompt(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (prompt) {
            navigator.clipboard.writeText(prompt.content).then(() => {
                this.showNotification(`'${prompt.title}' copied to clipboard!`, 'success');
                // Update use count and last used date
                prompt.useCount++;
                prompt.lastUsed = new Date().toISOString();
                this.savePrompts();
                this.renderPrompts();
            }).catch(err => {
                this.showNotification('Failed to copy prompt.', 'error');
            });
        }
        this.closeModal(this.dom.promptDetailModal);
    }

    showImportExportModal(defaultTab) {
        if (!this.dom.importExportModal) return;
        this.setActiveImportExportTab(defaultTab || 'export');
        if (this.dom.importSummary) {
            this.dom.importSummary.textContent = '';
            this.dom.importSummary.classList.add('is-hidden');
        }
        document.body.classList.add('modal-open');
        this.openModal(this.dom.importExportModal);
    }

    showAiAssistantModal() {
        if (!this.dom.aiAssistantModal) return;
        if (this.dom.aiPromptInput && !this.dom.aiPromptInput.value.trim()) {
            const currentContent = this.dom.promptContentInput?.value.trim();
            if (currentContent) {
                this.dom.aiPromptInput.value = currentContent;
            }
        }
        this.resetAiPromptState();
        document.body.classList.add('modal-open');
        this.openModal(this.dom.aiAssistantModal);
    }

    resetAiPromptState() {
        if (this.dom.aiPromptOutput) {
            this.dom.aiPromptOutput.value = '';
        }
        if (this.dom.aiPromptStatus) {
            this.dom.aiPromptStatus.textContent = '';
        }
        this.setAiPromptActionsEnabled(false);
        if (this.dom.aiPromptGenerate) {
            this.dom.aiPromptGenerate.disabled = false;
            this.dom.aiPromptGenerate.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate';
        }
    }

    setAiPromptActionsEnabled(isEnabled) {
        if (this.dom.aiPromptAccept) this.dom.aiPromptAccept.disabled = !isEnabled;
        if (this.dom.aiPromptRedo) this.dom.aiPromptRedo.disabled = !isEnabled;
        if (this.dom.aiPromptReject) this.dom.aiPromptReject.disabled = !isEnabled;
    }

    async generateAiPrompt(isRedo = false) {
        if (!this.aiSettings.apiKey || !this.aiSettings.model) {
            this.showNotification('Please configure AI settings first', 'error');
            this.showAiSettingsModal();
            return;
        }

        const userInput = this.dom.aiPromptInput?.value.trim() || '';
        if (!userInput) {
            this.showNotification('Enter a prompt or request to generate', 'error');
            return;
        }

        try {
            if (this.dom.aiPromptStatus) {
                this.dom.aiPromptStatus.textContent = isRedo ? 'Regenerating with AI...' : 'Generating with AI...';
            }
            if (this.dom.aiPromptGenerate) {
                this.dom.aiPromptGenerate.disabled = true;
                this.dom.aiPromptGenerate.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...';
            }
            this.setAiPromptActionsEnabled(false);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.aiSettings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.aiSettings.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.aiSettings.enhancementPrompt
                        },
                        {
                            role: 'user',
                            content: userInput
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'API request failed');
            }

            const result = await response.json();
            const generatedContent = result.choices[0]?.message?.content?.trim();

            if (!generatedContent) {
                throw new Error('No AI content returned');
            }

            if (this.dom.aiPromptOutput) {
                this.dom.aiPromptOutput.value = generatedContent;
            }
            this.setAiPromptActionsEnabled(true);
            if (this.dom.aiPromptStatus) {
                this.dom.aiPromptStatus.textContent = 'AI draft ready.';
            }
        } catch (error) {
            if (this.dom.aiPromptStatus) {
                this.dom.aiPromptStatus.textContent = '';
            }
            this.showNotification(`AI generation failed: ${error.message}`, 'error');
        } finally {
            if (this.dom.aiPromptGenerate) {
                this.dom.aiPromptGenerate.disabled = false;
                this.dom.aiPromptGenerate.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate';
            }
        }
    }

    acceptAiPrompt() {
        const generatedContent = this.dom.aiPromptOutput?.value.trim() || '';
        if (!generatedContent) {
            this.showNotification('No AI result to accept', 'error');
            return;
        }

        const isEditingOpen = this.dom.newEditModal && this.dom.newEditModal.classList.contains('active');
        if (!isEditingOpen) {
            this.showNewPromptModal();
        }
        if (this.dom.promptContentInput) {
            this.dom.promptContentInput.value = generatedContent;
        }
        this.closeModal(this.dom.aiAssistantModal);
        this.showNotification('AI prompt accepted. Review and save when ready.', 'success');
    }

    rejectAiPrompt() {
        if (this.dom.aiPromptOutput) {
            this.dom.aiPromptOutput.value = '';
        }
        if (this.dom.aiPromptStatus) {
            this.dom.aiPromptStatus.textContent = 'Draft discarded.';
        }
        this.setAiPromptActionsEnabled(false);
    }

    setActiveImportExportTab(tab) {
        if (!this.dom.importExportTabs || !this.dom.importExportSections) return;
        this.dom.importExportTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
            btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
        });
        this.dom.importExportSections.forEach(section => {
            section.classList.toggle('active', section.dataset.section === tab);
        });
    }

    handleExportAll() {
        const includeSettings = this.dom.exportIncludeSettings?.checked === true;
        this.exportPrompts({ includeSettings });
    }

    exportPrompts(options = {}) {
        const settingsBundle = options.includeSettings === true ? { aiSettings: this.aiSettings } : undefined;
        const exportData = PromptBoxImportExport.createExportBundle(this.prompts, settingsBundle);
        this.downloadExportData(exportData, 'promptbox_prompts.json');
        this.showNotification('Prompts exported successfully!', 'success');
    }

    exportSinglePromptById(id) {
        const prompt = this.prompts.find(p => p.id === id);
        if (!prompt) return;
        const exportData = PromptBoxImportExport.createExportBundle([prompt]);
        const filename = this.buildPromptFilename(prompt.title);
        this.downloadExportData(exportData, filename);
        this.showNotification('Prompt exported successfully!', 'success');
    }

    buildPromptFilename(title) {
        const base = String(title || 'prompt')
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '')
            .replace(/\s+/g, ' ')
            .slice(0, 80)
            .trim();
        return `${base || 'prompt'}.json`;
    }

    downloadExportData(exportData, filename) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    handleImportConfirm() {
        const file = this.dom.importFileInput?.files?.[0];
        if (!file) {
            this.showNotification('Choose a JSON file to import.', 'error');
            return;
        }
        const mode = this.getSelectedImportMode();
        const includeSettings = this.dom.importIncludeSettings?.checked !== false;
        this.importPromptsFromFile(file, mode, includeSettings);
        this.dom.importFileInput.value = '';
        this.updateImportFileName();
    }

    getSelectedImportMode() {
        const selected = this.dom.importBehaviorSelect?.value || 'merge';
        if (selected === 'replaceAll') return 'replace';
        return selected;
    }

    importPromptsFromFile(file, mode, includeSettings) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                const normalized = PromptBoxImportExport.normalizeImportedData(imported);
                const summary = this.computeImportSummary(this.prompts, normalized.prompts, mode);
                this.prompts = PromptBoxImportExport.applyImport(this.prompts, normalized.prompts, mode);
                if (this.currentPromptId && !this.prompts.some(p => p.id === this.currentPromptId)) {
                    this.currentPromptId = null;
                }

                if (includeSettings && normalized.settings && normalized.settings.aiSettings) {
                    this.aiSettings = normalized.settings.aiSettings;
                    localStorage.setItem('promptForgeAiSettings', JSON.stringify(this.aiSettings));
                }

                this.savePrompts();
                this.renderTagDropdown();
                this.handleFilterAndSort();
                this.updateImportSummary(summary);
                this.showNotification('Prompts imported successfully!', 'success');
            } catch (error) {
                console.error('Import failed:', error);
                this.updateImportSummary({ error: error.message });
                this.showNotification(`Failed to import prompts: ${error.message}`, 'error');
            }
        };

        reader.readAsText(file);
    }

    computeImportSummary(existingPrompts, incomingPrompts, mode) {
        const total = incomingPrompts.length;
        if (mode === 'replace') {
            return { added: total, updated: 0, skipped: 0, total };
        }

        const existingIds = new Set(existingPrompts.map(p => p.id));
        let added = 0;
        let updated = 0;
        let skipped = 0;

        incomingPrompts.forEach(prompt => {
            if (existingIds.has(prompt.id)) {
                if (mode === 'overwrite') {
                    updated += 1;
                } else {
                    skipped += 1;
                }
            } else {
                added += 1;
            }
        });

        return { added, updated, skipped, total };
    }

    updateImportSummary(summary) {
        if (!this.dom.importSummary) return;
        if (summary.error) {
            this.dom.importSummary.textContent = `Import failed: ${summary.error}`;
            this.dom.importSummary.classList.remove('is-hidden');
            return;
        }
        this.dom.importSummary.textContent = `Added: ${summary.added} • Updated: ${summary.updated} • Skipped: ${summary.skipped} • Total: ${summary.total}`;
        this.dom.importSummary.classList.remove('is-hidden');
    }

    updateImportFileName() {
        if (!this.dom.importFileName || !this.dom.importFileInput) return;
        const file = this.dom.importFileInput.files?.[0];
        this.dom.importFileName.textContent = file ? file.name : 'No file selected';
    }

    updateImportBehaviorHelp() {
        if (!this.dom.importBehaviorHelp || !this.dom.importBehaviorSelect) return;
        const mode = this.dom.importBehaviorSelect.value;
        const messages = {
            merge: 'Keeps your current prompts and adds only new ones.',
            overwrite: 'Replaces prompts with matching IDs.',
            replaceAll: 'Deletes everything first. Use with caution.'
        };
        this.dom.importBehaviorHelp.textContent = messages[mode] || '';
    }

    findHorizontalOverflow() {
        const elements = document.querySelectorAll('body *');
        const offenders = [];

        elements.forEach((el) => {
            if (el.style && el.style.outline === '2px solid red') {
                el.style.outline = '';
            }
            const rect = el.getBoundingClientRect();
            const overflow = rect.right - window.innerWidth;
            if (overflow > 1) {
                offenders.push({ el, overflow });
            }
        });

        offenders.sort((a, b) => b.overflow - a.overflow);
        const worst = offenders.slice(0, 10);
        worst.forEach(({ el }) => {
            el.style.outline = '2px solid red';
        });

        if (worst.length === 0) {
            console.log('Overflow check: no offenders found.');
            return;
        }

        console.log('Overflow check: worst offenders');
        worst.forEach(({ el, overflow }) => {
            console.log(
                `${overflow.toFixed(1)}px`,
                el.tagName,
                el.className || '(no class)',
                el.id ? `#${el.id}` : '(no id)'
            );
        });
    }

    handleImportDragOver(event) {
        event.preventDefault();
        if (!this.dom.importExportModal) return;
        this.dom.importExportModal.classList.add('drag-active');
    }

    handleImportDragLeave(event) {
        event.preventDefault();
        if (!this.dom.importExportModal) return;
        if (event.currentTarget && event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
            return;
        }
        this.dom.importExportModal.classList.remove('drag-active');
    }

    handleImportDrop(event) {
        event.preventDefault();
        if (!this.dom.importExportModal) return;
        this.dom.importExportModal.classList.remove('drag-active');
        const file = event.dataTransfer?.files?.[0];
        if (!file || !this.dom.importFileInput) return;
        this.setActiveImportExportTab('import');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        this.dom.importFileInput.files = dataTransfer.files;
        this.updateImportFileName();
        if (this.dom.importSummary) {
            this.dom.importSummary.textContent = `Selected file: ${file.name}`;
            this.dom.importSummary.classList.remove('is-hidden');
        }
    }

    openModal(modalElement) {
        if (!modalElement) return;
        if (!modalElement.classList.contains('active')) {
            const activeElement = document.activeElement;
            this.lastFocusedElement = activeElement instanceof HTMLElement ? activeElement : null;
        }
        modalElement.classList.add('active');
        this.focusModal(modalElement);
    }

    focusModal(modalElement) {
        const focusTarget = modalElement.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true });
        }
    }

    closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('active');
            modalElement.classList.remove('drag-active');
        }
        if (!document.querySelector('.modal.active')) {
            document.body.classList.remove('modal-open');
            if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
                this.lastFocusedElement.focus({ preventScroll: true });
            }
            this.lastFocusedElement = null;
        }
    }

    /**
     * Utility Functions
     */
    createPreview(content) {
        const collapsed = String(content || '').replace(/\s+/g, ' ').trim();
        return collapsed.slice(0, 140);
    }
    
    formatDate(date) {
        if (!date) return 'never';
        const parsedDate = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(parsedDate.getTime())) return 'never';

        const now = new Date();
        const diffInDays = Math.floor((now - parsedDate) / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor((now - parsedDate) / (1000 * 60 * 60));
        const diffInMinutes = Math.floor((now - parsedDate) / (1000 * 60));

        if (diffInDays > 30) {
            return parsedDate.toLocaleDateString();
        } else if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else if (diffInMinutes > 0) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'just now';
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    loadAiSettings() {
        const savedSettings = localStorage.getItem('promptForgeAiSettings');
        if (savedSettings) {
            this.aiSettings = JSON.parse(savedSettings);
            if (!this.aiSettings.enhancementPrompt) {
                this.aiSettings.enhancementPrompt = this.defaultEnhancementPrompt;
            }
            if (!this.aiSettings.model) {
                this.aiSettings.model = this.defaultAiModel;
            }
            if (this.dom.openrouterApiKey) {
                this.dom.openrouterApiKey.value = this.aiSettings.apiKey;
            }
            if (this.dom.enhancementPrompt) {
                this.dom.enhancementPrompt.value = this.aiSettings.enhancementPrompt;
            }
            
            if (this.aiSettings.apiKey) {
                this.fetchAiModels();
            }
        } else if (this.dom.enhancementPrompt) {
            this.aiSettings.model = this.defaultAiModel;
            this.dom.enhancementPrompt.value = this.defaultEnhancementPrompt;
        }
    }

    showAiSettingsModal() {
        if (this.dom.aiSettingsModal) {
            this.openModal(this.dom.aiSettingsModal);
        }
    }

    async fetchAiModels() {
        if (!this.aiSettings.apiKey || !this.dom.aiModelSelect) {
            if (this.dom.aiModelSelect) {
                this.dom.aiModelSelect.innerHTML = '<option value="">Enter API Key first</option>';
            }
            return;
        }
        
        if (this.dom.modelLoadingSpinner) {
            this.dom.modelLoadingSpinner.style.display = 'block';
        }
        this.dom.aiModelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.aiSettings.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch models');
            }
            
            const data = await response.json();
            this.dom.aiModelSelect.innerHTML = '<option value="">Select a model</option>';
            
            // Sort models alphabetically
            const sortedModels = data.data.sort((a, b) => a.name.localeCompare(b.name));
            
            sortedModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.name} (${model.id})`;
                
                // Highlight free models
                if (model.pricing?.prompt === 0 && model.pricing?.completion === 0) {
                    option.textContent += ' - FREE';
                    option.style.color = '#00ff88'; // Green text for free models
                }
                
                // Mark currently selected model
                if (model.id === this.aiSettings.model) {
                    option.selected = true;
                }
                
                this.dom.aiModelSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching models:', error);
            this.showNotification(`Failed to load models: ${error.message}`, 'error');
            this.dom.aiModelSelect.innerHTML = '<option value="">Error loading models</option>';
        } finally {
            if (this.dom.modelLoadingSpinner) {
                this.dom.modelLoadingSpinner.style.display = 'none';
            }
        }
    }

    saveAiSettings(e) {
        e.preventDefault();
        
        this.aiSettings = {
            apiKey: this.dom.openrouterApiKey.value.trim(),
            model: this.dom.aiModelSelect.value,
            enhancementPrompt: this.dom.enhancementPrompt.value.trim() || 
                             this.defaultEnhancementPrompt
        };
        
        localStorage.setItem('promptForgeAiSettings', JSON.stringify(this.aiSettings));
        this.showNotification('AI settings saved successfully!', 'success');
        this.closeModal(this.dom.aiSettingsModal);
    }

    async enhancePrompt() {
        if (!this.aiSettings.apiKey || !this.aiSettings.model) {
            this.showNotification('Please configure AI settings first', 'error');
            this.showAiSettingsModal();
            return;
        }
        
        const currentContent = this.dom.promptContentInput.value.trim();
        if (!currentContent) {
            this.showNotification('No prompt content to enhance', 'error');
            return;
        }
        
        try {
            this.previousPromptContent = currentContent;
            if (this.dom.undoEnhanceBtn) {
                this.dom.undoEnhanceBtn.disabled = true;
            }
            this.dom.enhancePromptBtn.disabled = true;
            this.dom.enhancePromptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enhancing...';
            
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.aiSettings.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.aiSettings.model,
                    messages: [
                        { 
                            role: "system", 
                            content: this.aiSettings.enhancementPrompt + "\n\n" + currentContent + 
                                    "\n\nIMPORTANT: Only return the improved prompt text exactly as it should be used."
                        }
                    ]
                })
            });
            
            if (!response.ok) throw new Error('API request failed');
            
            const result = await response.json();
            const enhancedContent = result.choices[0]?.message?.content?.trim();
            
            if (enhancedContent) {
                this.dom.promptContentInput.value = enhancedContent;
                if (this.dom.undoEnhanceBtn) {
                    this.dom.undoEnhanceBtn.disabled = false;
                }
                this.showNotification('Prompt enhanced successfully!', 'success');
            } else {
                throw new Error('No enhanced content returned');
            }
        } catch (error) {
            this.previousPromptContent = null;
            this.showNotification(`Enhancement failed: ${error.message}`, 'error');
        } finally {
            this.dom.enhancePromptBtn.disabled = false;
            this.dom.enhancePromptBtn.innerHTML = '<i class="fas fa-magic"></i> Enhance with AI';
        }
    }

    undoEnhancement() {
        if (!this.previousPromptContent) return;
        this.dom.promptContentInput.value = this.previousPromptContent;
        this.previousPromptContent = null;
        if (this.dom.undoEnhanceBtn) {
            this.dom.undoEnhanceBtn.disabled = true;
        }
        this.showNotification('Reverted to the previous prompt.', 'success');
    }

    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        this.dom.notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.promptForgeApp = new PromptBoxApp();
});
