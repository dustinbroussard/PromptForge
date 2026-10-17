(function(root) {
    const EXPORT_TYPE = 'promptbox.export';
    const EXPORT_VERSION = 2;

    function getRandomUUID() {
        if (root.crypto && typeof root.crypto.randomUUID === 'function') {
            return root.crypto.randomUUID();
        }
        try {
            const nodeCrypto = require('crypto');
            if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
                return nodeCrypto.randomUUID();
            }
        } catch (err) {
            // ignore - best effort fallback below
        }
        return `pf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    function normalizeDateToIso(value, fallbackIso) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
        return fallbackIso;
    }

    function normalizeTags(tags) {
        if (!Array.isArray(tags)) {
            return [];
        }
        return tags
            .map(tag => String(tag).trim().toLowerCase())
            .filter(Boolean);
    }

    function createPreviewFromContent(content) {
        const collapsed = String(content || '').replace(/\s+/g, ' ').trim();
        return collapsed.slice(0, 140);
    }

    function normalizePrompt(raw) {
        const idRaw = raw && raw.id;
        let id = '';
        if (idRaw === null || idRaw === undefined || idRaw === '') {
            id = getRandomUUID();
        } else if (typeof idRaw === 'number') {
            id = String(idRaw);
        } else {
            id = String(idRaw);
        }

        const title = raw && raw.title !== undefined ? String(raw.title) : '';
        const content = raw && raw.content !== undefined ? String(raw.content) : '';
        const preview = raw && typeof raw.preview === 'string' && raw.preview.trim()
            ? raw.preview
            : createPreviewFromContent(content);

        const createdAtFallback = new Date().toISOString();
        const createdAt = normalizeDateToIso(raw && raw.createdAt, createdAtFallback);

        let lastUsed = null;
        if (raw && raw.lastUsed !== undefined && raw.lastUsed !== null && raw.lastUsed !== '') {
            const lastUsedIso = normalizeDateToIso(raw.lastUsed, null);
            if (lastUsedIso) {
                lastUsed = lastUsedIso;
            }
        }

        const useCount = raw && typeof raw.useCount === 'number' && Number.isFinite(raw.useCount)
            ? raw.useCount
            : 0;

        return {
            id,
            title,
            preview,
            content,
            tags: normalizeTags(raw && raw.tags),
            createdAt,
            lastUsed,
            useCount
        };
    }

    function normalizeImportedData(json) {
        if (Array.isArray(json)) {
            return { prompts: json.map(normalizePrompt) };
        }
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid file format');
        }
        if (json.type !== EXPORT_TYPE || json.version !== EXPORT_VERSION || !Array.isArray(json.prompts)) {
            throw new Error('Invalid file format');
        }
        return {
            prompts: json.prompts.map(normalizePrompt),
            settings: json.settings
        };
    }

    function applyImport(existingPrompts, incomingPrompts, mode) {
        const normalizedMode = mode || 'replace';
        if (normalizedMode === 'replace') {
            return incomingPrompts.slice();
        }

        const next = existingPrompts.slice();
        const indexById = new Map();
        next.forEach((prompt, index) => {
            indexById.set(prompt.id, index);
        });

        incomingPrompts.forEach(prompt => {
            const existingIndex = indexById.get(prompt.id);
            if (existingIndex === undefined) {
                indexById.set(prompt.id, next.length);
                next.push(prompt);
                return;
            }
            if (normalizedMode === 'overwrite') {
                next[existingIndex] = prompt;
            }
        });

        return next;
    }

    function createExportBundle(prompts, settings) {
        const bundle = {
            type: EXPORT_TYPE,
            version: EXPORT_VERSION,
            prompts: (prompts || []).map(normalizePrompt)
        };
        if (settings !== undefined) {
            bundle.settings = settings;
        }
        return bundle;
    }

    const api = {
        EXPORT_TYPE,
        EXPORT_VERSION,
        normalizeImportedData,
        normalizePrompt,
        applyImport,
        createExportBundle
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.PromptBoxImportExport = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
