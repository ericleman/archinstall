const AccessMenu = imports.ui.main.panel.statusArea.a11y;


var enable = () => {
  if(AccessMenu != null) {
    AccessMenu.hide();
  }
}

var disable = () => {
  if(AccessMenu != null) {
    AccessMenu.show();
  }
}

