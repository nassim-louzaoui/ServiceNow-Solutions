var OIDataStore = Class.create();
OIDataStore.prototype = {

    initialize: function() {
        this.NS        = 'x_infte_ops_int.data.';
        this.PAGE_SIZE = 20;
    },

    getCollection: function(name) {
        var idxRaw = this._getProp(name + '.index');
        if (!idxRaw) { return []; }
        var idx;
        try { idx = JSON.parse(idxRaw); } catch(e) { return []; }
        var pages = idx.pages || 0;
        var result = [];
        var i, pageRaw, pageArr, j;
        for (i = 0; i < pages; i++) {
            pageRaw = this._getProp(name + '.' + i);
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

    setCollection: function(name, arr) {
        var idxRaw = this._getProp(name + '.index');
        var oldPages = 0;
        if (idxRaw) {
            try { oldPages = (JSON.parse(idxRaw)).pages || 0; } catch(e) {}
        }

        var chunks = [];
        var i, chunk;
        for (i = 0; i < arr.length; i += this.PAGE_SIZE) {
            chunk = arr.slice(i, i + this.PAGE_SIZE);
            chunks.push(chunk);
        }

        var j;
        for (j = 0; j < chunks.length; j++) {
            this._setProp(name + '.' + j, JSON.stringify(chunks[j]));
        }

        var idx = {
            total:     arr.length,
            pages:     chunks.length,
            page_size: this.PAGE_SIZE,
            updated:   new GlideDateTime().getDisplayValue()
        };
        this._setProp(name + '.index', JSON.stringify(idx));

        var k;
        for (k = chunks.length; k < oldPages; k++) {
            this._deleteProp(name + '.' + k);
        }
    },

    upsert: function(name, item) {
        var arr = this.getCollection(name);
        if (!item.sys_id) {
            item.sys_id = this.generateId();
        }
        var found = false;
        var i;
        for (i = 0; i < arr.length; i++) {
            if (arr[i].sys_id === item.sys_id) {
                arr[i] = item;
                found = true;
                break;
            }
        }
        if (!found) { arr.push(item); }
        this.setCollection(name, arr);
        return item.sys_id;
    },

    remove: function(name, sysId) {
        var arr = this.getCollection(name);
        var filtered = [];
        var i;
        for (i = 0; i < arr.length; i++) {
            if (arr[i].sys_id !== sysId) { filtered.push(arr[i]); }
        }
        this.setCollection(name, filtered);
    },

    get: function(name, sysId) {
        var arr = this.getCollection(name);
        var i;
        for (i = 0; i < arr.length; i++) {
            if (arr[i].sys_id === sysId) { return arr[i]; }
        }
        return null;
    },

    find: function(name, predicateFn) {
        var arr = this.getCollection(name);
        var result = [];
        var i;
        for (i = 0; i < arr.length; i++) {
            if (predicateFn(arr[i])) { result.push(arr[i]); }
        }
        return result;
    },

    generateId: function() {
        return 'oi_' + new GlideDateTime().getNumericValue() + '_' + Math.floor(Math.random() * 9000 + 1000);
    },

    getSessionMessages: function(sessionSysId) {
        var baseKey = 'session_msgs.' + sessionSysId;
        var idxRaw = this._getProp(baseKey + '.index');
        if (!idxRaw) { return []; }
        var idx;
        try { idx = JSON.parse(idxRaw); } catch(e) { return []; }
        var pages = idx.pages || 0;
        var result = [];
        var i, pageRaw, pageArr, j;
        for (i = 0; i < pages; i++) {
            pageRaw = this._getProp(baseKey + '.' + i);
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

    saveSessionMessages: function(sessionSysId, messages) {
        var baseKey = 'session_msgs.' + sessionSysId;
        var idxRaw = this._getProp(baseKey + '.index');
        var oldPages = 0;
        if (idxRaw) {
            try { oldPages = (JSON.parse(idxRaw)).pages || 0; } catch(e) {}
        }

        var chunks = [];
        var i, chunk;
        for (i = 0; i < messages.length; i += this.PAGE_SIZE) {
            chunk = messages.slice(i, i + this.PAGE_SIZE);
            chunks.push(chunk);
        }

        var j;
        for (j = 0; j < chunks.length; j++) {
            this._setProp(baseKey + '.' + j, JSON.stringify(chunks[j]));
        }

        var idx = {
            total:     messages.length,
            pages:     chunks.length,
            page_size: this.PAGE_SIZE,
            updated:   new GlideDateTime().getDisplayValue()
        };
        this._setProp(baseKey + '.index', JSON.stringify(idx));

        var k;
        for (k = chunks.length; k < oldPages; k++) {
            this._deleteProp(baseKey + '.' + k);
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
            gr.setValue('description', 'Operations Intelligence data store: ' + key);
            gr.insert();
        }
    },

    _deleteProp: function(key) {
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', this.NS + key);
        gr.query();
        if (gr.next()) { gr.deleteRecord(); }
    },

    type: 'OIDataStore'
};
