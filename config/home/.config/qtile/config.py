# Copyright (c) 2010 Aldo Cortesi
# Copyright (c) 2010, 2014 dequis
# Copyright (c) 2012 Randall Ma
# Copyright (c) 2012-2014 Tycho Andersen
# Copyright (c) 2012 Craig Barnes
# Copyright (c) 2013 horsik
# Copyright (c) 2013 Tao Sauvage
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
import os
import subprocess
import time

from libqtile import bar, layout, widget, hook, qtile
from libqtile.config import Click, Drag, Group, Key, Match, Screen
from libqtile.lazy import lazy
from libqtile.utils import guess_terminal
from libqtile.log_utils import logger
#from libqtile.core.manager import Qtile

COLORS={"nord0": "#2e3440", #black
    "nord1": "#3b4252", #black
    "nord2": "#434c5e", #black
    "nord3": "#4c566a", #black
    "nord4": "#d8dee9", #white
    "nord5": "#e5e9f0", #white
    "nord6": "#eceff4", #white
    "nord7": "#8fbcbb", #green
    "nord8": "#88c0d0", #cyan
    "nord9": "#81a1c1", #blue
    "nord10": "#5e81ac", #blue
    "nord11": "#bf616a", #red
    "nord12": "#d08770", #orange
    "nord13": "#ebcb8b", #yellow
    "nord14": "#a3be8c", #green
    "nord15": "#b48ead"} #purple

WINDOW_MARGIN=8
WALLPAPER_PATH = os.path.expanduser("~/Pictures/Wallpapers/dj-nord.jpg")

mod = "mod4"
terminal = guess_terminal()

#logger.warning(Qtile().status())

@hook.subscribe.startup_once
def autostart():
    home = os.path.expanduser('~/.config/qtile/autostart.sh')
    subprocess.run([home])


@hook.subscribe.setgroup
def remove_empty_groups():
    logger.warning("remove_empty_groups")
    i = qtile.groups.index(qtile.current_group)
    #logger.warning("remove_empty_groups | current group index: " + str(i))
    for group in qtile.groups:
        j = qtile.groups.index(group)
        #logger.warning("remove_empty_groups | group name+index: " + group.name + "+" + str(j))
        if i != j:
            #logger.warning("remove_empty_groups | i,j: " + str(i)+","+str(j))
            if j != 0:
                if not group.windows:
                    w = len(group.windows)
                    #logger.warning("remove_empty_groups | w: " + str(w))
                    qtile.delete_group(group.name)

@lazy.function
def window_to_new_group(qtile,switch=False):
    wm_class=qtile.current_window.info()['wm_class'][1]
    grp_icon = ''
    if wm_class == 'Alacritty':
        grp_icon = ''
    if wm_class == 'Google-chrome':
        grp_icon = ''
    if wm_class == 'Thunar':
        grp_icon = ''
    if wm_class == 'Code':
        grp_icon = ''
    if wm_class == 'com-itfinance-core-Starter':
        grp_icon = ''
    logger.warning("in window_to_new_group function " + grp_icon)
    logger.warning("in window_to_new_group function " + wm_class)
    new_grp = str(time.time())
    qtile.addgroup(new_grp, label=grp_icon)
    qtile.current_window.togroup(new_grp)
    if switch:
        qtile.current_screen.toggle_group(new_grp)
    
@lazy.function
def window_to_prev_group(qtile):
    i = qtile.groups.index(qtile.current_group)
    prev_grp = qtile.groups[-1] if i==0 else qtile.groups[i-1]
    qtile.current_window.togroup(prev_grp.name)
    qtile.current_screen.toggle_group(prev_grp.name)

@lazy.function
def window_to_next_group(qtile):
    i = qtile.groups.index(qtile.current_group)
    next_grp = qtile.groups[0] if i==len(qtile.groups)-1 else qtile.groups[i + 1]
    qtile.current_window.togroup(next_grp.name)
    qtile.current_screen.toggle_group(next_grp.name)


