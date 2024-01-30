/*********************************************************************
 * Shortcuts is Copyright (C) 2016-2018 Kyle Robbertze
 * African Institute for Mathematical Sciences, South Africa
 *
 * Shortcuts is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Shortcuts is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Shortcuts.  If not, see <http://www.gnu.org/licenses/>.
 **********************************************************************/

const GLib = imports.gi.GLib
const Gio = imports.gi.Gio
const Shell = imports.gi.Shell
const St = imports.gi.St
const Clutter = imports.gi.Clutter

const Gettext = imports.gettext.domain("Shortcuts")

const ExtensionUtils = imports.misc.extensionUtils

const Config = imports.misc.config

const Main = imports.ui.main

const Me = ExtensionUtils.getCurrentExtension()
const _ = Gettext.gettext

let button, stage, panel_panel, left_panel, right_panel
let _isAdded, _visible, _visibility
let _custom_shortcut_handler, _transparency_handler, _visibility_handler

/**
 * Initialises the plugin.
 */
function init() {
  ExtensionUtils.initTranslations("Shortcuts")
}

/*
 * Enables the plugin by adding listeners and icons as necessary
 */
function enable() {
  this._settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions.shortcuts"
  )
  this._settings.connect("changed::show-icon", this._toggleIcon.bind(this))
  _custom_shortcut_handler = this._settings.connect(
    "changed::use-custom-shortcuts",
    this._setShortcutsFile.bind(this)
  )
  _transparency_handler = this._settings.connect(
    "changed::use-transparency",
    this._setTransparency.bind(this)
  )
  _visibility_handler = this._settings.connect(
    "changed::visibility",
    this._setTransparency.bind(this)
  )
  _isAdded = false

  Main.overview._specialToggle = function (evt) {
    _toggleShortcuts()
  }
  Main.wm.setCustomKeybindingHandler(
    "toggle-overview",
    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
    Main.overview._specialToggle.bind(this, Main.overview)
  )
  _toggleIcon()
}

/**
 * Removes all traces of the listeners and icons that the extension created
 */
function disable() {
  this._settings.disconnect(_custom_shortcut_handler)
  this._settings.disconnect(_transparency_handler)
  this._settings.disconnect(_visibility_handler)
  if (this._settings) {
    delete this._settings
  }
  if (_isAdded) {
    Main.panel._rightBox.remove_child(button)
    _isAdded = false
  }
  Main.wm.setCustomKeybindingHandler(
    "toggle-overview",
    Shell.ActionMode.NORMAL,
    Main.overview.toggle.bind(this, Main.overview)
  )
  delete Main.overview._specialToggle
  _visible = false
}

/**
 * Builds the pop-up and shows the shortcut description list
 */
function _toggleShortcuts() {
  if (!_visible) {
    if (!stage) {
      // Show popup
      stage = new St.BoxLayout({
        style_class: "background-boxlayout",
        pack_start: false,
        vertical: true,
      })

      panel_panel = new St.BoxLayout({
        style_class: "panel-boxlayout",
        pack_start: false,
        vertical: false,
      })

      stage.add_actor(panel_panel)

      left_panel = new St.BoxLayout({
        style_class: "left-boxlayout",
        pack_start: false,
        vertical: true,
      })
      right_panel = new St.BoxLayout({
        style_class: "right-boxlayout",
        pack_start: false,
        vertical: true,
      })
      // panel_panel.add_actor(left_panel)
      // panel_panel.add_actor(right_panel)

      _readShortcuts()

      stage.add_actor(
        new St.Label({
          style_class: "superkey-prompt",
          text: _("The super key is the Windows key on most keyboards"),
        })
      )

      // Main.uiGroup.add_actor(stage)
    }

    let _color = new Clutter.Color({
      red: 10,
      blue: 10,
      green: 10,
      alpha: 255,
    })
    _color.alpha = 255 * _visibility
    stage.set_background_color(_color)

    let monitor = Main.layoutManager.primaryMonitor

    stage.set_position(
      monitor.x + Math.floor(monitor.width / 2 - stage.width / 2),
      monitor.y + Math.floor(monitor.height / 2 - stage.height / 2)
    )
    _visible = true
  } else {
    // Hide popup
    let current_version = Config.PACKAGE_VERSION.split(".")
    if (current_version[0] == 3 && current_version[1] < 38) {
      const Tweener = imports.ui.tweener
      Tweener.addTween(stage, {
        opacity: 0,
        time: 1,
        transition: "easeOutQuad",
        onComplete: _hideShortcuts,
      })
    } else {
      _hideShortcuts()
    }
  }
}

