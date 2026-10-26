/**
 * Catalogue des messages d'erreur : [texte francais, malagasy, anglais].
 *
 * Le texte francais est la CLE (celui que le code lance : new
 * BadRequestException('...'), `message:` des DTO...). La recherche ignore la
 * casse, les accents, l'apostrophe typographique et le point final : une
 * seule entree couvre donc "Profil etudiant introuvable" et
 * "Profil étudiant introuvable.".
 *
 * Les lignes marquees `// RELIRE` ont un malagasy dont la justesse est
 * incertaine : relecture par un locuteur natif recommandee.
 *
 * Glossaire malagasy utilise : asa (mission), serivisy (service),
 * kandidatiora (candidature), fanaterana (livraison), fandoavam-bola
 * (paiement), kaonty (compte), tenimiafina (mot de passe), famantarana
 * (jeton), vondrona (groupe), mpikambana (membre), fanasana (invitation),
 * mpianatra (etudiant), mpanjifa (client), mpitantana (administrateur).
 */
export type EntreeCatalogue = readonly [fr: string, mg: string, en: string];

export const CATALOGUE_ERREURS: readonly EntreeCatalogue[] = [
  // ------------------------------------------------------------------
  // Authentification / securite
  // ------------------------------------------------------------------
  [
    'Identifiants invalides',
    'Diso ny adiresy mailaka na ny tenimiafina.',
    'Invalid email or password.',
  ],
  [
    'Trop de tentatives de connexion. Reessayez dans quelques minutes.',
    'Betsaka loatra ny fanandramana hiditra. Andramo indray afaka minitra vitsy.',
    'Too many sign-in attempts. Please try again in a few minutes.',
  ],
  [
    'Ce compte est suspendu ou desactive',
    'Voatsahatra na tsy mavitrika ity kaonty ity.', // RELIRE (suspendu)
    'This account is suspended or deactivated.',
  ],
  [
    "Votre adresse email n'a pas encore ete verifiee. Consultez votre boite de reception et cliquez sur le lien de verification recu a l'inscription.",
    "Mbola tsy voamarina ny adiresy mailakao. Jereo ny boaty fandraisanao ary tsindrio ny rohy fanamarinana voaray rehefa nisoratra anarana ianao.",
    "Your email address has not been verified yet. Check your inbox and click the verification link you received when you signed up.",
  ],
  [
    "Seuls les roles etudiant ou client sont autorises a l'inscription",
    "Ny andraikitra mpianatra na mpanjifa ihany no azo ifidianana rehefa misoratra anarana.",
    'Only the student or client roles are allowed at sign-up.',
  ],
  [
    'Adresse email trop longue',
    'Lava loatra ny adiresy mailaka.',
    'Email address is too long.',
  ],
  [
    'Cette adresse email est deja utilisee',
    "Efa nampiasaina ity adiresy mailaka ity.",
    'This email address is already in use.',
  ],
  [
    "Un compte Kianja existe deja avec cette adresse email. Connectez-vous avec votre mot de passe, puis liez votre compte Google depuis vos parametres.",
    "Misy kaonty Kianja efa mampiasa ity adiresy mailaka ity. Midira amin'ny tenimiafinao, dia ampifandraiso ny kaonty Google-nao ao amin'ny fanamboarana.",
    'A Kianja account already exists with this email address. Sign in with your password, then link your Google account from your settings.',
  ],
  [
    'Un compte Google est deja lie a ce compte',
    "Efa mifandray amin'ity kaonty ity ny kaonty Google iray.",
    'A Google account is already linked to this account.',
  ],
  [
    "L'adresse email du compte Google doit etre identique a celle de votre compte Kianja.",
    "Tsy maintsy mitovy amin'ny an'ny kaonty Kianja-nao ny adiresy mailaka an'ny kaonty Google.",
    "The email address of the Google account must match the one on your Kianja account.",
  ],
  [
    'Ce compte Google est deja associe a un compte Kianja',
    "Efa mifandray amin'ny kaonty Kianja iray ity kaonty Google ity.",
    'This Google account is already linked to a Kianja account.',
  ],
  [
    'Votre role est deja defini',
    "Efa voafidy ny andraikitrao.",
    'Your role has already been set.',
  ],
  [
    'Refresh token invalide ou expire',
    "Tsy mety na lany daty ny fidirana nataonao. Midira indray azafady.",
    'Your session is invalid or has expired. Please sign in again.',
  ],
  [
    'Lien de reinitialisation invalide ou expire',
    "Tsy mety na lany daty ny rohy famerenana ny tenimiafina.",
    'The password reset link is invalid or has expired.',
  ],
  [
    'Lien de verification invalide, expire ou deja utilise',
    "Tsy mety, lany daty na efa nampiasaina ny rohy fanamarinana.",
    'The verification link is invalid, expired or has already been used.',
  ],
  [
    'Lien de verification expire. Demandez un nouvel email de verification depuis la page de connexion.',
    "Lany daty ny rohy fanamarinana. Angataho mailaka fanamarinana vaovao avy ao amin'ny pejy fidirana.",
    'The verification link has expired. Request a new verification email from the sign-in page.',
  ],
  [
    'Requete refusee',
    'Nolavina ny fangatahana.',
    'Request refused.',
  ],
  [
    'Type de jeton invalide',
    "Tsy mety ny karazan'ny famantarana.", // RELIRE
    'Invalid token type.',
  ],
  [
    'Compte introuvable, suspendu ou desactive',
    'Tsy hita, voatsahatra na tsy mavitrika ny kaonty.', // RELIRE (suspendu)
    'Account not found, suspended or deactivated.',
  ],
  [
    'Choisissez votre role (etudiant ou client) pour continuer.',
    "Safidio ny andraikitrao (mpianatra na mpanjifa) vao afaka manohy.",
    'Choose your role (student or client) to continue.',
  ],
  // Google
  [
    "La connexion avec Google n'est pas disponible pour le moment.",
    "Tsy azo atao amin'izao fotoana izao ny fidirana amin'ny alalan'ny Google.",
    'Sign-in with Google is not available at the moment.',
  ],
  [
    'Google est momentanement injoignable. Reessayez dans quelques instants.',
    "Tsy azo tratra vetivety i Google. Andramo indray afaka fotoana fohy.",
    'Google is temporarily unreachable. Please try again in a few moments.',
  ],
  [
    'Jeton Google invalide ou expire',
    'Tsy mety na lany daty ny famantarana Google.',
    'Invalid or expired Google token.',
  ],
  [
    "L'adresse email de ce compte Google n'est pas verifiee par Google.",
    "Tsy voamarin'i Google ny adiresy mailaka an'ity kaonty Google ity.",
    "The email address of this Google account has not been verified by Google.",
  ],
  // Anti-robot (Turnstile)
  [
    'Verification anti-robot requise. Veuillez la completer puis reessayer.',
    "Ilaina ny fanamarinana fa tsy rôbô ianao. Fenoy azafady, dia andramo indray.",
    'Anti-robot verification is required. Please complete it and try again.',
  ],
  [
    'Verification anti-robot invalide.',
    "Tsy mety ny fanamarinana fa tsy rôbô ianao.",
    'Invalid anti-robot verification.',
  ],
  [
    'La verification anti-robot a expire ou a deja ete utilisee. Veuillez la refaire.',
    "Lany daty na efa nampiasaina ny fanamarinana fa tsy rôbô ianao. Avereno azafady.",
    'The anti-robot verification has expired or has already been used. Please redo it.',
  ],
  [
    'Verification anti-robot echouee. Veuillez reessayer.',
    "Tsy nahomby ny fanamarinana fa tsy rôbô ianao. Andramo indray azafady.",
    'Anti-robot verification failed. Please try again.',
  ],
  [
    'Verification anti-robot momentanement indisponible. Reessayez dans quelques instants.',
    "Tsy azo atao vetivety ny fanamarinana fa tsy rôbô ianao. Andramo indray afaka fotoana fohy.",
    'Anti-robot verification is temporarily unavailable. Please try again in a few moments.',
  ],
  // Roles / droits
  [
    'Vous ne pouvez pas agir sur votre propre compte',
    "Tsy azonao atao amin'ny kaonty-nao manokana io hetsika io.",
    'You cannot act on your own account.',
  ],
  [
    'Un compte administrateur ne peut pas etre modifie depuis cette interface',
    "Tsy azo ovaina avy amin'ity pejy ity ny kaonty mpitantana.",
    'An administrator account cannot be modified from this interface.',
  ],

  // ------------------------------------------------------------------
  // Utilisateurs / profils
  // ------------------------------------------------------------------
  ['Utilisateur introuvable', 'Tsy hita ny mpampiasa.', 'User not found.'],
  [
    "Ce compte ne peut pas être supprimé définitivement : il a un historique de paiements et/ou d'évaluations. Utilisez la désactivation du compte à la place.",
    "Tsy azo fafana tanteraka ity kaonty ity satria manana tantaram-pandoavam-bola sy/na fanombanana. Ampiasao ny fanafoanana ny kaonty (tsy mavitrika) fa tsy ny famafana.", // RELIRE
    'This account cannot be permanently deleted: it has a payment and/or review history. Deactivate the account instead.',
  ],
  [
    'La langue doit etre fr, mg ou en',
    "Ny fiteny dia tsy maintsy fr, mg na en.",
    'The language must be fr, mg or en.',
  ],
  ['Profil etudiant introuvable', 'Tsy hita ny mombamomba ny mpianatra.', 'Student profile not found.'],
  ['Profil client introuvable', 'Tsy hita ny mombamomba ny mpanjifa.', 'Client profile not found.'],
  ['Profil introuvable', 'Tsy hita ny mombamomba.', 'Profile not found.'],
  ['Étudiant introuvable.', 'Tsy hita ilay mpianatra.', 'Student not found.'],
  [
    'Le mot de passe doit contenir au moins 8 caracteres',
    'Ny tenimiafina dia tsy maintsy misy tarehintsoratra 8 farafahakeliny.',
    'The password must contain at least 8 characters.',
  ],
  [
    'Le role doit etre etudiant ou client',
    'Ny andraikitra dia tsy maintsy mpianatra na mpanjifa.',
    'The role must be student or client.',
  ],
  [
    'Le numero de telephone est invalide',
    'Tsy mety ny laharan-telefaona.',
    'The phone number is invalid.',
  ],
  [
    "L'URL doit commencer par http:// ou https://",
    "Ny URL dia tsy maintsy manomboka amin'ny http:// na https://.",
    'The URL must start with http:// or https://.',
  ],
  [
    "L'URL du site web doit etre une URL http(s) valide",
    "Ny URL an'ny tranokala dia tsy maintsy URL http(s) mety.",
    'The website URL must be a valid http(s) URL.',
  ],
  [
    "L'URL GitHub doit etre une URL http(s) valide",
    "Ny URL GitHub dia tsy maintsy URL http(s) mety.",
    'The GitHub URL must be a valid http(s) URL.',
  ],
  [
    "L'URL GitLab doit etre une URL http(s) valide",
    "Ny URL GitLab dia tsy maintsy URL http(s) mety.",
    'The GitLab URL must be a valid http(s) URL.',
  ],
  [
    "L'URL LinkedIn doit etre une URL http(s) valide",
    "Ny URL LinkedIn dia tsy maintsy URL http(s) mety.",
    'The LinkedIn URL must be a valid http(s) URL.',
  ],
  [
    'Le budget minimum ne peut pas etre superieur au budget maximum',
    "Tsy azo lehibe noho ny ambony indrindra ny teti-bola ambany indrindra.",
    'The minimum budget cannot be greater than the maximum budget.',
  ],
  [
    'Le tarif minimum ne peut pas etre superieur au tarif maximum',
    "Tsy azo lehibe noho ny ambony indrindra ny saram-panompoana ambany indrindra.", // RELIRE (tarif)
    'The minimum rate cannot be greater than the maximum rate.',
  ],
  [
    'Le tarif horaire ne peut pas etre inferieur au tarif minimum',
    "Tsy azo ambany noho ny saram-panompoana ambany indrindra ny saram-panompoana isaky ny ora.", // RELIRE (tarif)
    'The hourly rate cannot be lower than the minimum rate.',
  ],
  [
    'Le tarif horaire ne peut pas etre superieur au tarif maximum',
    "Tsy azo lehibe noho ny saram-panompoana ambony indrindra ny saram-panompoana isaky ny ora.", // RELIRE (tarif)
    'The hourly rate cannot be greater than the maximum rate.',
  ],
  [
    'La photo doit etre un fichier envoye a la plateforme ou une URL https.',
    "Ny sary dia tsy maintsy rakitra nalefa tamin'ny sehatra na URL https.",
    'The photo must be a file uploaded to the platform or an https URL.',
  ],
  [
    'Maximum 10 liens de portfolio.',
    "Rohy 10 ho be indrindra ao amin'ny portfolio.",
    'Maximum 10 portfolio links.',
  ],
  [
    'Chaque lien de portfolio doit commencer par http:// ou https://',
    "Ny rohy rehetra ao amin'ny portfolio dia tsy maintsy manomboka amin'ny http:// na https://.",
    'Each portfolio link must start with http:// or https://.',
  ],
  [
    'Chaque lien de portfolio doit etre une URL http(s) valide',
    "Ny rohy rehetra ao amin'ny portfolio dia tsy maintsy URL http(s) mety.",
    'Each portfolio link must be a valid http(s) URL.',
  ],
  [
    "L'annee d'etude doit etre L1-L3, M1-M2, D1-D3 ou un chiffre de 1 a 7",
    "Ny taona fianarana dia tsy maintsy L1-L3, M1-M2, D1-D3 na isa manomboka amin'ny 1 hatramin'ny 7.",
    'The year of study must be L1-L3, M1-M2, D1-D3 or a number from 1 to 7.',
  ],
  [
    "L'URL doit commencer par http:// ou https:/",
    "Ny URL dia tsy maintsy manomboka amin'ny http:// na https://.",
    'The URL must start with http:// or https://.',
  ],
  [
    'Aucun fichier CV n’a été envoyé.',
    'Tsy nisy rakitra CV nalefa.',
    'No CV file was uploaded.',
  ],
  [
    'Format non supporté. Envoyez un CV au format PDF, JPG, PNG ou WebP.',
    "Tsy ekena ny endrika. Alefaso CV amin'ny endrika PDF, JPG, PNG na WebP.",
    'Unsupported format. Upload a CV as a PDF, JPG, PNG or WebP file.',
  ],

  // ------------------------------------------------------------------
  // Missions / matching / candidatures
  // ------------------------------------------------------------------
  ['Mission introuvable', 'Tsy hita ilay asa.', 'Mission not found.'],
  [
    'Cette mission ne vous appartient pas',
    "Tsy anao ity asa ity.",
    'This mission does not belong to you.',
  ],
  [
    'La date limite ne peut pas etre dans le passe',
    "Tsy azo atao tamin'ny lasa ny daty farany.",
    'The deadline cannot be in the past.',
  ],
  [
    'Vous ne pouvez modifier que vos propres missions',
    "Ny asa nataonao ihany no azonao ovaina.",
    'You can only edit your own missions.',
  ],
  [
    'Vous ne pouvez supprimer que vos propres missions',
    "Ny asa nataonao ihany no azonao fafana.",
    'You can only delete your own missions.',
  ],
  [
    'Cette mission est en cours ou terminee : elle ne peut pas etre supprimee (un historique metier lui est rattache).',
    "Mbola mandeha na vita ity asa ity: tsy azo fafana (misy tantara mifandray aminy).",
    'This mission is in progress or completed: it cannot be deleted (it has related business history).',
  ],
  [
    'Cette mission a une candidature acceptee : elle ne peut pas etre supprimee.',
    "Misy kandidatiora efa ekena ity asa ity: tsy azo fafana.",
    'This mission has an accepted application: it cannot be deleted.',
  ],
  [
    "Cette mission n'accepte plus de nouvelles candidatures",
    "Tsy mandray kandidatiora vaovao intsony ity asa ity.",
    'This mission no longer accepts new applications.',
  ],
  [
    'La date limite de candidature pour cette mission est depassee',
    "Lany ny daty farany handefasana kandidatiora ho an'ity asa ity.",
    'The application deadline for this mission has passed.',
  ],
  [
    'Vous avez deja postule a cette mission',
    "Efa nandefa kandidatiora ho an'ity asa ity ianao.",
    'You have already applied to this mission.',
  ],
  ['Groupe introuvable', 'Tsy hita ilay vondrona.', 'Group not found.'],
  [
    'Seul le chef du groupe peut déposer une candidature au nom du groupe',
    "Ny lehiben'ny vondrona ihany no afaka mandefa kandidatiora amin'ny anaran'ny vondrona.",
    'Only the group leader can submit an application on behalf of the group.',
  ],
  [
    'Ce groupe a deja postule a cette mission',
    "Efa nandefa kandidatiora ho an'ity asa ity ity vondrona ity.",
    'This group has already applied to this mission.',
  ],
  [
    'Vous ne pouvez consulter que les candidatures de vos propres missions',
    "Ny kandidatiora ho an'ny asa nataonao ihany no azonao jerena.",
    'You can only view applications for your own missions.',
  ],
  ['Candidature introuvable', 'Tsy hita ilay kandidatiora.', 'Application not found.'],
  [
    'Vous ne pouvez traiter que les candidatures de vos propres missions',
    "Ny kandidatiora ho an'ny asa nataonao ihany no azonao karakaraina.", // RELIRE (traiter)
    'You can only process applications for your own missions.',
  ],
  [
    'Cette candidature a deja ete traitee',
    "Efa voasoratra ny valiny momba an'ity kandidatiora ity.", // RELIRE (traitee)
    'This application has already been processed.',
  ],
  [
    "Cette mission n'accepte plus de candidature : impossible d'accepter une candidature sur une mission qui n'est plus ouverte.",
    "Tsy mandray kandidatiora intsony ity asa ity: tsy azo ekena ny kandidatiora amin'asa tsy misokatra intsony.",
    'This mission no longer accepts applications: an application cannot be accepted on a mission that is no longer open.',
  ],
  [
    'Cette candidature a deja ete traitee et ne peut plus etre modifiee.',
    "Efa voasoratra ny valiny momba an'ity kandidatiora ity ka tsy azo ovaina intsony.", // RELIRE
    'This application has already been processed and can no longer be modified.',
  ],
  [
    'Cette candidature a deja ete traitee et ne peut plus etre annulee.',
    "Efa voasoratra ny valiny momba an'ity kandidatiora ity ka tsy azo foanana intsony.", // RELIRE
    'This application has already been processed and can no longer be cancelled.',
  ],
  [
    'Vous ne pouvez gérer que vos propres candidatures.',
    "Ny kandidatiora nataonao ihany no azonao tantanana.",
    'You can only manage your own applications.',
  ],
  [
    'Une candidature acceptee ou refusee ne peut plus etre modifiee.',
    "Tsy azo ovaina intsony ny kandidatiora efa ekena na nolavina.",
    'An accepted or rejected application can no longer be modified.',
  ],
  [
    'Seul le chef du groupe peut gérer cette candidature.',
    "Ny lehiben'ny vondrona ihany no afaka mitantana an'ity kandidatiora ity.",
    'Only the group leader can manage this application.',
  ],
  [
    "Seule une candidature acceptee autorise le depot d'une livraison",
    "Ny kandidatiora efa ekena ihany no mahafaka mandefa fanaterana.",
    'Only an accepted application allows a delivery to be submitted.',
  ],

  // ------------------------------------------------------------------
  // Services / demandes de service
  // ------------------------------------------------------------------
  ['Service introuvable', 'Tsy hita ilay serivisy.', 'Service not found.'],
  [
    'Ce service est archive : restaurez-le avant de le republier.',
    "Efa ao amin'ny arkiva ity serivisy ity: averina aloha vao havoaka indray.", // RELIRE
    'This service is archived: restore it before republishing it.',
  ],
  [
    "Ce service n'est pas archive.",
    "Tsy ao amin'ny arkiva ity serivisy ity.", // RELIRE
    'This service is not archived.',
  ],
  [
    'Ce service est lié à des commandes : il ne peut pas être supprimé définitivement. Archivez-le plutôt.',
    "Mifandray amin'ny fangatahana serivisy ity serivisy ity: tsy azo fafana tanteraka. Ataovy arkiva kosa.", // RELIRE
    'This service is linked to orders: it cannot be permanently deleted. Archive it instead.',
  ],
  [
    'Vous ne pouvez modifier que vos propres services',
    "Ny serivisy nataonao ihany no azonao ovaina.",
    'You can only edit your own services.',
  ],
  [
    'Vous ne pouvez archiver que vos propres services',
    "Ny serivisy nataonao ihany no azonao ataovy arkiva.", // RELIRE
    'You can only archive your own services.',
  ],
  [
    'Vous ne pouvez restaurer que vos propres services',
    "Ny serivisy nataonao ihany no azonao averina.",
    'You can only restore your own services.',
  ],
  [
    'Vous ne pouvez supprimer que vos propres services',
    "Ny serivisy nataonao ihany no azonao fafana.",
    'You can only delete your own services.',
  ],
  [
    "Ce service n'est plus disponible",
    "Tsy misy intsony ity serivisy ity.",
    'This service is no longer available.',
  ],
  [
    'Vous ne pouvez pas commander votre propre service',
    "Tsy azonao angatahana ny serivisy nataonao manokana.",
    'You cannot order your own service.',
  ],
  [
    'Demande de service introuvable',
    'Tsy hita ilay fangatahana serivisy.',
    'Service request not found.',
  ],
  [
    "Vous n'avez pas acces a cette demande de service",
    "Tsy manana alalana hiditra amin'ity fangatahana serivisy ity ianao.",
    'You do not have access to this service request.',
  ],
  [
    'Vous ne pouvez traiter que les demandes recues sur vos propres services',
    "Ny fangatahana voaray ho an'ny serivisy nataonao ihany no azonao karakaraina.", // RELIRE (traiter)
    'You can only process requests received for your own services.',
  ],
  [
    'Cette demande a deja ete traitee',
    "Efa voasoratra ny valiny momba an'ity fangatahana ity.", // RELIRE
    'This request has already been processed.',
  ],
  [
    'Merci de detailler votre besoin (20 caracteres minimum)',
    "Azafady, lazao amin'ny antsipiriany ny zavatra ilainao (tarehintsoratra 20 farafahakeliny).",
    'Please describe your need in more detail (20 characters minimum).',
  ],

  // ------------------------------------------------------------------
  // Paiements / moyens de paiement / factures
  // ------------------------------------------------------------------
  [
    "Ce moyen de paiement n'est pas encore disponible sur la plateforme. Utilisez MVola ou le virement bancaire.",
    "Mbola tsy azo ampiasaina eto amin'ny sehatra ity fomba fandoavam-bola ity. Ampiasao ny MVola na ny famindrana bola amin'ny banky.",
    'This payment method is not yet available on the platform. Use MVola or bank transfer.',
  ],
  [
    'Vous ne pouvez payer que vos propres missions',
    "Ny asa nataonao ihany no azonao aloa.",
    'You can only pay for your own missions.',
  ],
  [
    'Un paiement existe deja pour cette candidature',
    "Efa misy fandoavam-bola ho an'ity kandidatiora ity.",
    'A payment already exists for this application.',
  ],
  [
    'Le numéro MVola du payeur est obligatoire (saisissez-le ou sélectionnez un moyen de paiement enregistré).',
    "Ilaina ny laharana MVola an'ny mpandoa (soraty izy na safidio ny fomba fandoavam-bola voarakitra).",
    'The payer’s MVola number is required (enter it or select a saved payment method).',
  ],
  [
    'La reference du virement est obligatoire.',
    "Ilaina ny tondron'ny famindrana bola.",
    'The transfer reference is required.',
  ],
  [
    "Le paiement Papi n'est pas disponible pour le moment. Utilisez un autre moyen de paiement ou reessayez plus tard.",
    "Tsy azo atao amin'izao fotoana izao ny fandoavam-bola Papi. Ampiasao fomba fandoavam-bola hafa na andramo indray any aoriana.",
    'Papi payment is not available at the moment. Use another payment method or try again later.',
  ],
  [
    'Montant du paiement invalide.',
    "Tsy mety ny habetsaky ny fandoavam-bola.",
    'Invalid payment amount.',
  ],
  [
    'Le nom du client est introuvable : completez votre profil avant de payer.',
    "Tsy hita ny anaran'ny mpanjifa: fenoy ny mombamomba anao alohan'ny handoavana.",
    'The client name could not be found: complete your profile before paying.',
  ],
  [
    'Le paiement a ete initie mais son enregistrement a echoue. Reessayez : votre paiement sera repris sans doublon.',
    "Nanomboka ny fandoavam-bola nefa tsy tafiditra ny firaketana azy. Andramo indray: ho tohizana ny fandoavam-bolanao tsy hisy indroa.",
    'The payment was initiated but recording it failed. Try again: your payment will be resumed without being duplicated.',
  ],
  [
    "Le paiement MVola en ligne n'est pas actif sur la plateforme. Configurez les identifiants marchands (MVOLA_*) ou utilisez le virement.",
    "Tsy mbola mandeha eto amin'ny sehatra ny fandoavam-bola MVola an-tserasera. Apetraho ny mombamomba ny mpivarotra (MVOLA_*) na ampiasao ny famindrana bola.",
    'Online MVola payment is not active on the platform. Configure the merchant credentials (MVOLA_*) or use bank transfer.',
  ],
  [
    'Le fournisseur de paiement MVola a refuse la transaction. Verifiez votre numero et reessayez.',
    "Nolavin'ny MVola ny fandoavam-bola. Hamarino ny laharanao ary andramo indray.",
    'The MVola payment provider declined the transaction. Check your number and try again.',
  ],
  [
    "L'étudiant bénéficiaire n'a pas encore configuré de moyen de paiement actif. Le paiement ne peut pas être effectué tant qu'il n'en a pas ajouté un dans ses paramètres.",
    "Mbola tsy nanamboatra fomba fandoavam-bola mavitrika ilay mpianatra handray ny vola. Tsy azo atao ny fandoavam-bola raha tsy mbola nampiditra iray ao amin'ny fanamboarany izy.",
    'The beneficiary student has not yet set up an active payment method. The payment cannot be made until they add one in their settings.',
  ],
  [
    'Vous ne pouvez consulter que les coordonnees de vos propres missions',
    "Ny mombamomba ny asa nataonao ihany no azonao jerena.",
    'You can only view the details of your own missions.',
  ],
  [
    'Vous ne pouvez consulter que vos propres paiements',
    "Ny fandoavam-bola nataonao ihany no azonao jerena.",
    'You can only view your own payments.',
  ],
  [
    'Vous ne pouvez verifier que vos propres paiements',
    "Ny fandoavam-bola nataonao ihany no azonao hamarinina.",
    'You can only verify your own payments.',
  ],
  [
    'Ce paiement est une declaration manuelle : sa verification se fait par un administrateur.',
    "Fanambarana an-tanana ity fandoavam-bola ity: mpitantana no manamarina azy.",
    'This payment is a manual declaration: it is verified by an administrator.',
  ],
  [
    "Cette transaction n'a pas d'identifiant fournisseur : verification impossible",
    "Tsy manana mari-pamantarana avy amin'ny mpamatsy ity fandoavam-bola ity: tsy azo hamarinina.", // RELIRE
    'This transaction has no provider identifier: verification is not possible.',
  ],
  [
    'La verification aupres du fournisseur est indisponible pour le moment. Reessayez dans un instant.',
    "Tsy azo atao amin'izao fotoana izao ny fanamarinana amin'ny mpamatsy. Andramo indray afaka fotoana fohy.",
    'Verification with the provider is unavailable at the moment. Please try again shortly.',
  ],
  ['Notification invalide', 'Tsy mety ny fampandrenesana.', 'Invalid notification.'],
  ['Transaction inconnue', 'Tsy fantatra ny fandoavam-bola.', 'Unknown transaction.'],
  [
    'Transaction non eligible a une notification',
    "Tsy mahafeno ny fepetra handraisana fampandrenesana ity fandoavam-bola ity.", // RELIRE
    'Transaction not eligible for a notification.',
  ],
  [
    'Montant de la notification incoherent',
    "Tsy mifanaraka ny habetsaky ny fampandrenesana.",
    'Notification amount mismatch.',
  ],
  [
    'Verification fournisseur indisponible',
    "Tsy azo atao ny fanamarinana amin'ny mpamatsy.",
    'Provider verification unavailable.',
  ],
  [
    'Un paiement en ligne (MVola / Papi) ne peut pas etre confirme manuellement : utilisez la verification fournisseur.',
    "Tsy azo ekena an-tanana ny fandoavam-bola an-tserasera (MVola / Papi): ampiasao ny fanamarinana amin'ny mpamatsy.",
    'An online payment (MVola / Papi) cannot be confirmed manually: use provider verification.',
  ],
  [
    'Ce paiement a deja ete traite',
    "Efa voakarakara ity fandoavam-bola ity.", // RELIRE
    'This payment has already been processed.',
  ],
  [
    'Un paiement en ligne (MVola / Papi) ne peut pas etre annule manuellement : son statut est gere par le fournisseur.',
    "Tsy azo foanana an-tanana ny fandoavam-bola an-tserasera (MVola / Papi): ny mpamatsy no mitantana ny toetrany.",
    'An online payment (MVola / Papi) cannot be cancelled manually: its status is managed by the provider.',
  ],
  ['Webhook non configure', 'Tsy voaomana ny webhook.', 'Webhook not configured.'],
  [
    'Signature webhook manquante',
    'Tsy misy ny sonia (signature) webhook.', // RELIRE
    'Missing webhook signature.',
  ],
  [
    'Signature webhook invalide',
    'Tsy mety ny sonia (signature) webhook.', // RELIRE
    'Invalid webhook signature.',
  ],
  [
    'Le numero MVola doit etre au format 034XXXXXXX (ou 032/033)',
    "Ny laharana MVola dia tsy maintsy amin'ny endrika 034XXXXXXX (na 032/033).",
    'The MVola number must be in the format 034XXXXXXX (or 032/033).',
  ],
  [
    'Impossible de définir comme principal un moyen de paiement désactivé.',
    "Tsy azo atao fomba fandoavam-bola fototra ny fomba efa nofoanana.",
    'A deactivated payment method cannot be set as the primary one.',
  ],
  [
    'Ce moyen de paiement est référencé par un ou plusieurs paiements et ne peut pas être supprimé. Désactivez-le plutôt.',
    "Misy fandoavam-bola mampiasa ity fomba fandoavam-bola ity ka tsy azo fafana. Atsahatro (ataovy tsy mavitrika) kosa.",
    'This payment method is referenced by one or more payments and cannot be deleted. Deactivate it instead.',
  ],
  [
    'Moyen de paiement introuvable',
    'Tsy hita ilay fomba fandoavam-bola.',
    'Payment method not found.',
  ],
  [
    'Ce moyen de paiement ne vous appartient pas',
    "Tsy anao ity fomba fandoavam-bola ity.",
    'This payment method does not belong to you.',
  ],
  [
    'Ce moyen de paiement est désactivé : il ne peut pas être utilisé pour un nouveau paiement',
    "Tsy mavitrika ity fomba fandoavam-bola ity: tsy azo ampiasaina amin'ny fandoavam-bola vaovao.",
    'This payment method is deactivated: it cannot be used for a new payment.',
  ],
  [
    'Vous ne pouvez gérer que vos propres moyens de paiement',
    "Ny fomba fandoavam-bola nataonao ihany no azonao tantanana.",
    'You can only manage your own payment methods.',
  ],
  [
    "Seuls les moyens Mobile Money sont acceptés côté client (MVola, Orange Money, Airtel Money).",
    "Ny Mobile Money ihany (MVola, Orange Money, Airtel Money) no ekena ho an'ny mpanjifa.",
    'Only Mobile Money methods are accepted for clients (MVola, Orange Money, Airtel Money).',
  ],
  [
    'Le numéro Mobile Money doit être au format malgache : 10 chiffres commençant par 03 (ex. 0341234567)',
    "Ny laharana Mobile Money dia tsy maintsy amin'ny endrika malagasy: isa 10 manomboka amin'ny 03 (oh. 0341234567).",
    'The Mobile Money number must be in Malagasy format: 10 digits starting with 03 (e.g. 0341234567).',
  ],
  [
    "Ce moyen de paiement n'appartient pas a l'etudiant beneficiaire",
    "Tsy an'ilay mpianatra handray ny vola ity fomba fandoavam-bola ity.",
    'This payment method does not belong to the beneficiary student.',
  ],
  [
    'Le nom du titulaire est obligatoire (RG-PAY-007)',
    "Ilaina ny anaran'ny tompon'ny kaonty (RG-PAY-007).",
    'The account holder name is required (RG-PAY-007).',
  ],
  [
    'Le numero (Mobile Money ou compte bancaire) est obligatoire',
    "Ilaina ny laharana (Mobile Money na kaonty banky).",
    'The number (Mobile Money or bank account) is required.',
  ],
  [
    'Le nom de la banque est obligatoire pour un compte bancaire (RG-PAY-005)',
    "Ilaina ny anaran'ny banky ho an'ny kaonty banky (RG-PAY-005).",
    'The bank name is required for a bank account (RG-PAY-005).',
  ],
  [
    'Le numero Mobile Money doit etre au format malgache : 10 chiffres commençant par 03 (ex. 0341234567)',
    "Ny laharana Mobile Money dia tsy maintsy amin'ny endrika malagasy: isa 10 manomboka amin'ny 03 (oh. 0341234567).",
    'The Mobile Money number must be in Malagasy format: 10 digits starting with 03 (e.g. 0341234567).',
  ],
  ['Paiement introuvable', 'Tsy hita ny fandoavam-bola.', 'Payment not found.'],
  [
    "Une facture n'est emise qu'apres confirmation du paiement.",
    "Aorian'ny fanamarinana ny fandoavam-bola vao alefa ny faktiora.",
    'An invoice is only issued once the payment has been confirmed.',
  ],
  [
    "Vous n'avez pas acces a cette facture",
    "Tsy manana alalana hiditra amin'ity faktiora ity ianao.",
    'You do not have access to this invoice.',
  ],
  ['Facture introuvable', 'Tsy hita ilay faktiora.', 'Invoice not found.'],

  // ------------------------------------------------------------------
  // Livraisons / evaluations / signalements
  // ------------------------------------------------------------------
  [
    'Vous ne pouvez livrer que vos propres candidatures.',
    "Ny kandidatiora nataonao ihany no azonao hatolotra.",
    'You can only deliver your own applications.',
  ],
  [
    'Le lien ne correspond pas à la plateforme sélectionnée.',
    "Tsy mifanaraka amin'ny sehatra voafidy ny rohy.",
    'The link does not match the selected platform.',
  ],
  [
    'Cette livraison a déjà été validée et ne peut plus être modifiée.',
    "Efa nekena ity fanaterana ity ka tsy azo ovaina intsony.",
    'This delivery has already been approved and can no longer be modified.',
  ],
  [
    'Une livraison existe déjà pour cette candidature.',
    "Efa misy fanaterana ho an'ity kandidatiora ity.",
    'A delivery already exists for this application.',
  ],
  ['Livraison introuvable.', 'Tsy hita ilay fanaterana.', 'Delivery not found.'],
  [
    "Vous n'êtes pas autorisé à consulter cette livraison.",
    "Tsy navela hijery an'ity fanaterana ity ianao.",
    'You are not allowed to view this delivery.',
  ],
  [
    'Vous ne pouvez valider que les livraisons de vos propres missions.',
    "Ny fanaterana ho an'ny asa nataonao ihany no azonao ekena.",
    'You can only approve deliveries for your own missions.',
  ],
  [
    'Cette livraison est déjà validée.',
    "Efa nekena ity fanaterana ity.",
    'This delivery is already approved.',
  ],
  [
    'Cette livraison a déjà été traitée.',
    "Efa voakarakara ity fanaterana ity.", // RELIRE
    'This delivery has already been processed.',
  ],
  [
    'Vous ne pouvez traiter que les livraisons de vos propres missions.',
    "Ny fanaterana ho an'ny asa nataonao ihany no azonao karakaraina.", // RELIRE
    'You can only process deliveries for your own missions.',
  ],
  [
    'Une livraison déjà validée ne peut plus être envoyée en correction.',
    "Tsy azo averina hovaina intsony ny fanaterana efa nekena.",
    'A delivery that has already been approved can no longer be sent back for correction.',
  ],
  [
    "Le projet ne peut être évalué qu'après validation de la livraison.",
    "Aorian'ny fanekena ny fanaterana vao azo hombanana ny tetikasa.", // RELIRE (evaluer)
    'The project can only be reviewed once the delivery has been approved.',
  ],
  [
    'Le lien du livrable doit être une URL valide.',
    "Ny rohy mankany amin'ny zavatra natolotra dia tsy maintsy URL mety.",
    'The deliverable link must be a valid URL.',
  ],
  [
    'La plateforme doit être GitHub ou GitLab.',
    "Ny sehatra dia tsy maintsy GitHub na GitLab.",
    'The platform must be GitHub or GitLab.',
  ],
  [
    'Maximum 10 pièces jointes par livraison.',
    "Rakitra miaraka 10 ho be indrindra isaky ny fanaterana.",
    'Maximum 10 attachments per delivery.',
  ],
  [
    'Seul le client ayant publie la mission peut evaluer la livraison',
    "Ny mpanjifa namoaka ny asa ihany no afaka manombana ny fanaterana.",
    'Only the client who published the mission can review the delivery.',
  ],
  [
    'Cette livraison a deja ete evaluee',
    "Efa nombanana ity fanaterana ity.",
    'This delivery has already been reviewed.',
  ],
  [
    'La mission liee a cette livraison ne peut pas etre cloturee (statut inattendu).',
    "Tsy azo hidiana ny asa mifandray amin'ity fanaterana ity (toe-javatra tsy nampoizina).",
    'The mission linked to this delivery cannot be closed (unexpected status).',
  ],
  [
    "Seul l'etudiant de cette candidature peut evaluer le client",
    "Ny mpianatra tao amin'ity kandidatiora ity ihany no afaka manombana ny mpanjifa.",
    'Only the student of this application can review the client.',
  ],
  [
    'Vous avez deja evalue ce client pour cette livraison',
    "Efa nanombana an'io mpanjifa io ianao ho an'ity fanaterana ity.",
    'You have already reviewed this client for this delivery.',
  ],
  [
    "Vous devez d'abord effectuer le paiement avant d'évaluer le projet.",
    "Tsy maintsy mandoa vola aloha ianao vao afaka manombana ny tetikasa.",
    'You must make the payment before reviewing the project.',
  ],
  ['Evaluation introuvable', 'Tsy hita ilay fanombanana.', 'Review not found.'],
  [
    'Vous ne pouvez modifier que vos propres evaluations',
    "Ny fanombanana nataonao ihany no azonao ovaina.",
    'You can only edit your own reviews.',
  ],
  [
    'RG6 : la note doit etre comprise entre 1 et 5',
    "RG6: ny naoty dia tsy maintsy eo anelanelan'ny 1 sy 5.",
    'RG6: the rating must be between 1 and 5.',
  ],
  ['Signalement introuvable', 'Tsy hita ilay fanairana.', 'Report not found.'], // RELIRE (signalement)
  [
    'Ce signalement a deja ete traite',
    "Efa voakarakara ity fanairana ity.", // RELIRE
    'This report has already been processed.',
  ],

  // ------------------------------------------------------------------
  // Amitie / groupes / messagerie / commentaires / reactions
  // ------------------------------------------------------------------
  [
    "Vous ne pouvez pas vous envoyer une demande d'amitié à vous-même.",
    "Tsy azonao alefa amin'ny tenanao ny fangatahana fisakaizana.",
    'You cannot send yourself a friend request.',
  ],
  [
    "Les demandes d'amitié ne peuvent être envoyées qu'à un autre étudiant.",
    "Ny fangatahana fisakaizana dia azo alefa amin'ny mpianatra hafa ihany.",
    'Friend requests can only be sent to another student.',
  ],
  [
    "Une demande d'amitié existe déjà entre vous deux.",
    "Efa misy fangatahana fisakaizana eo aminareo roa.",
    'A friend request already exists between the two of you.',
  ],
  [
    'Vous êtes déjà amis avec cet étudiant.',
    "Efa mpisakaiza ianareo amin'ity mpianatra ity.",
    'You are already friends with this student.',
  ],
  [
    "Demande d'amitié introuvable.",
    'Tsy hita ilay fangatahana fisakaizana.',
    'Friend request not found.',
  ],
  [
    "Cette demande d'amitié ne vous est pas destinée.",
    "Tsy ho anao ity fangatahana fisakaizana ity.",
    'This friend request is not addressed to you.',
  ],
  [
    "Cette demande d'amitié a déjà été traitée.",
    "Efa voakarakara ity fangatahana fisakaizana ity.", // RELIRE
    'This friend request has already been processed.',
  ],
  [
    'Vous ne pouvez pas vous retirer vous-même de vos amis.',
    "Tsy azonao esorina amin'ny namanao ny tenanao.",
    'You cannot remove yourself from your friends.',
  ],
  [
    'Aucune amitié avec cet étudiant.',
    "Tsy misy fisakaizana amin'ity mpianatra ity.",
    'No friendship with this student.',
  ],
  [
    'Seuls les étudiants peuvent accéder aux amitiés.',
    "Ny mpianatra ihany no afaka miditra amin'ny fisakaizana.",
    'Only students can access friendships.',
  ],
  [
    'Le nom du groupe est obligatoire.',
    "Ilaina ny anaran'ny vondrona.",
    'The group name is required.',
  ],
  [
    'Seuls les étudiants peuvent créer un groupe.',
    "Ny mpianatra ihany no afaka mamorona vondrona.",
    'Only students can create a group.',
  ],
  [
    'Cette fonctionnalité est réservée aux étudiants.',
    "Ho an'ny mpianatra ihany ity fiasa ity.",
    'This feature is reserved for students.',
  ],
  [
    "Vous n'êtes pas membre de ce groupe.",
    "Tsy mpikambana ao amin'ity vondrona ity ianao.",
    'You are not a member of this group.',
  ],
  [
    'Seuls les étudiants peuvent quitter un groupe.',
    "Ny mpianatra ihany no afaka miala amin'ny vondrona.",
    'Only students can leave a group.',
  ],
  [
    'Le chef doit transférer son rôle avant de quitter le groupe.',
    "Tsy maintsy afindrany amin'ny hafa ny andraikiny ny lehiben'ny vondrona alohan'ny hialany.",
    'The leader must transfer their role before leaving the group.',
  ],
  [
    'Le chef ne peut pas se retirer avec cette action.',
    "Tsy afaka manala ny tenany amin'ity hetsika ity ny lehiben'ny vondrona.",
    'The leader cannot remove themselves with this action.',
  ],
  [
    'Membre introuvable dans ce groupe.',
    "Tsy hita ao amin'ity vondrona ity ilay mpikambana.",
    'Member not found in this group.',
  ],
  [
    'Le chef doit transférer son rôle avant d’être retiré.',
    "Tsy maintsy afindrany amin'ny hafa ny andraikiny ny lehiben'ny vondrona alohan'ny hesorina azy.",
    'The leader must transfer their role before being removed.',
  ],
  [
    'Vous êtes déjà le chef de ce groupe.',
    "Efa lehiben'ity vondrona ity ianao.",
    'You are already the leader of this group.',
  ],
  [
    'Seul le chef du groupe peut transférer ce rôle.',
    "Ny lehiben'ny vondrona ihany no afaka mamindra ity andraikitra ity.",
    'Only the group leader can transfer this role.',
  ],
  ['Invitation introuvable.', 'Tsy hita ilay fanasana.', 'Invitation not found.'],
  [
    'Seule une invitation en attente peut être annulée.',
    "Ny fanasana mbola miandry ihany no azo foanana.",
    'Only a pending invitation can be cancelled.',
  ],
  [
    'Seuls les étudiants peuvent gérer les membres.',
    "Ny mpianatra ihany no afaka mitantana ny mpikambana.",
    'Only students can manage members.',
  ],
  [
    'Seul le chef du groupe peut effectuer cette action.',
    "Ny lehiben'ny vondrona ihany no afaka manao ity hetsika ity.",
    'Only the group leader can perform this action.',
  ],
  [
    'Seuls les étudiants peuvent inviter des membres.',
    "Ny mpianatra ihany no afaka manasa mpikambana.",
    'Only students can invite members.',
  ],
  [
    'Seul le chef du groupe peut inviter un étudiant.',
    "Ny lehiben'ny vondrona ihany no afaka manasa mpianatra.",
    'Only the group leader can invite a student.',
  ],
  [
    'Vous ne pouvez pas vous inviter vous-même.',
    "Tsy azonao asaina ny tenanao.",
    'You cannot invite yourself.',
  ],
  [
    'Cet étudiant est déjà membre du groupe.',
    "Efa mpikambana ao amin'ny vondrona ity mpianatra ity.",
    'This student is already a member of the group.',
  ],
  [
    'Une invitation existe déjà pour cet étudiant.',
    "Efa misy fanasana ho an'ity mpianatra ity.",
    'An invitation already exists for this student.',
  ],
  [
    'Seuls les étudiants peuvent consulter une invitation.',
    "Ny mpianatra ihany no afaka mijery fanasana.",
    'Only students can view an invitation.',
  ],
  [
    'Seuls les étudiants peuvent accepter une invitation.',
    "Ny mpianatra ihany no afaka manaiky fanasana.",
    'Only students can accept an invitation.',
  ],
  [
    'Cette invitation ne vous est pas destinée.',
    "Tsy ho anao ity fanasana ity.",
    'This invitation is not addressed to you.',
  ],
  [
    'Cette invitation a déjà été traitée.',
    "Efa voakarakara ity fanasana ity.", // RELIRE
    'This invitation has already been processed.',
  ],
  [
    'Vous êtes déjà membre de ce groupe.',
    "Efa mpikambana ao amin'ity vondrona ity ianao.",
    'You are already a member of this group.',
  ],
  [
    'Seuls les étudiants peuvent refuser une invitation.',
    "Ny mpianatra ihany no afaka mandà fanasana.",
    'Only students can decline an invitation.',
  ],
  ['Commentaire introuvable', 'Tsy hita ilay hevitra.', 'Comment not found.'],
  [
    'Vous ne pouvez modifier que vos propres commentaires',
    "Ny hevitra nosoratanao ihany no azonao ovaina.",
    'You can only edit your own comments.',
  ],
  [
    'Vous ne pouvez supprimer que vos propres commentaires',
    "Ny hevitra nosoratanao ihany no azonao fafana.",
    'You can only delete your own comments.',
  ],
  [
    'Vous ne pouvez pas reagir a votre propre profil',
    "Tsy azonao omena fihetsiketsehana ny mombamomba anao manokana.", // RELIRE (reagir)
    'You cannot react to your own profile.',
  ],
  [
    'Conversation non autorisée',
    "Tsy ekena ny resaka.",
    'Conversation not allowed.',
  ],
  [
    'Vous ne pouvez pas vous envoyer un message à vous-même',
    "Tsy azonao alefa amin'ny tenanao ny hafatra.",
    'You cannot send a message to yourself.',
  ],
  [
    "La messagerie est disponible uniquement après l'acceptation d'une candidature ou d'une amitié.",
    "Azo ampiasaina ny hafatra aorian'ny fanekena kandidatiora na fisakaizana ihany.",
    'Messaging is only available after an application or a friendship has been accepted.',
  ],
  ['Message introuvable', 'Tsy hita ilay hafatra.', 'Message not found.'],
  [
    'Vous ne pouvez supprimer que vos propres messages',
    "Ny hafatra nalefanao ihany no azonao fafana.",
    'You can only delete your own messages.',
  ],
  [
    'Le message doit contenir au moins 10 caracteres',
    "Ny hafatra dia tsy maintsy misy tarehintsoratra 10 farafahakeliny.",
    'The message must contain at least 10 characters.',
  ],
  [
    "Le service de contact n'est pas encore disponible. Veuillez reessayer plus tard.",
    "Mbola tsy azo ampiasaina ny serivisy fifandraisana. Andramo indray any aoriana azafady.",
    'The contact service is not available yet. Please try again later.',
  ],
  [
    "Votre message n'a pas pu etre envoye. Veuillez reessayer plus tard.",
    "Tsy tafaraka ny fandefasana ny hafatrao. Andramo indray any aoriana azafady.",
    'Your message could not be sent. Please try again later.',
  ],

  // ------------------------------------------------------------------
  // Fichiers / uploads / divers
  // ------------------------------------------------------------------
  [
    'Format non supporté. Utilisez JPG, PNG ou WebP.',
    "Tsy ekena ny endrika. Ampiasao JPG, PNG na WebP.",
    'Unsupported format. Use JPG, PNG or WebP.',
  ],
  [
    'Aucune image n’a été envoyée.',
    'Tsy nisy sary nalefa.',
    'No image was uploaded.',
  ],
  [
    'Format non supporté. Utilisez PDF, Word, Excel, une image, une archive ou un fichier texte.',
    "Tsy ekena ny endrika. Ampiasao PDF, Word, Excel, sary, rakitra voatondraka (archive) na rakitra soratra.", // RELIRE (archive)
    'Unsupported format. Use PDF, Word, Excel, an image, an archive or a text file.',
  ],
  [
    'Aucun fichier n’a été envoyé.',
    'Tsy nisy rakitra nalefa.',
    'No file was uploaded.',
  ],
  ['Document introuvable', 'Tsy hita ilay antontan-taratasy.', 'Document not found.'],
  [
    'Le contenu du fichier ne correspond pas a son format declare.',
    "Tsy mifanaraka amin'ny endrika voalaza ny votoatin'ny rakitra.",
    'The file content does not match its declared format.',
  ],
  ['Document invalide', 'Tsy mety ny antontan-taratasy.', 'Invalid document.'],
  [
    "Vous n'avez pas acces a ce document",
    "Tsy manana alalana hiditra amin'ity antontan-taratasy ity ianao.",
    'You do not have access to this document.',
  ],
  [
    "L'image doit provenir de l'envoi de fichier de la plateforme (JPG, PNG ou WebP).",
    "Ny sary dia tsy maintsy avy amin'ny fandefasana rakitra eto amin'ny sehatra (JPG, PNG na WebP).",
    "The image must come from the platform's file upload (JPG, PNG or WebP).",
  ],
  [
    "Le fichier doit provenir de l'envoi de fichier de la plateforme.",
    "Ny rakitra dia tsy maintsy avy amin'ny fandefasana rakitra eto amin'ny sehatra.",
    "The file must come from the platform's file upload.",
  ],
  [
    "Cible introuvable : cet utilisateur n'est pas un etudiant.",
    "Tsy hita ny kendrena: tsy mpianatra ity mpampiasa ity.",
    'Target not found: this user is not a student.',
  ],
  [
    'Type de cible non supporte.',
    "Tsy ekena ny karazana kendrena.",
    'Unsupported target type.',
  ],

  // ------------------------------------------------------------------
  // Messages natifs NestJS / Express / Multer / Throttler
  // ------------------------------------------------------------------
  [
    'Erreur interne du serveur',
    "Nisy hadisoana tao amin'ny mpizara.",
    'Internal server error.',
  ],
  [
    'Unauthorized',
    'Tsy voamarina ny fidirana. Midira azafady.',
    'Unauthorized. Please sign in.',
  ],
  [
    'Forbidden resource',
    'Tsy manana alalana hiditra amin\'ity loharano ity ianao.',
    'You do not have permission to access this resource.',
  ],
  [
    'Forbidden',
    'Tsy navela.',
    'Forbidden.',
  ],
  [
    'ThrottlerException: Too Many Requests',
    "Betsaka loatra ny fangatahana. Andramo indray afaka fotoana fohy.",
    'Too many requests. Please try again in a moment.',
  ],
  [
    'Too Many Requests',
    "Betsaka loatra ny fangatahana. Andramo indray afaka fotoana fohy.",
    'Too many requests. Please try again in a moment.',
  ],
  [
    'File too large',
    'Lehibe loatra ny rakitra.',
    'File too large.',
  ],
  [
    'Unexpected field',
    'Saha tsy ampoizina.',
    'Unexpected field.',
  ],
  ['Not Found', 'Tsy hita.', 'Not found.'],
  ['Bad Request', 'Fangatahana tsy mety.', 'Bad request.'],
  ['Internal server error', "Nisy hadisoana tao amin'ny mpizara.", 'Internal server error.'],
  [
    'Validation failed (uuid is expected)',
    "Tsy mety ny fanamarinana: UUID no andrasana.",
    'Validation failed (uuid is expected).',
  ],
  [
    'Validation failed (enum string is expected)',
    "Tsy mety ny fanamarinana: andrasana ny sanda iray amin'ny lisitra.",
    'Validation failed (enum string is expected).',
  ],
];
