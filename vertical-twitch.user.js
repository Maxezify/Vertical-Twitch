// ==UserScript==
// @name         Vertical Twitch — Chat en haut
// @namespace    https://github.com/Maxezify/Vertical-Twitch
// @version      1.0.0
// @description  En portrait, affiche le chat en haut et le lecteur en bas, sans interrompre le stream.
// @match        https://www.twitch.tv/*
// @run-at       document-idle
// @noframes
// @inject-into  content
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @homepageURL  https://github.com/Maxezify/Vertical-Twitch
// @supportURL   https://github.com/Maxezify/Vertical-Twitch/issues
// @downloadURL  https://raw.githubusercontent.com/Maxezify/Vertical-Twitch/main/vertical-twitch.user.js
// ==/UserScript==

(() => {
  'use strict';

  // Keep the original React DOM, player, chat connection and inline styles intact.
  const ACTIVE = 'vt-portrait';
  const PREFIX = 'data-vt-';
  const root = document.documentElement;
  const portrait = matchMedia('(orientation: portrait)');
  const SELECTOR = {
    main: 'main.twilight-main',
    player: '.persistent-player',
    chat: '[data-a-target="right-column-chat-bar"], .right-column',
    streamChat: '.stream-chat',
    room: '.chat-room',
  };
  const reservedRoutes = new Set([
    'directory', 'downloads', 'drops', 'inventory', 'jobs', 'login', 'logout',
    'messages', 'moderator', 'p', 'payments', 'popout', 'prime', 'products',
    'search', 'settings', 'signup', 'store', 'subscriptions', 'turbo', 'videos',
    'wallet', 'friends', 'following', 'collections', 'creatorcamp',
  ]);
  let enabled = GM_getValue('enabled', true) !== false;
  let menuId;
  let timer = 0;
  let current = null;
  let marked = [];
  let lastPath = location.pathname;

  GM_addStyle(`
    /* The fullscreen guard applies immediately, before fullscreenchange runs. */
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}escape] {
      transform: none !important;
      filter: none !important;
      perspective: none !important;
      contain: none !important;
      content-visibility: visible !important;
      will-change: auto !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}main] {
      isolation: auto !important;
      z-index: 2 !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}main] .channel-root {
      visibility: hidden !important;
      pointer-events: none !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}main] [data-a-target="root-scroller"] {
      overflow: hidden !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}player],
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] {
      position: fixed !important;
      inset: auto !important;
      left: var(--vt-left) !important;
      width: var(--vt-width) !important;
      min-width: 0 !important;
      max-width: none !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
      transition: none !important;
      box-sizing: border-box !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}player] {
      top: var(--vt-player-top) !important;
      height: var(--vt-player-height) !important;
      overflow: hidden !important;
      background: #000 !important;
      visibility: visible !important;
      z-index: 2 !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}player] > .tw-aspect {
      width: 100% !important;
      height: 100% !important;
      padding: 0 !important;
      max-height: none !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}player] > .tw-aspect::before {
      display: none !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}player] video {
      object-fit: contain !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] {
      top: var(--vt-top) !important;
      height: var(--vt-chat-height) !important;
      z-index: 3 !important;
      border: 0 !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}fill] {
      width: 100% !important;
      min-width: 0 !important;
      max-width: none !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      transform: none !important;
      transition: none !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] .channel-root__right-column {
      position: relative !important;
      inset: auto !important;
      opacity: 1 !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] .stream-chat {
      display: flex !important;
      flex-direction: column !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] .chat-room {
      flex: 1 1 0 !important;
      height: auto !important;
      min-height: 0 !important;
      width: 100% !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] .chat-room__content {
      min-height: 0 !important;
      width: 100% !important;
    }
    html.${ACTIVE}:not(:has(:fullscreen)) [${PREFIX}chat] .chat-input {
      flex-shrink: 0 !important;
    }
  `);

  function isChannel() {
    const parts = location.pathname.toLowerCase().split('/').filter(Boolean);
    return parts.length === 1 && /^[a-z0-9_]+$/.test(parts[0])
      && !reservedRoutes.has(parts[0]);
  }

  function schedule() {
    // Coalesce bursts without postponing forever on a busy chat.
    if (!timer) timer = window.setTimeout(() => {
      timer = 0;
      update();
    }, 80);
  }

  const resizeObserver = new ResizeObserver(schedule);
  const layoutObserver = new MutationObserver(schedule);

  function mark(element, name) {
    const attr = PREFIX + name;
    if (!element.hasAttribute(attr)) {
      element.setAttribute(attr, '');
    }
    // A replacement produced by cloneNode may already carry our attributes.
    if (!marked.some(([node, name]) => node === element && name === attr)) marked.push([element, attr]);
  }

  function deactivate() {
    resizeObserver.disconnect();
    layoutObserver.disconnect();
    root.classList.remove(ACTIVE);
    for (const [element, attr] of marked) element.removeAttribute(attr);
    marked = [];
    for (const name of ['left', 'width', 'top', 'chat-height', 'player-top', 'player-height']) {
      root.style.removeProperty('--vt-' + name);
    }
    current = null;
  }

  function discover() {
    const main = document.querySelector(SELECTOR.main);
    const player = main?.querySelector(SELECTOR.player);
    const chat = document.querySelector(SELECTOR.chat);
    const streamChat = chat?.querySelector(SELECTOR.streamChat);
    const room = streamChat?.querySelector(SELECTOR.room);
    const channel = main?.querySelector('.channel-root');
    // Do not turn a browsing-page mini player or an offline hero into this layout.
    if (!main || !player || !chat || !streamChat || !room
      || !channel?.classList.contains('channel-root--live')
      || player.contains(chat) || chat.contains(player)) return null;
    if (chat.classList.contains('right-column--collapsed')
      || chat.querySelector('#live-page-chat[aria-hidden="true"], .chat-shell__collapsed, .channel-root__right-column--collapsed')) return null;
    let shell = main.parentElement;
    while (shell && !shell.contains(chat)) shell = shell.parentElement;
    if (!shell || shell === document.body || shell === root) return null;
    return { main, player, chat, streamChat, room, shell, channel };
  }

  function attach(elements) {
    deactivate();
    current = elements;
    const {main, player, chat, streamChat, shell} = elements;
    mark(main, 'main');
    mark(player, 'player');
    mark(chat, 'chat');
    // A transformed ancestor otherwise traps a fixed-position descendant.
    for (const node of [player, chat]) {
      for (let ancestor = node.parentElement; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
        mark(ancestor, 'escape');
      }
    }
    // Twitch nests several 34rem-wide wrappers. Mark just the path to the chat,
    // never every descendant (emote menus, badges and message widths stay native).
    for (let node = streamChat; node && node !== chat; node = node.parentElement) mark(node, 'fill');
    for (const node of new Set([main, shell])) resizeObserver.observe(node);
    for (const node of [main, chat, elements.channel, ...chat.querySelectorAll('.chat-shell, .channel-root__right-column')]) {
      layoutObserver.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  function update() {
    if (!enabled || !portrait.matches || document.fullscreenElement || !isChannel()) {
      if (current) deactivate();
      return;
    }
    const elements = discover();
    if (!elements) {
      if (current) deactivate();
      return;
    }
    if (!current || Object.keys(elements).some(key => elements[key] !== current[key])) attach(elements);
    const mainRect = elements.main.getBoundingClientRect();
    const shellRect = elements.shell.getBoundingClientRect();
    const left = Math.max(0, mainRect.left);
    const top = Math.max(0, shellRect.top);
    const width = Math.min(innerWidth, shellRect.right) - left;
    const height = Math.min(innerHeight, shellRect.bottom) - top;
    if (width < 240 || height < 400) {
      deactivate();
      return;
    }
    // Full-width 16:9 in normal portrait dimensions. On short windows preserve
    // room for chat, and letterbox the video instead of cropping it.
    const playerHeight = Math.min(width * 9 / 16, height * 0.6, height - 240);
    const chatHeight = height - playerHeight;
    const values = {left, width, top, 'chat-height': chatHeight,
      'player-top': top + chatHeight, 'player-height': playerHeight};
    for (const [name, value] of Object.entries(values)) {
      const px = value.toFixed(3) + 'px';
      if (root.style.getPropertyValue('--vt-' + name) !== px) root.style.setProperty('--vt-' + name, px);
    }
    root.classList.add(ACTIVE);
  }

  function registerMenu() {
    if (menuId !== undefined) GM_unregisterMenuCommand(menuId);
    menuId = GM_registerMenuCommand(
      (enabled ? 'Désactiver' : 'Activer') + ' le chat en haut (portrait)',
      () => {
        enabled = !enabled;
        GM_setValue('enabled', enabled);
        registerMenu();
        update();
      },
    );
  }

  const domObserver = new MutationObserver(records => {
    if (current && Object.values(current).some(node => !node.isConnected)) {
      schedule();
      return;
    }
    if (records.some(record => {
      const target = record.target;
      if (record.type === 'attributes') {
        return target instanceof Element && target.matches(
          '.channel-root, .chat-shell, .right-column, .channel-root__right-column, #live-page-chat',
        );
      }
      // No full-page query for each message, emote animation or player control.
      return target instanceof Element && !target.closest('.chat-room, .video-player, style');
    })) schedule();
  });
  domObserver.observe(document.body, { childList: true, subtree: true,
    attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  portrait.addEventListener('change', schedule);
  window.addEventListener('resize', schedule, {passive: true});
  window.addEventListener('popstate', schedule);
  document.addEventListener('fullscreenchange', update);
  window.addEventListener('pageshow', schedule);
  // An isolated content script cannot reliably hook Twitch's history object.
  // This cheap URL-only check also covers pushState without a DOM mutation.
  window.setInterval(() => {
    if (lastPath !== location.pathname) {
      lastPath = location.pathname;
      schedule();
    }
  }, 1000);
  registerMenu();
  update();
})();
