import { CardTypes, CardRarity } from '../../../config/constants.js';

const season1Cards = [
    {
        "collection_id": 1,
        "collection_name": "Taverne",
        "collection_description": "Collection de la saison 1",
        "collection_image": "collection1.png",
        "season_id": 1,
        "cards": [
            ["La Taverne", "La taverne", "taverne.png", CardTypes.Location, CardRarity.Legendary],
            ["La Tavernière", "La tavernière", "taverniere.png", CardTypes.Character, CardRarity.Legendary],
            ["Phacochère", "Le phacochère emblématique de la taverne", "phacochere.png", CardTypes.Character, CardRarity.Rare],
            ["Comptoir", "Le comptoir de la taverne", "comptoir.png", CardTypes.Location, CardRarity.Rare],
            ["Elfe", "Une elfe", "elfe.png", CardTypes.Classic, CardRarity.Rare],
            ["Dragon", "Un dragon", "dragon.png", CardTypes.Classic, CardRarity.Epic],
            ["Serveur", "Le serveur de la taverne", "serveur.png", CardTypes.Classic, CardRarity.Common],
            ["Bière", "Une bière", "biere.png", CardTypes.Classic, CardRarity.Common],
            ["Humain", "Un humain", "humain.png", CardTypes.Classic, CardRarity.Common],
            ["Gobelin", "Un gobelin", "gobelin.png", CardTypes.Classic, CardRarity.Common],
        ]
    },
    {
        "collection_id": 2,
        "collection_name": "Arcane",
        "collection_description": "Collection sur la série Arcane",
        "collection_image": "collection4.png",
        "season_id": 1,
        "cards": [
            ["Jinx", "Jinx", "jinx.png", CardTypes.Character, CardRarity.Legendary],
            ["Vi", "Vi", "vi.png", CardTypes.Character, CardRarity.Legendary],

            ["Caitlyn", "Caitlyn", "caitlyn.png", CardTypes.Character, CardRarity.Epic],
            ["Jayce", "Jayce", "jayce.png", CardTypes.Character, CardRarity.Epic],
            ["Silco", "Silco", "silco.png", CardTypes.Character, CardRarity.Epic],
            ["Ekko", "Ekko", "ekko.png", CardTypes.Character, CardRarity.Epic],

            ["Viktor", "Viktor", "viktor.png", CardTypes.Classic, CardRarity.Rare],
            ["Heimerdinger", "Heimerdinger", "heimerdinger.png", CardTypes.Classic, CardRarity.Rare],
            ["Sevika", "Sevika", "sevika.png", CardTypes.Classic, CardRarity.Rare],
            ["Powder", "Powder", "powder.png", CardTypes.Classic, CardRarity.Rare],
            ["Vander", "Vander", "vander.png", CardTypes.Classic, CardRarity.Rare],
            ["Mel", "Mel", "mel.png", CardTypes.Classic, CardRarity.Rare],

            ["Claggor", "Claggor", "claggor.png", CardTypes.Classic, CardRarity.Common],
            ["Marcus", "Marcus", "marcus.png", CardTypes.Classic, CardRarity.Common],
            ["Grayson", "Grayson", "grayson.png", CardTypes.Classic, CardRarity.Common],
            ["Singed", "Singed", "singed.png", CardTypes.Classic, CardRarity.Common],
            ["Ambessa", "Ambessa", "ambessa.png", CardTypes.Classic, CardRarity.Common],
            ["Piltover", "Piltover", "piltover.png", CardTypes.Location, CardRarity.Common],
            ["Zaun", "Zaun", "zaun.png", CardTypes.Location, CardRarity.Common],
            ["Mylo", "Mylo", "mylo.png", CardTypes.Classic, CardRarity.Common],
        ]
    },
    {
        "collection_id": 4,
        "collection_name": "PATHFINDER",
        "collection_description": "Collection des JDR se déroulant dans l'univers de Pathfinder",
        "collection_image": "collection4.png",
        "season_id": 1,
        "cards": [
            ["Sarendyl", "Partir d'un passé honteux pour construire un avenir radieux ! Finalement, il est passé de guerrier à tavernier...", "sarendyl.png", CardTypes.Classic, CardRarity.Rare],
            ["Rias", "Le personnage n'est pas un simple glissé-déposé, on vous le jure. La preuve : elle est aveugle maintenant.", "rias.png", CardTypes.Classic, CardRarity.Common],
            ["Issei Yan", "Ce type adore les dragons et les navires et brûler des fôret... Ah non, ça c'est Florentin, désolé !", "issei_yan.png", CardTypes.Classic, CardRarity.Rare],
            ["Mokthar", "On t'aimait, Mokthar. Même si tu as été dévoré par une MONTURE, tu resteras dans nos cœurs.", "mokthar.png", CardTypes.Character, CardRarity.Epic],
            ["Tetia", "Perso random, personne ne s'en souvient, car elle est probablement restée 3 ou 4 séances grand max.", "tetia.png", CardTypes.Classic, CardRarity.Common],
            ["Kenzo", "Perso random de Florentin. Comme la plupart de ses persos, il est mort. Dommage..", "kenzo.png", CardTypes.Classic, CardRarity.Common],
            ["Sistra", "Elle a survécu à une chute de 80 m. Malheureusement, on ne peut pas toujours avoir de la chance et c'est donc la seule personne à être morte à cause du décor, et plus précisément d'escaliers..", "sistra.png", CardTypes.Classic, CardRarity.Epic],
            ["Dàin", "Un jour Dàin sera le meilleur Trancheur. Il tranchera sans répit. Il fera tout pour être le dieu des Trancheurs !", "dain.png", CardTypes.Character, CardRarity.Legendary],
            ["Dark Dàin", "Ennemis un jour, puis finalement alliés pour toujours. Ce mec était juste trop fort, mais genre littéralement", "dark_dain.png", CardTypes.Classic, CardRarity.Rare],
            ["Logan", "Un jeune homme fougueux, prêt à aider les aventuriers, mais se battre quand ses armes sont confisquées, c'est plus difficile", "logan.png", CardTypes.Classic, CardRarity.Common],
            ["Junoviel", "Ya un bug avec cette carte wtf", "junoviel.png", CardTypes.Classic, CardRarity.Rare],

            ["Itakore", "Tout ce qu'il faut retenir c'est qu'il avait un corbeau bien plus puissant que son propriétaire.", "itakore.png", CardTypes.Classic, CardRarity.Rare],
            ["Zica", "Hmmmm... c'est juste un rat.", "zica.png", CardTypes.Classic, CardRarity.Common],
            ["Zkrub", "Perdre son point de destin pour son familier dès les premières séances, c'est la vie qu'il a décidé de mener.", "zkrub.png", CardTypes.Classic, CardRarity.Common],
            ["Erell", "Sûrement une erreur de conception, car avoir une aussi grande gueule pour une si petite taille, il y a un problème.", "erell.png", CardTypes.Character, CardRarity.Epic],

            ["Karror", "Il se bat et se battra toujours pour le peuple, malgré ses quelques lacunes intellectuelles.", "karror.png", CardTypes.Classic, CardRarity.Common],
            ["Prinicas", "Perso oubliable, mais l'une des rares traces de Kirito en tant que joueur à l'époque.", "prinicas.png", CardTypes.Classic, CardRarity.Rare],
            ["Kim Bang Won", "Un guerrier noble, prêt à exterminer toute une race parce qu'un enfant l'a mal regardé, du moins selon lui.", "kim_bang_won.png", CardTypes.Classic, CardRarity.Epic],
            ["Ilar", "Un personnage oublié, même par son joueur. On retiendra de lui qu'il était probablement très important... ou pas.", "ilar.png", CardTypes.Classic, CardRarity.Common],

            ["Yanaelle Battlebrace", "Passer de prétendante au titre de reine des putes à générale dans un réseau d'esclavagisme, c'est une bonne évolution... quoique.", "yanaelle.png", CardTypes.Classic, CardRarity.Common],
            ["Séraphine", "Une petite fille tourmentée, manipulée, mais qui a surtout fait le choix d'arrêter d'être une tourelle à heal", "seraphine.png", CardTypes.Character, CardRarity.Legendary],
            ["Bolg LuthDargent", "Je ne suis PAS un Kobold ! Et je ne viens pas de la jungle du Mwangi bande de racistes !", "bolg.png", CardTypes.Classic, CardRarity.Rare],
            ["Dark Bolg", "Oh nan Lucina trop dommage :((", "dark_bolg.png", CardTypes.Classic, CardRarity.Epic],
            ["Vali Luciafiel", "Le prince des arcanes, celui qui délivrera la grande cité de Nex... du moins, si sa personnalité ne change pas entre-temps et qu'il ne provoque pas un cataclysme en jouant pour les stats.", "vali.png", CardTypes.Classic, CardRarity.Rare],
            ["Rehlcoks", "Monsieur Coks ! Un riche détective plutôt pâle, avec des capacités de combat probablement plus fortes que ce qu'il nous montre, qui a sûrement fini dans le pire groupe qu'il pouvait trouver.", "rehlcoks.png", CardTypes.Classic, CardRarity.Rare],
            ["Samael", "Le fameux paladin, prêt à voler, tuer, mentir, mais seulement quand ça l'arrange, tout en se demandant pourquoi ses pouvoirs disparaissent", "samael.png", CardTypes.Classic, CardRarity.Common],
            ["Kibendia", "L'accompagnateur du prince des arcanes, mais un mystère reste caché au fond de lui : est-ce toujours un bot ?", "kibendia.png", CardTypes.Classic, CardRarity.Common],

            ["Reyg", "Maître de la glace, faisant partie des négociateurs de la mort, il a failli one-shot un boss. Quelqu'un se souvient de lui ?", "reyg.png", CardTypes.Classic, CardRarity.Common],
            ["Gyre", "Maître du feu. C'était le frère du gars de glace... enfin, je crois.", "gyre.png", CardTypes.Classic, CardRarity.Common],
            ["Tsunyo", "Fils caché de Kibendia, il faisait partie des négociateurs de la mort et a failli one-shot un boss. Mais sinon, il faisait surtout voler des trucs, quoi.", "tsunyo.png", CardTypes.Classic, CardRarity.Rare],
            ["Xénie", "Fait partie des négociateurs de la mort, elle a failli one-shot un boss. Elle avait pas mal d'idées en tête pour forcer les gens à l'écouter, mais pas toujours des idées saines..", "xenie.png", CardTypes.Classic, CardRarity.Common],
            ["Sierra", "Jeune femme aux talents surnaturels et très instable. Malheureusement pour elle, une personne (et un joueur) en a peut être déjà profité...", "sierra.png", CardTypes.Character, CardRarity.Epic],
        ]
    },
    {
        "collection_id": 5,
        "collection_name": "RNP",
        "collection_description": "Collection des JDR se déroulant dans l'univers de RNP",
        "collection_image": "collection5.png",
        "season_id": 1,
        "cards": [
            ["Astoria", "Une des meilleures élèves de sa génération, mais aussi une grande passionnée d'aventure ! Par contre, les plébéiens, ce n'est pas son truc.", "astoria.png", CardTypes.Classic, CardRarity.Rare],
            ["Faelin", "Il est soit complètement idiot, soit totalement amnésique, mais son apparence me fait pencher davantage vers l'une des deux options.", "faelin.png", CardTypes.Classic, CardRarity.Epic],
            ["Sylio", "Enchaîner connerie sur connerie, c'est son quotidien, mais quand il s'agit de se battre, là, il est toujours sérieux et partant", "sylio.png", CardTypes.Classic, CardRarity.Common],
            ["Wilfried", "Petit majordome semblant cependant caché de très grands secrets", "wilfried.png", CardTypes.Character, CardRarity.Epic],

            ["Tsuna Kokana", "Le seul vrai paladin qu'on ait connu (même s'il est fortement aidé par le MJ)", "tsuna.png", CardTypes.Character, CardRarity.Legendary],
            ["Bjorn Ragnarson", "AHOUUUUU !!!!!! RRRRWAFF !!!!", "bjorn.png", CardTypes.Classic, CardRarity.Common],
            ["Leokas Carnorin", "Al a survécu au massacre de Chrysée, non sans séquelles. Un seul feu l'anime depuis : la vengeance. Je crois qu'il sait aussi faire apparaître un lapin dans un chapeau, sacré tour de magie.", "leokas.png", CardTypes.Classic, CardRarity.Rare],
            ["Brenda Crochefer", "Une naine pleine de bonne humeur ! Malheureusement, le massacre de Chrysée est un traumatisme de plus à ajouter dans sa tête... mais bon, une bonne bouffe et tout va mieux !", "branda.png", CardTypes.Classic, CardRarity.Rare],
            ["Ysolde Aphaunogé", "A failli crever lors de la session 2. Et c'est une folle. N-I-C-K-E-L. Probablement l'un des personnages les plus inaptes au JDR, ou du moins à l'aventure..", "ysolde.png", CardTypes.Classic, CardRarity.Common],
        ]
    },
    {
        "collection_id": 6,
        "collection_name": "Chroniques de Leif",
        "collection_description": "Collection des JDR se déroulant dans l'univers de Chroniques de Leif",
        "collection_image": "collection6.png",
        "season_id": 1,
        "cards": [
            ["Aria", "Une adolescente un peu trop folle pour vivre dans notre société, du moins convenablement. Elle ressemble à quelqu'un, non ?", "aria.png", CardTypes.Character, CardRarity.Legendary],
            ["Archibald", "Sa mort a été bien plus impressionnante que sa vie. Bref, il faut l'oublier.", "archibald.png", CardTypes.Classic, CardRarity.Common],
            ["Ulgar", "Une bête qui n'est pas le héros qu'il pense être. Il est à la recherche d'une membre de sa tribu... vous savez, les grands trucs verts... ses confrères, les ogres.", "ulgar.png", CardTypes.Character, CardRarity.Epic],
            ["Naelwen", "Perso, je n'ai pas vu l'anime, mais je pense avoir la référence de la meuf avec les 9 queues de renard. Vous l'avez aussi ?", "naelwen.png", CardTypes.Classic, CardRarity.Rare],
            ["Lyne", "On l'appelle la folle au marteau, réfléchir, c'est pas son truc.", "lyne.png", CardTypes.Classic, CardRarity.Common],
            ["Druco", "Non, ce n'est pas un garde, mais un vaillant partenaire. (Mais il a sûrement de nombreux frères.)", "druco.png", CardTypes.Classic, CardRarity.Epic],
            ["Knud", "On pourrait le décrire de bien des manières, mais les plus simples et les plus parlantes sont : sexiste, antisémite et raciste !", "knud.png", CardTypes.Classic, CardRarity.Rare],

            ["Anastasia", "Au moins, elle aura essayé", "anastasia.png", CardTypes.Classic, CardRarity.Rare],
            ["Clovis", "On raconte que ses jambes ont subi le même sort que des merguez lors d'un bon barbecue !", "clovis.png", CardTypes.Classic, CardRarity.Rare],
            ["Eldric", "L'arroseur arrosé, avant même d'avoir essayé d'arroser.", "eldric.png", CardTypes.Classic, CardRarity.Common],
            ["Manncen", "Le meilleur tireur du continent, avec un léger penchant pour les barbecues...", "manncen.png", CardTypes.Character, CardRarity.Epic],
            ["Sortos", "L'Éventreur des abysses ? Ah non, ce n'est que Sortos.", "sortos.png", CardTypes.Classic, CardRarity.Epic],
            ["Sven", "La seule personne raisonnable au milieu de la folie.", "sven.png", CardTypes.Classic, CardRarity.Common],
        ]
    },
    {
        "collection_id": 7,
        "collection_name": "One Shot",
        "collection_description": "Collection des JDR se déroulant dans l'univers de One shot",
        "collection_image": "collection7.png",
        "season_id": 1,
        "cards": [
            ["John Prentiss", "Un homme attiré par l'argent, mais ayant malheureusement sombré dans la folie. Du moins, le joueur, lui, était fou.", "john_prentiss.png", CardTypes.Classic, CardRarity.Common],
            ["Professeur Johan Kerenski", "Dormir à côté d'un monstre n'a pas été la meilleure de ses idées, et ça lui aura beaucoup coûté...", "professeur_johan_kerenski.png", CardTypes.Classic, CardRarity.Common],
            ["Francesca Petrini", "Seule \"survivante\" de cette horrible  aventure mais bon elle nous faisait bien chier avec son carnet", "francesca_petrini.png", CardTypes.Character, CardRarity.Epic],
            ["Lord Duncan Blight", "Un gros gun, un gros cigare... il ne pouvait que faire un massacre.", "lord_duncan_blight.png", CardTypes.Classic, CardRarity.Rare],
            ["Maryss Boucher", "Devenue folle, elle n'a pas compris que la police allait l'arrêter pour le massacre qu'elle a commis, ou du moins pour le sang qu'elle avait sur elle.", "maryss_boucher.png", CardTypes.Classic, CardRarity.Rare],

            ["Lira Altherion", "Le vol le plus facile de sa carrière , au final il suffisait juste de demander", "liraaltherion.png", CardTypes.Character, CardRarity.Epic],
            ["A.X.I.O.M", "Apparemment, manger des robots et accuser tout ce qui bouge n'est pas la meilleure façon de paraître innocent.", "axiom.png", CardTypes.Character, CardRarity.Epic],
            ["Bureau de l'IA", "La salle de tous les interdits : tout ce qui se passe dans le bureau de l'IA reste dans le bureau de l'IA", "bureauia.png", CardTypes.Location, CardRarity.Epic],
            ["Salle de bal", "Il y a un long bar automatique sur un côté et une grande piste de danse. Il suffit de taper des mains pour lancer la musique.", "sallebal.png", CardTypes.Location, CardRarity.Epic],
            ["Mia Tanis", "Une vraie touriste, mais une touriste méchanophile", "miatanis.png", CardTypes.Classic, CardRarity.Rare],
            ["Kael Lycos", "Le meurtrier le plus discret de l'espace, ou alors les enquêteurs étaient vraiment nuls.", "kaellycos.png", CardTypes.Classic, CardRarity.Rare],
            ["Dine Miller", "Le cowboy de l'espace, mais malheureusement un cowboy spéciste...", "dinemiller.png", CardTypes.Classic, CardRarity.Rare],
            ["Salle d'observation des étoiles", "En appuyant sur un bouton, tout le plafond devient transparent et l'on peut observer l'espace et les planètes au loin. ", "salleobservationdesetoiles.png", CardTypes.Location, CardRarity.Rare],
            ["Cinéma", "Chaque place est composée d'un immense siège qui peut se déplier en lit, l'écran occupe tout un mur", "cinema.png", CardTypes.Location, CardRarity.Rare],
            ["Faux Jardin", "Du sol au plafond se trouvent de belles plantes parmi les plus rares de l'univers, mais aucune n'est vraie.", "fauxjardin.png", CardTypes.Location, CardRarity.Rare],
            ["Chambre", "Chaque chambre est individuellement très grande et propose un large choix de meubles. Elle s'ouvre avec une carte magnétique.", "chambre.png", CardTypes.Classic, CardRarity.Common],
            ["Jacuzzi", "Une fois le pédiluve passé, la pièce est carrelée de bleu du sol au plafond.", "jacuzzi.png", CardTypes.Classic, CardRarity.Common],
            ["Salle de sport", "Cette salle de sport est ouverte de jour comme de nuit.", "salledesport.png", CardTypes.Classic, CardRarity.Common],
            ["Salle des capsules", "Aucune décoration dans ce simple couloir menant à une porte entourée de serrures numériques.", "sallecapsules.png", CardTypes.Classic, CardRarity.Common],
            ["Salle des robots", "Au milieu de la salle se trouvent une cinquantaine de pods, des sortes de sarcophages à taille humaine qui rechargent et réparent les robots.", "sallerobots.png", CardTypes.Classic, CardRarity.Common],
            ["Cuisine", "a moitié de la pièce est composée d'une cuisine de restaurant classique, l'autre est une imprimante à nourriture. ", "cuisine.png", CardTypes.Classic, CardRarity.Common],
            ["Salle des moteurs", " Il fait extrêmement chaud dans cette salle composée de tuyaux de plusieurs mètres de large.", "salledesmoteurs.png", CardTypes.Classic, CardRarity.Common],
            ["Débarras", "Tout objet trouvé, devenu inutile ou perdu, se retrouve ici, entroposé de manière aléatoire.", "debarras.png", CardTypes.Classic, CardRarity.Common],
            ["Salle à manger", "Tous les couverts sont dorés et les assiettes en porcelaine.", "salleamanger.png", CardTypes.Classic, CardRarity.Common],

            ["Iris Draenae", "La princ'hess du quartier sud de la ville", "iris_draenae.png", CardTypes.Character, CardRarity.Legendary],
            ["Amaluia", "Elle ne porte pas malheur, mais... elle a quand même foutu le feu dehors", "amaluia.png", CardTypes.Classic, CardRarity.Epic],
            ["Maximator Drip", "Une bière de trop, et c'est la baston générale. Mais bon, il est resplendissant avec sa doudoune DRIP.", "maximator_drip.png", CardTypes.Classic, CardRarity.Rare],
            ["Vhiraïn", "Sûrement le paladin qui a presque perdu ses pouvoirs le plus rapidement.", "vhirain.png", CardTypes.Classic, CardRarity.Common],
            ["Baldwuine Blue", "Le plus grand enquêteur de tous les temps, je vous dis. La preuve : il a vu de la fumée dehors.", "baldwuine_blue.png", CardTypes.Classic, CardRarity.Common],
            ["Shimyel", "Elle n'a pas hésité à vendre son corps pour monter sur le bateau. Ça, c'est une chef comme personne... ou alors ?", "shimyel.png", CardTypes.Classic, CardRarity.Rare],

            ["Grumble", "Attention, il est sûrement qualifié dans ce qu'il fait, mais pas sûr qu'on puisse considérer ce qu'il fait comme de la cuisine.", "grumble.png", CardTypes.Classic, CardRarity.Rare],
            ["Bartholomiew", "Toujours là pour s'immiscer dans les conneries de ses camarades, ou même pour trouver un plan afin de faire encore pire qu'eux.", "bartholomiew.png", CardTypes.Classic, CardRarity.Common],
            ["Fergus", "Quand vous le voyez , vous demandez pourquoi il a son nom écrit à l'envers sur sa côte. Il vous répondra \"pour FEUR !!!\"", "fergus.png", CardTypes.Character, CardRarity.Epic],

            ["Akoro", "WIP", "akoro.png", CardTypes.Classic, CardRarity.Common],
            ["Henato", "WIP", "henato.png", CardTypes.Classic, CardRarity.Common],
            ["Soris", "WIP", "soris.png", CardTypes.Classic, CardRarity.Common],
            ["Tamara", "WIP", "tamara.png", CardTypes.Classic, CardRarity.Common],

        ]
    }
]

export default season1Cards;