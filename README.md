# Vertical Twitch

Un userscript pour **Violentmonkey** qui place **le chat en haut et le lecteur en bas** sur les chaînes Twitch en direct, lorsque la fenêtre est en portrait.

**[Installer le userscript](https://raw.githubusercontent.com/Maxezify/Vertical-Twitch/main/vertical-twitch.user.js)**

## Installation

1. Installer [Violentmonkey](https://violentmonkey.github.io/get-it/) dans le navigateur.
2. Cliquer sur **Installer le userscript** ci-dessus, puis confirmer l'installation dans Violentmonkey.
3. Recharger Twitch et ouvrir une chaîne en direct avec son chat visible.
4. Utiliser une fenêtre plus haute que large. Le changement de disposition est automatique, en affichage normal comme en mode Studio.

Si le lien affiche simplement le code, ouvrir Violentmonkey → **Créer un nouveau script**, remplacer tout le contenu par celui de [`vertical-twitch.user.js`](vertical-twitch.user.js), puis enregistrer.

## Disposition

```text
┌─────────── Navigation Twitch ───────────┐
│ Chaînes │                              │
│         │         CHAT DU STREAM       │
│         │                              │
│         │  Zone de saisie du message   │
│         ├──────────────────────────────┤
│         │                              │
│         │       LECTEUR VIDÉO          │
│         │         format 16:9          │
└─────────┴──────────────────────────────┘
```

- Le lecteur occupe la largeur disponible à droite de la barre des chaînes. Le chat prend toute la hauteur restante au-dessus, avec son en-tête et sa zone de saisie.
- La vidéo conserve ses proportions. Dans une fenêtre portrait courte, la hauteur du lecteur est plafonnée à 60 % de l'espace disponible, en réservant au moins 240 px au chat ; la vidéo est alors contenue sans recadrage.
- La navigation, la barre des chaînes et les bannières situées en dehors du contenu restent accessibles.
- Les informations et panneaux sous la vidéo sont masqués pendant cette disposition. Pour y accéder, désactiver le script via son menu ou repasser la fenêtre en paysage.
- Le menu Violentmonkey propose **Désactiver / Activer le chat en haut (portrait)**, avec mémorisation du choix.
- Le plein écran natif, les pages de navigation, les VOD, les pages « À propos », le chat détaché et les chaînes hors ligne conservent la disposition Twitch. Masquer le chat désactive aussi temporairement la disposition portrait.

Le critère portrait porte sur **la fenêtre du navigateur**, pas sur l'orientation matérielle du moniteur. Une fenêtre plus haute que large active le script même sur un écran horizontal. Une zone de contenu inférieure à 240 px de large ou 400 px de haut garde l'affichage natif.

## Fonctionnement et confidentialité

Le script ajoute une feuille de style et marque les conteneurs existants. Il **ne déplace ni ne recrée** le lecteur, la vidéo ou le chat. Les gestionnaires d'événements, la connexion au chat et le brouillon restent attachés aux mêmes éléments. La désactivation retire les attributs et variables du script, sans restaurer d'anciens styles par-dessus des mises à jour de Twitch.

Il suit les changements de taille et de structure avec `ResizeObserver` et `MutationObserver`. Les mutations à l'intérieur des messages et des commandes vidéo sont filtrées ; les recalculs sont regroupés. Une vérification du chemin de l'URL chaque seconde couvre aussi la navigation interne sans mutation de page, sans intercepter les fonctions de Twitch.

Aucune dépendance externe, aucun appel réseau émis par le script, aucune lecture des messages ou des identifiants du compte. Les permissions Violentmonkey servent uniquement à ajouter du CSS, proposer un menu et mémoriser son état. Le gestionnaire peut vérifier les mises à jour sur GitHub via `@downloadURL`. Voir les références officielles sur les [métadonnées](https://violentmonkey.github.io/api/metadata-block/) et les [API GM](https://violentmonkey.github.io/api/gm/).

## Validation

Les conteneurs et états de Twitch ont été inspectés sur une chaîne en direct le **13 septembre 2026**, en affichage normal et Studio, avec chat ouvert et masqué. Le dépôt contient un banc de tests local reproduisant cette structure et ses contraintes CSS, sans charger de messages, médias ou code de Twitch.

Le détail des vérifications et leurs limites est dans [TESTING.md](TESTING.md). Ces tests utilisent des substituts des API GM : ils ne remplacent pas une validation de l'extension installée sur le compte de l'utilisateur. Les variantes de Twitch et les extensions qui modifient aussi la disposition, notamment 7TV, BTTV et FrankerFaceZ, peuvent nécessiter des ajustements. Aucun problème de coexistence n'est présumé, mais cette combinaison n'a pas été testée.

Twitch peut modifier ses sélecteurs. Si les conteneurs nécessaires ne sont plus reconnus, le script laisse la disposition native. Pour signaler un problème, indiquer le navigateur, les extensions de disposition actives, les dimensions de la fenêtre et joindre une capture dans les [issues](https://github.com/Maxezify/Vertical-Twitch/issues).

## Développement

Node.js 20 ou plus récent ; aucun paquet à installer.

```sh
npm run check
npm run test:browser
```

Ouvrir ensuite [le banc de tests](http://127.0.0.1:8765/test_channel) dans une fenêtre portrait, cliquer sur **Lancer les tests portrait**, puis vérifier séparément le paysage et le plein écran avec les boutons correspondants. Le serveur écoute seulement sur `127.0.0.1:8765`. Arrêt : `Ctrl+C`.

Le seul fichier nécessaire à l'installation est `vertical-twitch.user.js`.
