import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as UpdateBar from './updateIndicator.js';
import * as MemInfo from './memInfo.js';
import * as CPUInfo from './cpuInfo.js';
import * as Uptime from './uptime.js';
import * as Storage from './storage.js';
import * as Network from './network.js';
import * as AccessibilityButton from './accessibilityButton.js';


function _log(msg) {
  console.log('CUSTOM PANEL '+Date.now()+' *** ' + msg);
}

export default class MyIndicator extends Extension {
  enable(){
    _log('************* STARTING CUSTOM PANEL EXTENSION *************');
    UpdateBar.enable();
    MemInfo.enable();
    CPUInfo.enable();
    Uptime.enable();
    Storage.enable();
    Network.enable();
    AccessibilityButton.enable();
  }

  disable(){
    UpdateBar.disable();
    MemInfo.disable();
    CPUInfo.disable();
    Uptime.disable();
    Storage.disable();
    Network.disable();
    AccessibilityButton.disable();
  }
  
}

