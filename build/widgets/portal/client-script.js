api.controller = function() {
    var c = this;
    c.$onInit = function() {
        window.dispatchEvent(new CustomEvent('oi:ready', {
            detail: {
                data: c.data,
                call: function(input) { return c.server.get(input); }
            }
        }));
    };
};
