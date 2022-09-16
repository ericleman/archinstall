'use strict';

const Me = imports.misc.extensionUtils.getCurrentExtension()
const WorkspacesBar = Me.imports.workspacesBar;
const UpdateIndicator = Me.imports.updateIndicator;
const ActivitiesButton = Me.imports.activitiesButton;
const AppMenuButton = Me.imports.appMenuButton;

const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

function enable(){
    WorkspacesBar.enable();
    UpdateIndicator.enable();
    ActivitiesButton.enable();
    AppMenuButton.enable();
}

function disable(){
    WorkspacesBar.disable();
    UpdateIndicator.disable();
    ActivitiesButton.disable();
    AppMenuButton.disable();    
}
