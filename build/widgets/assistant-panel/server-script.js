(function() {
    var userSysId = gs.getUserID();

    data.pageId = 'operations_intelligence';

    var activeSection = 'workspace';
    if (input && input.activeSection) {
        activeSection = '' + input.activeSection;
    } else if (options && options.active_section) {
        activeSection = '' + options.active_section;
    }
    data.activeSection = activeSection;

    var vah = new VAHelper();
    data.welcome = vah.getWelcomeContext(userSysId, activeSection);
    data.context = vah.getUserContext(userSysId);
    data.preIntent = vah.getPreIntent();
})();
