'use strict';

// GM API substitutes for this fixture only. The distributed script has no test API.
let menuCommand;
window.GM_addStyle = css => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
};
window.GM_getValue = (key, fallback) => fallback;
window.GM_setValue = () => {};
window.GM_registerMenuCommand = (label, callback) => {
  menuCommand = callback;
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = callback;
  document.querySelector('#gm-menu').replaceChildren(button);
  return 1;
};
window.GM_unregisterMenuCommand = () => {};

const $ = selector => document.querySelector(selector);
const pause = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));
const active = () => document.documentElement.classList.contains('vt-portrait');
const rect = selector => $(selector).getBoundingClientRect();
const near = (a, b) => Math.abs(a - b) < 2;
const results = [];
function check(condition, label) {
  results.push({pass: Boolean(condition), label});
  $('#results').textContent = results.map(r => `${r.pass ? 'PASS' : 'FAIL'} ${r.label}`).join('\n');
  document.title = `${results.filter(r => !r.pass).length} échec(s) / ${results.length} tests — Vertical Twitch`;
}
const originalPlayer = $('.persistent-player');
const originalVideo = $('video');
const originalChat = $('.stream-chat');
const originalPlayerParent = originalPlayer.parentElement;
const originalChatParent = originalChat.parentElement;
const originalInline = originalPlayer.getAttribute('style');
let playClicks = 0;
$('#play').onclick = () => { playClicks++; };
$('#emotes').onclick = () => { $('.emote-menu').hidden = !$('.emote-menu').hidden; };
$('#collapse').onclick = () => {
  const collapsed = $('.right-column').classList.toggle('right-column--collapsed');
  $('#live-page-chat').setAttribute('aria-hidden', String(collapsed));
};
function studio(on) {
  document.body.classList.toggle('studio', on);
  $('.right-column').classList.toggle('right-column--theatre', on);
  originalPlayer.setAttribute('style', on
    ? 'top:0;position:fixed;width:calc(100% - 340px);max-height:100vh;z-index:3000;height:100%;transform:scale(1);inset-inline-start:0'
    : originalInline);
}
$('#studio').onclick = () => studio(!document.body.classList.contains('studio'));
$('#fullscreen').onclick = () => originalPlayer.requestFullscreen();
for (let i = 0; i < 100; i++) {
  const p = document.createElement('p');
  p.innerHTML = `<b>Spectateur ${i + 1}</b> : Message de test du chat.`;
  $('.messages').append(p);
}

function geometry(label) {
  const chat = rect('.right-column');
  const player = rect('.persistent-player');
  const content = rect('.layout');
  const room = rect('.chat-room');
  const input = rect('textarea');
  const video = rect('video');
  check(active() && near(chat.top, content.top) && near(chat.bottom, player.top)
    && near(player.bottom, content.bottom) && near(player.left, rect('main').left)
    && near(player.right, content.right) && near(chat.width, player.width)
    && near(video.width, player.width) && near(video.height, player.height)
    && room.bottom <= chat.bottom + 1 && input.bottom <= chat.bottom + 1
    && input.top >= chat.top && input.width > chat.width - 50, label);
}

