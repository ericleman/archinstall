import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function enable() {
    let a11y = Main.panel.statusArea["a11y"];
    if (a11y != null) {
        a11y.container.hide();
    }
}


export function disable() {
    let a11y = Main.panel.statusArea["a11y"];
    if (a11y != null) {
      a11y.container.show();
    }
}
