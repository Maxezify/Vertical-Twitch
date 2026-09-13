'use strict';

// Targeted delayed-mount/occlusion cases. This models the public 7TV DOM and
// scroll CSS, not its complete extension or its network/React implementation.
const regressionButton = document.createElement('button');
regressionButton.textContent = 'Tester les chargements différés / 7TV';
$('#test-panel').prepend(regressionButton);

function playerIsExposed() {
  const box = originalPlayer.getBoundingClientRect();
  // Rectangles alone do not prove visibility: the original tests missed this.
  return [0.15, 0.5, 0.85].every(fraction => {
    const hit = document.elementFromPoint(box.left + box.width * 0.8, box.top + box.height * fraction);
    return hit && originalPlayer.contains(hit);
  });
}

regressionButton.onclick = async () => {
  results.length = 0;
  check(active(), 'Portrait actif avant chargement différé');
  check(playerIsExposed(), 'Lecteur effectivement visible, pas seulement bien dimensionné');
  const toggle = rect('#collapse');
  const chatBounds = rect('.right-column');
  check(toggle.left >= chatBounds.left && toggle.right <= chatBounds.right
    && toggle.top >= chatBounds.top && toggle.bottom <= chatBounds.bottom,
  'Bouton de masquage du chat conservé dans la zone visible');
  await pause(2500);

  // 7TV's ChatController mounts a custom element with a 100%-height scroller.
  // Keep the original chat input and native message region for restoration.
  const nativeMessages = $('.chat-scrollable-area');
  const replacement = document.createElement('seventv-container');
  replacement.id = 'seventv-chat-controller';
  replacement.className = 'seventv-chat-list';
  replacement.innerHTML = '<div class="seventv-chat-scroller scrollable-container"><div class="scrollable-contents"><div class="seventv-message-container"></div></div></div>';
  const extensionStyle = document.createElement('style');
  extensionStyle.textContent = `
    seventv-container.seventv-chat-list { display:flex; flex-direction:column!important; flex-grow:1!important; overflow:auto!important; overflow-x:hidden!important; }
    .seventv-chat-scroller { z-index:1; height:100%; }
    .scrollable-container { overflow:hidden; position:relative; }
    .scrollable-container .scrollable-contents { height:100%; width:100%; overflow-y:scroll; }
    .seventv-message-container p { padding:12px; border-bottom:1px solid #555; }
  `;
  document.head.append(extensionStyle);
  for (let i = 0; i < 150; i++) {
    const line = document.createElement('p');
    line.textContent = 'Message de test 7TV ' + i;
    replacement.querySelector('.seventv-message-container').append(line);
  }
  nativeMessages.replaceWith(replacement);
  await pause(1200);
  check(playerIsExposed(), 'Lecteur visible après montage différé du chat 7TV simulé');
  const scroller = replacement.querySelector('.scrollable-contents');
  check(scroller.clientHeight > 100 && scroller.scrollHeight > scroller.clientHeight
    && rect('textarea').bottom <= rect('.right-column').bottom + 1,
  '7TV simulé : messages défilables et saisie dans la colonne');
  scroller.scrollTop = 400;
  await pause();
  check(scroller.scrollTop > 0 && playerIsExposed(), 'Le défilement 7TV ne recouvre pas le lecteur');

  // A fixed host is not enough if an extension inserts a new transformed
  // ancestor while keeping the same stream-chat element alive.
  const chatWrapper = document.createElement('div');
  chatWrapper.style.cssText = 'width:340px;height:100vh;transform:translateX(-340px)';
  originalChat.before(chatWrapper);
  chatWrapper.append(originalChat);
  await pause();
  check(near(rect('.stream-chat').width, rect('.right-column').width)
    && near(rect('.stream-chat').height, rect('.right-column').height)
    && playerIsExposed(), 'Nouvelle enveloppe du même chat : contraintes réappliquées');
  chatWrapper.before(originalChat);
  chatWrapper.remove();
  await pause();

  const playerWrapper = document.createElement('div');
  playerWrapper.style.cssText = 'position:relative;transform:translateZ(0);height:1px;overflow:hidden';
  originalPlayer.before(playerWrapper);
  playerWrapper.append(originalPlayer);
  await pause();
  check(playerIsExposed(), 'Nouvel ancêtre transformé : le lecteur reste visible');
  playerWrapper.before(originalPlayer);
  playerWrapper.remove();
  await pause();

  // Late native visibility and size writes must not collapse the active host.
  const before = originalPlayer.getAttribute('style');
  originalPlayer.style.cssText = 'display:none;opacity:0;visibility:hidden;height:0;width:0';
  await pause();
  check(playerIsExposed(), 'Écriture tardive des styles du lecteur : visibilité conservée');
  menuCommand();
  await pause();
  check(getComputedStyle(originalPlayer).display === 'none', 'Désactivation : dernières valeurs natives restituées');
  originalPlayer.setAttribute('style', before);
  replacement.replaceWith(nativeMessages);
  extensionStyle.remove();
  menuCommand();
  await pause();
  check(playerIsExposed(), 'Retour au chat natif après le test');
  $('#results').textContent += '\nTerminé.';
};
