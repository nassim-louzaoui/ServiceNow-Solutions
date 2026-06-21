api.controller = function() {
    var c = this;
    c.$onInit = function() {
        if (c.data && c.data.denied) {
            window.location.href = '/login';
            return;
        }
        window.dispatchEvent(new CustomEvent('oi:ready', {
            detail: {
                data: c.data,
                call: function(input) { return c.server.get(input); }
            }
        }));
    };
};
