'use strict';

const Me = imports.misc.extensionUtils.getCurrentExtension()
const WorkspacesBar = Me.imports.workspacesBar;
const UpdateIndicator = Me.imports.updateIndicator;
const ActivitiesButton = Me.imports.activitiesButton;
const AppMenuButton = Me.imports.appMenuButton;
const AccessibilityButton = Me.imports.accessibilityButton;
const DateMenuButton = Me.imports.dateMenuButton;
const AggregateMenuButton = Me.imports.aggregateMenuButton;



const DEBUG = true;
function _log(msg) {
  if (DEBUG) log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

function enable(){
    WorkspacesBar.enable();
    UpdateIndicator.enable();
    ActivitiesButton.enable();
    AppMenuButton.enable();
    AccessibilityButton.enable();
    DateMenuButton.enable();
    AggregateMenuButton.enable();
}

function disable(){
    WorkspacesBar.disable();
    UpdateIndicator.disable();
    ActivitiesButton.disable();
    AppMenuButton.disable();    
    AccessibilityButton.disable();    
    DateMenuButton.disable();    
    AggregateMenuButton.disable();    
}
