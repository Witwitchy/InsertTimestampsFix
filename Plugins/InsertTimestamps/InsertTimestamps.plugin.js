/**
 * @name InsertTimestamps
 * @author Vendicated & Witwitchy
 * @authorId 92660365
 * @description Allows you to insert timestamp markdown with a convenient chat bar button
 * @source https://github.com/Witwitchy/InsertTimestampsFix/blob/main/Plugins/InsertTimestamps/InsertTimestamps.plugin.js
 * @version 1.0.16
 */

/*
Original file: https://github.com/Vendicated/BetterDiscordPlugins/blob/main/Plugins/InsertTimestamps/InsertTimestamps.plugin.js
I’m just someone who fixes the plugin.
*/

"use strict";

// ---------------------------------------------------------------------------
// Webpack lookups
// ---------------------------------------------------------------------------
var { useState, useMemo } = BdApi.React;
var { Filters } = BdApi.Webpack;
var { Button, Tooltip } = BdApi.Components;

var CalendarIcon = BdApi.Webpack.getModule(Filters.byStrings("M7 1a1 1 0 0 1 1 1v.75c0"), { searchExports: true });
var Parser = BdApi.Webpack.getByKeys("parseTopic");
var PreloadedUserSettings = BdApi.Webpack.getModule((m) => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"), {
  searchExports: true
});
var ButtonWrapperClasses = BdApi.Webpack.getByKeys("buttonWrapper", "buttonContent");
var ButtonClasses = BdApi.Webpack.getByKeys("emojiButton", "stickerButton");
var IconClasses = BdApi.Webpack.getByKeys("iconContainer", "trinketsIcon");

var cl = (...names) => names.map((n) => `vbd-its-${n}`).join(" ");
var Formats = ["", "t", "T", "d", "D", "f", "F", "R"];
var h = BdApi.React.createElement;

// ---------------------------------------------------------------------------
// Label generator (English, 12-hour clock)
// ---------------------------------------------------------------------------
function getDynamicLabel(f, t) {
  const d = new Date(t * 1000);
  if (isNaN(d.getTime())) return "Invalid Date";

  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  let rawHours = d.getHours();
  const ampm = rawHours >= 12 ? "PM" : "AM";
  rawHours = rawHours % 12 || 12;
  const hours = pad(rawHours);
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  switch (f) {
    case "t": return `${hours}:${minutes} ${ampm}`;
    case "T": return `${hours}:${minutes}:${seconds} ${ampm}`;
    case "d": return `${day}.${month}.${year}`;
    case "D": return `${day} ${months[d.getMonth()]} ${year}`;
    case "f": return `${day} ${months[d.getMonth()]} ${year} ${hours}:${minutes} ${ampm}`;
    case "F": return `${weekdays[d.getDay()]}, ${day} ${months[d.getMonth()]} ${year} ${hours}:${minutes} ${ampm}`;
    case "R": {
      const diff = Math.round((d.getTime() - Date.now()) / 1000);
      const absDiff = Math.abs(diff);
      let timeString = "just now";
      if (absDiff >= 60 && absDiff < 3600) {
        const mins = Math.round(absDiff / 60);
        timeString = `${mins} minute${mins > 1 ? "s" : ""}`;
      } else if (absDiff >= 3600 && absDiff < 86400) {
        const hrs = Math.round(absDiff / 3600);
        timeString = `${hrs} hour${hrs > 1 ? "s" : ""}`;
      } else if (absDiff >= 86400) {
        const days = Math.round(absDiff / 86400);
        timeString = `${days} day${days > 1 ? "s" : ""}`;
      }
      if (absDiff >= 60) timeString = diff > 0 ? `in ${timeString}` : `${timeString} ago`;
      return `Relative (${timeString})`;
    }
    default: return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  }
}

