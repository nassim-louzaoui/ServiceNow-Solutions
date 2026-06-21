api.controller = function() {
    var c = this;

    window.__OI__ = {
        serverCall: function(input) {
            return c.server.get(input);
        }
    };

    c.$onInit = function() {
        window.__OI_INIT__ = c.data;
        window.dispatchEvent(new CustomEvent('oi:data', { detail: c.data }));
    };
};
