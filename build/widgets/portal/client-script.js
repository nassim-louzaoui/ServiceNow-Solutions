api.controller = function() {
    var c = this;
    function dispatchReady() {
        window.dispatchEvent(new CustomEvent('oi:ready', {
            detail: {
                data: c.data,
                call: function(input) { return c.server.get(input); }
            }
        }));
    }
    c.$postLink = dispatchReady;
    c.$onInit = function() {
        setTimeout(dispatchReady, 0);
    };
};
