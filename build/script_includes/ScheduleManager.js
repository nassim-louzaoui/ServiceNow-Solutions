var ScheduleManager = Class.create();
ScheduleManager.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.AUTOMATION_TABLE = 'x_infte_ops_int_automation';
        this.AUTOMATION_SCHEDULE_TABLE = 'x_infte_ops_int_automation_schedule';
        this.SYSAUTO_SCRIPT_TABLE = 'sysauto_script';
        this.SYS_SCOPE_TABLE = 'sys_scope';
        this.audit = new AuditService();
    },

    _scopeSysId: function() {
        var scope = new GlideRecord(this.SYS_SCOPE_TABLE);
        scope.addQuery('scope', this.SCOPE);
        scope.setLimit(1);
        scope.query();
        if (scope.next()) {
            return '' + scope.getUniqueValue();
        }
        return null;
    },

    createSchedule: function(automationSysId) {
        if (!automationSysId) {
            gs.error('x_infte_ops_int ScheduleManager.createSchedule called without automation sys_id');
            return null;
        }
        var schedule = new GlideRecord(this.AUTOMATION_SCHEDULE_TABLE);
        schedule.addQuery('automation', automationSysId);
        schedule.addQuery('active', true);
        schedule.orderByDesc('created_at');
        schedule.setLimit(1);
        schedule.query();
        if (!schedule.next()) {
            return null;
        }

        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        var automationName = automationSysId;
        if (auto.get(automationSysId)) {
            automationName = '' + auto.getValue('name');
        }

        var scriptBody = "new ExecutionEngine().runScheduled('" + automationSysId + "');";

        var job = new GlideRecord(this.SYSAUTO_SCRIPT_TABLE);
        job.initialize();
        job.setValue('name', 'Operations Intelligence - Scheduled Automation - ' + automationName);
        job.setValue('script', scriptBody);
        job.setValue('active', true);

        var scheduleType = '' + schedule.getValue('schedule_type');
        var timezone = '' + schedule.getValue('timezone');
        if (timezone) {
            job.setValue('time_zone', timezone);
        }

        if (scheduleType === 'recurring') {
            var cron = '' + schedule.getValue('cron_expression');
            job.setValue('run_type', 'periodically');
            if (cron) {
                job.setValue('run_period', this._cronToRunPeriod(cron));
            }
        } else if (scheduleType === 'one_time') {
            job.setValue('run_type', 'once');
            var runAt = '' + schedule.getValue('run_at');
            if (runAt) {
                job.setValue('run_start', runAt);
            }
        }

        var scopeSysId = this._scopeSysId();
        if (scopeSysId) {
            job.setValue('sys_scope', scopeSysId);
        }

        var sysautoSysId = job.insert();
        if (!sysautoSysId) {
            gs.error('x_infte_ops_int ScheduleManager failed to create sysauto_script for automation ' + automationSysId);
            return null;
        }

        schedule.setValue('sysauto_sys_id', '' + sysautoSysId);
        schedule.update();

        this.audit.log('schedule_created', {
            automation_sys_id: automationSysId,
            sysauto_sys_id: '' + sysautoSysId,
            schedule_type: scheduleType
        });
        return '' + sysautoSysId;
    },

    _cronToRunPeriod: function(cronExpression) {
        return '' + cronExpression;
    },

    deactivateSchedule: function(automationSysId) {
        if (!automationSysId) {
            return false;
        }
        var schedule = new GlideRecord(this.AUTOMATION_SCHEDULE_TABLE);
        schedule.addQuery('automation', automationSysId);
        schedule.query();
        var anyDeactivated = false;
        while (schedule.next()) {
            var sysautoSysId = '' + schedule.getValue('sysauto_sys_id');
            if (sysautoSysId) {
                var job = new GlideRecord(this.SYSAUTO_SCRIPT_TABLE);
                if (job.get(sysautoSysId)) {
                    job.setValue('active', false);
                    job.update();
                    anyDeactivated = true;
                }
            }
            schedule.setValue('active', false);
            schedule.update();
        }
        if (anyDeactivated) {
            this.audit.log('schedule_deactivated', { automation_sys_id: automationSysId });
        }
        return anyDeactivated;
    },

    type: 'ScheduleManager'
};