keys = [
    # A list of available commands that can be bound to keys can be found
    # at https://docs.qtile.org/en/latest/manual/config/lazy.html
    # Switch between windows
    Key([mod], "Left", lazy.layout.left(), desc="Move focus to left"),
    Key([mod], "Right", lazy.layout.right(), desc="Move focus to right"),
    Key([mod], "Down", lazy.layout.down(), desc="Move focus down"),
    Key([mod], "Up", lazy.layout.up(), desc="Move focus up"),
    # Move windows between left/right columns or move up/down in current stack. 
    # Moving out of range in Columns layout will create new column.
    Key([mod, "shift"], "Left", lazy.layout.shuffle_left()),
    Key([mod, "shift"], "Right", lazy.layout.shuffle_right()),
    Key([mod, "shift"], "Down", lazy.layout.shuffle_down(), desc="Move window down"),
    Key([mod, "shift"], "Up", lazy.layout.shuffle_up(), desc="Move window up"),
    # Grow windows. If current window is on the edge of screen and direction
    # will be to screen edge - window would shrink.
    Key([mod, "control"], "Left", lazy.layout.grow_left().when(layout='columns'),lazy.layout.flip().when(layout='monadtall')),
    Key([mod, "control"], "Right", lazy.layout.grow_right().when(layout='columns'),lazy.layout.flip().when(layout='monadtall')),
    Key([mod, "control"], "Down", lazy.layout.grow_down().when(layout='columns'),lazy.layout.shrink().when(layout='monadtall')),
    Key([mod, "control"], "Up", lazy.layout.grow_up().when(layout='columns'),lazy.layout.grow().when(layout='monadtall')),
    Key([mod, "shift", "control"], "Left", lazy.layout.swap_column_left().when(layout='columns'),lazy.layout.swap_left().when(layout='monadtall')),
    Key([mod, "shift", "control"], "Right", lazy.layout.swap_column_right().when(layout='columns'),lazy.layout.swap_right().when(layout='monadtall')),
    Key([mod], "n", lazy.layout.normalize(), desc="Reset all window sizes"),
    Key([mod], "f", lazy.window.toggle_fullscreen(),desc="Toggle fullscreen on the focused window",),
    Key([mod, "shift"], "f", lazy.window.toggle_floating(),desc="Toggle floating on the focused window",),
    # Toggle between different layouts as defined below
    Key([mod], "Tab", lazy.next_layout(), desc="Toggle between layouts"),
    # Moving Groups
    Key([mod], "semicolon", lazy.screen.prev_group()),
    Key([mod], "colon", lazy.screen.next_group()),
    Key([mod, "shift"], "semicolon", window_to_prev_group()),
    Key([mod, "shift"], "colon", window_to_next_group()),
    Key([mod], "exclam", window_to_new_group()),
    Key([mod, "shift"], "exclam", window_to_new_group(switch=True)),
    # Spawn applications
    Key([mod], "Return", lazy.spawn(terminal), desc="Launch terminal"),
    Key([mod, "shift"], "Return", lazy.spawn("thunar"), desc="Launch File Manager"),
    Key([mod, "control"], "Return", lazy.spawn("google-chrome-stable"), desc="Launch Chrome"),
    # Controls
    Key([mod, "shift"], "q", lazy.window.kill(), desc="Kill focused window"),
    Key([mod, "control"], "r", lazy.reload_config(), desc="Reload the config"),
    Key([mod, "control"], "q", lazy.shutdown(), desc="Shutdown Qtile"),
    Key([mod], "r", lazy.spawncmd(), desc="Spawn a command using a prompt widget")
]

groups = [Group("Home", position=1, label="")]


#for i in groups:
#    keys.extend(
#        [
#            Key([mod], "F"+i.name, lazy.group[i.name].toscreen()),
#            Key([mod, "shift"], "F"+i.name, lazy.window.togroup(i.name, switch_group=True)),
#            Key([mod, "control"], "F"+i.name, lazy.window.togroup(i.name))
#        ]
#    )

layouts = [
    layout.MonadTall(border_focus=[COLORS['nord11']], margin=WINDOW_MARGIN),
    layout.Columns(border_focus_stack=[COLORS['nord11']], margin=WINDOW_MARGIN, fair=True),
    layout.Max(margin=WINDOW_MARGIN)
]

widget_defaults = dict(
    font="UbuntuMono Nerd Font Propo",
    #font="sans",
    fontsize=18,
    padding=3,
)
extension_defaults = widget_defaults.copy()

screens = [
    Screen(
        wallpaper=WALLPAPER_PATH,
        wallpaper_mode="fill",
        bottom=bar.Bar(
            [
                widget.CurrentLayoutIcon(foreground=COLORS["nord7"], scale=0.8),
                widget.GroupBox(),
                widget.Prompt(),
                widget.WindowName(),
                # NB Systray is incompatible with Wayland, consider using StatusNotifier instead
                # widget.StatusNotifier(),
                widget.Systray(),
                widget.Clock(format="%Y-%m-%d %a %H:%M:%S %p"),
                widget.QuickExit(countdown_start=3),
            ],
            50,
            background= COLORS["nord0"]
            # border_width=[2, 0, 2, 0],  # Draw top and bottom borders
            # border_color=["ff00ff", "000000", "ff00ff", "000000"]  # Borders are magenta
        ),
        # You can uncomment this variable if you see that on X11 floating resize/moving is laggy
        # By default we handle these events delayed to already improve performance, however your system might still be struggling
        # This variable is set to None (no cap) by default, but you can set it to 60 to indicate that you limit it to 60 events per second
        # x11_drag_polling_rate = 60,
    ),
]

# Drag floating layouts.
mouse = [
    Drag([mod], "Button1", lazy.window.set_position_floating(), start=lazy.window.get_position()),
    Drag([mod], "Button3", lazy.window.set_size_floating(), start=lazy.window.get_size()),
    Click([mod], "Button2", lazy.window.bring_to_front()),
    Click([mod], "Button4", lazy.screen.prev_group()),
    Click([mod], "Button5", lazy.screen.next_group()),
    Click([mod, "shift"], "Button4", window_to_prev_group()),
    Click([mod, "shift"], "Button5", window_to_next_group())
]

dgroups_key_binder = None
dgroups_app_rules = []  # type: list
follow_mouse_focus = True
bring_front_click = False
floats_kept_above = True
cursor_warp = False
floating_layout = layout.Floating(
    float_rules=[
        # Run the utility of `xprop` to see the wm class and name of an X client.
        *layout.Floating.default_float_rules,
        Match(wm_class="com-itfinance-core-Starter"),  # Prorealtime
        Match(wm_class="com-itfinance-launcher-CommonLauncher"),  # Prorealtime
        Match(wm_class="confirmreset"),  # gitk
        Match(wm_class="makebranch"),  # gitk
        Match(wm_class="maketag"),  # gitk
        Match(wm_class="ssh-askpass"),  # ssh-askpass
        Match(title="branchdialog"),  # gitk
        Match(title="pinentry"),  # GPG key password entry
    ]
)
auto_fullscreen = True
focus_on_window_activation = "smart"
reconfigure_screens = True

# If things like steam games want to auto-minimize themselves when losing
# focus, should we respect this or not?
auto_minimize = True

# When using the Wayland backend, this can be used to configure input devices.
wl_input_rules = None
wmname = "LG3D"

