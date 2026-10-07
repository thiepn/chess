import { Chess } from "chess.js";
import { skillById } from "../domain/curriculum";
import { repertoireById } from "../openings/repertoire";
import type {
  ModelGame,
  ModelGameCheckpoint,
  ModelGameCheckpointPosition,
} from "./types";

const operaGame = `[Event "Paris Opera Game"]
[Site "Paris, France"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5
6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6
15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

const nimzowitschCapablanca = `[Event "New York"]
[Site "New York, USA"]
[Date "1927.??.??"]
[White "Aron Nimzowitsch"]
[Black "Jose Raul Capablanca"]
[Result "0-1"]

1. e4 c6 2. d4 d5 3. e5 Bf5 4. Bd3 Bxd3 5. Qxd3 e6
6. Nc3 Qb6 7. Nge2 c5 8. dxc5 Bxc5 9. O-O Ne7
10. Na4 Qc6 11. Nxc5 Qxc5 12. Be3 Qc7 13. f4 Nf5
14. c3 Nc6 15. Rad1 g6 16. g4 Nxe3 17. Qxe3 h5
18. g5 O-O 19. Nd4 Qb6 20. Rf2 Rfc8 21. a3 Rc7
22. Rd3 Na5 23. Re2 Re8 24. Kg2 Nc6 25. Red2 Rec8
26. Re2 Ne7 27. Red2 Rc4 28. Qh3 Kg7 29. Rf2 a5
30. Re2 Nf5 31. Nxf5+ gxf5 32. Qf3 Kg6 33. Red2 Re4
34. Rd4 Rc4 35. Qf2 Qb5 36. Kg3 Rcxd4 37. cxd4 Qc4
38. Kg2 b5 39. Kg1 b4 40. axb4 axb4 41. Kg2 Qc1
42. Kg3 Qh1 43. Rd3 Re1 44. Rf3 Rd1 45. b3 Rc1
46. Re3 Rf1 0-1`;

const topalovAnand = `[Event "World Championship Match"]
[Site "Sofia, Bulgaria"]
[Date "2010.05.11"]
[Round "12"]
[White "Veselin Topalov"]
[Black "Viswanathan Anand"]
[Result "0-1"]

1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. Nc3 Be7 5. Bg5 h6
6. Bh4 O-O 7. e3 Ne4 8. Bxe7 Qxe7 9. Rc1 c6 10. Be2 Nxc3
11. Rxc3 dxc4 12. Bxc4 Nd7 13. O-O b6 14. Bd3 c5
15. Be4 Rb8 16. Qc2 Nf6 17. dxc5 Nxe4 18. Qxe4 bxc5
19. Qc2 Bb7 20. Nd2 Rfd8 21. f3 Ba6 22. Rf2 Rd7
23. g3 Rbd8 24. Kg2 Bd3 25. Qc1 Ba6 26. Ra3 Bb7
27. Nb3 Rc7 28. Na5 Ba8 29. Nc4 e5 30. e4 f5
31. exf5 e4 32. fxe4 Qxe4+ 33. Kh3 Rd4 34. Ne3 Qe8
35. g4 h5 36. Kh4 g5+ 37. fxg6 Qxg6 38. Qf1 Rxg4+
39. Kh3 Re7 40. Rf8+ Kg7 41. Nf5+ Kh7 42. Rg3 Rxg3+
43. hxg3 Qg4+ 44. Kh2 Re2+ 45. Kg1 Rg2+ 46. Qxg2 Bxg2
47. Kxg2 Qe2+ 48. Kh3 c4 49. a4 a5 50. Rf6 Kg8
51. Nh6+ Kg7 52. Rb6 Qe4 53. Kh2 Kh7 54. Rd6 Qe5
55. Nf7 Qxb2+ 56. Kh3 Qg7 0-1`;

const botvinnikCapablanca = `[Event "AVRO"]
[Site "Netherlands"]
[Date "1938.11.22"]
[White "Mikhail Botvinnik"]
[Black "Jose Raul Capablanca"]
[Result "1-0"]

