var OIJournal = Class.create();
OIJournal.prototype = {

    initialize: function() {
        this.NS          = 'x_infte_ops_int.journal.';
        this.MAX_ENTRIES = 500;
        this.PAGE_SIZE   = 25;
    },

    write: function(eventType, userInfo, subject, result, context) {
        var entry = {
            id:         'oi_' + new GlideDateTime().getNumericValue() + '_' + Math.floor(Math.random() * 9000 + 1000),
            timestamp:  new GlideDateTime().getDisplayValue(),
            event_type: eventType || 'system',
            user: {
                sys_id: (userInfo && userInfo.sys_id)  || '',
                name:   (userInfo && userInfo.name)    || '',
                role:   (userInfo && userInfo.role)    || ''
            },
            subject: {
                type:   (subject && subject.type)    || '',
                sys_id: (subject && subject.sys_id)  || '',
                name:   (subject && subject.name)    || ''
            },
            result: {
                status:      (result && result.status)      || 'success',
                duration_ms: (result && result.duration_ms) || 0,
                error:       (result && result.error)       || null,
                detail:      (result && result.detail)      || ''
            },
            context: {
                section:        (context && context.section)        || '',
                assistant_type: (context && context.assistant_type) || '',
                query:          (context && context.query)          || '',
                intent_scores:  (context && context.intent_scores)  || {}
            }
        };

        var entries = this._loadAll();
        entries.unshift(entry);
        if (entries.length > this.MAX_ENTRIES) {
            entries = entries.slice(0, this.MAX_ENTRIES);
        }
        this._saveAll(entries);
        return entry;
    },

    read: function(filter, limit) {
        var entries = this._loadAll();
        var results = [];
        var i, entry, pass;

        for (i = 0; i < entries.length; i++) {
            entry = entries[i];
            pass  = true;

            if (filter) {
                if (filter.event_type && entry.event_type !== filter.event_type) { pass = false; }
                if (filter.user_sys_id && entry.user.sys_id !== filter.user_sys_id) { pass = false; }
                if (filter.status && entry.result.status !== filter.status) { pass = false; }
                if (filter.section && entry.context.section !== filter.section) { pass = false; }
                if (filter.subject_type && entry.subject.type !== filter.subject_type) { pass = false; }
                if (filter.since) {
                    if (entry.timestamp < filter.since) { pass = false; }
                }
            }

            if (pass) { results.push(entry); }
            if (limit && results.length >= limit) { break; }
        }

        return results;
    },

    summary: function() {
        var entries = this._loadAll();
        var total        = entries.length;
        var byEventType  = {};
        var bySection    = {};
        var byRole       = {};
        var errorCount   = 0;
        var successCount = 0;
        var userCounts   = {};
        var recentErrors = [];
        var i, entry, et, sec, role, uid, uname;

        for (i = 0; i < entries.length; i++) {
            entry = entries[i];

            et = entry.event_type || 'system';
            byEventType[et] = (byEventType[et] || 0) + 1;

            sec = (entry.context && entry.context.section) || 'unknown';
            bySection[sec] = (bySection[sec] || 0) + 1;

            role = (entry.user && entry.user.role) || 'unknown';
            byRole[role] = (byRole[role] || 0) + 1;

            if (entry.result && entry.result.status === 'failed') {
                errorCount++;
                if (recentErrors.length < 10) { recentErrors.push(entry); }
            } else if (entry.result && entry.result.status === 'success') {
                successCount++;
            }

            uid   = (entry.user && entry.user.sys_id) || '';
            uname = (entry.user && entry.user.name)   || '';
            if (uid) {
                if (!userCounts[uid]) { userCounts[uid] = { name: uname, count: 0 }; }
                userCounts[uid].count++;
            }
        }

        var topUsers = [];
        var k;
        for (k in userCounts) {
            if (userCounts.hasOwnProperty(k)) {
                topUsers.push({ name: userCounts[k].name, count: userCounts[k].count });
            }
        }
        topUsers.sort(function(a, b) { return b.count - a.count; });
        if (topUsers.length > 10) { topUsers = topUsers.slice(0, 10); }

        var denominator = successCount + errorCount;
        var successRate = denominator > 0 ? (successCount / denominator) : 1;

        return {
            total:         total,
            by_event_type: byEventType,
            by_section:    bySection,
            by_role:       byRole,
            error_count:   errorCount,
            success_rate:  Math.round(successRate * 100) / 100,
            top_users:     topUsers,
            recent_errors: recentErrors
        };
    },

    export: function() {
        var entries = this._loadAll();
        var sum     = this.summary();
        return {
            exported_at: new GlideDateTime().getDisplayValue(),
            summary:     sum,
            entries:     entries
        };
    },

    _loadAll: function() {
        var idxRaw = this._getProp('entries.index');
        if (!idxRaw) { return []; }
        var idx;
        try { idx = JSON.parse(idxRaw); } catch(e) { return []; }
        var pages = idx.pages || 0;
        var result = [];
        var i, pageRaw, pageArr, j;
        for (i = 0; i < pages; i++) {
            pageRaw = this._getProp('entries.' + i);
            if (!pageRaw) { continue; }
            try {
                pageArr = JSON.parse(pageRaw);
                for (j = 0; j < pageArr.length; j++) {
                    result.push(pageArr[j]);
                }
            } catch(e2) {}
        }
        return result;
    },

    _saveAll: function(entries) {
        var idxRaw = this._getProp('entries.index');
        var oldPages = 0;
        if (idxRaw) {
            try { oldPages = (JSON.parse(idxRaw)).pages || 0; } catch(e) {}
        }

        var chunks = [];
        var i, chunk;
        for (i = 0; i < entries.length; i += this.PAGE_SIZE) {
            chunk = entries.slice(i, i + this.PAGE_SIZE);
            chunks.push(chunk);
        }

        var j;
        for (j = 0; j < chunks.length; j++) {
            this._setProp('entries.' + j, JSON.stringify(chunks[j]));
        }

        var idx = {
            total:     entries.length,
            pages:     chunks.length,
            page_size: this.PAGE_SIZE,
            updated:   new GlideDateTime().getDisplayValue()
        };
        this._setProp('entries.index', JSON.stringify(idx));

        var k;
        for (k = chunks.length; k < oldPages; k++) {
            var gr = new GlideRecord('sys_properties');
            gr.addQuery('name', this.NS + 'entries.' + k);
            gr.query();
            if (gr.next()) { gr.deleteRecord(); }
        }
    },

    _getProp: function(key) {
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', this.NS + key);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) { return gr.getValue('value'); }
        return null;
    },

    _setProp: function(key, value) {
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', this.NS + key);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            gr.setValue('value', value);
            gr.update();
        } else {
            gr.initialize();
            gr.setValue('name',        this.NS + key);
            gr.setValue('value',       value);
            gr.setValue('description', 'Operations Intelligence journal: ' + key);
            gr.insert();
        }
    },

    type: 'OIJournal'
};
