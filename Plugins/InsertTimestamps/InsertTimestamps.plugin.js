/**
 * @name InsertTimestamps
 * @author Vendicated & Witwitchy
 * @authorId 92660365
 * @description Allows you to insert timestamp markdown with a convenient chat bar button
 * @source https://github.com/Witwitchy/InsertTimestampsFix/blob/main/Plugins/InsertTimestamps/InsertTimestamps.plugin.js
 * @version 1.0.14
 */

/*
Original file: https://github.com/Vendicated/BetterDiscordPlugins/blob/main/Plugins/InsertTimestamps/InsertTimestamps.plugin.js
I’m just someone who fixes the plugin.
*/

"use strict";

// src/plugins/InsertTimestamps/modal.tsx
var { useState, useMemo } = BdApi.React;
var { Filters } = BdApi.Webpack;
var { Button, Tooltip } = BdApi.Components;
var [Text, CalendarIcon, SingleSelect] = BdApi.Webpack.getBulk(
  { filter: (m) => m.render?.toString?.().includes('case"always-white"'), searchExports: true },
  { filter: Filters.byStrings("M7 1a1 1 0 0 1 1 1v.75c0"), searchExports: true },
  { filter: Filters.byStrings("SingleSelect", "selectionMode"), searchExports: true }
);
var Modal = BdApi.Webpack.getByKeys("Modal")?.Modal;
var openModal = BdApi.Webpack.getByKeys("openModal")?.openModal;
var Parser = BdApi.Webpack.getByKeys("parseTopic");
var PreloadedUserSettings = BdApi.Webpack.getModule((m) => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"), {
  searchExports: true
});
var ButtonWrapperClasses = BdApi.Webpack.getByKeys("buttonWrapper", "buttonContent");
var ButtonClasses = BdApi.Webpack.getByKeys("emojiButton", "stickerButton");
var IconClasses = BdApi.Webpack.getByKeys("iconContainer", "trinketsIcon");
var cl = (...names) => names.map((n) => `vbd-its-${n}`).join(" ");
var Formats = ["", "t", "T", "d", "D", "f", "F", "R"];
function PickerModal({ rootProps }) {
  const [value, setValue] = useState("");
  const [format, setFormat] = useState("");
  const time = Math.round((new Date(value).getTime() || Date.now()) / 1e3);
  const formatTimestamp = (time2, format2) => `<t:${time2}${format2 && `:${format2}`}>`;
  const [formatted, rendered] = useMemo(() => {
    const formatted2 = formatTimestamp(time, format);
    return [formatted2, Parser.parse(formatted2)];
  }, [time, format]);

  // Generates dynamic English 12-hour labels based on the selected time
  const getDynamicLabel = (f, t) => {
    const d = new Date(t * 1000);
    if (isNaN(d.getTime())) return "Invalid Date";

    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    
    // 12-hour clock calculation
    let rawHours = d.getHours();
    const ampm = rawHours >= 12 ? "PM" : "AM";
    rawHours = rawHours % 12;
    rawHours = rawHours ? rawHours : 12; // The hour '0' should be '12'
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
      case "F": return `${day} ${months[d.getMonth()]} ${year} ${weekdays[d.getDay()]} ${hours}:${minutes} ${ampm}`;
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

        if (absDiff >= 60) {
          timeString = diff > 0 ? `in ${timeString}` : `${timeString} ago`;
        }
        return `Relative (${timeString})`;
      }
      default: return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    }
  };

  return /* @__PURE__ */ BdApi.React.createElement(
    Modal,
    {
      title: "Timestamp Picker",
      actions: [{
        variant: "primary",
        text: "Insert",
        onClick: () => {
          const ComponentDispatch = BdApi.Webpack.getModule((m) => m.emitter?._events?.INSERT_TEXT, {
            searchExports: true
          });
          ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
            rawText: formatted + " ",
            plainText: formatted + " "
          });
          rootProps.onClose();
        }
      }],
      ...rootProps
    },
    /* @__PURE__ */ BdApi.React.createElement(BdApi.React.Fragment, null, /* @__PURE__ */ BdApi.React.createElement(
      "input",
      {
        type: "datetime-local",
        value,
        className: cl("datetime-input"),
        onChange: (e) => setValue(e.currentTarget.value),
        style: {
          colorScheme: PreloadedUserSettings?.getCurrentValue?.()?.appearance?.theme === 2 ? "light" : "dark"
        }
      }
    ), /* @__PURE__ */ BdApi.React.createElement(Text, { variant: "heading-md/bold", className: cl("format-title") }, "Timestamp Format"), /* @__PURE__ */ BdApi.React.createElement(
      "select",
      {
        value: format,
        onChange: (e) => setFormat(e.target.value),
        className: cl("datetime-input"),
        style: {
          colorScheme: PreloadedUserSettings?.getCurrentValue?.()?.appearance?.theme === 2 ? "light" : "dark",
          backgroundColor: "var(--input-background-default)",
          color: "var(--text-normal)"
        }
      },
      Formats.map((m) => {
        return /* @__PURE__ */ BdApi.React.createElement(
          "option", 
          { 
            key: m, 
            value: m,
            style: {
              backgroundColor: "var(--background-secondary-alt)",
              color: "var(--text-normal)"
            }
          }, 
          getDynamicLabel(m, time)
        );
      })
    ), /* @__PURE__ */ BdApi.React.createElement(Text, { variant: "heading-md/bold", className: cl("preview-title") }, "Preview"), /* @__PURE__ */ BdApi.React.createElement(Text, { variant: "heading-sm/normal", className: cl("preview-text") }, rendered, " (", formatted, ")"))
  );
}
function ChatBarComponent() {
  return /* @__PURE__ */ BdApi.React.createElement(Tooltip, { text: "Insert Timestamp" }, ({ onMouseEnter, onMouseLeave }) => /* @__PURE__ */ BdApi.React.createElement(
    Button,
    {
      className: cl("text-area-button"),
      "aria-haspopup": "dialog",
      "aria-label": "",
      size: "",
      look: Button?.Looks?.BLANK,
      onMouseEnter,
      onMouseLeave,
      onClick: () => {
        openModal((props) => /* @__PURE__ */ BdApi.React.createElement(PickerModal, { rootProps: props }));
      }
    },
    /* @__PURE__ */ BdApi.React.createElement(
      "div",
      {
        className: `${ButtonWrapperClasses.buttonWrapper} ${ButtonClasses.button} ${ButtonWrapperClasses.button}`
      },
      /* @__PURE__ */ BdApi.React.createElement("div", { className: IconClasses.iconContainer }, /* @__PURE__ */ BdApi.React.createElement(CalendarIcon, null))
    )
  ));
}

// src/shared/findInReactTree.ts
function findInReactTree(root, filter) {
  return BdApi.Utils.findInTree(root, filter, {
    walkable: ["children", "props"]
  });
}

// include-file:~fileContent/styles.css
var styles_default = `.vbd-its-datetime-input {
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
    margin: 1em 0;
}
.vbd-its-preview-text {
    margin-bottom: 1em;
}
`;

// src/plugins/InsertTimestamps/index.jsx
var ChannelTextAreaButtons = BdApi.Webpack.getModule((m) => m.type?.toString?.().includes('"sticker")'));
function start() {
  BdApi.DOM.addStyle("vbd-st", styles_default);
  BdApi.Patcher.after("vbd-st", ChannelTextAreaButtons, "type", (_this, [{ disabled }], res) => {
    if (disabled)
      return;
    const buttons = findInReactTree(res, (n) => Array.isArray(n) && n.some((e) => e.key === "emoji"));
    if (!buttons)
      return;
    buttons.splice(0, 0, /* @__PURE__ */ BdApi.React.createElement(ChatBarComponent, null));
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