// ---------------------------------------------------------------------------
// Custom dropdown (looks like Discord's SingleSelect)
// ---------------------------------------------------------------------------
function FormatSelect({ options, value, onChange }) {
  const React = BdApi.React;
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const btnRef = React.useRef(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const r = btnRef.current.getBoundingClientRect();
      const maxHeight = 300;
      const spaceBelow = window.innerHeight - r.bottom;
      const flip = spaceBelow < maxHeight && r.top > spaceBelow;
      setPos({
        left: r.left,
        width: r.width,
        maxHeight: Math.min(maxHeight, (flip ? r.top : spaceBelow) - 16),
        ...(flip ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 })
      });
    }
    setOpen(!open);
  };

  const current = options.find((o) => o.value === value) ?? options[0];

  const list = open && pos
    ? BdApi.ReactDOM.createPortal(
        h("div", { ref: listRef, className: cl("select-list"), style: pos },
          options.map((o) =>
            h("div", {
              key: o.value,
              className: cl("select-option") + (o.value === value ? " " + cl("selected") : ""),
              onClick: () => {
                onChange(o.value);
                setOpen(false);
              }
            },
              h("span", { className: cl("select-label") }, o.label),
              o.value === value
                ? h("svg", { width: 20, height: 20, viewBox: "0 0 24 24", className: cl("select-check") },
                    h("circle", { cx: 12, cy: 12, r: 10, fill: "currentColor" }),
                    h("path", {
                      fill: "none",
                      stroke: "#fff",
                      strokeWidth: 2.5,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      d: "M7.5 12.5l3 3 6-6.5"
                    }))
                : null
            )
          )
        ),
        document.body
      )
    : null;

  return h(React.Fragment, null,
    h("div", {
      ref: btnRef,
      role: "button",
      tabIndex: 0,
      className: cl("select-control") + (open ? " " + cl("open") : ""),
      onClick: toggle,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }
    },
      h("span", { className: cl("select-label") }, current?.label),
      h("svg", { className: cl("select-arrow"), width: 18, height: 18, viewBox: "0 0 24 24" },
        h("path", {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          d: "M6 9l6 6 6-6"
        }))
    ),
    list
  );
}

// ---------------------------------------------------------------------------
// Picker content + modal opening (uses BetterDiscord's own modal API)
// ---------------------------------------------------------------------------
var pickerState = { formatted: "" };

function PickerContent() {
  const [value, setValue] = useState("");
  const [format, setFormat] = useState("");
  const time = Math.round((new Date(value).getTime() || Date.now()) / 1e3);
  const formatted = `<t:${time}${format && `:${format}`}>`;
  pickerState.formatted = formatted; // read when "Insert" is pressed
  const rendered = useMemo(() => Parser?.parse?.(formatted) ?? formatted, [formatted]);

  const scheme = PreloadedUserSettings?.getCurrentValue?.()?.appearance?.theme === 2 ? "light" : "dark";

  return h(BdApi.React.Fragment, null,
    h("input", {
      type: "datetime-local",
      value,
      className: cl("datetime-input"),
      onChange: (e) => setValue(e.currentTarget.value),
      style: { colorScheme: scheme }
    }),
    h("h3", { className: cl("format-title") }, "Timestamp Format"),
    h(FormatSelect, {
      value: format,
      onChange: setFormat,
      options: Formats.map((m) => ({ value: m, label: getDynamicLabel(m, time) }))
    }),
    h("h3", { className: cl("preview-title") }, "Preview"),
    h("div", { className: cl("preview-text") }, rendered, " (", formatted, ")")
  );
}

