api.controller = function() {
    var c = this;
    c.$onInit = function() {
        var detail = {
            data: c.data,
            call: function(input) { return c.server.get(input); }
        };
        window.__oiBridge = detail;
        window.dispatchEvent(new CustomEvent('oi:ready', { detail: detail }));
    };
};
