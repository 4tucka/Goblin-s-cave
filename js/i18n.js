/* i18n.js — multi-language engine + AI Master narration.
   Languages: en (base), pt, es, fr, de. Missing keys fall back to English. */
const I18n = (() => {
  const LANGS = { en: 'English', pt: 'Português', es: 'Español', fr: 'Français', de: 'Deutsch' };

  const D = {
    en: {
      nav_home: 'Home', nav_create: 'Create Room', nav_join: 'Join Room', nav_account: 'My Account',
      hdr_login: 'Log in', hdr_signup: 'Sign up',
      tag_line: 'A virtual tabletop for dungeon delvers',
      hero_intro: 'Step into the depths. Build your world on battlemaps wreathed in fog of war, spawn your monsters, light the torches — and gather your party around the table.',
      cta_create: '🕯️ Create a Room', cta_join: '🚪 Join a Room', cta_auth: '⚔️ Log in / Sign up',
      qj_ph: 'Enter room code…', qj_btn: 'Enter the Cave',
      ban_g_h: '🎭 Play as a Guest — instantly',
      ban_g_p: 'No account needed. Create or join a room right now, fill a quick character card, and roll dice with your party. Everything lives for the length of your visit.',
      ban_g_btn: 'Continue as guest',
      ban_u_h: '🔑 Sign in — keep your hoard',
      ban_u_p: 'Logged-in adventurers save custom characters in <b>My Vault</b>, keep a map library and ambient playlists, track campaign stats, and revisit their <b>Room History</b> any time.',
      ban_u_btn: 'Create free account',
      feat_h: 'Everything a DM needs, down to the last goblin',
      f_map_h: '🗺️ Map Builder', f_map_p: 'Square or hex grids, walls, props, labels, paintable terrain, fog of war, token placement and object scaling.',
      f_npc_h: '👹 NPC &amp; Monster Spawner', f_npc_p: 'Build stat blocks with HP, AC and token icons, or import them as JSON. The DM drives every monster on the initiative bar.',
      f_dice_h: '🎲 Dice &amp; Chat', f_dice_p: 'A full dice tray (d4–d100) with /roll commands, advantage/disadvantage, and a table chat for RP and OOC talk.',
      f_audio_h: '🔊 Atmosphere Engine', f_audio_p: 'Synthesized ambient loops — Dungeon Rain, Tavern Noise, Cave Drips — plus your own MP3s or audio URLs, synced to the room by the DM.',
      f_live_h: '⚔️ Live Sessions', f_live_p: 'Real-time token movement, fog reveals, turn tracking and ready-up lobbies. Open a second tab and watch the table sync.',
      f_guide_h: '👺 The Goblin Guide', f_guide_p: 'A floating companion who explains the site, answers D&amp;D 5e rules questions, and conjures NPCs, encounters and loot on demand.',
      steps_h: 'Your session in five steps',
      st1: '<b>Forge the room</b> — name it, set a password and player cap if you like.',
      st2: '<b>Build the map</b> — pick a template or upload your own; paint terrain and hide secrets in fog.',
      st3: '<b>Spawn the threats</b> — add NPCs and monsters with HP, AC and tokens.',
      st4: '<b>Set the mood</b> — attach an ambient track for the table.',
      st5: '<b>Post the room</b> — share the code, wait for the party to Ready up, then <i>Start Game Session</i>.',
      auth_h: '⚔️ Adventurer&rsquo;s Gate',
      login_h: 'Log in', signup_h: 'Sign up',
      fld_name: 'Adventurer name', fld_pass: 'Password', fld_pickname: 'Choose a name', fld_pickpass: 'Choose a password',
      login_btn: 'Enter the Cave', signup_btn: 'Forge my Account',
      wiz_t: '🕯️ Forge a New Room', wiz_sub: 'Five steps between you and a table full of adventurers.',
      w1: 'Room Details', w2: 'Map Builder', w3: 'NPC Spawner', w4: 'Atmosphere', w5: 'Staging Lobby',
      s1_t: '📜 Room Details', s1_name: 'Room name', s1_pass: 'Password (optional — leave empty for an open room)',
      s1_max: 'Max players', s1_access: 'Access rule', acc_open: 'Open — anyone with the code', acc_pass: 'Password protected',
      next_map: 'Next: Build the Map →', next_npc: 'Next: Spawn NPCs →', next_atmo: 'Next: Atmosphere →', next_lobby: 'Next: Staging Lobby →',
      back_b: '← Back',
      s2_t: '🗺️ Advanced Map Builder', s3_t: '👹 NPC &amp; Monster Spawner', s4_t: '🔊 Atmosphere &amp; Audio Manager', s5_t: '🏰 Staging Lobby',
      post_btn: '📯 Post / Launch Room', start_btn: '⚔️ Start Game Session',
      copy_code: 'Copy code', copy_link: 'Copy invite link', abandon: 'Abandon room',
      j_t: '🚪 Join a Room', j_sub: 'Paste a 5-letter room code or a full invite link sent by your Dungeon Master.',
      j_btn: 'Descend', j_etiq_h: 'Lobby etiquette',
      j_etiq_p: 'Pick your character, chat with the party, and flip your <b>Ready</b> toggle. The session starts when the DM launches it. Guests play instantly; signed-in players can pull characters straight from <b>My Vault</b>.',
      j_enter: '🕯️ Enter the Lobby', j_leave: 'Leave room', j_ready: "✔ I'm Ready", j_unready: '❌ Un-ready',
      j_roster: 'Party roster', j_chat: 'Party chat', j_char: 'Character card',
      p_chat: '💬 Chat', p_dice: '🎲 Dice', p_party: '👥 Party', p_audio: '🔊 Audio',
      p_move: '✋ Move / Pan', p_fog: '🌫️ Fog brush', p_reveal: '☀️ Reveal',
      p_next: 'Next Turn ▶', p_setinit: '🎲 Set Initiative', p_end: 'End Session', p_invite: '🔗 Invite',
      p_amb_h: 'Room ambience', p_play: '▶ Play', p_stop: '⏹ Stop', p_vol: 'Volume',
      a_vault: '🎒 My Vault — Characters', a_maps: '🗺️ Saved Maps', a_play: '🎵 Ambient Playlists', a_hist: '📜 Room History',
      a_stats: 'Campaign Stats', a_logout: 'Log out', a_newchar: '⚒️ New / Import Character',
      g_sub: 'site help • 5e rules • DM generators', g_ph: 'Ask the goblin…',
    },
    pt: {
      nav_home: 'Início', nav_create: 'Criar Sala', nav_join: 'Entrar na Sala', nav_account: 'Minha Conta',
      hdr_login: 'Entrar', hdr_signup: 'Registar',
      tag_line: 'Uma mesa virtual para exploradores de masmorras',
      hero_intro: 'Desce às profundezas. Constrói o teu mundo em mapas de batalha envoltos em névoa de guerra, invoca os teus monstros, acende as tochas — e reúne o teu grupo à volta da mesa.',
      cta_create: '🕯️ Criar uma Sala', cta_join: '🚪 Entrar numa Sala', cta_auth: '⚔️ Entrar / Registar',
      qj_ph: 'Código da sala…', qj_btn: 'Entrar na Caverna',
      ban_g_h: '🎭 Jogar como Convidado — já',
      ban_g_p: 'Sem conta. Cria ou entra numa sala agora, preenche uma ficha rápida e lança dados com o teu grupo. Tudo dura enquanto durar a visita.',
      ban_g_btn: 'Continuar como convidado',
      ban_u_h: '🔑 Entra — guarda o teu tesouro',
      ban_u_p: 'Aventureiros com conta guardam personagens no <b>Meu Cofre</b>, mantêm biblioteca de mapas e playlists, estatísticas de campanha e <b>Histórico de Salas</b>.',
      ban_u_btn: 'Criar conta grátis',
      feat_h: 'Tudo o que um Mestre precisa, até ao último goblin',
      f_map_h: '🗺️ Construtor de Mapas', f_map_p: 'Grelhas quadradas ou hexagonais, muros, objetos, etiquetas, terreno pintável, névoa de guerra, tokens e escala.',
      f_npc_h: '👹 Criador de NPCs e Monstros', f_npc_p: 'Cria blocos de estatísticas com HP, CA e ícones, ou importa JSON. O Mestre controla todos os monstros na barra de iniciativa.',
      f_dice_h: '🎲 Dados e Chat', f_dice_p: 'Tabuleiro de dados completo (d4–d100) com comandos /roll, vantagem/desvantagem e chat de mesa.',
      f_audio_h: '🔊 Motor de Atmosfera', f_audio_p: 'Ambientes sintetizados — Chuva na Masmorra, Barulho de Taverna, Pingos de Caverna — mais os teus MP3 ou URLs de áudio.',
      f_live_h: '⚔️ Sessões ao Vivo', f_live_p: 'Movimento de tokens em tempo real, revelação de névoa, turnos e lobbies de prontidão. Abre um segundo separador e vê a mesa sincronizar.',
      f_guide_h: '👺 O Guia Goblin', f_guide_p: 'Um companheiro flutuante que explica o site, responde a regras de D&amp;D 5e e conjura NPCs, encontros e saque.',
      steps_h: 'A tua sessão em cinco passos',
      st1: '<b>Forja a sala</b> — dá-lhe nome, palavra-passe e limite de jogadores.',
      st2: '<b>Constrói o mapa</b> — modelo ou upload; pinta terreno e esconde segredos na névoa.',
      st3: '<b>Invoca as ameaças</b> — NPCs e monstros com HP, CA e tokens.',
      st4: '<b>Cria o ambiente</b> — anexa uma faixa ambiente para a mesa.',
      st5: '<b>Publica a sala</b> — partilha o código, espera pelos “Prontos” e <i>Inicia a Sessão</i>.',
      auth_h: '⚔️ Portão do Aventureiro',
      login_h: 'Entrar', signup_h: 'Registar',
      fld_name: 'Nome de aventureiro', fld_pass: 'Palavra-passe', fld_pickname: 'Escolhe um nome', fld_pickpass: 'Escolhe uma palavra-passe',
      login_btn: 'Entrar na Caverna', signup_btn: 'Forjar a minha Conta',
      wiz_t: '🕯️ Forjar uma Nova Sala', wiz_sub: 'Cinco passos entre ti e uma mesa cheia de aventureiros.',
      w1: 'Detalhes', w2: 'Mapa', w3: 'NPCs', w4: 'Atmosfera', w5: 'Lobby',
      s1_t: '📜 Detalhes da Sala', s1_name: 'Nome da sala', s1_pass: 'Palavra-passe (opcional)',
      s1_max: 'Máx. de jogadores', s1_access: 'Regra de acesso', acc_open: 'Aberta — qualquer um com o código', acc_pass: 'Protegida por palavra-passe',
      next_map: 'Seguinte: Mapa →', next_npc: 'Seguinte: NPCs →', next_atmo: 'Seguinte: Atmosfera →', next_lobby: 'Seguinte: Lobby →',
      back_b: '← Voltar',
      s2_t: '🗺️ Construtor Avançado de Mapas', s3_t: '👹 Criador de NPCs e Monstros', s4_t: '🔊 Atmosfera e Áudio', s5_t: '🏰 Lobby de Espera',
      post_btn: '📯 Publicar / Abrir Sala', start_btn: '⚔️ Iniciar Sessão de Jogo',
      copy_code: 'Copiar código', copy_link: 'Copiar convite', abandon: 'Abandonar sala',
      j_t: '🚪 Entrar numa Sala', j_sub: 'Cola o código de 5 letras ou o link de convite do teu Mestre.',
      j_btn: 'Descer', j_etiq_h: 'Etiqueta do lobby',
      j_etiq_p: 'Escolhe a personagem, conversa com o grupo e ativa <b>Pronto</b>. A sessão começa quando o Mestre a iniciar. Convidados jogam já; jogadores com conta usam o <b>Meu Cofre</b>.',
      j_enter: '🕯️ Entrar no Lobby', j_leave: 'Sair da sala', j_ready: '✔ Estou Pronto', j_unready: '❌ Não pronto',
      j_roster: 'Lista do grupo', j_chat: 'Chat do grupo', j_char: 'Ficha de personagem',
      p_chat: '💬 Chat', p_dice: '🎲 Dados', p_party: '👥 Grupo', p_audio: '🔊 Áudio',
      p_move: '✋ Mover / Panorâmica', p_fog: '🌫️ Pincel de névoa', p_reveal: '☀️ Revelar',
      p_next: 'Próximo Turno ▶', p_setinit: '🎲 Definir Iniciativa', p_end: 'Terminar Sessão', p_invite: '🔗 Convite',
      p_amb_h: 'Ambiente da sala', p_play: '▶ Tocar', p_stop: '⏹ Parar', p_vol: 'Volume',
      a_vault: '🎒 Meu Cofre — Personagens', a_maps: '🗺️ Mapas Guardados', a_play: '🎵 Playlists', a_hist: '📜 Histórico de Salas',
      a_stats: 'Estatísticas de Campanha', a_logout: 'Sair', a_newchar: '⚒️ Nova / Importar Personagem',
      g_sub: 'ajuda do site • regras 5e • geradores', g_ph: 'Pergunta ao goblin…',
    },
    es: {
      nav_home: 'Inicio', nav_create: 'Crear Sala', nav_join: 'Unirse a Sala', nav_account: 'Mi Cuenta',
      hdr_login: 'Entrar', hdr_signup: 'Registrarse',
      tag_line: 'Una mesa virtual para exploradores de mazmorras',
      hero_intro: 'Desciende a las profundidades. Construye tu mundo sobre mapas de batalla envueltos en niebla de guerra, invoca a tus monstruos, enciende las antorchas y reúne a tu grupo en la mesa.',
      cta_create: '🕯️ Crear una Sala', cta_join: '🚪 Unirse a una Sala', cta_auth: '️ Entrar / Registrarse',
      qj_ph: 'Código de sala…', qj_btn: 'Entrar en la Cueva',
      ban_g_h: '🎭 Jugar como Invitado — ya',
      ban_g_p: 'Sin cuenta. Crea o únete a una sala ahora, rellena una ficha rápida y tira dados con tu grupo. Todo dura lo que dure tu visita.',
      ban_g_btn: 'Continuar como invitado',
      ban_u_h: '🔑 Entra — guarda tu tesoro',
      ban_u_p: 'Los aventureros con cuenta guardan personajes en <b>Mi Bóveda</b>, mantienen biblioteca de mapas y playlists, estadísticas de campaña e <b>Historial de Salas</b>.',
      ban_u_btn: 'Crear cuenta gratis',
      feat_h: 'Todo lo que un DM necesita, hasta el último goblin',
      f_map_h: '🗺️ Constructor de Mapas', f_map_p: 'Cuadrículas o hexágonos, muros, objetos, etiquetas, terreno pintable, niebla de guerra, tokens y escala.',
      f_npc_h: '👹 Creador de NPCs y Monstruos', f_npc_p: 'Crea bloques de estadísticas con HP, CA e iconos, o importa JSON. El DM controla cada monstruo en la barra de iniciativa.',
      f_dice_h: '🎲 Dados y Chat', f_dice_p: 'Bandeja de dados completa (d4–d100) con comandos /roll, ventaja/desventaja y chat de mesa.',
      f_audio_h: '🔊 Motor de Atmósfera', f_audio_p: 'Ambientes sintetizados — Lluja en la Mazmorra, Ruido de Taberna, Goteo de Cueva — más tus MP3 o URLs de audio.',
      f_live_h: '⚔️ Sesiones en Vivo', f_live_p: 'Movimiento de tokens en tiempo real, revelado de niebla, turnos y lobbies de listos. Abre una segunda pestaña y mira la mesa sincronizarse.',
      f_guide_h: '👺 El Guía Goblin', f_guide_p: 'Un compañero flotante que explica el sitio, responde reglas de D&amp;D 5e y conjura NPCs, encuentros y botín.',
      steps_h: 'Tu sesión en cinco pasos',
      st1: '<b>Forja la sala</b> — nombre, contraseña y límite de jugadores.',
      st2: '<b>Construye el mapa</b> — plantilla o subida; pinta terreno y oculta secretos en la niebla.',
      st3: '<b>Invoca las amenazas</b> — NPCs y monstruos con HP, CA y tokens.',
      st4: '<b>Crea el ambiente</b> — adjunta una pista ambiental para la mesa.',
      st5: '<b>Publica la sala</b> — comparte el código, espera los “Listos” y <i>Inicia la Sesión</i>.',
      auth_h: '⚔️ Puerta del Aventurero',
      login_h: 'Entrar', signup_h: 'Registrarse',
      fld_name: 'Nombre de aventurero', fld_pass: 'Contraseña', fld_pickname: 'Elige un nombre', fld_pickpass: 'Elige una contraseña',
      login_btn: 'Entrar en la Cueva', signup_btn: 'Forjar mi Cuenta',
      wiz_t: '🕯️ Forjar una Nueva Sala', wiz_sub: 'Cinco pasos entre tú y una mesa llena de aventureros.',
      w1: 'Detalles', w2: 'Mapa', w3: 'NPCs', w4: 'Atmósfera', w5: 'Lobby',
      s1_t: '📜 Detalles de la Sala', s1_name: 'Nombre de la sala', s1_pass: 'Contraseña (opcional)',
      s1_max: 'Máx. jugadores', s1_access: 'Regla de acceso', acc_open: 'Abierta — cualquiera con el código', acc_pass: 'Protegida con contraseña',
      next_map: 'Siguiente: Mapa →', next_npc: 'Siguiente: NPCs →', next_atmo: 'Siguiente: Atmósfera →', next_lobby: 'Siguiente: Lobby →',
      back_b: '← Volver',
      s2_t: '🗺️ Constructor Avanzado de Mapas', s3_t: '👹 Creador de NPCs y Monstruos', s4_t: '🔊 Atmósfera y Audio', s5_t: '🏰 Lobby de Espera',
      post_btn: '📯 Publicar / Abrir Sala', start_btn: '⚔️ Iniciar Sesión de Juego',
      copy_code: 'Copiar código', copy_link: 'Copiar invitación', abandon: 'Abandonar sala',
      j_t: '🚪 Unirse a una Sala', j_sub: 'Pega el código de 5 letras o el enlace de invitación de tu DM.',
      j_btn: 'Descender', j_etiq_h: 'Etiqueta del lobby',
      j_etiq_p: 'Elige tu personaje, charla con el grupo y activa <b>Listo</b>. La sesión empieza cuando el DM la lance. Los invitados juegan ya; los jugadores con cuenta usan <b>Mi Bóveda</b>.',
      j_enter: '🕯️ Entrar al Lobby', j_leave: 'Salir de la sala', j_ready: '✔ Estoy Listo', j_unready: '❌ No listo',
      j_roster: 'Lista del grupo', j_chat: 'Chat del grupo', j_char: 'Ficha de personaje',
      p_chat: '💬 Chat', p_dice: '🎲 Dados', p_party: '👥 Grupo', p_audio: '🔊 Audio',
      p_move: '✋ Mover / Panorámica', p_fog: '🌫️ Pincel de niebla', p_reveal: '☀️ Revelar',
      p_next: 'Siguiente Turno ▶', p_setinit: '🎲 Fijar Iniciativa', p_end: 'Terminar Sesión', p_invite: '🔗 Invitar',
      p_amb_h: 'Ambiente de la sala', p_play: '▶ Reproducir', p_stop: '⏹ Parar', p_vol: 'Volumen',
      a_vault: '🎒 Mi Bóveda — Personajes', a_maps: '🗺️ Mapas Guardados', a_play: '🎵 Playlists', a_hist: '📜 Historial de Salas',
      a_stats: 'Estadísticas de Campaña', a_logout: 'Salir', a_newchar: '⚒️ Nueva / Importar Personaje',
      g_sub: 'ayuda del sitio • reglas 5e • generadores', g_ph: 'Pregunta al goblin…',
    },
    fr: {
      nav_home: 'Accueil', nav_create: 'Créer une Salle', nav_join: 'Rejoindre', nav_account: 'Mon Compte',
      hdr_login: 'Connexion', hdr_signup: 'Inscription',
      tag_line: 'Une table virtuelle pour explorateurs de donjons',
      hero_intro: 'Descendez dans les profondeurs. Bâtissez votre monde sur des cartes de bataille nimbées de brouillard de guerre, invoquez vos monstres, allumez les torches — et rassemblez votre groupe autour de la table.',
      cta_create: '🕯️ Créer une Salle', cta_join: '🚪 Rejoindre une Salle', cta_auth: '⚔️ Connexion / Inscription',
      qj_ph: 'Code de la salle…', qj_btn: 'Entrer dans la Caverne',
      ban_g_h: '🎭 Jouer en Invité — tout de suite',
      ban_g_p: 'Sans compte. Créez ou rejoignez une salle maintenant, remplissez une fiche rapide et lancez les dés avec votre groupe.',
      ban_g_btn: 'Continuer en invité',
      ban_u_h: '🔑 Connectez-vous — gardez votre trésor',
      ban_u_p: 'Les aventuriers connectés sauvegardent leurs personnages dans <b>Mon Coffre</b>, gardent cartes et playlists, statistiques de campagne et <b>Historique des Salles</b>.',
      ban_u_btn: 'Créer un compte gratuit',
      feat_h: 'Tout ce qu&rsquo;un MJ nécessite, jusqu&rsquo;au dernier gobelin',
      f_map_h: '🗺️ Constructeur de Cartes', f_map_p: 'Grilles carrées ou hex, murs, objets, étiquettes, terrain peignable, brouillard de guerre, jetons et échelle.',
      f_npc_h: '👹 Créateur de PNJ et Monstres', f_npc_p: 'Créez des blocs de stats avec PV, CA et icônes, ou importez du JSON. Le MJ mène chaque monstre sur la barre d&rsquo;initiative.',
      f_dice_h: '🎲 Dés &amp; Chat', f_dice_p: 'Plateau de dés complet (d4–d100) avec commandes /roll, avantage/désavantage et chat de table.',
      f_audio_h: '🔊 Moteur d&rsquo;Ambiance', f_audio_p: 'Boucles synthétisées — Pluie de Donjon, Bruits de Taverne, Gouttes de Caverne — plus vos MP3 ou URLs audio.',
      f_live_h: '⚔️ Sessions en Direct', f_live_p: 'Déplacement de jetons en temps réel, révélations de brouillard, tours et lobbies. Ouvrez un second onglet et regardez la table se synchroniser.',
      f_guide_h: '👺 Le Guide Gobelin', f_guide_p: 'Un compagnon flottant qui explique le site, répond aux règles D&amp;D 5e et conjure PNJ, rencontres et butin.',
      steps_h: 'Votre session en cinq étapes',
      st1: '<b>Forgez la salle</b> — nom, mot de passe et limite de joueurs.',
      st2: '<b>Construisez la carte</b> — modèle ou upload ; peignez le terrain et cachez des secrets dans le brouillard.',
      st3: '<b>Invoquez les menaces</b> — PNJ et monstres avec PV, CA et jetons.',
      st4: '<b>Créez l&rsquo;ambiance</b> — attachez une piste sonore pour la table.',
      st5: '<b>Publiez la salle</b> — partagez le code, attendez les « Prêts » puis <i>Lancez la Session</i>.',
      auth_h: '⚔️ Porte de l&rsquo;Aventurier',
      login_h: 'Connexion', signup_h: 'Inscription',
      fld_name: 'Nom d&rsquo;aventurier', fld_pass: 'Mot de passe', fld_pickname: 'Choisissez un nom', fld_pickpass: 'Choisissez un mot de passe',
      login_btn: 'Entrer dans la Caverne', signup_btn: 'Forger mon Compte',
      wiz_t: '🕯️ Forger une Nouvelle Salle', wiz_sub: 'Cinq étapes entre vous et une table pleine d&rsquo;aventuriers.',
      w1: 'Détails', w2: 'Carte', w3: 'PNJ', w4: 'Ambiance', w5: 'Lobby',
      s1_t: '📜 Détails de la Salle', s1_name: 'Nom de la salle', s1_pass: 'Mot de passe (optionnel)',
      s1_max: 'Joueurs max', s1_access: 'Règle d&rsquo;accès', acc_open: 'Ouverte — quiconque a le code', acc_pass: 'Protégée par mot de passe',
      next_map: 'Suivant : Carte →', next_npc: 'Suivant : PNJ →', next_atmo: 'Suivant : Ambiance →', next_lobby: 'Suivant : Lobby →',
      back_b: '← Retour',
      s2_t: '🗺️ Constructeur Avancé de Cartes', s3_t: '👹 Créateur de PNJ et Monstres', s4_t: '🔊 Ambiance &amp; Audio', s5_t: '🏰 Lobby d&rsquo;Attente',
      post_btn: '📯 Publier / Ouvrir la Salle', start_btn: '⚔️ Lancer la Session',
      copy_code: 'Copier le code', copy_link: 'Copier l&rsquo;invitation', abandon: 'Abandonner la salle',
      j_t: '🚪 Rejoindre une Salle', j_sub: 'Collez le code à 5 lettres ou le lien d&rsquo;invitation de votre MJ.',
      j_btn: 'Descendre', j_etiq_h: 'Savoir-vivre du lobby',
      j_etiq_p: 'Choisissez votre personnage, discutez avec le groupe et activez <b>Prêt</b>. La session démarre quand le MJ la lance. Les invités jouent tout de suite ; les comptes utilisent <b>Mon Coffre</b>.',
      j_enter: '🕯️ Entrer dans le Lobby', j_leave: 'Quitter la salle', j_ready: '✔ Je suis Prêt', j_unready: '❌ Pas prêt',
      j_roster: 'Liste du groupe', j_chat: 'Chat du groupe', j_char: 'Fiche de personnage',
      p_chat: '💬 Chat', p_dice: '🎲 Dés', p_party: '👥 Groupe', p_audio: '🔊 Audio',
      p_move: '✋ Déplacer / Panorama', p_fog: '🌫️ Pinceau de brouillard', p_reveal: '☀️ Révéler',
      p_next: 'Tour Suivant ▶', p_setinit: '🎲 Initiative', p_end: 'Terminer la Session', p_invite: '🔗 Inviter',
      p_amb_h: 'Ambiance de la salle', p_play: '▶ Lire', p_stop: '⏹ Stop', p_vol: 'Volume',
      a_vault: '🎒 Mon Coffre — Personnages', a_maps: '🗺️ Cartes Sauvegardées', a_play: '🎵 Playlists', a_hist: '📜 Historique des Salles',
      a_stats: 'Stats de Campagne', a_logout: 'Déconnexion', a_newchar: '⚒️ Nouveau / Importer Personnage',
      g_sub: 'aide du site • règles 5e • générateurs', g_ph: 'Demandez au gobelin…',
    },
    de: {
      nav_home: 'Start', nav_create: 'Raum erstellen', nav_join: 'Raum betreten', nav_account: 'Mein Konto',
      hdr_login: 'Anmelden', hdr_signup: 'Registrieren',
      tag_line: 'Ein virtueller Tisch für Dungeon-Forscher',
      hero_intro: 'Steig hinab in die Tiefe. Baue deine Welt auf Schlachtkarten im Nebel des Kriegs, beschwöre deine Monster, zünde die Fackeln — und versammle deine Gruppe am Tisch.',
      cta_create: '🕯️ Raum erstellen', cta_join: '🚪 Raum betreten', cta_auth: '⚔️ Anmelden / Registrieren',
      qj_ph: 'Raumcode…', qj_btn: 'Höhle betreten',
      ban_g_h: '🎭 Als Gast spielen — sofort',
      ban_g_p: 'Kein Konto nötig. Erstelle oder betritt jetzt einen Raum, fülle eine schnelle Charakterkarte und würfle mit deiner Gruppe.',
      ban_g_btn: 'Als Gast fortfahren',
      ban_u_h: '🔑 Anmelden — behalte deinen Schatz',
      ban_u_p: 'Angemeldete Abenteurer speichern Charaktere in <b>Meinem Tresor</b>, behalten Kartenbibliothek und Playlists, Kampagnenstatistiken und <b>Raumverlauf</b>.',
      ban_u_btn: 'Kostenloses Konto erstellen',
      feat_h: 'Alles, was ein DM braucht, bis zum letzten Goblin',
      f_map_h: '🗺️ Karten-Editor', f_map_p: 'Quadrat- oder Hexraster, Mauern, Objekte, Beschriftungen, malbares Terrain, Kriegsnebel, Token und Skalierung.',
      f_npc_h: '👹 NPC- &amp; Monster-Ersteller', f_npc_p: 'Erstelle Statusblöcke mit HP, AC und Icons oder importiere JSON. Der DM steuert jedes Monster auf der Initiativleiste.',
      f_dice_h: '🎲 Würfel &amp; Chat', f_dice_p: 'Volle Würfelablage (d4–d100) mit /roll-Befehlen, Vorteil/Nachteil und Tisch-Chat.',
      f_audio_h: '🔊 Atmosphären-Motor', f_audio_p: 'Synthetisierte Loops — Dungeon-Regen, Tavernenlärm, Höhlentropfen — plus eigene MP3s oder Audio-URLs.',
      f_live_h: '⚔️ Live-Sitzungen', f_live_p: 'Echtzeit-Tokenbewegung, Nebel-Enthüllungen, Zugverfolgung und Bereit-Lobbys. Öffne einen zweiten Tab und sieh die Sync.',
      f_guide_h: '👺 Der Goblin-Führer', f_guide_p: 'Ein schwebender Begleiter, der die Seite erklärt, D&amp;D-5e-Regeln beantwortet und NPCs, Begegnungen und Beute beschwört.',
      steps_h: 'Deine Sitzung in fünf Schritten',
      st1: '<b>Schmiede den Raum</b> — Name, Passwort und Spielerlimit.',
      st2: '<b>Baue die Karte</b> — Vorlage oder Upload; male Terrain und verbirge Geheimnisse im Nebel.',
      st3: '<b>Beschwöre die Gefahren</b> — NPCs und Monster mit HP, AC und Token.',
      st4: '<b>Setze die Stimmung</b> — hänge einen Ambient-Track an.',
      st5: '<b>Veröffentliche den Raum</b> — teile den Code, warte auf „Bereit“ und <i>starte die Sitzung</i>.',
      auth_h: '⚔️ Abenteurertor',
      login_h: 'Anmelden', signup_h: 'Registrieren',
      fld_name: 'Abenteurername', fld_pass: 'Passwort', fld_pickname: 'Wähle einen Namen', fld_pickpass: 'Wähle ein Passwort',
      login_btn: 'Höhle betreten', signup_btn: 'Konto schmieden',
      wiz_t: '🕯️ Neuen Raum schmieden', wiz_sub: 'Fünf Schritte zwischen dir und einem Tisch voller Abenteurer.',
      w1: 'Details', w2: 'Karte', w3: 'NPCs', w4: 'Atmo', w5: 'Lobby',
      s1_t: '📜 Raumdetails', s1_name: 'Raumname', s1_pass: 'Passwort (optional)',
      s1_max: 'Max. Spieler', s1_access: 'Zugangsregel', acc_open: 'Offen — jeder mit Code', acc_pass: 'Passwortgeschützt',
      next_map: 'Weiter: Karte →', next_npc: 'Weiter: NPCs →', next_atmo: 'Weiter: Atmosphäre →', next_lobby: 'Weiter: Lobby →',
      back_b: '← Zurück',
      s2_t: '🗺️ Erweiterter Karten-Editor', s3_t: '👹 NPC- &amp; Monster-Ersteller', s4_t: '🔊 Atmosphäre &amp; Audio', s5_t: '🏰 Wartelobby',
      post_btn: '📯 Raum veröffentlichen', start_btn: '⚔️ Spielsitzung starten',
      copy_code: 'Code kopieren', copy_link: 'Einladung kopieren', abandon: 'Raum verlassen',
      j_t: '🚪 Raum betreten', j_sub: 'Füge den 5-stelligen Code oder den Einladungslink deines DMs ein.',
      j_btn: 'Hinabsteigen', j_etiq_h: 'Lobby-Knigge',
      j_etiq_p: 'Wähle deinen Charakter, chatte mit der Gruppe und aktiviere <b>Bereit</b>. Die Sitzung startet, wenn der DM sie beginnt. Gäste spielen sofort; Konten nutzen <b>Meinen Tresor</b>.',
      j_enter: '🕯️ Lobby betreten', j_leave: 'Raum verlassen', j_ready: '✔ Ich bin bereit', j_unready: '❌ Nicht bereit',
      j_roster: 'Gruppenliste', j_chat: 'Gruppen-Chat', j_char: 'Charakterkarte',
      p_chat: '💬 Chat', p_dice: '🎲 Würfel', p_party: '👥 Gruppe', p_audio: '🔊 Audio',
      p_move: '✋ Bewegen / Schwenken', p_fog: '🌫️ Nebel-Pinsel', p_reveal: '☀️ Enthüllen',
      p_next: 'Nächster Zug ▶', p_setinit: '🎲 Initiative', p_end: 'Sitzung beenden', p_invite: '🔗 Einladen',
      p_amb_h: 'Raum-Atmosphäre', p_play: '▶ Abspielen', p_stop: '⏹ Stopp', p_vol: 'Lautstärke',
      a_vault: '🎒 Mein Tresor — Charaktere', a_maps: '🗺️ Gespeicherte Karten', a_play: '🎵 Playlists', a_hist: '📜 Raumverlauf',
      a_stats: 'Kampagnen-Stats', a_logout: 'Abmelden', a_newchar: '⚒️ Neu / Charakter importieren',
      g_sub: 'Seitenhilfe • 5e-Regeln • Generatoren', g_ph: 'Frag den Goblin…',
    },
  };

  function getLang() { return localStorage.getItem('gc_lang') || 'en'; }
  function t(key, vars) {
    const l = getLang();
    let s = (D[l] && D[l][key]) || D.en[key] || key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.documentElement.lang = getLang();
  }

  function setLang(l) {
    localStorage.setItem('gc_lang', l);
    apply();
    Bus && Bus.emit('lang', l);
  }

  /* ---------------- machine translation for AI content (best effort) ---------------- */
  const MT = (() => {
    const cache = {};
    async function translate(text, lang) {
      if (!lang || lang === 'en' || !text) return null;
      const key = lang + '|' + text.length + '|' + text.slice(0, 60);
      if (cache[key]) return cache[key];
      try {
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + lang + '&dt=t&q=' + encodeURIComponent(text);
        const r = await fetch(url);
        if (!r.ok) return null;
        const j = await r.json();
        const out = (j[0] || []).map(x => x[0] || '').join('');
        if (out) { cache[key] = out; return out; }
      } catch { /* offline / blocked: fall back to English */ }
      return null;
    }
    const strip = html => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { translate, strip };
  })();

  /* ---------------- AI Master narration pools ---------------- */
  const NARR = {
    en: [
      'Torches gutter as {name} seizes the moment — the cave holds its breath.',
      'A cold wind snuffs one torch. {name} acts while shadows lengthen.',
      'The goblins whisper: {name} moves, and the dark leans in to watch.',
      'Dice of fate spin above the table… {name}, the cave is yours.',
      'Somewhere below, something hungry counts your footfalls. {name}, your move.',
      'Embers rise like spirits. The round bends toward {name}.',
    ],
    pt: [
      'As tochas tremem quando {name} agarra o momento — a caverna prende a respiração.',
      'Um vento frio apaga uma tocha. {name} age enquanto as sombras crescem.',
      'Os goblins sussurram: {name} move-se, e a escuridão inclina-se para ver.',
      'Os dados do destino giram sobre a mesa… {name}, a caverna é tua.',
      'Lá em baixo, algo faminto conta os teus passos. {name}, é a tua vez.',
      'Fagulhas sobem como espíritos. A ronda volta-se para {name}.',
    ],
    es: [
      'Las antorchas titilan cuando {name} toma el momento — la cueva contiene el aliento.',
      'Un viento frío apaga una antorcha. {name} actúa mientras las sombras crecen.',
      'Los goblins susurran: {name} se mueve, y la oscuridad se inclina a mirar.',
      'Los dados del destino giran sobre la mesa… {name}, la cueva es tuya.',
      'En lo profundo, algo hambriento cuenta tus pasos. {name}, es tu turno.',
      'Ascuas suben como espíritus. La ronda se vuelve hacia {name}.',
    ],
    fr: [
      'Les torches vacillent quand {name} saisit l&rsquo;instant — la caverne retient son souffle.',
      'Un vent froid éteint une torche. {name} agit tandis que les ombres s&rsquo;allongent.',
      'Les gobelins chuchotent : {name} bouge, et l&rsquo;obscurité se penche pour regarder.',
      'Les dés du destin tournent au-dessus de la table… {name}, la caverne est à vous.',
      'Quelque part en bas, une chose affamée compte vos pas. {name}, à vous de jouer.',
      'Des braises montent comme des esprits. Le round se tourne vers {name}.',
    ],
    de: [
      'Die Fackeln flackern, als {name} den Moment ergreift — die Höhle hält den Atem an.',
      'Ein kalter Wind löscht eine Fackel. {name} handelt, während die Schatten wachsen.',
      'Die Goblins flüstern: {name} bewegt sich, und die Dunkelheit beugt sich herbei.',
      'Die Schicksalswürfel kreisen über dem Tisch… {name}, die Höhle gehört dir.',
      'Irgendwo unten zählt etwas Hungriges deine Schritte. {name}, du bist am Zug.',
      'Funken steigen wie Geister empor. Die Runde wendet sich {name} zu.',
    ],
  };
  function narrate(lang, name) {
    const pool = NARR[lang] || NARR.en;
    return pick(pool).replace('{name}', name || '…');
  }

  const aiMasterOn = () => localStorage.getItem('gc_aimaster') === '1';
  function setAiMaster(on) { localStorage.setItem('gc_aimaster', on ? '1' : '0'); Bus && Bus.emit('aimaster', on); }

  return { LANGS, t, apply, setLang, getLang, MT, narrate, aiMasterOn, setAiMaster };
})();
