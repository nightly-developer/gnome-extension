/*********************************************************************
 * The Shortcuts is Copyright (C) 2016-2018 Kyle Robbertze
 * African Institute for Mathematical Sciences, South Africa
 *
 * Shortcuts is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation
 *
 * Shortcuts is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Shortcuts.  If not, see <http://www.gnu.org/licenses/>.
 **********************************************************************/

const { Gtk, Gio, GObject } = imports.gi;
const Gettext = imports.gettext.domain("Shortcuts");
const _ = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const g_schema = "org.gnome.shell.extensions.shortcuts";

/**
 * Initialises the preferences widget
 */
function init() {
  ExtensionUtils.initTranslations("Shortcuts");
}

/**
 * Builds the preferences widget
 */
function buildPrefsWidget() {
  let current_version = Config.PACKAGE_VERSION.split(".");
  if (current_version[0] == 3) {
    let widget = new ShortcutsPrefsWidget3();
    widget.show_all();
    return widget;
  } else {
    let widget = new ShortcutsPrefsWidget4();
    return widget;
  }
}

/**
 * Builds the preferences widget gnome 42 and newer
 */
function fillPreferencesWindow(window) {
  let widget = new AdwShortcutsPrefsWidget(window);

  return widget.fillPreferencesWindow();
}

/**
 * Describes the widget that is shown in the extension settings section of
 * GNOME tweek.
 */