1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 d5 5. a3 Bxc3+
6. bxc3 c5 7. cxd5 exd5 8. Bd3 O-O 9. Ne2 b6
10. O-O Ba6 11. Bxa6 Nxa6 12. Bb2 Qd7 13. a4 Rfe8
14. Qd3 c4 15. Qc2 Nb8 16. Rae1 Nc6 17. Ng3 Na5
18. f3 Nb3 19. e4 Qxa4 20. e5 Nd7 21. Qf2 g6
22. f4 f5 23. exf6 Nxf6 24. f5 Rxe1 25. Rxe1 Re8
26. Re6 Rxe6 27. fxe6 Kg7 28. Qf4 Qe8 29. Qe5 Qe7
30. Ba3 Qxa3 31. Nh5+ gxh5 32. Qg5+ Kf8 33. Qxf6+ Kg8
34. e7 Qc1+ 35. Kf2 Qc2+ 36. Kg3 Qd3+ 37. Kh4 Qe4+
38. Kxh5 Qe2+ 39. Kh4 Qe4+ 40. g4 Qe1+ 41. Kh5 1-0`;

function option(
  id: string,
  label: string,
  correct: boolean,
  feedback: string,
) {
  return { id, label, correct, feedback };
}

function checkpoint(
  value: ModelGameCheckpoint,
): ModelGameCheckpoint {
  return value;
}

export const modelGames: ModelGame[] = [
  {
    id: "morphy-opera-1858",
    title: "Development becomes initiative",
    players: "Paul Morphy — Duke Karl / Count Isouard",
    event: "Paris Opera Game",
    year: 1858,
    result: "1–0",
    orientation: "w",
    summary:
      "A short complete game showing why development, king safety and open lines can outweigh material.",
    whyStudy:
      "Use it to connect opening principles to a concrete middlegame plan instead of memorizing isolated rules.",
    pgn: operaGame,
    tags: ["development", "initiative", "open-files", "king-safety"],
    skillIds: [
      "openings.development",
      "strategy.piece-activity",
      "openings.king-safety",
      "strategy.open-files",
      "strategy.exchanges",
    ],
    repertoireId: "white-e4-simple",
    checkpoints: [
      checkpoint({
        id: "opera-development",
        ply: 10,
        skillId: "openings.development",
        title: "Develop with a threat",
        prompt:
          "White is ahead in space but not yet in development. What should the next move accomplish?",
        options: [
          option("a", "Activate a new piece toward the king while creating a concrete threat.", true, "Correct. Development is strongest when the new piece immediately matters."),
          option("b", "Move the queen again to collect another pawn.", false, "That spends another tempo on an already-developed piece while the minor pieces remain asleep."),
          option("c", "Push a flank pawn so the bishop can be developed later.", false, "The position rewards immediate mobilization, not a slow preparatory pawn move."),
        ],
        hints: [
          "Look for the undeveloped piece that can enter the game with tempo.",
          "The f7 square gives the king-side bishop a natural target.",
        ],
        explanation:
          "Morphy played Bc4. The bishop develops to its most active diagonal and immediately makes f7 part of Black's defensive problem.",
        plan:
          "Bring every piece into the attack before spending extra tempi on material or cosmetic moves.",
      }),
      checkpoint({
        id: "opera-pin",
        ply: 16,
        skillId: "strategy.piece-activity",
        title: "Improve the attacker's coordination",
        prompt:
          "Black is behind in development and the king is still central. Which strategic priority matters most?",
        options: [
          option("a", "Increase pressure with another active piece and make development harder for Black.", true, "Correct. When the opponent is uncoordinated, every developing move should increase the burden."),
          option("b", "Trade queens immediately even if it releases Black's position.", false, "A queen trade would reduce the value of White's development lead."),
          option("c", "Retreat the active bishop to preserve it at all costs.", false, "Preserving a piece is secondary to keeping the initiative while Black is uncoordinated."),
        ],
        hints: [
          "Look for a move that develops the c1 bishop without reducing pressure.",
          "A pin can make the f6 knight less useful as a defender.",
        ],
        explanation:
          "Bg5 adds a new attacker while pinning the knight. The move is useful because it develops and restricts at the same time.",
        plan:
          "When you lead in development, choose improving moves that also restrict the opponent's ability to catch up.",
      }),
      checkpoint({
        id: "opera-castle-long",
        ply: 22,
        skillId: "openings.king-safety",
        title: "King safety with tempo",
        prompt:
          "White's pieces are active and Black's king is exposed. What should White secure before the final assault?",
        options: [
          option("a", "Move the king to safety while activating the last rook.", true, "Correct. Castling can be both a safety move and an attacking development move."),
          option("b", "Leave the king in the center because attacking is more urgent.", false, "The attack is stronger when White removes counterplay against the own king."),
          option("c", "Trade the active bishop to simplify immediately.", false, "Simplification would discard part of the development advantage before it is converted."),
        ],
        hints: [
          "One legal king move also brings a rook directly toward the center.",
          "Think of castling as a development move, not only a defensive move.",
        ],
        explanation:
          "O-O-O secures the king and places the rook on d1, where the open d-file soon becomes decisive.",
        plan:
          "Before converting an initiative, remove the opponent's easiest counterplay and connect the remaining pieces.",
        turningPoint:
          "From here the d-file is not just an open line; it becomes the route through which every remaining white piece joins the attack.",
      }),
      checkpoint({
        id: "opera-open-file",
        ply: 26,
        skillId: "strategy.open-files",
        title: "Occupy the open file",
        prompt:
          "After exchanges on d7, Black's king and queen remain tied to the center. What should White do with the remaining rook?",
        options: [
          option("a", "Reoccupy the d-file immediately and keep the initiative forcing.", true, "Correct. Open files matter when a rook can enter them with targets and tempo."),
          option("b", "Move the rook to the edge to attack a pawn.", false, "That abandons the line connecting White's heavy piece to the king."),
          option("c", "Pause to defend queenside pawns.", false, "The position is dynamic; giving Black a consolidation tempo wastes the open-file advantage."),
        ],
        hints: [
          "The d-file has just been cleared.",
          "The remaining rook can replace the rook that was exchanged.",
        ],
        explanation:
          "Rd1 keeps a rook on the open d-file and prevents Black from stabilizing. The later combination works because the rook already owns the invasion line.",
        plan:
          "After an exchange opens a file, ask whether another rook can occupy it before the opponent reorganizes.",
        turningPoint:
          "The final mating pattern is a consequence of accumulated activity, not a disconnected tactical trick.",
      }),
      checkpoint({
        id: "opera-transform-exchange",
        ply: 24,
        skillId: "strategy.exchanges",
        title: "Exchange to keep the initiative",
        prompt:
          "White is about to give up one rook on d7. Why is this exchange strategically justified?",
        options: [
          option("a", "Because the exchange clears the d-file so the remaining rook can enter with tempo while Black stays uncoordinated.", true, "Correct. The value of the exchange is the transformed position: one active rook replaces another on the decisive file."),
          option("b", "Because exchanging rooks is always desirable when attacking.", false, "Automatic exchanges can kill an attack. Here it works only because the remaining rook gains the open file immediately."),
          option("c", "Because material no longer matters once the enemy king is uncastled.", false, "Material still matters; the exchange is justified by concrete activity and coordination."),
        ],
        hints: [
          "Look at what happens to the d-file after Rxd7.",
          "Ask which white rook can replace the exchanged rook immediately.",
        ],
        explanation:
          "Rxd7! is not a generic simplification. It removes Black's key defender and clears d1-d8 so the other rook can occupy the file with tempo.",
        plan:
          "Judge an exchange by the position it creates: which lines open, which defender disappears, and which remaining piece becomes stronger.",
      }),
    ],
  },
  {
    id: "nimzowitsch-capablanca-1927",
    title: "Break the pawn chain, then own the files",
    players: "Aron Nimzowitsch — José Raúl Capablanca",
    event: "New York",
    year: 1927,
    result: "0–1",
    orientation: "b",
    summary:
      "A Caro-Kann model for attacking the base of an advanced center, completing development and turning open files into lasting pressure.",
    whyStudy:
      "This is directly relevant to the app's Black Caro-Kann repertoire: the freeing ...c5 break is a plan, not a move to memorize in isolation.",
    pgn: nimzowitschCapablanca,
    tags: ["caro-kann", "pawn-break", "rook-activity", "prophylaxis"],
    skillIds: [
      "pawns.breaks",
      "strategy.piece-activity",
      "openings.king-safety",
      "strategy.open-files",
      "strategy.repertoire-middlegames",
    ],
    repertoireId: "black-caro",
    checkpoints: [
      checkpoint({
        id: "caro-c5",
        ply: 13,
        skillId: "pawns.breaks",
        title: "Challenge the base",
        prompt:
          "White has advanced e5 and owns space. What is Black's most important structural idea?",
        options: [
          option("a", "Challenge d4, the base of White's center, before the space becomes permanent.", true, "Correct. The Caro-Kann center becomes healthy only if Black contests its base."),
          option("b", "Avoid all pawn exchanges and wait behind the pawn chain.", false, "Passive waiting lets White's spatial advantage become easier to use."),
          option("c", "Attack the e5 pawn only with pieces and never change the structure.", false, "The d4 base is the structural lever that makes the entire chain less stable."),
        ],
        hints: [
          "Pawn chains are usually attacked at their base.",
          "Black prepared this break with ...c6 from move one.",
        ],
        explanation:
          "Capablanca played ...c5. It immediately questions d4 and ensures that White's advanced center must make concrete decisions.",
        plan:
          "In the Advance Caro-Kann, do not confuse solidity with passivity: use ...c5 to attack the base of the chain.",
      }),
      checkpoint({
        id: "caro-repertoire-middlegame",
        ply: 13,
        skillId: "strategy.repertoire-middlegames",
        title: "Recognize the structure after theory ends",
        prompt:
          "Forget the exact opening move number. Which recurring Caro-Kann middlegame idea should Black recognize here?",
        options: [
          option("a", "Challenge the d4 base with ...c5 and develop around the opened queenside and central lines.", true, "Correct. The structure tells you the plan even when the move order is unfamiliar."),
          option("b", "Keep the c6 pawn fixed forever because the Caro-Kann is a defensive opening.", false, "The c-pawn was placed on c6 largely to support the freeing ...c5 or ...e5 ideas later."),
          option("c", "Attack only on the kingside because White has more space.", false, "The central pawn chain points to its base; Black should first challenge the structure."),
        ],
        hints: [
          "Name the pawn chain before thinking about opening names.",
          "The base of White's advanced center is d4.",
        ],
        explanation:
          "The useful repertoire memory is structural: after ...c5, Black contests d4, develops with purpose and stops White's space advantage from becoming permanent.",
        plan:
          "Carry structures and breaks out of the opening, not just memorized coordinates.",
      }),
      checkpoint({
        id: "caro-nf5",
        ply: 25,
        skillId: "strategy.piece-activity",
        title: "Find the useful square",
        prompt:
          "The center has clarified. Which piece should Black improve to increase pressure without creating weaknesses?",
        options: [
          option("a", "Centralize the king's knight toward f5, where it eyes key central and kingside squares.", true, "Correct. The knight becomes active without forcing the position prematurely."),
          option("b", "Move the queen repeatedly to search for a pawn.", false, "The queen is already active; another queen move would delay development of the remaining pieces."),
          option("c", "Push the f-pawn immediately and expose the king.", false, "Black can improve a piece first and preserve king safety."),
        ],
        hints: [
          "Look for the least active minor piece.",
          "The f5 square gives the g7 knight more influence over e3, d4 and h4.",
        ],
        explanation:
          "...Nf5 improves the knight while increasing pressure on White's center. The move fits the position without forcing a tactical commitment.",
        plan:
          "After the freeing break, improve the least active piece before starting new operations.",
      }),
      checkpoint({
        id: "caro-castle",
        ply: 35,
        skillId: "openings.king-safety",
        title: "Finish development before pressing",
        prompt:
          "Black has provoked kingside pawn advances. What should happen before exploiting the new weaknesses?",
        options: [
          option("a", "Castle and remove the king from the center.", true, "Correct. The position will open further, so king safety comes before exploitation."),
          option("b", "Launch a queen raid immediately while the king stays central.", false, "That adds tactical risk just as files are likely to open."),
          option("c", "Push more kingside pawns and delay castling indefinitely.", false, "Black already has targets; the priority is completing development safely."),
        ],
        hints: [
          "The center is no longer closed enough to justify leaving the king on e8.",
          "One move completes development and connects the rooks.",
        ],
        explanation:
          "...O-O makes the king safe and connects the rooks. Only then does Black begin the long rook maneuvering phase.",
        plan:
          "When the opponent creates weaknesses, secure your own position before trying to collect them.",
      }),
      checkpoint({
        id: "caro-rc4",
        ply: 53,
        skillId: "strategy.open-files",
        title: "Turn a file into an invasion route",
        prompt:
          "Black's rooks control the c-file but have not penetrated yet. What is the next strategic objective?",
        options: [
          option("a", "Increase rook activity by entering the fourth rank and creating lateral targets.", true, "Correct. File control becomes valuable when the rook can invade and attack from the side."),
          option("b", "Trade both rooks simply because the position is equal in material.", false, "Exchanges would remove the pieces that are exploiting White's passive coordination."),
          option("c", "Move the rooks away from the c-file to defend kingside pawns.", false, "The active rooks are the source of Black's pressure; abandoning the file gives White relief."),
        ],
        hints: [
          "A rook on an open file wants an entry square, not permanent occupation of the back rank.",
          "The c4 square lets the rook operate both vertically and horizontally.",
        ],
        explanation:
          "...Rc4 converts c-file control into an invasion. Capablanca's rooks keep gaining activity until White's position becomes increasingly tied down.",
        plan:
          "Do not stop at putting a rook on an open file. Identify the rank or square from which it can attack multiple weaknesses.",
        turningPoint:
          "The game becomes a lesson in converting structural pressure through activity rather than through a single tactic.",
      }),
    ],
  },
  {
    id: "topalov-anand-2010-g12",
    title: "Free the QGD position with timely breaks",
    players: "Veselin Topalov — Viswanathan Anand",
    event: "World Championship Match, Game 12",
    year: 2010,
    result: "0–1",
    orientation: "b",
    summary:
      "A modern QGD model in which Black solves development, challenges the center and creates counterplay instead of defending passively.",
    whyStudy:
      "It connects directly to the app's QGD repertoire: ...c5 and later central breaks show how the solid d5/e6 shell becomes active.",
    pgn: topalovAnand,
    tags: ["qgd", "pawn-break", "counterplay", "centralization"],
    skillIds: [
      "practical.plan",
      "pawns.breaks",
      "defense.counterplay",
      "attack.king-safety",
      "strategy.imbalances",
    ],
    repertoireId: "black-qgd",
    checkpoints: [
      checkpoint({
        id: "qgd-b6",
        ply: 25,
        skillId: "practical.plan",
        title: "Prepare the freeing move",
        prompt:
          "Black has a solid QGD center. What plan best solves the position rather than merely waiting?",
        options: [
          option("a", "Prepare ...c5 and give the queenside pieces useful routes.", true, "Correct. The structure is sound, but Black still needs an active freeing plan."),
          option("b", "Keep every pawn fixed and defend d5 forever.", false, "That treats the QGD structure as a bunker instead of a platform for counterplay."),
          option("c", "Start a kingside pawn storm before development is complete.", false, "The position calls for central and queenside activation, not an unsupported flank attack."),
        ],
        hints: [
          "Black's strategic problem is not d5 itself; it is activating the pieces behind the pawn chain.",
          "A queenside pawn move can support the upcoming ...c5 break.",
        ],
        explanation:
          "Anand played ...b6. The move supports queenside development and makes the planned ...c5 break easier to execute.",
        plan:
          "In a solid structure, identify the freeing break first; then choose preparatory moves that make that break work.",
      }),
      checkpoint({
        id: "qgd-c5",
        ply: 27,
        skillId: "pawns.breaks",
        title: "Use the freeing break",
        prompt:
          "The preparatory work is complete. What should Black do before White consolidates the center?",
        options: [
          option("a", "Challenge d4 with ...c5 and force the center to define itself.", true, "Correct. The freeing break prevents White from enjoying an uncontested space advantage."),
          option("b", "Retreat a developed piece and wait.", false, "Waiting gives White time to improve without solving Black's central problem."),
          option("c", "Advance the h-pawn because both kings have castled.", false, "There is no basis for a wing attack while the central break is available."),
        ],
        hints: [
          "The c-pawn is the natural lever against White's d4 pawn.",
          "The move was prepared one move earlier.",
        ],
        explanation:
          "...c5 is the thematic QGD break. It contests White's center and releases Black's position before the pieces become passive.",
        plan:
          "A pawn break is strongest when your pieces are ready to occupy the lines it opens.",
      }),
      checkpoint({
        id: "qgd-e5",
        ply: 57,
        skillId: "pawns.breaks",
        title: "Create a second central lever",
        prompt:
          "The position has transformed and White's pieces are active. How can Black change the character of the game?",
        options: [
          option("a", "Strike in the center with ...e5 and force new tactical decisions.", true, "Correct. A second break changes the position before White can stabilize."),
          option("b", "Retreat every piece and defend the seventh rank.", false, "Pure defense would surrender the initiative in a position where Black has active central resources."),
          option("c", "Trade queens at any cost even if it ruins coordination.", false, "The goal is active counterplay, not simplification independent of consequences."),
        ],
        hints: [
          "The e6 pawn is no longer required only as a defender.",
          "Opening lines favors the side whose heavy pieces are already coordinated.",
        ],
        explanation:
          "...e5 transforms the center. Black stops reacting and begins asking White concrete questions.",
        plan:
          "When one freeing break has done its job, reassess the pawn structure; a second break may become possible.",
        turningPoint:
          "From this point the game is no longer about maintaining a QGD shell. It becomes a dynamic fight in which initiative matters more than static structure.",
      }),
      checkpoint({
        id: "qgd-imbalance",
        ply: 57,
        skillId: "strategy.imbalances",
        title: "Re-evaluate the imbalances",
        prompt:
          "Before ...e5, what has changed enough that Black should stop thinking of the position as a quiet QGD?",
        options: [
          option("a", "Black's pieces are coordinated and central pawn mobility can create initiative, so dynamic activity now outweighs preserving the static shell.", true, "Correct. The relevant imbalance has shifted from structure to activity and initiative."),
          option("b", "Nothing important has changed; Black should preserve the original pawn structure at all costs.", false, "Plans must change when piece activity and pawn breaks change the position's dominant features."),
          option("c", "Black should simplify only because the world-championship match situation demands it.", false, "The board position, not the event narrative, justifies the central transformation."),
        ],
        hints: [
          "Compare piece activity now with the position before ...c5.",
          "Ask whether the e6 pawn is still more valuable as a defender or as a lever.",
        ],
        explanation:
          "The important imbalance is now dynamic: Black's coordinated pieces make ...e5 possible, and opening the center favors activity over static restraint.",
        plan:
          "Re-evaluate imbalances after every major structural change; the best plan can change even when the material does not.",
      }),
      checkpoint({
        id: "qgd-f5",
        ply: 59,
        skillId: "defense.counterplay",
        title: "Defend by creating threats",
        prompt:
          "White has established e4. Which defensive mindset is most useful now?",
        options: [
          option("a", "Generate counterplay immediately so White cannot improve without answering threats.", true, "Correct. Active defense forces the opponent to spend tempi responding."),
          option("b", "Protect every weakness with a passive piece and avoid pawn moves.", false, "Passive defense lets White organize under no pressure."),
          option("c", "Give up the center voluntarily and hope to hold an endgame.", false, "Black has enough activity to fight for the initiative instead."),
        ],
        hints: [
          "Look for a pawn move that attacks White's center and opens lines toward the king.",
          "The f-pawn can support a direct challenge to e4.",
        ],
        explanation:
          "...f5 is active defense. Anand increases central tension and creates practical threats rather than accepting a passive position.",
        plan:
          "When passive defense would leave the opponent a free hand, create a threat that changes what the opponent is allowed to do.",
      }),
    ],
  },
  {
    id: "botvinnik-capablanca-1938",
    title: "Build the pawn break, then transform",
    players: "Mikhail Botvinnik — José Raúl Capablanca",
    event: "AVRO",
    year: 1938,
    result: "1–0",
    orientation: "w",
    summary:
      "A strategic buildup that turns a central pawn majority into connected threats and finally into a forcing tactical transformation.",
    whyStudy:
      "It shows the full chain from quiet preparation to pawn breaks to calculation: the tactic works because the strategic position was prepared first.",
    pgn: botvinnikCapablanca,
    tags: ["pawn-center", "breakthrough", "calculation", "transformation"],
    skillIds: [
      "practical.plan",
      "pawns.breaks",
      "attack.open-lines",
      "attack.sacrifice",
      "strategy.coordination",
    ],
    checkpoints: [
      checkpoint({
        id: "avro-f3",
        ply: 34,
        skillId: "practical.plan",
        title: "Prepare before advancing",
        prompt:
          "White has a strong pawn center but cannot push it safely yet. What should the next move accomplish?",
        options: [
          option("a", "Support the central advance so e4 can be played under better conditions.", true, "Correct. A useful preparatory move makes the future break stronger instead of forcing it immediately."),
          option("b", "Sacrifice a piece immediately because the center looks impressive.", false, "The tactical conditions are not ready; the central expansion must be prepared."),
          option("c", "Exchange the central pawns to remove all tension.", false, "That would throw away the space and dynamic potential White is trying to exploit."),
        ],
        hints: [
          "Ask what pawn move White wants next and which pawn currently needs support.",
          "The f-pawn can reinforce e4 while also preparing a later f4-f5 expansion.",
        ],
        explanation:
          "Botvinnik played f3, preparing e4 and giving the central pawn mass a concrete direction.",
        plan:
          "Before a pawn break, improve the conditions for the break: support the pawn, coordinate the pieces and limit counterplay.",
      }),
      checkpoint({
        id: "avro-e4",
        ply: 36,
        skillId: "pawns.breaks",
        title: "Claim the center",
        prompt:
          "The preparation is complete. What structural change should White make now?",
        options: [
          option("a", "Advance e4 and create a mobile central duo.", true, "Correct. The move turns static space into a dynamic central threat."),
          option("b", "Move the queen again and leave the center unchanged.", false, "The position was prepared specifically for a central advance; delaying it gives Black time."),
          option("c", "Retreat the knight to the back rank.", false, "That does not use the support created by f3."),
        ],
        hints: [
          "The last move was preparation, not an end in itself.",
          "Use the pawn that f3 just reinforced.",
        ],
        explanation:
          "e4 creates the mobile center that drives the rest of the game. White now has space plus the possibility of e5 and f4-f5.",
        plan:
          "A pawn center is valuable when it can advance with purpose and gain tempi against enemy pieces.",
      }),
      checkpoint({
        id: "avro-f5",
        ply: 46,
        skillId: "attack.open-lines",
        title: "Open lines at the right moment",
        prompt:
          "White's center has advanced and Black is trying to blockade. What is White's next attacking objective?",
        options: [
          option("a", "Use f5 to open lines and create a protected passed e-pawn after exchanges.", true, "Correct. The break turns space into open lines and a concrete passer."),
          option("b", "Freeze every pawn and maneuver indefinitely.", false, "The pieces are coordinated for a break; waiting lets Black improve the blockade."),
          option("c", "Trade queens before changing the structure.", false, "The queen is an important attacking piece while Black's king is about to face opened lines."),
        ],
        hints: [
          "White's kingside pawn can attack the piece controlling e6 and change the e-file structure.",
          "The purpose is not the pawn itself; it is the lines and passed pawn created after exchanges.",
        ],
        explanation:
          "f5 forces structural change. After the exchanges, the e-pawn becomes a dangerous passer and Black's king has fewer stable defensive squares.",
        plan:
          "Use a pawn break when the resulting open lines and passed pawns favor your active pieces.",
        turningPoint:
          "The strategic buildup has now produced tactical conditions. From here calculation becomes inseparable from the positional plan.",
      }),
      checkpoint({
        id: "avro-coordination",
        ply: 46,
        skillId: "strategy.coordination",
        title: "Make every piece support the break",
        prompt:
          "Why is f5 powerful now rather than several moves earlier?",
        options: [
          option("a", "White's queen, rooks, bishop, knight and central pawns now support the same kingside-central transformation.", true, "Correct. The break works because the pieces are coordinated around the resulting open lines and passed pawn."),
          option("b", "Pawn breaks become stronger automatically as the game gets longer.", false, "Timing comes from piece placement and the opponent's resources, not move number."),
          option("c", "The move is good only because it attacks a piece immediately.", false, "The deeper point is the structural transformation and the coordinated follow-up."),
        ],
        hints: [
          "Count how many white pieces become more active after the f-file and e-file structure changes.",
          "Compare the break with the earlier position before e4-e5.",
        ],
        explanation:
          "f5 succeeds because White's pieces are no longer pursuing separate goals. They all benefit from the same transformation: open lines, a passed e-pawn and access to Black's king.",
        plan:
          "Before a major break, ask whether your pieces are coordinated to use the position that will exist after the pawns move.",
      }),
      checkpoint({
        id: "avro-ba3",
        ply: 58,
        skillId: "attack.sacrifice",
        title: "Transform advantage into a forcing line",
        prompt:
          "White has a dangerous passed e-pawn and active pieces. What should justify a material sacrifice here?",
        options: [
          option("a", "A forcing sequence in which the passed pawn, queen and knight gain decisive access to the king.", true, "Correct. The sacrifice is justified by concrete follow-up, not by attacking aesthetics."),
          option("b", "Any move that gives up a bishop is good because White has more space.", false, "Space alone never justifies material loss; the continuation must be concrete."),
          option("c", "Sacrifice first and calculate the follow-up afterward.", false, "The forcing continuation must be seen before committing material."),
        ],
        hints: [
          "The bishop can offer itself so the queen is drawn away from the king.",
          "After ...Qxa3, look for a knight check that opens the queen's route.",
        ],
        explanation:
          "Ba3! invites ...Qxa3 and begins the famous forcing sequence. The strategic advantage is converted only because White can calculate the resulting king attack.",
        plan:
          "Sacrifice when the resulting forcing moves can be calculated to a stable payoff: mate, material recovery or an overwhelming passed pawn.",
        turningPoint:
          "This is the bridge between strategy and tactics: the combination is possible because the central majority, open lines and piece placement were built over many moves.",
      }),
    ],
  },
];

export const modelGameById = Object.fromEntries(
  modelGames.map((game) => [game.id, game]),
) as Record<string, ModelGame>;

function uci(move: {
  from: string;
  to: string;
  promotion?: string;
}) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function modelGameTimeline(game: ModelGame) {
  const parsed = new Chess();
  parsed.loadPgn(game.pgn, { strict: false });
  const sans = parsed.history();
  const replay = new Chess();

  return sans.map((san, ply) => {
    const beforeFen = replay.fen();
    const move = replay.move(san);
    const afterFen = replay.fen();

    return {
      ply,
      san: move.san,
      uci: uci(move),
      beforeFen,
      afterFen,
    };
  });
}

export function modelGameCheckpointPosition(
  game: ModelGame,
  checkpoint: ModelGameCheckpoint,
): ModelGameCheckpointPosition {
  const move = modelGameTimeline(game)[checkpoint.ply];
  if (!move) {
    throw new Error(
      `Missing historical move for ${game.id}/${checkpoint.id}`,
    );
  }

  return {
    checkpoint,
    beforeFen: move.beforeFen,
    afterFen: move.afterFen,
    expectedMove: move.uci,
    targetSan: move.san,
  };
}

export function modelGameCatalogIssues() {
  const issues: string[] = [];
  const gameIds = new Set<string>();
  const checkpointIds = new Set<string>();

  for (const game of modelGames) {
    if (gameIds.has(game.id)) {
      issues.push(`${game.id}: duplicate game id`);
    }
    gameIds.add(game.id);

    if (game.checkpoints.length < 3) {
      issues.push(`${game.id}: needs at least three checkpoints`);
    }
    if (game.checkpoints.length > 6) {
      issues.push(`${game.id}: too many checkpoints for a compact model game`);
    }
    if (game.repertoireId && !repertoireById[game.repertoireId]) {
      issues.push(`${game.id}: unknown repertoire ${game.repertoireId}`);
    }

    let timeline: ReturnType<typeof modelGameTimeline> = [];
    try {
      timeline = modelGameTimeline(game);
    } catch {
      issues.push(`${game.id}: invalid PGN`);
      continue;
    }

    if (!timeline.length) {
      issues.push(`${game.id}: empty PGN`);
    }

    for (const checkpoint of game.checkpoints) {
      const key = `${game.id}:${checkpoint.id}`;
      if (checkpointIds.has(key)) {
        issues.push(`${key}: duplicate checkpoint id`);
      }
      checkpointIds.add(key);

      if (!skillById[checkpoint.skillId]) {
        issues.push(`${key}: unknown skill ${checkpoint.skillId}`);
      }
      if (!timeline[checkpoint.ply]) {
        issues.push(`${key}: ply outside game`);
      }
      if (checkpoint.options.length < 3) {
        issues.push(`${key}: needs at least three question options`);
      }
      if (
        checkpoint.options.filter((item) => item.correct).length !== 1
      ) {
        issues.push(`${key}: question must have exactly one correct answer`);
      }
      if (checkpoint.hints.length < 2) {
        issues.push(`${key}: needs escalating hints`);
      }
      if (checkpoint.explanation.length < 40 || checkpoint.plan.length < 30) {
        issues.push(`${key}: explanation is too shallow`);
      }
    }
  }

  if (modelGames.length > 8) {
    issues.push("catalog: P33 should stay compact rather than become a game dump");
  }

  return issues;
}
