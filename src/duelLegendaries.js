export const LEGENDARY_EFFECTS = Object.freeze({
  '1-1-001': {
    id: 'tavern-sanctuary',
    name: 'Refuge chaleureux',
    description: 'Au déploiement, ton noyau gagne 4 vie maximale et récupère 4 vies.',
  },
  '1-1-002': {
    id: 'last-round',
    name: 'Dernière tournée',
    description: 'Au déploiement, soigne de 5 l’allié le plus blessé et pioche une carte.',
  },
  '1-2-001': {
    id: 'death-rocket',
    name: 'Super Mega Roquette',
    description: 'Au déploiement, inflige 3 au noyau ennemi et 1 à toutes ses unités.',
  },
  '1-2-002': {
    id: 'piltover-punch',
    name: 'Gantelets de Piltover',
    description: 'Au déploiement, inflige 4 à l’unité opposée et gagne +2 vie.',
  },
  '1-4-008': {
    id: 'relentless-slasher',
    name: 'Trancheur sans répit',
    description: 'Après chaque élimination, gagne +1 attaque et inflige 2 au noyau ennemi.',
  },
  '1-4-021': {
    id: 'seraphine-anthem',
    name: 'Hymne libérateur',
    description: 'Au déploiement, les autres alliés gagnent +1 attaque et récupèrent 2 vies.',
  },
  '1-5-005': {
    id: 'gm-favor',
    name: 'Faveur du MJ',
    description: 'La première fois qu’il devrait être détruit, revient avec toute sa vie.',
  },
  '1-6-001': {
    id: 'aria-chaos',
    name: 'Folie imprévisible',
    description: 'Au déploiement, gagne au hasard +4 attaque, +5 vie ou inflige 3 au noyau ennemi.',
  },
  '1-7-025': {
    id: 'south-princess',
    name: 'Princ’hess du Sud',
    description: 'Au déploiement, les alliés adjacents gagnent +2 attaque et +2 vie.',
  },
  '2-8-001': {
    id: 'final-spark',
    name: 'Final Spark',
    description: 'Avant son premier combat, inflige 2 à sa cible et aux unités adjacentes.',
  },
  '2-8-002': {
    id: 'charm',
    name: 'Charme',
    description: 'Au déploiement, vole jusqu’à 2 attaque à l’unité ennemie opposée.',
  },
  '2-8-003': {
    id: 'thorn-garden',
    name: 'Jardin de ronces',
    description: 'Avant chaque assaut ennemi, blesse de 1 les assaillants face à Zyra et ses voisines.',
  },
  '2-9-001': {
    id: 'command-shot',
    name: 'Tir de commandement',
    description: 'Au déploiement, inflige 4 à l’ennemi ayant le plus d’attaque.',
  },
  '2-9-002': {
    id: 'glorious-evolution',
    name: 'Glorieuse évolution',
    description: 'Au déploiement, l’allié le plus faible gagne +3 attaque, +3 vie et Arcaniste.',
  },
  '2-9-003': {
    id: 'trauma-engine',
    name: 'Traumatisme moteur',
    description: 'La première fois qu’il tombe à mi-vie, récupère 3 vies et gagne +3 attaque.',
  },
  '2-10-001': {
    id: 'bordeaux-session',
    name: 'JDR Bordeaux WHEN ?',
    description: 'Au déploiement, pioche 2 cartes et gagne 2 énergie ; l’adversaire pioche 1 carte.',
  },
  '2-11-001': {
    id: 'knife-joke',
    name: 'Blague poignardante',
    description: 'Au déploiement, inflige 2 à l’unité opposée ; si elle tombe, pioche une carte.',
  },
  '2-12-001': {
    id: 'bought-alliance',
    name: 'Alliance irrésistible',
    description: 'Au déploiement, vole l’unité ennemie la plus faible s’il reste une place alliée.',
  },
  '2-12-002': {
    id: 'roman-roads',
    name: 'Tous les chemins',
    description: 'Tant que Trajan est en jeu, gagne +1 énergie au début de chacun de tes tours.',
  },
  '2-13-001': {
    id: 'anthony-trap',
    name: 'Je sais que c’est toi !',
    description: 'Au déploiement, l’ennemi le plus puissant rate son prochain assaut.',
  },
  '2-3-001': {
    id: 'void-absorption',
    name: 'Absorption du Néant',
    description: 'Au déploiement, retire 1 vie maximale à chaque ennemi et gagne +1/+1 par cible.',
  },
  '2-3-002': {
    id: 'lotus-dream',
    name: 'Rêve de Lotus',
    description: 'Tant que Lotus est en jeu, sauve une fois le premier autre allié qui devrait mourir.',
  },
  '2-1-014': {
    id: 'summer-cocktail',
    name: 'Cocktail glacé',
    description: 'Au déploiement, réinitialise ta Surcharge ; si elle était prête, gagne plutôt 2 énergie.',
  },
  '3-15-001': {
    id: 'stormbreaker',
    name: 'Stormbreaker',
    description: 'Au déploiement, inflige 3 à l’unité opposée et 1 aux unités adjacentes.',
  },
  '3-15-002': {
    id: 'avengers-assemble',
    name: 'Avengers, rassemblement !',
    description: 'Au déploiement, les alliés adjacents gagnent +1 attaque et +2 vie.',
  },
  '3-15-003': {
    id: 'endgame-sacrifice',
    name: 'Je suis Iron Man',
    description: 'À sa destruction, inflige 4 au noyau ennemi.',
  },
  '3-15-004': {
    id: 'time-stone',
    name: 'Pierre du Temps',
    description: 'Au déploiement, pioche une carte et récupère 2 énergie.',
  },
  '3-15-005': {
    id: 'the-snap',
    name: 'Le Snap',
    description: 'Au déploiement, inflige 2 à toutes les unités ennemies mais perd 3 vies.',
  },
  '3-16-001': {
    id: 'raleigh-drift',
    name: 'Dérive synchronisée',
    description: 'Au déploiement, Raleigh et un allié adjacent gagnent +2 attaque et +2 vie.',
  },
  '3-16-002': {
    id: 'mako-copilot',
    name: 'Copilote parfaite',
    description: 'Au déploiement, Mako et un allié adjacent gagnent +1 attaque et +3 vie.',
  },
  '3-17-001': {
    id: 'king-in-the-north',
    name: 'Roi du Nord',
    description: 'La première fois qu’il meurt, revient avec 3 vies et donne +1 attaque aux autres alliés.',
  },
  '3-17-002': {
    id: 'faceless-assassin',
    name: 'Sans-Visage',
    description: 'Au déploiement, copie l’attaque de l’ennemi le plus puissant.',
  },
  '3-17-003': {
    id: 'wildfire',
    name: 'Feu grégeois',
    description: 'Avant le premier assaut ennemi, inflige 1 à toutes ses unités.',
  },
  '3-18-001': {
    id: 'return-of-the-king',
    name: 'Retour du Roi',
    description: 'Au déploiement, les autres alliés gagnent +1/+1 et le noyau récupère 2 vies.',
  },
  '3-18-002': {
    id: 'carry-the-burden',
    name: 'Je peux vous porter',
    description: 'Au déploiement, l’allié le plus puissant gagne +2 attaque et +4 vie.',
  },
  '3-19-001': {
    id: 'freedom-leader',
    name: 'Liberté pour tous',
    description: 'Au déploiement, les autres alliés gagnent +1 attaque et Optimus gagne +1 vie par allié.',
  },
  '3-19-002': {
    id: 'radio-scout',
    name: 'Éclaireur radio',
    description: 'Au déploiement, pioche une carte et retire 1 attaque à l’ennemi le plus puissant.',
  },
  '3-21-001': {
    id: 'worlds-best-boss',
    name: 'World’s Best Boss',
    description: 'Au déploiement, chaque autre allié gagne aléatoirement +2 attaque ou +2 vie.',
  },
  '3-22-001': {
    id: 'still-alive',
    name: 'Toujours debout',
    description: 'La première fois qu’elle meurt, revient avec toute sa vie mais perd 2 attaque.',
  },
  '3-22-002': {
    id: 'beautiful-day',
    name: 'A Beautiful Day to Save Lives',
    description: 'Au déploiement, soigne toutes les unités alliées de 3 et le noyau de 2.',
  },
  '3-23-001': {
    id: 'dream-project',
    name: 'Le projet de sa vie',
    description: 'Au déploiement, pioche 2 cartes et gagne +2 attaque et +2 vie.',
  },
});

export function getLegendaryEffect(sourceId) {
  return LEGENDARY_EFFECTS[sourceId] ?? null;
}
