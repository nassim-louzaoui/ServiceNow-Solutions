var RESTBridge = Class.create();
RESTBridge.prototype = {
    initialize: function() {
        this.DEFAULT_TIMEOUT_MS = 10000;
        this.DEFAULT_RETRIES = 0;
        this.MAX_RETRIES = 5;
        this.BASE_BACKOFF_MS = 500;
        this.audit = new AuditService();
    },

    call: function(configObject) {
        if (!configObject || !configObject.url) {
            return { ok: false, status: 0, body: '', error: 'rest_call missing url' };
        }
        var method = configObject.method ? ('' + configObject.method).toUpperCase() : 'GET';
        var url = '' + configObject.url;
        var headers = configObject.headers || {};
        var body = configObject.body;
        var timeoutMs = parseInt(configObject.timeout_ms, 10);
        if (isNaN(timeoutMs) || timeoutMs <= 0) {
            timeoutMs = this.DEFAULT_TIMEOUT_MS;
        }
        var retries = parseInt(configObject.retries, 10);
        if (isNaN(retries) || retries < 0) {
            retries = this.DEFAULT_RETRIES;
        }
        if (retries > this.MAX_RETRIES) {
            retries = this.MAX_RETRIES;
        }

        var attempt = 0;
        var lastResult = { ok: false, status: 0, body: '', error: 'rest_call not executed' };

        while (attempt <= retries) {
            lastResult = this._executeOnce(method, url, headers, body, timeoutMs, configObject);
            if (lastResult.ok) {
                return lastResult;
            }
            if (!this._isRetryable(lastResult.status)) {
                return lastResult;
            }
            attempt++;
            if (attempt <= retries) {
                this._backoff(attempt);
            }
        }
        return lastResult;
    },

    _executeOnce: function(method, url, headers, body, timeoutMs, configObject) {
        try {
            var request = new sn_ws.RESTMessageV2();
            request.setHttpMethod(method);
            request.setEndpoint(url);
            request.setHttpTimeout(timeoutMs);

            var key;
            for (key in headers) {
                if (headers.hasOwnProperty(key)) {
                    request.setRequestHeader('' + key, '' + headers[key]);
                }
            }

            this._applyAuth(request, configObject);

            if (body !== null && body !== undefined && method !== 'GET') {
                if (Object.prototype.toString.call(body) === '[object String]') {
                    request.setRequestBody('' + body);
                } else {
                    request.setRequestBody(JSON.stringify(body));
                }
            }

            var response = request.execute();
            var status = parseInt(response.getStatusCode(), 10);
            var responseBody = '' + response.getBody();
            var ok = status >= 200 && status < 300;

            this.audit.log('rest_call_executed', {
                url: url,
                method: method,
                status: status,
                ok: ok
            });

            var result = { ok: ok, status: status, body: responseBody };
            if (!ok) {
                result.error = 'HTTP ' + status;
            }
            return result;
        } catch (e) {
            this.audit.log('rest_call_exception', {
                url: url,
                method: method,
                error: '' + e
            });
            return { ok: false, status: 0, body: '', error: '' + e };
        }
    },

    _applyAuth: function(request, configObject) {
        var alias = configObject.connection_alias || configObject.credential_alias;
        var authType = configObject.auth_type ? ('' + configObject.auth_type) : '';
        if (alias) {
            try {
                request.setAuthenticationProfile(authType ? authType : 'basic', '' + alias);
            } catch (e) {
                gs.warn('x_infte_ops_int RESTBridge could not apply connection alias ' + alias + ': ' + e);
            }
        }
    },

    _isRetryable: function(status) {
        if (status === 0) {
            return true;
        }
        if (status === 408 || status === 429) {
            return true;
        }
        return status >= 500 && status < 600;
    },

    _backoff: function(attempt) {
        var delayMs = this.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        var target = new GlideDateTime();
        target.add(delayMs);
        var now = new GlideDateTime();
        while (now.getNumericValue() < target.getNumericValue()) {
            now = new GlideDateTime();
        }
    },

    type: 'RESTBridge'
};
