# Vérifications — versions 1.0.1 et 1.0.0

Date : 13 septembre 2026.

## Correctif 1.0.1 : disparition après chargement

Signalement : le lecteur apparaît en bas au démarrage puis disparaît ; environnement indiqué par l'utilisateur : **Helium avec 7TV**.

L'inspection du code de la 1.0.0 a montré trois lacunes vérifiables :

- La comparaison des éléments ignorait leurs parents. Insérer une enveloppe en conservant le même lecteur/chat ne déclenchait donc pas le marquage du nouvel ancêtre. Une transformation sur celui-ci peut capturer et découper le lecteur en position fixe.
- Les règles du lecteur ne protégeaient pas `display` et `opacity` contre une écriture tardive de styles.
- Les tests vérifiaient des rectangles sans vérifier quel élément était réellement dessiné devant le lecteur.

Le correctif suit aussi les relations parent/enfant, protège la visibilité du lecteur et borne le débordement du chat. La racine entière de la chaîne n'est plus rendue invisible ; seuls les blocs d'information identifiés sont masqués. Le bouton de masquage du chat reste dans la zone visible.

`tests/regression.js` teste le montage après délai d'un chat avec la structure et les règles de défilement publiques de 7TV, puis les modifications tardives des enveloppes et styles. Les points de contrôle utilisent `document.elementFromPoint` pour vérifier que le lecteur est réellement exposé à plusieurs hauteurs.

**Comparaison exécutée sur la même fixture :** la 1.0.0 échoue sur l'ajout d'une enveloppe du chat, l'ajout d'un ancêtre transformé du lecteur et l'écriture tardive de `display:none; opacity:0`. Ces trois cas passent avec la 1.0.1. Le montage simple du chat 7TV simulé passait déjà en 1.0.0 : ce test ne démontre donc pas à lui seul la cause exacte du signalement dans Helium.

