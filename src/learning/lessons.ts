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
    move: "a6h6",
    prompt: "Maintain the sixth-rank barrier with a waiting rook move.",
    hint: "Move the rook along the sixth rank to h6.",
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
};

function moveSquares(move: string) {
  return {
    from: move.slice(0, 2) as Square,
    to: move.slice(2, 4) as Square,
  };
}

function makeScript(skillId: string, seed: LessonSeed): LessonScript {
  const { from, to } = moveSquares(seed.move);

  return {
    id: `lesson-${skillId}`,
    skillId,
    title: seed.title,
    summary: seed.summary,
    steps: [
      {
        id: "concept",
        type: "explain",
        eyebrow: "CONCEPT",
        title: seed.title,
        body: seed.body,
        fen: seed.fen,
        highlights: [
          { square: from, tone: "focus" },
          { square: to, tone: "good" },
        ],
      },
      {
        id: "apply",
        type: "move",
        eyebrow: "APPLY IT",
        title: "Use the idea on the board.",
        prompt: seed.prompt,
        fen: seed.fen,
        acceptedMoves: [seed.move],
        successTitle: seed.title,
        successBody: seed.success ?? seed.summary,
        hint: seed.hint,
        hintHighlights: [
          { square: from, tone: "hint" },
          { square: to, tone: "good" },
        ],
        hintArrows: [{ from, to, tone: "hint" }],
      },
    ],
  };
}

export const lessonScripts: Record<string, LessonScript> = Object.fromEntries(
  Object.entries(seeds).map(([skillId, seed]) => [
    skillId,
    makeScript(skillId, seed),
  ]),
);

export function lessonForSkill(
  skillId: string,
  _title: string,
  _description: string,
  _mode?: TrainingMode,
): LessonScript {
  const lesson = lessonScripts[skillId];
  if (!lesson) {
    throw new Error(`Missing authored lesson for curriculum skill: ${skillId}`);
  }
  return lesson;
}

export function lessonCatalogIssues() {
  const issues: string[] = [];

  for (const [skillId, lesson] of Object.entries(lessonScripts)) {
    for (const step of lesson.steps) {
      try {
        new Chess(step.fen);
      } catch {
        issues.push(`${skillId}:${step.id}: invalid FEN`);
        continue;
      }

      if (step.type !== "move") continue;

      for (const encoded of step.acceptedMoves) {
        try {
          const chess = new Chess(step.fen);
          const move = chess.move({
            from: encoded.slice(0, 2),
            to: encoded.slice(2, 4),
            promotion: encoded.slice(4, 5) || "q",
          });
          if (!move) issues.push(`${skillId}:${step.id}: illegal move ${encoded}`);
        } catch {
          issues.push(`${skillId}:${step.id}: illegal move ${encoded}`);
        }
      }
    }
  }

  return issues;
}
