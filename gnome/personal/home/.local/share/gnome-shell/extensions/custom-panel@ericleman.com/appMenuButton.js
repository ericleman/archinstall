const AppMenu = imports.ui.main.panel.statusArea.appMenu;
const LayoutManager = imports.ui.main.layoutManager;

let monitorsChangedEvent = null;
let showEvent = null;

var enable = () => {
  //Hide menu when something attempts to show it or the ui is reloadedmonitorsChangedEvent = LayoutManager.connect('monitors-changed', hideMenu);
  showEvent = AppMenu.connect('show', hideMenu);
  //Hide appMenu
  hideMenu();

}
var disable = () => {
  //Disconnect hiding the app menu from events and show it again
  LayoutManager.disconnect(monitorsChangedEvent);
  AppMenu.disconnect(showEvent);
  //Show appMenu, if available
  if(AppMenu != null) {
    AppMenu.show();
  }
}

function hideMenu() {
  //Hide the menu if available
  if(AppMenu != null) {
    AppMenu.hide();
  }
}