# Bibliography

<!--
The bibliography page (/bibliography/) and the home page's preview of it are built from this file;
edit it and rebuild. Run "npm run check:bibliography" to visit every link (it needs the network).

- "## Theme" starts a group; groups appear in this file's order. A new theme needs its label in all
  11 src/i18n/translations/*.json files, as "bibliography.theme.<slug>" (slug: the heading in lower
  case, accents dropped, words joined by "-"); npm test checks it.
- "### Book" starts a book. The heading is only a name for this file; the page shows the edition titles.
- "- id:" (optional) names the book for other pages: a Field Guide cites it by this id in its
  "sources", and the bibliography links the book to every guide that does. Kebab-case, unique (the
  build checks). It is also the book's #anchor on /bibliography/. An Indonesian edition is "- ind:".
- "- by:" and "- year:" give the authors and the year the book was first published.
- "- climate:" (optional) names the climates a book is written for, from the Canopi app's zones:
  tropical, subtropical, mediterranean, arid, temperate, continental, boreal (several: "temperate, continental").
  Leave it out when the book's advice holds in any climate; the page shows it only when present.
- "- featured: yes" puts a book in the home page's preview; keep 3 to 6 books marked (the build checks).
- "- <language>: [Title](https://…)" is one edition, by language code (en, fr, ja, zh, hi…).
  The original edition comes first. A visitor sees the edition in their language when there is one,
  else the original, and the others under "Also in". "Title: Subtitle" sets the subtitle smaller.
- After an edition's link, "— Name" gives the author's name as that edition prints it, and
  "— 1998" (or "— Name · 1998") the year of the text it translates, when either differs.
- Books are sorted by title within each theme, so order here does not matter.

The design grows in stages; when a count below is reached, the page changes before more books go in.
1. Up to 15 books, and at most 5 in any theme: a section on the home page.
2. From 16 books, or 6 in one theme: its own /bibliography/ page in every locale, a home preview of
   3–6 books marked "- featured: yes" with a "See all" link, a footer link, and a link checker. (Built.)
3. From 8 themes: theme jump links with counts on the bibliography page. (Built.)
4. From 40 books: a language filter (opening on the reader's language when it has at least 6 books,
   else on all). A climate filter joins it once at least 2 climates have 5 books or more each; books
   with no "- climate:" show under every climate.
Not tied to a count: ISBN fallback links (the first edition with no stable page), one-line notes
(an editorial decision; they add translation work), one file per theme (only past ~150 books).
-->

## Agroecology

### Agroecology (Gliessman)
- by: Stephen R. Gliessman, V. Ernesto Méndez, Victor M. Izzo, Eric W. Engles
- year: 2022
- featured: yes
- en: [Agroecology: Leading the Transformation to a Just and Sustainable Food System](https://www.routledge.com/Agroecology-Leading-the-Transformation-to-a-Just-and-Sustainable-Food-System/Gliessman-Mendez-Izzo-Engles/p/book/9781032187105)
- es: [Agroecología: procesos ecológicos en agricultura sostenible](https://www.sidalc.net/search/Record/KOHA-OAI-TEST:39885) — Stephen R. Gliessman · 1998
- pt: [Agroecologia: processos ecológicos em agricultura sustentável](https://books.google.com/books?vid=ISBN9788538600381) — Stephen R. Gliessman · 1998

### Bienvenue en syntropie
- by: Anaëlle Théry
- year: 2024
- climate: temperate
- fr: [Bienvenue en syntropie ! : Un jardin d'abondance, des principes au terrain](https://www.terrevivante.org/boutique/livres/permaculture-jardin-bio/techniques-de-jardinage/bienvenue-en-syntropie/)

### The Carbon Farming Solution
- by: Eric Toensmeier
- year: 2016
- en: [The Carbon Farming Solution: A Global Toolkit of Perennial Crops and Regenerative Agriculture Practices for Climate Change Mitigation and Food Security](https://www.chelseagreen.com/product/the-carbon-farming-solution/)

### Le grand guide pour réinventer le potager
- by: Johann Gis
- year: 2026
- fr: [Le grand guide pour réinventer le potager](https://www.editions-ulmer.fr/editions-ulmer/le-grand-guide-pour-reinventer-le-potager-1086-gis-cl.htm)

### Mon potager perpétuel
- by: Terence Groos
- year: 2025
- fr: [Mon potager perpétuel : 90 vivaces comestibles pour des récoltes à l'infini et sans effort !](https://www.leslibraires.fr/livre/24304402-mon-potager-perpetuel-terence-groos-solar)

### The One-Straw Revolution
- by: Masanobu Fukuoka
- year: 1975
- featured: yes
- ja: [自然農法 わら一本の革命](https://www.shunjusha.co.jp/book/9784393741412.html) — 福岡正信
- en: [The One-Straw Revolution: An Introduction to Natural Farming](https://www.nyrb.com/products/the-one-straw-revolution)
- fr: [La Révolution d'un seul brin de paille : Une introduction à l'agriculture sauvage](https://books.google.com/books?vid=ISBN9782844456243)
- es: [La revolución de una brizna de paja: Una introducción a la agricultura natural](https://www.polifemo.com/libros/la-revolucion-de-una-brizna-de-paja-una-introduccion-a-la-agricultura-natural/264112/)
- pt: [A revolução de uma palha](https://www.martinsfontespaulista.com.br/a-revolucao-de-uma-palha-1172917/p)
- it: [La rivoluzione del filo di paglia: Un'introduzione all'agricoltura naturale](https://www.macrolibrarsi.it/libri/__la_rivoluzione_del_filo_di_paglia.php)
- zh: [一根稻草的革命](https://book.douban.com/subject/26222476/) — 福冈正信
- de: [Der Große Weg hat kein Tor: Nahrung – Anbau – Leben](https://www.pala-verlag.de/buecher/der-grosse-weg-hat-kein-tor)
- ko: [짚 한오라기의 혁명](https://product.kyobobook.co.kr/detail/S000001443755) — 후쿠오카 마사노부
- nl: [The one straw revolution: De filosofie van natuurlijke landbouw](https://www.maklugarant.eu/product/the-one-straw-revolution-de-filosofie-van-natuurlijke-landbouw/)
- ru: [Революция одной соломинки](https://cluboz.net/shop/knigi-i-diski/knigi-i-diski-klubnye-izdaniya/fukuoka-revolyuciya-odnoj-solominki/) — Масанобу Фукуока

## Soil

### Teaming with Microbes
- by: Jeff Lowenfels, Wayne Lewis
- year: 2006
- featured: yes
- en: [Teaming with Microbes: The Organic Gardener's Guide to the Soil Food Web](https://www.hachettebookgroup.com/titles/jeff-lowenfels/teaming-with-microbes/9781604691139/)
- fr: [Collaborer avec les bactéries et autres micro-organismes : Guide du réseau alimentaire du sol à destination des jardiniers](https://books.google.com/books?vid=ISBN9782841569274)
- de: [Gärtnern mit Mikroben: Der Leitfaden des Bio-Gärtners zum Bodennahrungsnetz](https://pfeil-verlag.de/publikationen/gaertnern-mit-mikroben/)

### Les clés d'un sol vivant
- by: Blaise Leclerc, Jean-Jacques Raynal
- year: 2017
- fr: [Les clés d'un sol vivant : Comment améliorer la terre de son jardin ?](https://www.terrevivante.org/boutique/livres/permaculture-jardin-bio/potager/les-cles-dun-sol-vivant/)

### L'encyclopédie des plantes bio-indicatrices
- by: Gérard Ducerf
- year: 2005
- fr: [L'encyclopédie des plantes bio-indicatrices alimentaires et médicinales : Guide de diagnostic des sols](https://www.promonature.com/produit/pack-4-volumes-encyclopedies-des-plantes-bio-indicatrices)

### Le sol, la terre et les champs
- by: Claude Bourguignon, Lydia Bourguignon
- year: 1989
- featured: yes
- fr: [Le sol, la terre et les champs : Pour retrouver une agriculture saine](https://books.google.com/books?vid=ISBN9782869854116)
- en: [Regenerating the Soil: From Agronomy to Agrology](https://books.google.com/books?vid=ISBN8185569681) — Claude Bourguignon
- it: [Il suolo: Un patrimonio da salvare](https://giunti.it/products/il-suolo-un-patrimonio-da-salvare-bourguignon-claude-9788884992772)

## Water

### Cultiver l'eau douce
- by: Samuel Bonvoisin, François Goldin, Antoine Talin
- year: 2025
- fr: [Cultiver l'eau douce : Du jardin de pluie à l'hydrologie régénérative, des solutions concrètes pour régénérer nos écosystèmes](https://www.editions-ulmer.fr/editions-ulmer/cultiver-l-eau-douce-du-jardin-de-pluie-a-l-hydrologie-regenerative-des-solutions-concretes-pour-regenerer-nos-ecosystemes-1023-cl.htm)

## Seeds

### Landrace Gardening
- id: landrace-gardening
- by: Joseph Lofthouse
- year: 2021
- featured: yes
- en: [Landrace Gardening: Food Security Through Biodiversity and Promiscuous Pollination](https://lofthouse.com/landrace-gardening-joseph-lofthouse.phtml)
- fr: [Semences paysannes métissées : La souveraineté alimentaire sans acheter ni semences ni engrais ni pesticides](https://lofthouse.com/semences-paysannes-m%C3%A9tiss%C3%A9es.phtml)
- de: [Gärtnern mit Landsorten: Weltweite, lokale und private Ernährungssicherheit durch genetisch vielfältige, sich frei verkreuzende Pflanzen](https://lofthouse.com/g%C3%A4rtnern-mit-landsorten.phtml)
- zh: [使用當地品種園藝：利用生物多樣性和異花授粉的永續農業糧食安全指南](https://lofthouse.com/%E4%BD%BF%E7%94%A8%E7%95%B6%E5%9C%B0%E5%93%81%E7%A8%AE%E5%9C%92%E8%97%9D.phtml)
- hi: [स्थानीय किस्मों के साथ बागवानी](https://lofthouse.com/%E0%A4%B8%E0%A5%8D%E0%A4%A5%E0%A4%BE%E0%A4%A8%E0%A5%80%E0%A4%AF-%E0%A4%95%E0%A4%BF%E0%A4%B8%E0%A5%8D%E0%A4%AE%E0%A5%8B%E0%A4%82-%E0%A4%95%E0%A5%87-%E0%A4%B8%E0%A4%BE%E0%A4%A5-%E0%A4%AC%E0%A4%BE%E0%A4%97%E0%A4%B5%E0%A4%BE%E0%A4%A8%E0%A5%80.phtml)

## Forests

### Pour une forêt primaire en Europe de l'Ouest
- by: Francis Hallé
- year: 2021
- climate: temperate
- fr: [Pour une forêt primaire en Europe de l'Ouest](https://actes-sud.fr/pour-une-foret-primaire-en-europe-de-louest)

## Biodiversity

### De la biodiversité comme un humanisme
- by: Marc-André Selosse
- year: 2026
- fr: [De la biodiversité comme un humanisme](https://www.seuil.com/ouvrage/de-la-biodiversite-comme-un-humanisme-marc-andre-selosse/9782021604337)

### Découvrir et protéger nos abeilles sauvages
- by: Nicolas Vereecken
- year: 2017
- fr: [Découvrir et protéger nos abeilles sauvages](https://www.glenat.com/glenat-livres/decouvrir-et-proteger-nos-abeilles-sauvages-9782344021521/)

### Les auxiliaires au jardin
- by: Vincent Albouy
- year: 2018
- fr: [Les auxiliaires au jardin : Une solution alternative aux pesticides](https://www.editions-ulmer.fr/editions-ulmer/les-auxiliaires-au-jardin-une-solution-alternative-aux-pesticides-614-cl.htm)

## Plants

### La vie sociale des plantes
- by: Jean-Marie Pelt
- year: 1984
- fr: [La vie sociale des plantes](https://www.fayard.fr/livre/la-vie-sociale-des-plantes-9782213013718/)

### Plantes sauvages comestibles
- by: François Couplan
- year: 2018
- fr: [Plantes sauvages comestibles](https://www.editions-larousse.fr/livre/plantes-sauvages-comestibles-9782036012981/)

## Growing structures

### Walipini Design and Construction
- by: Sean Londrigan, Danielle Londrigan
- year: 2022
- en: [Walipini Design and Construction](https://www.amazon.com/Walipini-Design-Construction-Danielle-Londrigan/dp/B0BCYBYQFR)

### Kleine grüne Archen
- by: Claudia Lorenz-Ladener
- year: 2012
- climate: temperate
- de: [Kleine grüne Archen: Passivsolare (Erd-)Gewächshäuser selbst gebaut](https://oekobuch.de/buecher/kleine-gruene-archen/)
- fr: [Construire une serre : Serres solaires passives, conception, exemples de réalisations](https://www.editions-ulmer.fr/editions-ulmer/construire-une-serre-serres-solaires-passives-conception-exemples-de-realisations-336-cl.htm)

## Indigenous knowledge

### Braiding Sweetgrass
- by: Robin Wall Kimmerer
- year: 2013
- featured: yes
- en: [Braiding Sweetgrass: Indigenous Wisdom, Scientific Knowledge, and the Teachings of Plants](https://milkweed.org/book/braiding-sweetgrass)
- fr: [Tresser les herbes sacrées : Sagesse ancestrale, science et enseignements des plantes](https://www.hachette.fr/livre/tresser-les-herbes-sacrees-9782016283967/)
- es: [Una trenza de hierba sagrada: Saber indígena, conocimiento científico y las enseñanzas de las plantas](https://capitanswing.com/catalogo/una-trenza-de-hierba-sagrada/)
- pt: [A maravilhosa trama das coisas: Sabedoria indígena, conhecimento científico e os ensinamentos das plantas](https://loja.intrinseca.com.br/a-maravilhosa-trama-das-coisas-sabedoria-indigena-conhecimento-cientifico-e-os-ensinamentos-das-plantas/)
- it: [La meravigliosa trama del tutto: Saggezza indigena, conoscenza scientifica e gli insegnamenti delle piante](https://www.mondadori.it/libri/la-meravigliosa-trama-del-tutto-robin-wall-kimmerer/)
- zh: [编结茅香](https://book.douban.com/subject/36091143/) — 罗宾·沃尔·基默尔
- de: [Geflochtenes Süßgras: Die Weisheit der Pflanzen](https://www.aufbau-verlage.de/aufbau/geflochtenes-sussgras/978-3-351-03873-1)
- ja: [植物と叡智の守り人：ネイティブアメリカンの植物学者が語る科学・癒し・伝承](https://www.tsukiji-shokan.co.jp/mokuroku/ISBN978-4-8067-1564-1.html) — ロビン・ウォール・キマラー
- ko: [향모를 땋으며: 토박이 지혜와 과학 그리고 식물이 가르쳐준 것들](https://product.kyobobook.co.kr/detail/S000001867145) — 로빈 월 키머러
- nl: [Een vlecht van heilig gras: Hoe de natuur, wetenschap en traditionele kennis ons leren respectvol met de aarde om te gaan](https://books.google.com/books?vid=ISBN9789401305365)
- ru: [Голос земли: Легендарный бестселлер десятилетия о сокровенных знаниях индейских племен, научных исследованиях и мистической связи человека с природой](https://eksmo.ru/book/pletenie-sladkoy-travy-mudrost-predkov-nauchnye-fakty-i-istina-iz-zhizni-rasteniy-ITD960428/) — Робин Уолл Киммерер

### Plants Have So Much to Give Us
- by: Mary Siisip Geniusz
- year: 2015
- en: [Plants Have So Much to Give Us, All We Have to Do Is Ask: Anishinaabe Botanical Teachings](https://www.upress.umn.edu/9780816696765/plants-have-so-much-to-give-us-all-we-have-to-do-is-ask/)

### Ancient Wisdom, Modern Hope
- by: James T. Powers
- year: 2021
- en: [Ancient Wisdom, Modern Hope: Relearning Environmental Connectiveness](https://books.google.com/books?vid=ISBN9781782792444)

### Les Indiens kogis
- by: Éric Julien, Muriel Fifils
- year: 2009
- fr: [Les Indiens kogis : La mémoire des possibles](https://actes-sud.fr/catalogue/les-indiens-kogis-001007)
