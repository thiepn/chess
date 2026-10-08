import { Chess, DEFAULT_POSITION, type Square } from "chess.js";
import type { TrainingMode } from "../domain/types";
import type { LessonScript } from "./types";

interface LessonSeed {
  title: string;
  summary: string;
  body: string;
  fen: string;
  move: string;
  prompt: string;
  hint: string;
  success?: string;
}

const START = DEFAULT_POSITION;
const CHECK = "4k3/8/8/8/8/8/4r3/4K3 w - - 0 1";
const CASTLE = "r1bqk1nr/ppppbppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const PROMOTE = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
const MATE = "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1";
const CAPTURE = "4k3/8/8/8/8/3p4/4Q3/4K3 w - - 0 1";
const HANG = "4k3/8/8/8/3n4/8/4Q3/4K3 w - - 0 1";
const DEFENDER = "4k3/8/8/4p3/3n4/5N2/8/4K3 w - - 0 1";
const TRADE = "4k3/8/8/8/3r4/8/3R4/4K3 w - - 0 1";
const FORK = "3q3k/8/3N4/8/8/8/8/4K3 w - - 0 1";
const PIN = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
const SKEWER = "q5k1/8/8/8/8/2B5/8/4K2R w - - 0 1";
const DISCOVERED = "4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1";
const REMOVE = "6k1/5ppp/7n/6B1/8/8/8/6K1 w - - 0 1";
const DEFLECT = "3qr1k1/5ppp/8/8/8/3B4/5PPP/4R1K1 w - - 0 1";
const QUEEN_CHECK = "6k1/8/8/8/8/8/5Q2/6K1 w - - 0 1";
const OPEN_FILE = "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1";
const OUTPOST = "4k3/8/8/3N4/8/8/8/4K3 w - - 0 1";
const PAWN_BREAK = "4k3/8/3pp3/3P4/4P3/8/8/4K3 w - - 0 1";
const WEAK_PAWN = "4k3/8/3p4/8/8/8/4K3/8 w - - 0 1";
const EXCHANGE_ATTACKER = "4k3/8/8/8/3r4/3R4/8/4K3 w - - 0 1";
const QUEEN_TECH = "7k/8/8/8/8/8/6K1/5Q2 w - - 0 1";
const OPPOSITION = "4k3/8/8/4K3/4P3/8/8/8 w - - 0 1";
const PAWN_RACE = "8/8/8/P7/7p/8/4K2k/8 w - - 0 1";
const PASSED = "4k3/8/8/4P3/8/8/4K3/8 w - - 0 1";
const LUCENA = "2K5/2P1k3/8/8/8/8/r7/3R4 w - - 0 1";
const PHILIDOR = "8/8/r3k3/4P3/4K3/8/8/7R b - - 0 1";
const DRAW_RULE = "7k/8/8/8/8/8/5K2/7R w - - 0 1";
const ADV_COMBO = "3q2k1/5ppp/8/8/8/3B4/5PPP/4R1K1 w - - 0 1";
const ADV_DEFENSE = "6k1/5ppp/8/8/8/8/4rPPP/3R2K1 w - - 0 1";
const ADV_IMBALANCE = "4k3/8/8/3n4/3P4/2B5/8/4K3 w - - 0 1";
const ADV_MINOR = "4k3/8/3p4/3n4/2B1P3/8/8/4K3 w - - 0 1";
const ADV_RESTRICTION = "4k3/8/3n4/8/4P3/2B5/8/4K3 w - - 0 1";
const ADV_COORDINATION = "4k3/8/8/8/8/8/3Q4/R3K3 w Q - 0 1";
const ADV_IQP = "4k3/8/8/3P4/8/8/8/4K3 w - - 0 1";
const ADV_HANGING = "4k3/8/8/8/2PP4/8/8/4K3 w - - 0 1";
const ADV_MINORITY = "4k3/ppp5/8/8/1PP5/8/8/4K3 w - - 0 1";
const ADV_REPERTOIRE = "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 4 5";
const ADV_ROOK_CHECKS = "8/5k2/4P3/8/8/8/6R1/6K1 w - - 0 1";
const ADV_OPPOSITE_BISHOPS = "4k3/8/8/4p3/3P4/2B5/8/4Kb2 w - - 0 1";
const ADV_MINOR_ENDING = "4k3/8/8/3p4/3P4/3N4/8/4K3 w - - 0 1";
const ADV_TWO_WEAKNESSES = "4k3/p6p/8/8/8/8/P6P/R3K3 w Q - 0 1";