$('#run').onclick = async () => {
  results.length = 0;
  playClicks = 0;
  check(innerHeight >= innerWidth, 'Fenêtre portrait');
  await pause();
  geometry('Chat en haut, lecteur en bas, saisie visible, aucun chevauchement');
  check(document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
    'Pas de débordement de la page');
  check(near(rect('.persistent-player').height, rect('.persistent-player').width * 9 / 16)
    || rect('.chat-room').height > 150, 'Vidéo 16:9 ou hauteur plafonnée avec espace de chat');
  const input = $('textarea');
  input.value = 'Brouillon conservé';
  input.focus();
  $('#play').click();
  $('#emotes').click();
  check(playClicks === 1 && !$('.emote-menu').hidden, 'Événements du lecteur et menu émoticônes conservés');
  $('#emotes').click();
  check($('.chat-scrollable-area').scrollHeight > $('.chat-scrollable-area').clientHeight, 'Chat défilable indépendamment');
  $('.chat-scrollable-area').scrollTop = 500;
  await pause();
  check(near(rect('.persistent-player').bottom, rect('.layout').bottom), 'Le défilement du chat ne déplace pas le lecteur');
  menuCommand();
  await pause();
  check(!active() && !$('[data-vt-player]') && !$('[data-vt-fill]')
    && !document.documentElement.style.getPropertyValue('--vt-width')
    && originalPlayer.getAttribute('style') === originalInline, 'Désactivation : attributs retirés, styles natifs intacts');
  menuCommand();
  await pause();
  check($('video') === originalVideo && $('.stream-chat') === originalChat
    && originalPlayer.parentElement === originalPlayerParent && originalChat.parentElement === originalChatParent
    && input.value === 'Brouillon conservé', 'Réactivation sans recréer ou déplacer la vidéo, le chat ou le brouillon');
  studio(true);
  await pause();
  geometry('Mode Studio : positions et hauteurs correctes');
  studio(false);
  $('.side-wrapper').style.width = '240px';
  await pause();
  geometry('Barre latérale élargie : dimensions recalculées');
  $('.side-wrapper').style.width = '50px';
  $('.signup').hidden = false;
  await pause();
  geometry('Bannière Twitch : aucun recouvrement');
  $('.signup').hidden = true;
  $('#collapse').click();
  await pause();
  check(!active(), 'Masquer le chat restitue la disposition native');
  $('#collapse').click();
  await pause();
  geometry('Réouvrir le chat réactive la disposition portrait');
  history.pushState({}, '', '/directory');
  await pause(1250);
  check(!active(), 'Navigation SPA sans mutation : désactivation sur Parcourir');
  history.pushState({}, '', '/test_channel');
  await pause(1250);
  geometry('Retour SPA sur une chaîne : réactivation');
  for (const path of ['/test_channel/about', '/videos/123', '/popout/test_channel/chat']) {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
    await pause();
    check(!active(), `Page exclue : ${path}`);
  }
  history.pushState({}, '', '/test_channel');
  dispatchEvent(new PopStateEvent('popstate'));
  await pause();
  const channel = $('.channel-root');
  channel.classList.remove('channel-root--live');
  await pause();
  check(!active(), 'Chaîne hors ligne : disposition native');
  channel.classList.add('channel-root--live');
  await pause();
  const room = $('.chat-room');
  const roomParent = room.parentElement;
  room.remove();
  await pause();
  check(!active(), 'Chat retiré pendant une navigation : retour natif');
  roomParent.append(room);
  await pause();
  geometry('Chat ajouté tardivement : activation');
  const newChat = originalChat.cloneNode(true);
  originalChat.replaceWith(newChat);
  await pause();
  geometry('Remplacement React du conteneur chat : nouveaux éléments détectés');
  newChat.replaceWith(originalChat);
  await pause();
  check(!newChat.hasAttribute('data-vt-fill'), 'Ancien conteneur détaché nettoyé');
  $('#results').textContent += '\nTerminé. Tester aussi le paysage et le plein écran avec les boutons.';
};
$('#landscape').onclick = () => {
  check(innerWidth > innerHeight && !active() && originalPlayer.getAttribute('style') === originalInline,
    'Paysage : disposition native et styles restaurés');
};
$('#check-fullscreen').onclick = async () => {
  await originalPlayer.requestFullscreen();
  await pause();
  check(!active() && near(rect('.persistent-player').width, innerWidth)
    && near(rect('.persistent-player').height, innerHeight), 'Plein écran natif sans contrainte portrait');
  await document.exitFullscreen();
  await pause();
  geometry('Sortie du plein écran : retour chat en haut');
};
