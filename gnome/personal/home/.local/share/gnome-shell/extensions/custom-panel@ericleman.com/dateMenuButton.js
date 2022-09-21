const DateMenu = imports.ui.main.panel.statusArea.dateMenu;


var enable = () => {
  DateMenu.add_style_class_name('custom-color4');

}

var disable = () => {
  DateMenu.remove_style_class_name('custom-color4');
}