const seeds: Record<string, LessonSeed> = {
  "rules.board": {
    title: "Read the board",
    summary: "Use coordinates without stopping to translate them.",
    body: "Files run a–h and ranks run 1–8 from White's side. Coordinates let you describe moves, calculate lines and follow notation precisely.",
    fen: START,
    move: "e2e4",
    prompt: "Translate the coordinate instruction: move the pawn from e2 to e4.",
    hint: "Find the e-file first, then rank 2.",
  },
  "rules.pieces": {
    title: "How pieces move",
    summary: "Build legal movement into intuition.",
    body: "Sliding pieces need a clear path. Knights jump. Pawns move and capture differently. Kings move one square and may never step into check.",
    fen: START,
    move: "g1f3",
    prompt: "Develop the g1 knight to f3.",
    hint: "Knights move in an L and may jump over the pawns.",
  },
  "rules.capture": {
    title: "Captures change the board",
    summary: "A capture replaces the target piece on its square.",
    body: "Most pieces capture exactly as they move. Always look at what disappears, what lands on the square and what lines open afterward.",
    fen: CAPTURE,
    move: "e2d3",
    prompt: "Capture the black pawn with the queen.",
    hint: "The queen on e2 attacks d3 diagonally.",
  },
  "rules.check": {
    title: "See the king threat",
    summary: "Check overrides every other plan.",
    body: "When the king is attacked, the position has one priority: make the king safe. You cannot answer check with a move that leaves the attack in place.",
    fen: CHECK,
    move: "e1d1",
    prompt: "Move the checked king to a safe square.",
    hint: "The rook controls the e-file. Step off that file.",
  },
  "rules.check-responses": {
    title: "Three ways to answer check",
    summary: "Move, capture or block—when the geometry permits it.",
    body: "Every legal response to check belongs to one of three families: move the king, capture the checking piece, or block a sliding attack.",
    fen: CHECK,
    move: "e1d1",
    prompt: "Use the simplest response here: move the king away from the rook's line.",
    hint: "d1 is outside the checking file.",
  },
  "rules.mate": {
    title: "Checkmate ends the game",
    summary: "Mate is check with no legal defense.",
    body: "Before calling a move mate, verify every king move, capture and possible block. Here Black's own pawns remove all flight squares.",
    fen: MATE,
    move: "e1e8",
    prompt: "Deliver checkmate with the rook.",
    hint: "Reach the eighth rank with check.",
    success: "The rook covers the back rank while Black's own pawns remove every escape square.",
  },
  "rules.castling": {
    title: "Castle legally",
    summary: "Move the king to safety and activate a rook in one move.",
    body: "Castling is legal only if king and rook have not moved, the path is clear, and the king is not in check or crossing an attacked square.",
    fen: CASTLE,
    move: "e1g1",
    prompt: "Castle kingside.",
    hint: "Move the king two squares toward the h1 rook.",
  },
  "rules.promotion": {
    title: "Promote the pawn",
    summary: "A pawn reaching the last rank becomes a new piece.",
    body: "A queen is usually best, but rook, bishop and knight promotions are legal too. Promotion choice can matter tactically.",
    fen: PROMOTE,
    move: "a7a8q",
    prompt: "Promote the a-pawn to a queen.",
    hint: "Move a7 to a8 and choose a queen.",
  },
  "rules.draws": {
    title: "Know when the game is drawn",
    summary: "Stalemate is only one of several draw rules.",
    body: "Games can draw by stalemate, repetition, insufficient material, agreement or the fifty-move rule. Winning positions still require legal moves for the opponent.",
    fen: DRAW_RULE,
    move: "f2g2",
    prompt: "Make a quiet king move while keeping the position legal.",
    hint: "Kg2 is a normal king move and does not stalemate Black.",
  },

  "fundamentals.values": {
    title: "Material has a price",
    summary: "Use approximate values to make exchange decisions.",
    body: "Pawn≈1, knight≈3, bishop≈3, rook≈5 and queen≈9. Values are a starting point—not permission to ignore king safety or tactics.",
    fen: CAPTURE,
    move: "e2d3",
    prompt: "Take the free pawn rather than giving away the queen.",
    hint: "The queen can capture d3 safely in this simplified position.",
  },
  "fundamentals.attacked": {
    title: "See what is attacked",
    summary: "Before planning, scan what the opponent can capture.",
    body: "An attacked piece is not automatically lost, but every attack creates a question. The black knight on d4 currently attacks your queen.",
    fen: HANG,
    move: "e2e4",
    prompt: "Move the attacked queen out of danger.",
    hint: "e4 is a safe square for the queen in this position.",
  },
  "fundamentals.defended": {
    title: "Count defenders that actually work",
    summary: "A defended piece can still be tactically vulnerable.",
    body: "Do not stop at 'it is defended.' Ask what defends it, whether that defender is pinned or overloaded, and what happens after exchanges.",
    fen: DEFENDER,
    move: "f3e5",
    prompt: "Capture the pawn that is supporting the central knight.",
    hint: "The e5 pawn is part of the defensive network around d4.",
  },
  "fundamentals.hanging": {
    title: "Stop hanging pieces",
    summary: "Loose pieces demand immediate attention.",
    body: "A large share of beginner games are decided by a piece that could simply be captured. Build the habit of checking every attacked high-value piece.",
    fen: HANG,
    move: "e2e4",
    prompt: "Save the queen from the knight attack.",
    hint: "Move the queen from e2 to e4.",
  },
  "fundamentals.trades": {
    title: "Judge the position after the trade",
    summary: "Equal-value exchanges are not automatically equal.",
    body: "Compare material first, then activity, pawn structure, king safety and what pieces remain. Exchanges are decisions about the resulting position.",
    fen: TRADE,
    move: "d2d4",
    prompt: "Exchange the rooks in this simplified position.",
    hint: "The white rook can capture the rook on d4.",
  },
  "fundamentals.blunder-check": {
    title: "Run the final blunder check",
    summary: "Before releasing the piece, inspect the opponent's forcing replies.",
    body: "Ask: after my move, what checks, captures and threats does my opponent gain? This short pause prevents more losses than another opening line.",
    fen: HANG,
    move: "e2e4",
    prompt: "Choose the move that survives the opponent's immediate capture threat.",
    hint: "Your queen is attacked right now.",
  },
  "defense.threats": {
    title: "What does the opponent want?",
    summary: "Name the threat before starting your own plan.",
    body: "Forcing threats deserve priority. Identify checks, captures, attacks on loose pieces and tactical ideas around your king.",
    fen: CHECK,
    move: "e1d1",
    prompt: "Answer the immediate threat instead of creating one of your own.",
    hint: "You are in check; move off the e-file.",
  },

  "openings.principles": {
    title: "Start with useful moves",
    summary: "Control the center, develop and secure the king.",
    body: "Opening principles are a decision system, not a memorized move list. Good early moves usually improve space, activity or king safety.",
    fen: START,
    move: "e2e4",
    prompt: "Claim central space with 1.e4.",
    hint: "Move the e-pawn two squares.",
  },
  "openings.development": {
    title: "Develop with purpose",
    summary: "Bring new pieces into the game before moving one piece repeatedly.",
    body: "Development increases your available force. Knights and bishops usually belong in the game before the queen starts making repeated moves.",
    fen: START,
    move: "g1f3",
    prompt: "Develop a kingside minor piece toward the center.",
    hint: "Nf3 develops and influences e5 and d4.",
  },
  "openings.center": {
    title: "Fight for central squares",
    summary: "Central influence gives pieces more useful routes.",
    body: "You can control the center with pawns or pieces. The goal is not to occupy every central square—it is to prevent the opponent from owning them for free.",
    fen: START,
    move: "d2d4",
    prompt: "Use a central pawn to claim space.",
    hint: "The d-pawn may advance two squares from its starting square.",
  },
  "openings.king-safety": {
    title: "Secure the king before adventuring",
    summary: "A developed position is incomplete if the king remains exposed.",
    body: "Castling usually combines two jobs: king safety and rook activation. Delay it only when the concrete position gives a good reason.",
    fen: CASTLE,
    move: "e1g1",
    prompt: "Complete development by castling kingside.",
    hint: "The path is clear and the king may castle here.",
  },
  "openings.queen-timing": {
    title: "Do not donate tempi with the queen",
    summary: "Early queen moves can let the opponent develop while attacking you.",
    body: "When there is no concrete gain, prefer bringing a new piece into the game over moving the queen repeatedly.",
    fen: START,
    move: "b1c3",
    prompt: "Develop a new piece instead of bringing the queen out early.",
    hint: "Nc3 improves central control without exposing the queen.",
  },
  "openings.tempo": {
    title: "Make every early move earn its time",
    summary: "A tempo matters most when development is incomplete.",
    body: "Useful opening moves often develop, control the center or create a threat at the same time. Avoid moves that the opponent can answer while improving their own position.",
    fen: START,
    move: "g1f3",
    prompt: "Make a developing move that also attacks e5.",
    hint: "The g1 knight can develop with tempo against the center.",
  },
  "strategy.piece-activity": {
    title: "Put pieces where they do more",
    summary: "Activity is the number and quality of useful things a piece can influence.",
    body: "Central squares usually increase a piece's options. A well-placed piece can be worth more than its nominal material value suggests.",
    fen: START,
    move: "b1c3",
    prompt: "Improve the queenside knight's activity.",
    hint: "Nc3 points the knight toward four central and kingside squares.",
  },
  "strategy.worst-piece": {
    title: "Improve the worst piece",
    summary: "When nothing is forcing, fix the piece contributing least.",
    body: "Quiet positions become easier when you ask which piece has the fewest useful squares, then find a route that improves it.",
    fen: START,
    move: "b1c3",
    prompt: "Improve one of White's least active pieces.",
    hint: "The b1 knight is still on its original square.",
  },

  "tactics.double-attack": {
    title: "One move, two problems",
    summary: "Double attacks win because one reply rarely solves both threats.",
    body: "Before every forcing move, count all new attacks it creates. Knights are especially good at attacking separated targets.",
    fen: FORK,
    move: "d6f7",
    prompt: "Create a double attack on king and queen.",
    hint: "Nf7+ attacks h8 and d8.",
  },
  "tactics.knight-fork": {
    title: "Knight forks",
    summary: "Use knight geometry to attack valuable targets at once.",
    body: "Knights ignore blocking pieces, which makes their forks easy to miss. Search squares that attack the king plus another high-value target.",
    fen: FORK,
    move: "d6f7",
    prompt: "Find the knight fork.",
    hint: "From f7 the knight checks h8 and attacks d8.",
  },
  "tactics.pin": {
    title: "Pins restrict movement",
    summary: "A piece may be physically able to move but tactically unable to.",
    body: "In an absolute pin, moving the pinned piece would expose the king. Relative pins expose a more valuable piece instead.",
    fen: PIN,
    move: "f1b5",
    prompt: "Pin the c6 knight to the king.",
    hint: "Place the bishop on b5.",
  },
  "tactics.skewer": {
    title: "Skewer the valuable piece first",
    summary: "Attack the front piece so the piece behind it becomes loose.",
    body: "A skewer reverses the visual idea of a pin: the more valuable target is attacked first and must move.",
    fen: SKEWER,
    move: "h1h8",
    prompt: "Use the rook to force the king away and expose the queen.",
    hint: "Rh8+ uses the bishop on c3 to control h8.",
  },
  "tactics.discovered": {
    title: "Reveal the hidden attacker",
    summary: "Moving one piece can unleash another piece behind it.",
    body: "Discovered attacks are powerful because the moving piece may create its own threat while uncovering a rook, bishop or queen.",
    fen: DISCOVERED,
    move: "e2f3",
    prompt: "Move the bishop away and reveal the rook's check.",
    hint: "The rook on e1 is lined up with the king on e8.",
  },
  "tactics.removing-defender": {
    title: "Remove the defender",
    summary: "A target becomes vulnerable when its key defender disappears.",
    body: "Before attacking a protected target directly, identify which enemy piece makes the defense work and whether you can exchange it.",
    fen: REMOVE,
    move: "g5h6",
    prompt: "Capture the knight that is helping defend the kingside.",
    hint: "Bxh6 removes the h6 knight.",
  },
  "tactics.deflection": {
    title: "Deflect a defender",
    summary: "Force a defending piece away from the square or line it must protect.",
    body: "Checks and captures are common deflection tools because they leave the defender no time to keep performing its original duty.",
    fen: DEFLECT,
    move: "e1e8",
    prompt: "Use a forcing rook capture to drag the defense away.",
    hint: "Rxe8+ forces Black to answer the check.",
  },
  "tactics.decoy": {
    title: "Decoy a piece onto the wrong square",
    summary: "Sometimes the tactical goal is where an enemy piece ends up.",
    body: "A decoy offers a forcing target so an enemy piece is lured onto a square where another tactic becomes possible.",
    fen: DEFLECT,
    move: "e1e8",
    prompt: "Play the forcing capture that invites the queen onto e8.",
    hint: "Rxe8+ is the forcing move.",
  },
  "tactics.back-rank": {
    title: "Exploit a sealed back rank",
    summary: "A king trapped by its own pawns is vulnerable to rook and queen checks.",
    body: "Back-rank tactics work only when the king lacks a flight square. Check the pawn shelter before assuming the pattern exists.",
    fen: MATE,
    move: "e1e8",
    prompt: "Finish with the back-rank mate.",
    hint: "Re8 is check and there is no escape square.",
  },
  "tactics.overload": {
    title: "One defender, too many jobs",
    summary: "An overloaded piece cannot protect everything at once.",
    body: "Look for a defender tied to two critical tasks. A forcing move against one duty can make the other collapse.",
    fen: DEFLECT,
    move: "e1e8",
    prompt: "Force the overloaded back-rank defense to respond.",
    hint: "The rook capture on e8 creates an immediate check.",
  },
  "tactics.clearance": {
    title: "Clear the line",
    summary: "Move a friendly piece so another piece can use the square or line behind it.",
    body: "Clearance is often invisible because the important effect belongs to the piece that was previously blocked.",
    fen: DISCOVERED,
    move: "e2f3",
    prompt: "Clear the e-file for the rook.",
    hint: "Move the bishop away from e2.",
  },

  "calculation.candidates": {
    title: "Generate candidates before calculating",
    summary: "Do not calculate the first move that catches your eye.",
    body: "Start with checks, captures and threats, then add useful quiet moves. A short candidate list prevents tunnel vision.",
    fen: MATE,
    move: "e1e8",
    prompt: "Start with the forcing candidate and calculate the check.",
    hint: "Checks deserve inspection first.",
  },
  "calculation.reply": {
    title: "Give the opponent their best reply",
    summary: "Hope is not calculation.",
    body: "After choosing a candidate, switch sides mentally and search for the strongest defensive or forcing reply—not the move you want them to play.",
    fen: FORK,
    move: "d6f7",
    prompt: "Choose the forcing move that leaves Black the fewest good replies.",
    hint: "A checking fork forces the king to respond.",
  },
  "calculation.forcing-lines": {
    title: "Calculate forcing lines first",
    summary: "Checks, captures and direct threats shrink the opponent's reply tree.",
    body: "Continue a forcing line until the position becomes quiet enough to evaluate. Do not stop merely because your first move looks attractive.",
    fen: MATE,
    move: "e1e8",
    prompt: "Calculate the forcing check to its conclusion.",
    hint: "Re8+ is the forcing move.",
  },
  "calculation.move-order": {
    title: "Move order changes everything",
    summary: "The same ideas can succeed or fail depending on which comes first.",
    body: "Compare forcing moves before committing. A check inserted first may prevent a defense that would otherwise be available.",
    fen: START,
    move: "e2e4",
    prompt: "Begin with the central move that opens lines before developing the bishop.",
    hint: "Move the e-pawn first.",
  },
  "calculation.visualization": {
    title: "See the resulting board",
    summary: "Accurate calculation requires tracking where every moved piece ends up.",
    body: "After each imagined move, rebuild the board: what disappeared, what lines opened and what squares became attacked?",
    fen: FORK,
    move: "d6f7",
    prompt: "Visualize the knight on f7 and name both targets before moving.",
    hint: "From f7 the knight attacks h8 and d8.",
  },
  "calculation.quiet": {
    title: "Find quiet candidates too",
    summary: "When forcing moves fail, improve the position without demanding an immediate reply.",
    body: "Quiet moves can prevent threats, improve the worst piece or prepare a stronger tactical idea on the next move.",
    fen: START,
    move: "b1c3",
    prompt: "Choose a quiet improving move.",
    hint: "Develop the b1 knight toward the center.",
  },
  "strategy.open-files": {
    title: "Put rooks on open files",
    summary: "Rooks become powerful when pawns no longer block the file.",
    body: "An open file gives a rook access deep into the position. Entry squares on the seventh or eighth rank can matter more than immediate material.",
    fen: OPEN_FILE,
    move: "a1a8",
    prompt: "Use the open a-file to invade with check.",
    hint: "The rook has a clear path to a8.",
  },
  "strategy.outposts": {
    title: "Use stable outposts",
    summary: "A protected square can make a knight permanently annoying.",
    body: "The best outposts cannot be challenged by enemy pawns and influence important squares in the opponent's camp.",
    fen: OUTPOST,
    move: "d5c7",
    prompt: "Jump the centralized knight into the advanced outpost with check.",
    hint: "Nc7+ reaches deep into Black's position.",
  },
  "pawns.breaks": {
    title: "Use pawn breaks to change the structure",
    summary: "A pawn move can open files, diagonals and new targets.",
    body: "Pawn breaks are irreversible. Calculate what opens after the exchange and which side's pieces benefit from the new lines.",
    fen: PAWN_BREAK,
    move: "e4e5",
    prompt: "Advance the e-pawn to challenge the fixed center.",
    hint: "e5 gains space and changes the pawn contact.",
  },
  "pawns.weaknesses": {
    title: "Attack weaknesses that cannot run away",
    summary: "Weak pawns are long-term targets because pawns have limited mobility.",
    body: "Isolated, backward and fixed pawns can become useful targets when your pieces can attack them more times than the opponent can defend them.",
    fen: WEAK_PAWN,
    move: "e2d3",
    prompt: "Bring the king toward the isolated d6 pawn.",
    hint: "Kd3 centralizes and approaches the target.",
  },

  "attack.king-safety": {
    title: "Attack because the king is vulnerable",
    summary: "Do not attack by habit; compare shelter, defenders and piece access.",
    body: "An exposed king, missing pawn cover and nearby attacking pieces are evidence. Without them, an attack can simply waste tempi.",
    fen: MATE,
    move: "e1e8",
    prompt: "Exploit the trapped king immediately.",
    hint: "The back rank has no flight square.",
  },
  "attack.open-lines": {
    title: "Open a route to the king",
    summary: "Attacking pieces need files, ranks and diagonals.",
    body: "Pawn breaks and exchanges are often valuable because they remove the barriers between your heavy pieces and the king.",
    fen: OPEN_FILE,
    move: "a1a8",
    prompt: "Use the open file to penetrate.",
    hint: "Ra8+ turns the file into a direct attacking route.",
  },
  "attack.defenders": {
    title: "Count defenders around the king",
    summary: "An attack succeeds when your force reaches the critical zone faster than the defense.",
    body: "Identify the pieces doing essential defensive work. Removing one defender can matter more than adding another attacker.",
    fen: REMOVE,
    move: "g5h6",
    prompt: "Eliminate a kingside defender.",
    hint: "Bxh6 removes the knight.",
  },
  "attack.mating-net": {
    title: "Take away escape squares first",
    summary: "A mating net is a restriction problem before it is a checking problem.",
    body: "Strong attacks often improve control of flight squares, then deliver the final check only after the king has nowhere useful to go.",
    fen: MATE,
    move: "e1e8",
    prompt: "Deliver the final check after the escape squares are sealed.",
    hint: "Re8 is mate.",
  },
  "attack.sacrifice": {
    title: "Sacrifice only with concrete compensation",
    summary: "A beautiful idea still has to survive the best defense.",
    body: "Before sacrificing, calculate forcing replies and name the compensation: mate, material recovery, perpetual check or a lasting positional gain.",
    fen: SKEWER,
    move: "h1h8",
    prompt: "Use the protected rook invasion to force the king away.",
    hint: "The bishop on c3 supports h8.",
  },
  "defense.prophylaxis": {
    title: "Prevent the easy plan",
    summary: "Sometimes the best move is the move that makes the opponent's next move worse.",
    body: "Ask what your opponent would play if you passed. A small preventive move can remove a pin, mating idea or useful square.",
    fen: START,
    move: "h2h3",
    prompt: "Make a useful preventive move that gives the king a future luft square and questions ...Bg4.",
    hint: "Advance the h-pawn one square.",
  },
  "defense.exchange-attackers": {
    title: "Trade the pieces causing the danger",
    summary: "Removing an attacker can be more efficient than adding another defender.",
    body: "When under pressure, identify which enemy piece makes the attack function and whether a favorable exchange can reduce the threat.",
    fen: EXCHANGE_ATTACKER,
    move: "d3d4",
    prompt: "Exchange the active attacking rook.",
    hint: "Rxd4 removes the enemy rook.",
  },
  "defense.counterplay": {
    title: "Create counterplay when passivity fails",
    summary: "A forcing threat can make the attacker spend a move defending.",
    body: "Counterplay is not random aggression. It should target something concrete enough that the opponent cannot continue attacking freely.",
    fen: QUEEN_CHECK,
    move: "f2f7",
    prompt: "Create a forcing check instead of waiting passively.",
    hint: "Qf7+ forces the king to respond.",
  },

  "endgames.queen-mate": {
    title: "Shrink the king's box",
    summary: "Use the queen to restrict, then bring the king closer.",
    body: "Avoid random checks. The efficient method reduces the enemy king's available area while your king approaches to support the final mate.",
    fen: QUEEN_TECH,
    move: "f1f6",
    prompt: "Use the queen to cut the king off with check.",
    hint: "Qf6+ restricts the h8 king.",
  },
  "endgames.rook-mate": {
    title: "Rook mate",
    summary: "Use the rook as a wall and the king as support.",
    body: "A rook cannot mate a lone king by itself. Restrict the king rank by rank and bring your king close enough to support the final check.",
    fen: MATE,
    move: "e1e8",
    prompt: "Finish the boxed-in king with the rook.",
    hint: "Re8 is mate in this simplified pattern.",
  },
  "endgames.opposition": {
    title: "Take the opposition",
    summary: "King geometry decides many pawn endings.",
    body: "When kings face each other with one square between, the side not to move often has the opposition and can force the other king to give ground.",
    fen: OPPOSITION,
    move: "e5e6",
    prompt: "Move forward and take the opposition.",
    hint: "Ke6 keeps the kings directly opposed.",
  },
  "endgames.key-squares": {
    title: "Reach the key squares",
    summary: "A king in front of its pawn can guarantee promotion from the right squares.",
    body: "Key squares convert a vague 'king activity' idea into concrete targets. Reach them before pushing the pawn automatically.",
    fen: OPPOSITION,
    move: "e5e6",
    prompt: "Occupy the key square in front of the pawn.",
    hint: "Ke6 improves the king before the pawn advances.",
  },
  "endgames.pawn-races": {
    title: "Count pawn races exactly",
    summary: "One tempo often decides which pawn queens first.",
    body: "Count moves to promotion, then account for checks and whether a promoted queen can stop the other pawn in time.",
    fen: PAWN_RACE,
    move: "a5a6",
    prompt: "Start the race with the passed a-pawn.",
    hint: "Push a6 and recalculate both promotion clocks.",
  },
  "pawns.passed": {
    title: "Passed pawns must be pushed with support",
    summary: "A passed pawn has no enemy pawn directly able to stop it.",
    body: "Passed pawns become stronger as they advance, but pushing too early can lose them. Coordinate the king and pieces before committing.",
    fen: PASSED,
    move: "e5e6",
    prompt: "Advance the protected passed pawn.",
    hint: "e6 brings the pawn closer to promotion.",
  },
  "endgames.rook-activity": {
    title: "Keep the rook active",
    summary: "Active rooks belong behind passed pawns and on open files.",
    body: "Passive rook defense is often a slow loss. Look for checking distance, activity from behind and opportunities to cut off the enemy king.",
    fen: OPEN_FILE,
    move: "a1a8",
    prompt: "Activate the rook on the open file.",
    hint: "Ra8+ uses the full file.",
  },
  "endgames.lucena": {
    title: "Build the bridge",
    summary: "The Lucena position is the essential winning rook-ending technique.",
    body: "The attacking rook uses a bridge so the king can escape checks while escorting the pawn to promotion.",
    fen: LUCENA,
    move: "d1d4",
    prompt: "Begin the bridge-building technique with Rd4.",
    hint: "Lift the rook to the fourth rank.",
  },
  "endgames.philidor": {
    title: "Hold with the sixth-rank barrier",
    summary: "The Philidor position is the essential defensive rook-ending setup.",
    body: "Keep the attacking king from advancing while the pawn remains back. Once the pawn advances, switch to checking from behind.",
    fen: PHILIDOR,
    move: "a6d6",
    prompt: "Maintain the sixth-rank barrier with a waiting rook move.",
    hint: "Move the rook along the sixth rank to d6.",
  },
  "conversion.simplify": {
    title: "Simplify without going passive",
    summary: "When clearly ahead, reduce the opponent's counterplay.",
    body: "Trading pieces often helps the side with a material advantage, but trade because the resulting position is easier—not because every exchange is automatically good.",
    fen: TRADE,
    move: "d2d4",
    prompt: "Exchange the remaining rooks and simplify.",
    hint: "Rxd4 removes the opponent's active rook.",
  },

  "practical.time": {
    title: "Spend time where the position deserves it",
    summary: "Routine moves should not consume the clock needed for critical decisions.",
    body: "Use more time when the position changes sharply: checks, captures, tactical tension, irreversible pawn moves and major exchanges.",
    fen: START,
    move: "g1f3",
    prompt: "Make the routine developing move without overcomplicating it.",
    hint: "Nf3 is a normal low-risk developing move.",
  },
  "practical.plan": {
    title: "Turn features into a plan",
    summary: "A plan is a useful next objective, not a ten-move prophecy.",
    body: "Identify the most important feature—weak piece, open file, pawn break, king safety—then choose a move that improves your position around it.",
    fen: START,
    move: "b1c3",
    prompt: "Choose a simple plan: improve an undeveloped piece.",
    hint: "Nc3 improves a piece and central control.",
  },
  "practical.transition": {
    title: "Notice when the phase changes",
    summary: "Different rules become important as the position simplifies.",
    body: "Opening development matters less once pieces are active; king activity matters more as pieces disappear. Reassess after major exchanges.",
    fen: CASTLE,
    move: "e1g1",
    prompt: "Finish the opening task of king safety before planning the middlegame.",
    hint: "Castle kingside.",
  },
  "practical.post-move-check": {
    title: "Re-scan after every move",
    summary: "Every move changes lines, defenders and tactical possibilities.",
    body: "Do not reuse the previous position's evaluation automatically. After each move, scan checks, captures and threats again.",
    fen: CHECK,
    move: "e1d1",
    prompt: "The board changed and your king is checked. Re-scan and respond.",
    hint: "Step off the e-file.",
  },
  "practical.resilience": {
    title: "Stop the error cascade",
    summary: "After a mistake, solve the new position instead of replaying the old one emotionally.",
    body: "A bad move changes the evaluation, not the rules. Reassess material, king safety and threats, then make the best practical move available now.",
    fen: HANG,
    move: "e2e4",
    prompt: "Stabilize the position by saving the attacked queen.",
    hint: "Qe4 removes the immediate material loss.",
  },

  "tactics.combinations": {
    title: "Combine motifs instead of naming one",
    summary: "Strong combinations often work because one forcing move creates a second tactical mechanism.",
    body: "At advanced level, labels are only search cues. Calculate how deflection, overload, open lines and mating threats interact after every forced reply.",
    fen: ADV_COMBO,
    move: "e1e8",
    prompt: "Start the forcing sequence by using the back rank to overload Black's queen.",
    hint: "A rook check on the eighth rank forces the defender to commit.",
  },
  "tactics.defensive-resources": {
    title: "Look for forcing defense",
    summary: "Before accepting a passive defense, search for checks, exchanges and zwischenzugs that change the move order.",
    body: "Defensive calculation should be active. A forcing resource can make the attacker answer you, trade the key attacking piece or reverse the initiative.",
    fen: ADV_DEFENSE,
    move: "d1d8",
    prompt: "Find the countercheck that forces Black to stop attacking and answer you.",
    hint: "The white rook can reach the eighth rank with check.",
  },
  "calculation.branching": {
    title: "Compare branches, not one favorite line",
    summary: "Keep at least two serious candidates alive until their resulting positions can be compared.",
    body: "Tunnel vision is a calculation error even when the line you calculated is legal. Generate candidates, calculate the opponent's best reply in each branch, then compare outcomes.",
    fen: ADV_COMBO,
    move: "e1e8",
    prompt: "Choose the forcing branch only after recognizing why Black's best reply still leaves White with follow-up play.",
    hint: "Start with the move that forces the queen to respond.",
  },
  "calculation.evaluation": {
    title: "Stop at a stable position",
    summary: "A line is finished when forcing moves run out and you can evaluate the resulting position accurately.",
    body: "Do not calculate forever and do not stop after the first gain. At the end of a branch, compare material, king safety, activity, pawn structure and remaining forcing moves.",
    fen: CAPTURE,
    move: "e2d3",
    prompt: "Take the pawn, then evaluate the stable material and activity change rather than stopping at the capture itself.",
    hint: "The queen can capture d3 safely.",
  },
  "strategy.imbalances": {
    title: "Let the imbalance choose the plan",
    summary: "Plans come from what is unequal: piece quality, structure, space, king safety, material or initiative.",
    body: "Avoid generic improvement moves. Identify the most important imbalance, decide whether it is temporary or permanent, and choose a plan that increases your useful advantage or attacks theirs.",
    fen: ADV_IMBALANCE,
    move: "c3a5",
    prompt: "Preserve the bishop's long-range potential instead of drifting into the knight's preferred closed fight.",
    hint: "Use the bishop's ability to work from distance.",
  },
  "strategy.bishop-vs-knight": {
    title: "Judge the minor pieces by the position",
    summary: "A bishop or knight is good only relative to pawn structure, targets, outposts and the side of the board where play happens.",
    body: "Do not use a universal bishop-versus-knight rule. Open positions and play on both wings often favor bishops; stable outposts and closed structures can make knights dominant.",
    fen: ADV_MINOR,
    move: "c4d5",
    prompt: "Exchange the bishop for the centralized knight when removing the dominant blockader solves the position's main problem.",
    hint: "The knight on d5 is the key centralized piece.",
  },
  "strategy.exchanges": {
    title: "Exchange to transform the position",
    summary: "The point of an exchange is the new position it creates, not the act of trading itself.",
    body: "Before exchanging, ask which imbalance disappears, which piece becomes stronger, what pawn structure remains and whether counterplay increases or decreases.",
    fen: TRADE,
    move: "d2d4",
    prompt: "Exchange the rooks and judge the simplified result.",
    hint: "The white rook can capture on d4.",
  },
  "strategy.restriction": {
    title: "Take away the opponent's good squares",
    summary: "Restriction improves your position by reducing the opponent's useful choices before you attack.",
    body: "Prophylaxis is not passive waiting. Fix a piece, control a break or take away an outpost so the opponent cannot activate while you improve.",
    fen: ADV_RESTRICTION,
    move: "e4e5",
    prompt: "Gain space with tempo and drive the knight away from its useful square.",
    hint: "The e-pawn can advance and attack d6.",
  },
  "strategy.coordination": {
    title: "Make pieces work on the same job",
    summary: "Coordination is stronger than isolated activity: pieces should support the same break, file, target or invasion square.",
    body: "Two active pieces can still be poorly coordinated if they pursue unrelated goals. Look for moves that connect their influence and make the next operation easier.",
    fen: ADV_COORDINATION,
    move: "a1d1",
    prompt: "Bring the rook onto the same file as the queen so the heavy pieces coordinate.",
    hint: "The d-file lets rook and queen support the same direction.",
  },
  "pawns.iqp": {
    title: "Use the IQP before it becomes weak",
    summary: "An isolated queen's pawn gives space and dynamic breaks now, but may become a fixed target after pieces are exchanged.",
    body: "The IQP is a time-sensitive imbalance. Favor activity, piece coordination and the d5-d6 or d4-d5 break while enough pieces remain to use the open lines.",
    fen: ADV_IQP,
    move: "d5d6",
    prompt: "Advance the isolated pawn while it can still gain space and create activity.",
    hint: "The isolated pawn's strength is mobility, not passive defense.",
  },
  "pawns.hanging": {
    title: "Use hanging pawns as a dynamic unit",
    summary: "Connected c- and d-pawns control space and support breaks, but one advance can leave the other permanently weak.",
    body: "Do not push hanging pawns automatically. Advance when the break gains activity or creates a passed pawn; otherwise keep them mutually supporting.",
    fen: ADV_HANGING,
    move: "c4c5",
    prompt: "Advance one hanging pawn to gain space while preserving the d4 pawn's central support.",
    hint: "The c-pawn can gain a tempo of space without abandoning the pair completely.",
  },
  "pawns.minority": {
    title: "Create a weakness with the minority",
    summary: "A minority attack uses fewer pawns to force a fixed target in the opponent's larger pawn group.",
    body: "The goal is not to win a pawn by force. Advance until exchanges create a backward or isolated pawn that your pieces can attack later.",
    fen: ADV_MINORITY,
    move: "b4b5",
    prompt: "Continue the queenside minority advance and prepare contact with Black's pawn chain.",
    hint: "Push the b-pawn to create the first pawn contact.",
  },
  "strategy.repertoire-middlegames": {
    title: "Know the middlegame your opening is aiming for",
    summary: "Opening knowledge is useful when it predicts structures, breaks and piece routes after memorized moves end.",
    body: "Connect your repertoire to recurring middlegames. Ask which pawn break matters, which minor piece is often misplaced and where the rooks belong once development finishes.",
    fen: ADV_REPERTOIRE,
    move: "d2d3",
    prompt: "Complete the Italian structure with a flexible d3 setup before choosing the central break.",
    hint: "Support e4 and keep both c3-d4 and later central plans available.",
  },
  "endgames.rook-checks": {
    title: "Use checking distance and cutoffs",
    summary: "Rook endings are often decided by whether the rook can check from far enough away while the king is cut off.",
    body: "An active rook needs space. Cut the king from the pawn, use side or rear checks with enough distance, and avoid placing the rook where the enemy king can attack it with tempo.",
    fen: ADV_ROOK_CHECKS,
    move: "g2g7",
    prompt: "Activate the rook with a side check that keeps distance from the king.",
    hint: "The seventh rank gives the rook a checking line across the board.",
  },
  "endgames.opposite-bishops": {
    title: "Blockade the color you can control",
    summary: "Opposite-colored bishops make passed-pawn blockades unusually resilient because each bishop controls squares the other cannot contest.",
    body: "Material count can mislead. Build a blockade on your bishop's color, keep the king near the other wing and avoid creating passers that the enemy bishop can stop forever.",
    fen: ADV_OPPOSITE_BISHOPS,
    move: "d4d5",
    prompt: "Fix the pawn structure and create a blockadeable target rather than opening both wings immediately.",
    hint: "Advance the central pawn one square.",
  },
  "endgames.minor-piece": {
    title: "Activate the king before chasing pawns",
    summary: "Minor-piece endings magnify king activity, outposts and fixed pawn targets.",
    body: "When queens and rooks are gone, the king becomes an attacking piece. Coordinate it with the minor piece and improve the piece before collecting pawns that can run away.",
    fen: ADV_MINOR_ENDING,
    move: "d3e5",
    prompt: "Centralize the knight onto an active square that attacks the pawn structure.",
    hint: "The knight can jump toward e5.",
  },
  "conversion.two-weaknesses": {
    title: "Open a second front",
    summary: "A single weakness can often be defended; two separated weaknesses overload the defender.",
    body: "When direct pressure stalls, keep the first target fixed and transfer pieces to the other wing. Force the defender to stretch before making the final entry.",
    fen: ADV_TWO_WEAKNESSES,
    move: "a1d1",
    prompt: "Centralize the rook so it can switch between both wings instead of attacking only one pawn.",
    hint: "The rook needs a flexible file from which it can transfer laterally.",
  },
  "practical.complications": {
    title: "Choose the right level of complexity",
    summary: "Simplify when clarity protects your advantage; complicate when concrete activity gives you better practical chances.",
    body: "Complexity is a tool, not a goal. Consider objective evaluation, clock, king safety and the opponent's resources. Never choose chaos only because the position is uncomfortable.",
    fen: TRADE,
    move: "d2d4",
    prompt: "Choose the simplifying exchange when reducing counterplay is the practical priority.",
    hint: "Trade the rooks rather than preserving unnecessary tension.",
  },
};