function openPicker() {
  pickerState.formatted = "";
  BdApi.UI.showConfirmationModal(
    "Timestamp Picker",
    h(PickerContent),
    {
      confirmText: "Insert",
      cancelText: "Cancel",
      onConfirm: () => {
        if (!pickerState.formatted) return;
        const ComponentDispatch = BdApi.Webpack.getModule(
          (m) => m.emitter?._events?.INSERT_TEXT,
          { searchExports: true }
        );
        ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
          rawText: pickerState.formatted + " ",
          plainText: pickerState.formatted + " "
        });
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Chat bar button
// ---------------------------------------------------------------------------
function ChatBarComponent() {
  return h(Tooltip, { text: "Insert Timestamp" }, ({ onMouseEnter, onMouseLeave }) =>
    h(
      Button,
      {
        className: cl("text-area-button"),
        "aria-haspopup": "dialog",
        "aria-label": "",
        size: "",
        look: Button?.Looks?.BLANK,
        onMouseEnter,
        onMouseLeave,
        onClick: () => openPicker()
      },
      h(
        "div",
        { className: `${ButtonWrapperClasses.buttonWrapper} ${ButtonClasses.button} ${ButtonWrapperClasses.button}` },
        h("div", { className: IconClasses.iconContainer }, h(CalendarIcon, null))
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function findInReactTree(root, filter) {
  return BdApi.Utils.findInTree(root, filter, {
    walkable: ["children", "props"]
  });
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var styles_default = `
.vbd-its-datetime-input {
    position: relative;
    background-color: var(--input-background-default);
    color: var(--text-default);
    width: -webkit-fill-available;
    padding: 8px 12px;
    margin: 1em 0;
    outline: none;
    border: 1px solid var(--input-border-default);
    border-radius: var(--radius-sm);
    font-weight: 500;
    font-style: inherit;
    font-size: 16px;
}
.vbd-its-text-area-button {
    padding: 0;
}
.vbd-its-preview-title,
.vbd-its-format-title {
    margin: 1em 0 8px;
    font-size: 12px;
    font-weight: 700;
    line-height: 16px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--header-secondary, #b5bac1);
}
.vbd-its-preview-text {
    margin-bottom: 1em;
}
.vbd-its-select-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    box-sizing: border-box;
    padding: 10px 12px;
    margin: 0 0 1em;
    background-color: var(--input-background-default, #1e1f22);
    color: var(--text-default, var(--text-normal, #dbdee1));
    border: 1px solid var(--input-border-default, transparent);
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
}
.vbd-its-select-control:focus-visible,
.vbd-its-select-control.vbd-its-open {
    outline: none;
    border-color: var(--brand-500, #5865f2);
}
.vbd-its-select-arrow {
    flex-shrink: 0;
    color: var(--interactive-normal, #b5bac1);
    /* OK KONUMU: sola almak icin bu degeri arttir, saga almak icin azalt */
    margin-right: 0px;
}
.vbd-its-open .vbd-its-select-arrow {
    transform: rotate(180deg);
}
.vbd-its-select-list {
    position: fixed;
    z-index: 10000;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 0;
    background: var(--background-secondary, var(--background-base-low, #2b2d31));
    border: 1px solid var(--background-tertiary, rgba(0, 0, 0, 0.35));
    border-radius: 4px 4px 12px 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
}
.vbd-its-select-list::-webkit-scrollbar {
    width: 8px;
}
.vbd-its-select-list::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thin-thumb, #1a1b1e);
    border-radius: 4px;
}
.vbd-its-select-list::-webkit-scrollbar-track {
    background: transparent;
}
.vbd-its-select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 16px;
    color: var(--interactive-normal, #b5bac1);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
}
.vbd-its-select-option:hover {
    background-color: var(--background-modifier-hover, rgba(78, 80, 88, 0.3));
    color: var(--interactive-hover, #dbdee1);
}
.vbd-its-select-option.vbd-its-selected {
    background-color: var(--background-modifier-selected, #404249);
    color: var(--interactive-active, #fff);
}
.vbd-its-select-check {
    flex-shrink: 0;
    color: var(--brand-500, #5865f2);
}
.vbd-its-select-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
`;

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
var ChannelTextAreaButtons = BdApi.Webpack.getModule((m) => m.type?.toString?.().includes('"sticker")'));

function start() {
  BdApi.DOM.addStyle("vbd-st", styles_default);
  BdApi.Patcher.after("vbd-st", ChannelTextAreaButtons, "type", (_this, [{ disabled }], res) => {
    if (disabled) return;
    const buttons = findInReactTree(res, (n) => Array.isArray(n) && n.some((e) => e.key === "emoji"));
    if (!buttons) return;
    buttons.splice(0, 0, h(ChatBarComponent, null));
  });
}

function stop() {
  BdApi.DOM.removeStyle("vbd-st");
  BdApi.Patcher.unpatchAll("vbd-st");
}

module.exports = () => ({
  start,
  stop
});
