# Projet de jQuery

## Résumé
Jeu multi-joueur réalisé par Nicolas GUERROUDJ, étudiant en deuxième année d'informatique à l'IUT d'Aix en provence, dans le cadre d'un projet scolaire encadré par **M. Olivier Pons**.

## Technologies utilisées
* Node JS (express)
* Socket IO (js)
* Semantic UI (css & js)
* jQuery
 
## Informations complémentaires
Les pages sont chargées dynamiquement par des requêtes du côté client vers le serveur (avec Socket IO). Le serveur indique ainsi la page que le JavaScript devra inclure (cf. fonction includeHTML) ainsi que le script a chargé (grâce à $.getScript(...)).

Chaque page est représenté par un objet qui hérite de la classe mère PageContent (cf. script principal). Ainsi chaque page, une fois chargé, initialise les différents objets dont elle a besoin (cf. méthode init) et les supprime ses mêmes liens, lors d'un changement de page (cf. méthode reset). Pour visualiser les scripts se charger, il est conseillé d'utiliser la page "réseau" de votre navigateur.

Les différentes pages html sont stocké dans le répertoire '*/public/page*'. Les scripts associés dans le répertoire '*/public/js*'

Le script principal est contenu dans le fichier '*/public/js/common.js*'

Pour essayer **seul** le jeu, il est recommandé de se connecter avec deux compte (un sur un navigateur classique et l'autre via un autre navigateur ou en navigation).
Vous pouvez vous créer un compte pour essayer l'inscription. Il n'y a pas de vérification côté serveur de l'email entré. De plus le mot de passe est sauvegardé en MD5.

Toutefois, si vous ne préferez pas vous inscrire. Retrouvez ci-dessous des comptes et leurs mots de passe.

## Comptes d'essais
Le format utilisé est **[identifiant]:[mot de passe]** :
* test:testtest
* pons:ponspons