interface LessonTransferSeed {
  fen: string;
  acceptedMoves: string[];
  prompt: string;
  success: string;
  hints: string[];
}

const transferSeeds: Record<string, LessonTransferSeed> = {
  "fundamentals.attacked": {
    fen: "4k3/8/2n5/8/3Q4/8/8/4K3 w - - 0 1",
    acceptedMoves: ["d4e3"],
    prompt:
      "The knight on c6 attacks your queen. Save the queen without creating a new immediate problem.",
    success:
      "You responded to the concrete attack first instead of continuing with a plan that no longer mattered.",
    hints: [
      "Start with the opponent's forcing threats.",
      "The knight on c6 attacks d4.",
      "Move the queen from d4 to e3.",
    ],
  },
  "fundamentals.hanging": {
    fen: "4k3/8/2n5/8/3Q4/8/8/4K3 w - - 0 1",
    acceptedMoves: ["d4e3"],
    prompt:
      "Your queen is loose to the knight. Remove the hanging-piece problem before doing anything else.",
    success:
      "The queen is no longer available to a one-move capture. That is the habit this lesson is trying to automate.",
    hints: [
      "Ask which of your valuable pieces can be captured immediately.",
      "The c6 knight attacks d4.",
      "Qe3 solves the immediate problem.",
    ],
  },
  "fundamentals.blunder-check": {
    fen: "4k3/8/2n5/8/3Q4/8/8/4K3 w - - 0 1",
    acceptedMoves: ["d4e3"],
    prompt:
      "Run the final blunder check. Which move gets the queen out of the knight's attack?",
    success:
      "You used the opponent's immediate capture threat as the final filter before committing.",
    hints: [
      "What can Black capture after your move?",
      "The knight currently attacks d4.",
      "Move the queen to e3.",
    ],
  },
  "defense.threats": {
    fen: "4k3/8/2n5/8/3Q4/8/8/4K3 w - - 0 1",
    acceptedMoves: ["d4e3"],
    prompt:
      "Name Black's immediate threat, then make the move that neutralizes it.",
    success:
      "You solved the opponent's threat before looking for your own active idea.",
    hints: [
      "Scan checks and captures against you first.",
      "The knight can capture the queen on d4.",
      "Qe3 steps out of the attack.",
    ],
  },
  "tactics.double-attack": {
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["f5d6"],
    prompt:
      "Find a move that attacks the king and queen at the same time.",
    success:
      "Nd6+ creates two urgent problems with one move: check on e8 and an attack on c8.",
    hints: [
      "Look for a knight move with check first.",
      "The useful destination must also attack c8.",
      "Nd6+ is the double attack.",
    ],
  },
  "tactics.knight-fork": {
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["f5d6"],
    prompt:
      "Use knight geometry to fork the king and queen.",
    success:
      "The knight reaches d6 with check while also attacking the queen on c8.",
    hints: [
      "List the checking squares for the knight.",
      "From d6 the knight attacks both e8 and c8.",
      "Play Nd6+.",
    ],
  },
  "tactics.pin": {
    fen: "4k3/3n4/8/8/2B5/8/8/4K3 w - - 0 1",
    acceptedMoves: ["c4b5"],
    prompt:
      "Create an absolute pin on the d7 knight.",
    success:
      "Bb5 pins the knight to the king because moving the knight would expose check along the diagonal.",
    hints: [
      "Find a bishop square that lines the knight up with the king.",
      "The diagonal b5-c6-d7-e8 is the key.",
      "Play Bb5.",
    ],
  },
  "tactics.discovered": {
    fen: "k7/8/8/8/8/8/B7/R6K w - - 0 1",
    acceptedMoves: ["a2f7"],
    prompt:
      "Move the bishop so the rook on a1 is revealed against the king.",
    success:
      "Bf7 clears the a-file and uncovers the rook's attack on a8.",
    hints: [
      "The rook already points toward the king but one friendly piece blocks it.",
      "Move the bishop away from a2.",
      "Bf7 reveals the rook check.",
    ],
  },
  "tactics.back-rank": {
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    acceptedMoves: ["a1a8"],
    prompt:
      "The king has no flight square. Finish with the back-rank pattern.",
    success:
      "Ra8+ exploits the sealed pawn shelter: the king cannot step onto the seventh rank.",
    hints: [
      "Verify that f7, g7 and h7 remove the king's escape squares.",
      "A rook check on the eighth rank is decisive.",
      "Play Ra8+.",
    ],
  },
  "calculation.candidates": {
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["f5d6"],
    prompt:
      "Generate forcing candidates first, then choose the move that creates the strongest concrete problem.",
    success:
      "Nd6+ wins the candidate comparison because it checks and attacks the queen simultaneously.",
    hints: [
      "Begin with checks before quiet moves.",
      "One knight check also attacks a major piece.",
      "Nd6+ is the forcing candidate.",
    ],
  },
  "calculation.reply": {
    fen: "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
    acceptedMoves: ["e1e8"],
    prompt:
      "Choose the forcing move only after checking Black's best legal responses.",
    success:
      "Re8 is decisive because the king has no legal flight square and there is no useful block or capture.",
    hints: [
      "After your candidate, give Black every legal defense.",
      "The back-rank pawns remove the king moves.",
      "Re8 is the forcing conclusion.",
    ],
  },
  "calculation.forcing-lines": {
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["f5d6"],
    prompt:
      "Start the calculation with the forcing move that sharply reduces Black's reply tree.",
    success:
      "Nd6+ forces a king response while keeping the attack on the queen visible in the resulting position.",
    hints: [
      "Checks usually shrink the reply tree most.",
      "Search the knight's checking squares.",
      "Nd6+ begins the forcing line.",
    ],
  },
  "calculation.visualization": {
    fen: "2q1k3/8/8/5N2/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["f5d6"],
    prompt:
      "Before moving, picture the knight on d6 and identify both squares it will attack.",
    success:
      "The imagined board was accurate: from d6 the knight checks e8 and attacks c8.",
    hints: [
      "Rebuild the knight's attacks from its destination, not its starting square.",
      "A knight on d6 attacks e8 and c8.",
      "Now play Nd6+.",
    ],
  },
  "calculation.quiet": {
    fen: "rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    acceptedMoves: ["g1f3"],
    prompt:
      "No tactic is required. Choose a quiet move that improves a piece and increases central influence.",
    success:
      "Nf3 improves a dormant piece, controls central squares and develops without forcing the position.",
    hints: [
      "Look for the least active piece rather than a forcing move.",
      "A kingside knight can improve naturally.",
      "Play Nf3.",
    ],
  },
  "endgames.pawn-races": {
    fen: "8/8/8/1P6/6p1/8/4K2k/8 w - - 0 1",
    acceptedMoves: ["b5b6"],
    prompt:
      "Count both promotion races, then commit to the passed pawn push.",
    success:
      "b6 advances the race by one tempo. The key habit is counting both sides before assuming a passed pawn is fast enough.",
    hints: [
      "Count moves to promotion for both pawns.",
      "Your b-pawn must keep moving.",
      "Play b6.",
    ],
  },
  "pawns.passed": {
    fen: "4k3/8/8/3P4/8/8/3K4/8 w - - 0 1",
    acceptedMoves: ["d5d6"],
    prompt:
      "Advance the passed pawn while its king remains close enough to support the promotion plan.",
    success:
      "d6 increases the passed pawn's value while the king remains available to support it.",
    hints: [
      "A passed pawn grows stronger as it advances, provided it is not simply lost.",
      "The d-pawn can gain a rank safely here.",
      "Play d6.",
    ],
  },
  "endgames.rook-activity": {
    fen: "7k/8/8/8/8/8/8/K6R w - - 0 1",
    acceptedMoves: ["h1h7"],
    prompt:
      "Activate the rook with a checking invasion instead of leaving it passive on the back rank.",
    success:
      "Rh7+ uses the open file and forces the king to respond. Active rooks create problems from a distance.",
    hints: [
      "Look for the most active rank the rook can reach with tempo.",
      "The h-file is completely open.",
      "Play Rh7+.",
    ],
  },
  "endgames.lucena": {
    fen: "5K2/3k1P2/8/8/8/8/7r/4R3 w - - 0 1",
    acceptedMoves: ["e1e4"],
    prompt:
      "This is the mirrored Lucena structure. Begin building the bridge.",
    success:
      "Re4 starts the same bridge-building mechanism on the mirrored board.",
    hints: [
      "The technique survives when the board is mirrored.",
      "Lift the rook to the fourth rank.",
      "Play Re4.",
    ],
  },
  "endgames.philidor": {
    fen: "8/8/3k3r/3P4/3K4/8/8/R7 b - - 0 1",
    acceptedMoves: ["h6e6"],
    prompt:
      "Use the mirrored Philidor setup to keep the sixth-rank barrier.",
    success:
      "Re6 preserves the barrier and prevents the attacking king from making useful progress.",
    hints: [
      "Do not abandon the sixth rank while the pawn remains back.",
      "Keep the rook active laterally on rank six.",
      "Play Re6.",
    ],
  },

  "tactics.combinations": {
    fen: MATE,
    acceptedMoves: ["e1e8"],
    prompt: "Recognize the final forcing motif after a different tactical buildup and finish the back rank.",
    success: "You transferred the combination search into a new mating geometry.",
    hints: ["Look for the most forcing move first.", "The king has no useful flight square.", "Play Re8#."],
  },
  "tactics.defensive-resources": {
    fen: CHECK,
    acceptedMoves: ["e1d1"],
    prompt: "The position is forcing. Find the concrete defensive move before considering any long-term plan.",
    success: "You prioritized the forcing defensive requirement before strategic wishes.",
    hints: ["Start with checks against your king.", "Leave the attacked file.", "Move Ke1-d1."],
  },
  "calculation.branching": {
    fen: FORK,
    acceptedMoves: ["d6f7"],
    prompt: "Compare the forcing candidates and choose the branch that attacks both king and queen.",
    success: "You selected the branch with the strongest forcing consequences.",
    hints: ["List all checks first.", "The knight can attack two major targets.", "Play Nf7+."],
  },
  "calculation.evaluation": {
    fen: TRADE,
    acceptedMoves: ["d2d4"],
    prompt: "Calculate the exchange, then stop at the simplified position and evaluate what remains.",
    success: "You ended the line at a stable position and evaluated the result instead of calculating aimlessly.",
    hints: ["The forcing exchange is easy; the evaluation after it is the real task.", "Both rooks occupy the d-file.", "Play Rxd4."],
  },
  "strategy.imbalances": {
    fen: PAWN_BREAK,
    acceptedMoves: ["e4e5"],
    prompt: "Use the space and pawn-break imbalance to gain time against Black's central structure.",
    success: "You let the position's most important imbalance dictate the plan.",
    hints: ["Compare space and pawn mobility.", "A central pawn move attacks d6.", "Play e5."],
  },
  "strategy.bishop-vs-knight": {
    fen: OUTPOST,
    acceptedMoves: ["d5f6"],
    prompt: "Use the knight's outpost to create a concrete threat before considering an exchange.",
    success: "You evaluated the minor piece by its square and targets rather than by a fixed rule.",
    hints: ["The knight is stable and central.", "Look for a jump toward the king side.", "Play Nf6."],
  },
  "strategy.exchanges": {
    fen: EXCHANGE_ATTACKER,
    acceptedMoves: ["d3d4"],
    prompt: "Exchange the active rook when the resulting position removes the opponent's only source of activity.",
    success: "You judged the transformation, not merely the equal material trade.",
    hints: ["Identify the opponent's most active piece.", "The rooks face each other on the d-file.", "Play Rxd4."],
  },
  "strategy.restriction": {
    fen: OUTPOST,
    acceptedMoves: ["d5f6"],
    prompt: "Use the stable knight to restrict key king-side squares rather than abandoning the outpost.",
    success: "You carried the restriction principle into a different piece geometry.",
    hints: ["Preserve the stable piece.", "Look for a square that increases control near the king.", "Play Nf6."],
  },
  "strategy.coordination": {
    fen: OPEN_FILE,
    acceptedMoves: ["a1a8"],
    prompt: "Use the open file so the rook coordinates with the king-side pressure instead of remaining disconnected.",
    success: "You activated the heavy piece on the line where it can participate immediately.",
    hints: ["Find the completely open file.", "The rook can invade the eighth rank.", "Play Ra8+."],
  },
  "pawns.iqp": {
    fen: PAWN_BREAK,
    acceptedMoves: ["e4e5"],
    prompt: "Use the central pawn's mobility to create activity before the structure becomes static.",
    success: "You treated the isolated-pawn idea dynamically rather than as a permanent weakness label.",
    hints: ["Look for the freeing pawn advance.", "The e-pawn can gain space with tempo.", "Play e5."],
  },
  "pawns.hanging": {
    fen: "4k3/8/8/2PP4/8/8/8/4K3 w - - 0 1",
    acceptedMoves: ["d5d6"],
    prompt: "Advance the connected pawn only when the pair remains capable of supporting a passed pawn.",
    success: "You used hanging-pawn mobility in a second structure.",
    hints: ["Keep the connected pair coordinated.", "The d-pawn can advance safely.", "Play d6."],
  },
  "pawns.minority": {
    fen: "4k3/ppp5/8/1P6/2P5/8/8/4K3 w - - 0 1",
    acceptedMoves: ["c4c5"],
    prompt: "Continue making contact so the minority can create a fixed queenside target.",
    success: "You transferred the minority-attack goal from the move to the weakness it is trying to create.",
    hints: ["The objective is pawn contact.", "Advance the remaining queenside pawn.", "Play c5."],
  },
  "strategy.repertoire-middlegames": {
    fen: "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQR1K1 w - - 6 6",
    acceptedMoves: ["d2d4"],
    prompt: "Recognize the familiar Italian center and choose the thematic central expansion when development permits it.",
    success: "You connected opening memory to the middlegame break rather than to a memorized move number.",
    hints: ["Name the structure before calculating.", "White can challenge the center directly.", "Play d4."],
  },
  "endgames.rook-checks": {
    fen: "8/2k5/3P4/8/8/8/1R6/1K6 w - - 0 1",
    acceptedMoves: ["b2b7"],
    prompt: "Use checking distance from the side in the mirrored rook-ending geometry.",
    success: "You reproduced the active-checking principle on the other side of the board.",
    hints: ["Keep distance from the king.", "The seventh rank gives a side check.", "Play Rb7+."],
  },
  "endgames.opposite-bishops": {
    fen: "4k3/8/8/3p4/4P3/5B2/8/2b1K3 w - - 0 1",
    acceptedMoves: ["f3g4"],
    prompt: "Improve the bishop while preserving control of the color complex that supports the blockade.",
    success: "You maintained the correct-color blockade idea in a different bishop ending.",
    hints: ["Do not chase the opposite bishop directly.", "Improve your bishop on its own color complex.", "Play Bg4."],
  },
  "endgames.minor-piece": {
    fen: "4k3/8/8/4p3/4P3/5N2/8/4K3 w - - 0 1",
    acceptedMoves: ["f3e5"],
    prompt: "Centralize the knight and attack the fixed central pawn.",
    success: "You used king-and-minor-piece ending logic in a different setup.",
    hints: ["Central activity matters more after heavy pieces disappear.", "The e5 square contains the target.", "Play Nxe5."],
  },
  "conversion.two-weaknesses": {
    fen: "4k3/p6p/8/8/8/8/P6P/3RK3 w - - 0 1",
    acceptedMoves: ["d1d7"],
    prompt: "Use the active rook to penetrate centrally so it can attack either wing.",
    success: "You created the mobility needed to pressure two separated weaknesses.",
    hints: ["Do not commit to only one wing.", "Use the open d-file for penetration.", "Play Rd7."],
  },
  "practical.complications": {
    fen: ADV_COMBO,
    acceptedMoves: ["e1e8"],
    prompt: "Here simplification is not the priority: choose the forcing line because the tactical conditions justify complexity.",
    success: "You matched the level of complexity to the concrete position instead of following a fixed preference.",
    hints: ["The king is vulnerable now.", "A forcing rook move changes the evaluation immediately.", "Play Re8+."],
  },
};