Sources inspectées, révision `9225dc089759510ae100496a7adeb6db92bf8117` : [ChatController.vue](https://github.com/SevenTV/Extension/blob/9225dc089759510ae100496a7adeb6db92bf8117/src/site/twitch.tv/modules/chat/ChatController.vue), [UiScrollable.vue](https://github.com/SevenTV/Extension/blob/9225dc089759510ae100496a7adeb6db92bf8117/src/ui/UiScrollable.vue). Le scénario ajoute seulement une structure de test minimale ; il ne charge pas l'extension complète.

Pour reproduire : lancer le serveur, ouvrir la fixture en portrait et cliquer sur **Tester les chargements différés / 7TV**. La version 1.0.1 réussit les **11 assertions** de cette suite en 1080 × 1808, ainsi que les **24 assertions** de la suite portrait existante. L'entrée/sortie du plein écran est vérifiée séparément.

**Limite :** le navigateur Helium de l'utilisateur n'est pas accessible par l'outil de navigation de cette session. La combinaison installée Helium + Violentmonkey + 7TV et le symptôme exact sur son compte restent à vérifier après mise à jour. Le correctif ne prétend pas qu'une causalité propre à 7TV a été confirmée.

## Historique de validation 1.0.0

## Structure Twitch inspectée

Inspection dans un navigateur d'une chaîne en direct (`www.twitch.tv/gom4rt`), en affichage normal, en mode Studio et avec le chat masqué :

- Lecteur : `.persistent-player` sous `main.twilight-main`, avec dimensions et transformations écrites par Twitch dans l'attribut `style`.
- Colonne chat : `[data-a-target="right-column-chat-bar"]`, avec plusieurs conteneurs intermédiaires, `#live-page-chat`, `.channel-root__right-column`, `.chat-shell`, `.stream-chat` et `.chat-room`.
- En affichage normal, certaines enveloppes du chat ont une largeur nulle et le contenu utilise une translation de -340 px. En mode Studio, le lecteur et la colonne utilisent des positions fixes.
- Le chat masqué expose `.right-column--collapsed` et `aria-hidden="true"` sur `#live-page-chat`.
- L'espace de contenu est mesuré pour conserver la barre supérieure, la navigation des chaînes et l'éventuelle bannière inférieure.

Les sélecteurs utilisés sont des noms fonctionnels, identifiants et attributs de Twitch, sans dépendance aux noms de classes générés par styled-components.

## Tests exécutés

`npm run check` : syntaxe JavaScript du userscript, du banc de tests et du serveur validée avec Node.js 26.7.0.

Le banc local a été exécuté dans le navigateur Chromium intégré : **24 assertions réussies à 1080 × 1808 et 24 à 900 × 1000**, sans échec sur la version finale.

| Domaine | Vérifications réussies |
| --- | --- |
| Géométrie | Chat au-dessus, lecteur en bas, même largeur, limites alignées, zone de saisie visible, aucun chevauchement ni débordement de page |
| Proportions | 16:9 ou hauteur limitée, vidéo contenue dans son lecteur |
| Interactions | Gestionnaires du lecteur et des émoticônes conservés ; chat défilable sans déplacer le lecteur |
| Réversibilité | Désactivation et réactivation, suppression des attributs et variables propres au script, styles en ligne natifs intacts |
| Identité | Mêmes nœuds vidéo et chat, mêmes parents, brouillon conservé |
| Autres dispositions | Mode Studio, barre des chaînes élargie à 240 px, bannière inférieure de 57 px |
| Chat | Masquage/réouverture ; retrait, ajout tardif et remplacement du conteneur ; nettoyage du nœud détaché |
| Navigation | `pushState` sans mutation vers Parcourir puis retour ; exclusion d'À propos, des VOD et du chat détaché |
| Direct | Désactivation lors du retrait de la classe « live », réactivation après son retour |

Contrôles supplémentaires réussis :

- Entrée et sortie du plein écran **réel via l'API Fullscreen**, avec restitution de la disposition portrait ensuite (2 assertions).
- Passage à **1280 × 720** : retour à la disposition native, styles initiaux conservés (1 assertion).
- Passage à **450 × 500** : chat de 240 px, lecteur de 210 px, saisie entièrement visible, `object-fit: contain`.
- Passage à **300 × 420** : désactivation automatique, aucun attribut de disposition restant.
- Inspection visuelle d'une capture du banc de tests à 1080 × 1808.

## Portée et limites

Le banc de tests reproduit la structure et les contraintes de positionnement observées ; ses API `GM_*` sont des substituts. Aucun média réel n'est lu dans la simulation. La conservation de la vidéo porte sur l'identité du nœud et ses événements, et ne constitue pas une mesure de continuité réseau/audio.

Le userscript **n'a pas été installé et exécuté dans Violentmonkey sur le compte de l'utilisateur**. Firefox, les tests A/B de Twitch, les emotes 7TV/BTTV/FrankerFaceZ et leurs menus réels ne sont pas validés par ce banc. Le code et les tests ne prétendent pas couvrir toutes les variantes futures du site.

## Reproduire les tests

1. Avec Node.js 20 ou plus récent, lancer `npm run check`, puis `npm run test:browser`.
2. Ouvrir `http://127.0.0.1:8765/test_channel` et donner à la fenêtre un format portrait.
3. Cliquer sur **Lancer les tests portrait**. Attendre le texte « Terminé » ; chaque ligne doit commencer par `PASS`.
4. Cliquer sur **Vérifier le plein écran**. Il s'ouvre et se ferme automatiquement ; deux lignes `PASS` sont ajoutées.
5. Passer la fenêtre en paysage, puis cliquer sur **Vérifier le mode paysage**.
6. Arrêter le serveur avec `Ctrl+C`.

## Vérification conseillée après installation réelle

Sur une chaîne Twitch en direct : contrôler la disposition dans une fenêtre portrait, la lecture et le son, la saisie d'un brouillon, le défilement du chat, les émoticônes, le mode Studio, le plein écran, la navigation vers une autre chaîne et le retour en paysage. Désactiver puis réactiver le script depuis Violentmonkey pour vérifier le retour aux panneaux de la chaîne. Il n'est pas nécessaire d'envoyer un message pour tester la saisie.