const ShortcutsPrefsWidget3 = new GObject.Class({
  Name: "Shortcuts.Prefs.Widget3",
  GTypeName: "ShortcutsPrefsWidget3",
  Extends: Gtk.Grid,
  /**
   * Initalises the widget
   */
  _init: function (params) {
    this._settings = ExtensionUtils.getSettings(g_schema);
    this.parent(params);
    this.margin = 12;
    this.row_spacing = this.column_spacing = 6;
    this.set_orientation(Gtk.Orientation.VERTICAL);

    this.customShortcutsFileCheckButton = new Gtk.CheckButton({
      label: _("Custom Shortcuts File"),
    });
    this.attach(this.customShortcutsFileCheckButton, 0, 0, 2, 1);
    this._settings.bind(
      "use-custom-shortcuts",
      this.customShortcutsFileCheckButton,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    this.shortcutsFile = new Gtk.FileChooserButton({
      title: _("Select shortcut file"),
      action: Gtk.FileChooserAction.OPEN,
    });
    this.shortcutsFile.select_uri(
      "file://" + this._settings.get_string("shortcuts-file")
    );
    let shortcutsFileFilter = new Gtk.FileFilter();
    this.shortcutsFile.set_filter(shortcutsFileFilter);
    shortcutsFileFilter.add_mime_type("application/json");
    this.shortcutsFile.connect("selection_changed", function (sw, data) {
      let path = String(this.shortcutsFile.get_uri()).slice(7);
      this._settings.set_string("shortcuts-file", path);
    });
    this.attach(this.shortcutsFile, 3, 0, 1, 1);

    let showIconCheckButton = new Gtk.CheckButton({
      label: _("Show tray icon"),
      margin_top: 6,
    });
    this._settings.bind(
      "show-icon",
      showIconCheckButton,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    this.attach(showIconCheckButton, 0, 1, 2, 1);
  },
});

const ShortcutsPrefsWidget4 = GObject.registerClass(
  {
    Name: "Shortcuts.Prefs.Widget4",
    GTypeName: "ShortcutsPrefsWidget4",
    Template: Me.dir.get_child("prefs.ui").get_uri(),
    InternalChildren: [
      "file_chooser",
      "file_chooser_button",
      "file_chooser_chkbutcusfile",
      "file_chooser_chkbuttrayicon",
      "file_chooser_chkbuttransp",
    ],
  },

  class ShortcutsPrefsWidget4 extends Gtk.Box {
    _init(params = {}) {
      super._init(params);

      this._settings = ExtensionUtils.getSettings(g_schema);

      this._file_chooser_chkbutcusfile.set_active(
        this._settings.get_boolean("use-custom-shortcuts")
      );

      if (this._settings.get_boolean("use-custom-shortcuts")) {
        this._file_chooser_button.label =
          "file://" + this._settings.get_string("shortcuts-file");
      }

      this._file_chooser_chkbuttrayicon.set_active(
        this._settings.get_boolean("show-icon")
      );

      this._file_chooser_chkbuttransp.set_active(
        this._settings.get_boolean("use-transparency")
      );

      this.append(
        _buildRange(
          "visibility",
          [0, 100, 1, 70],
          _("Visibility"),
          _("Visibility in percent"),
          this._settings
        )
      );
    }

    _onChkCusFileClicked(chkbox) {
      this._settings.set_boolean("use-custom-shortcuts", chkbox.get_active());
    }

    _onChkTrayIconClicked(chkbox) {
      this._settings.set_boolean("show-icon", chkbox.get_active());
    }

    _onBtnClicked(btn) {
      let parent = btn.get_root();
      this._file_chooser.set_transient_for(parent);

      let shortcutsFileFilter = new Gtk.FileFilter();
      this._file_chooser.set_filter(shortcutsFileFilter);
      shortcutsFileFilter.add_mime_type("application/json");

      this._file_chooser.title = _("Select shortcut file");

      this._file_chooser.show();
    }

    _onChkTransparencyClicked(chkbox) {
      this._settings.set_boolean("use-transparency", chkbox.get_active());
    }

    _onFileChooserResponse(native, response) {
      if (response !== Gtk.ResponseType.ACCEPT) {
        return;
      }
      let fileURI = native.get_file().get_uri();
      this._file_chooser_button.set_label(fileURI);
      let fileURI2 = fileURI.replace("file://", "");
      this._settings.set_string("shortcuts-file", fileURI2);
    }
  }
);

class AdwShortcutsPrefsWidget {
  constructor(window) {
    this._window = window;
    this._page1 = null;
    this._rowfilename = null;
    this._filechooser = null;
    this._settings = ExtensionUtils.getSettings(g_schema);
  }

  _onBtnClicked(btn) {
    let parent = btn.get_root();
    this._filechooser.set_transient_for(parent);

    let shortcutsFileFilter = new Gtk.FileFilter();
    this._filechooser.set_filter(shortcutsFileFilter);
    shortcutsFileFilter.add_mime_type("application/json");

    this._filechooser.title = _("Select shortcut file");

    this._filechooser.show();
  }

  _onFileChooserResponse(native, response) {
    if (response !== Gtk.ResponseType.ACCEPT) {
      return;
    }
    let fileURI = native.get_file().get_uri();
    this._rowfilename.set_title(fileURI);
    let fileURI2 = fileURI.replace("file://", "");
    this._settings.set_string("shortcuts-file", fileURI2);
  }

  fillPreferencesWindow() {
    const { Adw } = imports.gi;
    let adwrow;
    this._page1 = Adw.PreferencesPage.new(); //page
    this._page1.set_title(_("Shortcuts"));
    this._page1.set_name("shortcuts_page");
    this._page1.set_icon_name("folder-symbolic");

    const group1 = Adw.PreferencesGroup.new(); //group
    group1.set_title(_("Settings"));
    group1.set_name("shortcuts_group");
    this._page1.add(group1);

    adwrow = new Adw.ActionRow({ title: _("Custom Shortcuts File") }); //row1
    group1.add(adwrow);
    const togglecustomfile = new Gtk.Switch({
      active: this._settings.get_boolean("use-custom-shortcuts"),
      valign: Gtk.Align.CENTER,
    });
    this._settings.bind(
      "use-custom-shortcuts",
      togglecustomfile,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    adwrow.add_suffix(togglecustomfile);
    adwrow.activatable_widget = togglecustomfile;

    adwrow = new Adw.ActionRow({
      title: "file://" + this._settings.get_string("shortcuts-file"),
    }); //row2
    group1.add(adwrow);
    this._rowfilename = adwrow;

    adwrow = new Adw.ActionRow({ title: _("Select shortcut file") }); //row3
    let buttonfilechooser = new Gtk.Button({
      label: _("..."),
      valign: Gtk.Align.CENTER,
    });
    buttonfilechooser.connect(
      "clicked",
      this._onBtnClicked.bind(this, buttonfilechooser)
    );
    this._filechooser = new Gtk.FileChooserNative({
      title: _("Select shortcut file"),
      modal: true,
      action: Gtk.FileChooserAction.OPEN,
    });
    this._filechooser.connect(
      "response",
      this._onFileChooserResponse.bind(this)
    );
    adwrow.add_suffix(buttonfilechooser);
    adwrow.activatable_widget = buttonfilechooser;
    group1.add(adwrow);

    adwrow = new Adw.ActionRow({ title: _("Use transparency") }); //row4
    group1.add(adwrow);
    const toggleusetransparency = new Gtk.Switch({
      active: this._settings.get_boolean("use-transparency"),
      valign: Gtk.Align.CENTER,
    });
    this._settings.bind(
      "use-transparency",
      toggleusetransparency,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
    adwrow.add_suffix(toggleusetransparency);

    adwrow = new Adw.ActionRow({ title: _("Visibility") }); //row5
    let rangeslider = _rangeslider(
      "visibility",
      [0, 100, 1, 70],
      _("Visibility in percent"),
      this._settings
    );
    adwrow.add_suffix(rangeslider);
    adwrow.activatable_widget = rangeslider;
    group1.add(adwrow);
    this._window.add(this._page1);
  }
}

function _rangeslider(key, values, tooltip, settings) {
  let [min, max, step, defv] = values;
  let range = Gtk.Scale.new_with_range(
    Gtk.Orientation.HORIZONTAL,
    min,
    max,
    step
  );
  range.tooltip = tooltip;
  range.set_value(settings.get_int(key));
  range.set_draw_value(true);
  range.add_mark(defv, Gtk.PositionType.BOTTOM, null);
  range.set_size_request(200, -1);

  range.connect("value-changed", function (slider) {
    settings.set_int(key, slider.get_value());
  });
  return range;
}

function _buildRange(key, values, labeltext, tooltip, settings) {
  let hbox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 10,
  });

  let label = new Gtk.Label({ label: labeltext, xalign: 0 });

  let range = _rangeslider(key, values, tooltip, settings);

  hbox.append(label);
  hbox.append(range);

  return hbox;
}