export const deepTransferSkillIds = Object.freeze(
  Object.keys(transferSeeds),
);

function moveSquares(move: string) {
  return {
    from: move.slice(0, 2) as Square,
    to: move.slice(2, 4) as Square,
  };
}

function moveHints(
  seed: LessonSeed,
  move: string,
  conceptual = seed.summary,
) {
  const { from, to } = moveSquares(move);
  return [
    {
      text: conceptual,
    },
    {
      text: seed.hint,
      highlights: [{ square: from, tone: "hint" as const }],
    },
    {
      text: `The move starts on ${from} and finishes on ${to}.`,
      highlights: [
        { square: from, tone: "hint" as const },
        { square: to, tone: "good" as const },
      ],
      arrows: [
        {
          from,
          to,
          tone: "hint" as const,
        },
      ],
    },
  ];
}

function transferHints(
  transfer: LessonTransferSeed,
) {
  const move = transfer.acceptedMoves[0];
  const { from, to } = moveSquares(move);
  return [
    {
      text:
        transfer.hints[0] ??
        "Name the concept before calculating moves.",
    },
    {
      text:
        transfer.hints[1] ??
        "Compare the strongest candidate with the opponent's best reply.",
      highlights: [{ square: from, tone: "hint" as const }],
    },
    {
      text:
        transfer.hints[2] ??
        `Consider the move from ${from} to ${to}.`,
      highlights: [
        { square: from, tone: "hint" as const },
        { square: to, tone: "good" as const },
      ],
      arrows: [
        {
          from,
          to,
          tone: "hint" as const,
        },
      ],
    },
  ];
}