/**
 * Reads the shortcuts from a file specified in the settings. If this is not
 * there then it defaults to the shortcuts file provided by the extension.
 */
function _readShortcuts() {
  let SHORTCUTS_FILE = this._settings.get_boolean("use-custom-shortcuts")
    ? this._settings.get_string("shortcuts-file")
    : Me.dir.get_child("shortcuts.json").get_path()
  if (!GLib.file_test(SHORTCUTS_FILE, GLib.FileTest.EXISTS)) {
    let msg = _("Shortcuts file not found: '%s'").format(SHORTCUTS_FILE)
    Main.notifyError(msg)
    return
  }
  let file = Gio.file_new_for_path(SHORTCUTS_FILE)
  let [result, contents] = file.load_contents(null)
  if (!result) {
    let msg = _("Unable to read file: '%s'").format(SHORTCUTS_FILE)
    Main.notifyError(msg)
    return
  }

  let shortcuts = JSON.parse(contents)
  let shortcutLength = shortcuts.length
  for (let i = 0; i < shortcuts.length; i++) {
    shortcutLength += shortcuts[i].shortcuts.length
  }

  let listProgress = 0.0
  for (let i = 0; i < shortcuts.length; i++) {
    listProgress += (shortcuts[i].shortcuts.length * 1.0) / shortcutLength
    let panel = listProgress < 0.5 ? left_panel : right_panel
    panel.add_actor(
      new St.Label({
        style_class: "shortcut-section",
        text: shortcuts[i].name,
      })
    )
    for (let j = 0; j < shortcuts[i].shortcuts.length; j++) {
      let item_panel = new St.BoxLayout({
        style_class: "item-boxlayout",
        pack_start: false,
        vertical: false,
      })
      let key = shortcuts[i].shortcuts[j].key
      let description = _(shortcuts[i].shortcuts[j].description)
      item_panel.add(
        new St.Label({
          style_class: "shortcut-key-label",
          text: key,
        })
      )
      item_panel.add(
        new St.Label({
          style_class: "shortcut-description-label",
          text: description,
        })
      )
      panel.add_actor(item_panel)
    }
  }
}

/**
 * Removes the actors used to make the pop-up describing the shortcuts.
 */
function _hideShortcuts() {
  panel_panel.remove_actor(left_panel)
  panel_panel.remove_actor(right_panel)
  stage.remove_actor(panel_panel)
  Main.uiGroup.remove_actor(stage)
  left_panel = null
  right_panel = null
  panel_panel = null
  stage = null
  _visible = false
}

/*
 * Shows or hides the icon in the right box of the top panel as the user
 * changes the setting
 */
function _toggleIcon() {
  let SHOW_ICON = this._settings.get_boolean("show-icon")
  if (!SHOW_ICON) {
    if (_isAdded) {
      Main.panel._rightBox.remove_child(button)
      _isAdded = false
    }
    return
  }
  if (!_isAdded) {
    let current_version = Config.PACKAGE_VERSION.split(".")
    if (current_version[0] == 3 && current_version[1] < 38) {
      button = new St.Bin({
        style_class: "panel-button",
        reactive: true,
        can_focus: true,
        x_fill: true,
        y_fill: false,
        track_hover: true,
      })
    } else {
      button = new St.Bin({
        style_class: "panel-button",
        reactive: true,
        can_focus: true,
        x_expand: true,
        y_expand: false,
        track_hover: true,
      })
    }
    let icon = new St.Icon({
      icon_name: "preferences-desktop-keyboard-shortcuts-symbolic",
      style_class: "system-status-icon",
    })

    button.set_child(icon)
    button.connect("button-press-event", _toggleShortcuts)

    Main.panel._rightBox.insert_child_at_index(button, 0)
    _isAdded = true
  }
}

/**
 * Updates the shortcut file location when it is changed in the settings
 */
function _setShortcutsFile() {
  if (!this._settings.get_boolean("use-custom-shortcuts")) {
    this._settings.set_string(
      "shortcuts-file",
      Me.dir.get_child("shortcuts.json").get_path()
    )
  }
}

function _setTransparency() {
  if (!this._settings.get_boolean("use-transparency")) {
    //    this._settings.set_int("visibility", 100);
    _visibility = 1
  } else {
    _visibility = this._settings.get_int("visibility") / 100
  }
}