function misconceptionOptions(seed: LessonSeed) {
  return [
    {
      id: "principle",
      text: seed.summary,
      feedback:
        "Correct. That is the reusable idea; the board move is only one example of it.",
    },
    {
      id: "automatic",
      text:
        "Once you recognize the pattern, the same move should be played automatically in every similar position.",
      feedback:
        "Pattern recognition starts the search, but legality, tactics and the opponent's best reply still decide whether the move works.",
    },
    {
      id: "hope",
      text:
        "If the idea looks attractive, you can ignore the opponent's strongest response and calculate only your own plan.",
      feedback:
        "That is hope, not chess calculation. A concept is useful only when it survives the opponent's best response.",
    },
  ];
}

// Retrieval must not simply repeat the same three options shown during contrast.
function retrievalOptions(seed: LessonSeed) {
  return [
    {
      id: "principle",
      text: seed.summary + " Verify legality and the opponent's best reply first.",
      feedback: "Correct. You must recognize when the principle applies, not copy the model move.",
    },
    {
      id: "automatic",
      text: "Remember the exact squares from the example, then copy that move whenever the board looks similar.",
      feedback: "A recalled coordinate is not an explanation. The pieces and opponent's threats can change.",
    },
    {
      id: "hope",
      text: "Once you remember a useful principle, the opponent's strongest response no longer matters.",
      feedback: "A principle guides candidate generation, but a concrete reply can refute the move.",
    },
  ];
}

function makeScript(
  skillId: string,
  seed: LessonSeed,
): LessonScript {
  const { from, to } = moveSquares(seed.move);
  const transfer =
    transferSeeds[skillId] ?? {
      fen: seed.fen,
      acceptedMoves: [seed.move],
      prompt:
        `Solve the position again without the demonstration. ${seed.prompt}`,
      success:
        seed.success ?? seed.summary,
      hints: [
        "Name the concept and the opponent's strongest reply before touching a piece.",
        seed.hint,
        `The key move runs from ${from} to ${to}.`,
      ],
    };

  return {
    id: `lesson-${skillId}`,
    skillId,
    title: seed.title,
    summary: seed.summary,
    steps: [
      {
        id: "model",
        type: "explain",
        stage: "model",
        eyebrow: "MODEL",
        title: seed.title,
        body: seed.body,
        fen: seed.fen,
        highlights: [
          { square: from, tone: "focus" },
          { square: to, tone: "good" },
        ],
      },
      {
        id: "worked-example",
        type: "explain",
        stage: "example",
        eyebrow: "WORKED EXAMPLE",
        title: "See the idea before you have to find it.",
        body:
          `${seed.prompt} The reusable lesson is: ${seed.summary} First understand why the move works; memorizing the coordinates is not the goal.`,
        fen: seed.fen,
        highlights: [
          { square: from, tone: "focus" },
          { square: to, tone: "good" },
        ],
        arrows: [
          {
            from,
            to,
            tone: "good",
          },
        ],
      },
      {
        id: "misconception",
        type: "choice",
        stage: "contrast",
        support: "retrieval",
        eyebrow: "CONTRAST",
        title: "Which rule should you carry to another position?",
        prompt:
          "Choose the statement that captures the chess idea rather than the memorized move.",
        fen: seed.fen,
        options: misconceptionOptions(seed),
        correctOptionId: "principle",
        successTitle: "Concept separated from coordinates",
        successBody:
          "Good. You identified the transferable principle instead of treating one board position as a recipe.",
      },
      {
        id: "guided",
        type: "move",
        stage: "guided",
        support: "guided",
        eyebrow: "GUIDED PRACTICE",
        title: "Apply it with support.",
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: seed.title,
        successBody:
          seed.success ?? seed.summary,
        hints: moveHints(seed, seed.move),
      },
      {
        id: "retrieval-check",
        type: "choice",
        stage: "retrieval",
        support: "retrieval",
        eyebrow: "RETRIEVAL",
        title: "Rebuild the idea from memory.",
        prompt:
          "Before moving again, which statement should guide your search?",
        fen: seed.fen,
        options: retrievalOptions(seed),
        correctOptionId: "principle",
        successTitle: "You retrieved the principle",
        successBody:
          "Now use that principle without relying on the worked-example arrow.",
      },
      {
        id: "independent",
        type: "move",
        stage: "retrieval",
        support: "retrieval",
        eyebrow: "INDEPENDENT",
        title: "Find it without the demonstration.",
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: "Independent retrieval",
        successBody:
          "You reproduced the idea after the visual support was removed.",
        hints: moveHints(
          seed,
          seed.move,
          "Name the concept first. Only then compare candidate moves.",
        ),
      },
      {
        id: "transfer",
        type: "move",
        stage: "transfer",
        // Repeating the worked position is retrieval, not transfer to new geometry.
        support: transfer.fen === seed.fen ? "retrieval" : "transfer",
        eyebrow: "TRANSFER",
        title:
          transfer.fen === seed.fen
            ? "Prove you can retrieve it again."
            : "Use the idea in a different position.",
        prompt: transfer.prompt,
        fen: transfer.fen,
        acceptedMoves:
          transfer.acceptedMoves,
        successTitle: "Transfer complete",
        successBody: transfer.success,
        hints: transferHints(transfer),
      },
      {
        id: "takeaway",
        type: "explain",
        stage: "takeaway",
        eyebrow: "TAKEAWAY",
        title: "Keep the rule, not the coordinates.",
        body:
          `${seed.summary} In a real game, recognize the condition first, check the opponent's strongest reply, and only then commit to the move.`,
        fen: transfer.fen,
      },
    ],
  };
}

export const lessonScripts: Record<
  string,
  LessonScript
> = Object.fromEntries(
  Object.entries(seeds).map(
    ([skillId, seed]) => [
      skillId,
      makeScript(skillId, seed),
    ],
  ),
);

export function lessonForSkill(
  skillId: string,
  _title: string,
  _description: string,
  _mode?: TrainingMode,
): LessonScript {
  const lesson = lessonScripts[skillId];
  if (!lesson) {
    throw new Error(
      `Missing authored lesson for curriculum skill: ${skillId}`,
    );
  }
  return lesson;
}

export function lessonCatalogIssues() {
  const issues: string[] = [];

  for (
    const [skillId, lesson] of
    Object.entries(lessonScripts)
  ) {
    const stepIds = new Set<string>();
    const stages = new Set(
      lesson.steps.map((step) => step.stage),
    );

    if (lesson.steps.length < 7) {
      issues.push(
        `${skillId}: only ${lesson.steps.length} lesson steps`,
      );
    }
    for (
      const stage of [
        "model",
        "contrast",
        "guided",
        "retrieval",
        "transfer",
        "takeaway",
      ] as const
    ) {
      if (!stages.has(stage)) {
        issues.push(
          `${skillId}: missing ${stage} stage`,
        );
      }
    }

    for (const step of lesson.steps) {
      if (stepIds.has(step.id)) {
        issues.push(
          `${skillId}:${step.id}: duplicate step id`,
        );
      }
      stepIds.add(step.id);

      try {
        new Chess(step.fen);
      } catch {
        issues.push(
          `${skillId}:${step.id}: invalid FEN`,
        );
        continue;
      }

      if (step.type === "choice") {
        const optionIds = new Set(
          step.options.map(
            (option) => option.id,
          ),
        );
        if (optionIds.size !== step.options.length) {
          issues.push(
            `${skillId}:${step.id}: duplicate option ids`,
          );
        }
        if (
          !optionIds.has(
            step.correctOptionId,
          )
        ) {
          issues.push(
            `${skillId}:${step.id}: missing correct option`,
          );
        }
        if (step.options.length < 3) {
          issues.push(
            `${skillId}:${step.id}: too few misconception options`,
          );
        }
        continue;
      }

      if (step.type !== "move") {
        continue;
      }

      if (step.hints.length < 2) {
        issues.push(
          `${skillId}:${step.id}: needs escalating hints`,
        );
      }

      for (
        const encoded of
        step.acceptedMoves
      ) {
        try {
          const chess = new Chess(
            step.fen,
          );
          const move = chess.move({
            from: encoded.slice(0, 2),
            to: encoded.slice(2, 4),
            promotion:
              encoded.slice(4, 5) ||
              "q",
          });
          if (!move) {
            issues.push(
              `${skillId}:${step.id}: illegal move ${encoded}`,
            );
          }
        } catch {
          issues.push(
            `${skillId}:${step.id}: illegal move ${encoded}`,
          );
        }
      }
    }

    if (
      deepTransferSkillIds.includes(
        skillId,
      )
    ) {
      const transferStep =
        lesson.steps.find(
          (step) =>
            step.stage === "transfer",
        );
      const modelStep =
        lesson.steps.find(
          (step) =>
            step.stage === "model",
        );
      if (
        !transferStep ||
        !modelStep ||
        transferStep.fen === modelStep.fen
      ) {
        issues.push(
          `${skillId}: deep lesson requires a distinct transfer position`,
        );
      }
    }
  }

  return issues;
}
