import { Chess } from "chess.js";
import type {
  OpeningNode,
  OpeningRepertoire,
} from "./types";

type NodeSeed = {
  id: string;
  parentId?: string;
  name: string;
  eco?: string;
  moveFromParent?: string;
  purpose?: string;
  structure?: string;
  tacticalMotifs?: string[];
  concepts?: { title: string; body: string }[];
  plans?: string[];
  commonMistakes?: string[];
  keySquares?: string[];
  priority?: OpeningNode["priority"];
  preferred?: boolean;
};

const rootFen = new Chess().fen();

const seeds: NodeSeed[] = [
  {
    id: "white-start",
    name: "White repertoire",
    purpose: "Start from one dependable first move instead of memorizing unrelated opening systems.",
    concepts: [
      { title: "One home base", body: "Use 1.e4 as the default so recurring structures become familiar quickly." }
    ],
    plans: ["Play e4", "Learn Black's major replies by ideas"],
    commonMistakes: ["Changing first move every game before building pattern recognition"],
    keySquares: ["e4", "d4"],
    priority: "core"
  },
  {
    id: "white-e4",
    parentId: "white-start",
    name: "1.e4 — Open Games Base",
    eco: "B00",
    moveFromParent: "e2e4",
    purpose: "Claim central space and open the queen and f1 bishop.",
    concepts: [
      { title: "Develop with tempo", body: "Use the open diagonals created by e4 to bring pieces toward the center quickly." },
      { title: "Castle before adventures", body: "King safety comes before grabbing pawns or launching early attacks." }
    ],
    plans: ["Develop Nf3 and Bc4/Bb5", "Castle kingside", "Use d4 when the center supports it"],
    commonMistakes: ["Early queen moves", "Repeatedly moving the same piece", "Ignoring ...Nf6 pressure on e4"],
    keySquares: ["e4", "d4", "f7"],
    priority: "core",
    preferred: true
  },
  {
    id: "italian-e5",
    parentId: "white-e4",
    name: "Open Game: 1...e5",
    eco: "C20",
    moveFromParent: "e7e5",
    purpose: "Meet the symmetrical center with fast natural development.",
    structure: "Symmetrical e4/e5 center with rapid development and an eventual d4 break.",
    tacticalMotifs: ["Pressure on f7", "Central e5 tactics", "Pins on the f-file and c6 knight"],
    plans: ["Nf3 attacks e5", "Bc4 eyes f7", "Castle quickly"],
    commonMistakes: ["Trying to win e5 immediately without development"],
    keySquares: ["e5", "f7", "d4"],
    priority: "core"
  },
  {
    id: "italian-nf3",
    parentId: "italian-e5",
    name: "Italian setup: Nf3",
    eco: "C40",
    moveFromParent: "g1f3",
    purpose: "Develop while attacking e5.",
    plans: ["Bc4 next", "Castle", "Prepare d4"],
    commonMistakes: ["Playing f3 to defend e4 unnecessarily"],
    keySquares: ["f3", "e5", "d4"],
    priority: "core",
    preferred: true
  },
  {
    id: "italian-nc6",
    parentId: "italian-nf3",
    name: "1.e4 e5 2.Nf3 Nc6",
    eco: "C44",
    moveFromParent: "b8c6",
    purpose: "Black defends e5 and develops naturally.",
    plans: ["Bc4 for the Italian", "Bb5 is also sound but not the default repertoire"],
    commonMistakes: ["Playing d4 too early without calculating the center"],
    keySquares: ["c6", "e5", "f7"],
    priority: "core"
  },
  {
    id: "italian-bc4",
    parentId: "italian-nc6",
    name: "Italian Game",
    eco: "C50",
    moveFromParent: "f1c4",
    purpose: "Develop the bishop actively toward f7 and prepare castling.",
    plans: ["Castle", "d3 for a calm center", "c3 and d4 when ready"],
    commonMistakes: ["Ng5 before development is justified", "Premature sacrifices on f7"],
    keySquares: ["c4", "f7", "d5"],
    priority: "core",
    preferred: true
  },
  {
    id: "sicilian",
    parentId: "white-e4",
    name: "Sicilian: 1...c5",
    eco: "B20",
    moveFromParent: "c7c5",
    purpose: "Black challenges d4 asymmetrically instead of mirroring e5.",
    structure: "Alapin setup: c3 supports d4 so White builds a broad center without entering Open Sicilian theory.",
    tacticalMotifs: ["d4 central break", "Pressure on d5", "e5 space gain against ...Nf6"],
    plans: ["Keep the repertoire simple with c3", "Build d4 under control", "Develop before tactical complications"],
    commonMistakes: ["Entering sharp Open Sicilian theory accidentally"],
    keySquares: ["c5", "d4", "d5"],
    priority: "common"
  },
  {
    id: "sicilian-alapin",
    parentId: "sicilian",
    name: "Alapin Sicilian",
    eco: "B22",
    moveFromParent: "c2c3",
    purpose: "Prepare d4 and build a broad center with far less theory.",
    plans: ["d4", "Nf3", "Develop naturally after the center clarifies"],
    commonMistakes: ["Treating c3 as a passive move instead of preparation for d4"],
    keySquares: ["c3", "d4", "e4"],
    priority: "core",
    preferred: true
  },
  {
    id: "caro",
    parentId: "white-e4",
    name: "Caro-Kann: 1...c6",
    eco: "B10",
    moveFromParent: "c7c6",
    purpose: "Black prepares ...d5 with a solid pawn structure.",
    structure: "White builds e4+d4; the center usually clarifies around ...d5 and often becomes an Advance pawn chain.",
    tacticalMotifs: ["Pressure on d5", "Space with e5", "Kingside initiative after development"],
    plans: ["Take space with d4", "Develop normally", "Do not force tactics before the center is defined"],
    commonMistakes: ["Overprotecting e4 instead of occupying d4"],
    keySquares: ["c6", "d5", "d4"],
    priority: "common"
  },
  {
    id: "caro-d4",
    parentId: "caro",
    name: "Caro-Kann Classical Center",
    eco: "B10",
    moveFromParent: "d2d4",
    purpose: "Build the ideal e4+d4 center.",
    plans: ["Nc3 or Nd2", "Develop around the central tension"],
    commonMistakes: ["Pushing e5 automatically without understanding the structure"],
    keySquares: ["d4", "e4", "d5"],
    priority: "core",
    preferred: true
  },
  {
    id: "french",
    parentId: "white-e4",
    name: "French: 1...e6",
    eco: "C00",
    moveFromParent: "e7e6",
    purpose: "Black prepares ...d5 and accepts a temporarily blocked light bishop.",
    structure: "Closed e5/d4 pawn chain after the Advance; White attacks the kingside while Black challenges the base with ...c5.",
    tacticalMotifs: ["d4 pressure", "Kingside space", "Pawn-chain breaks with c3 and f4"],
    plans: ["Play d4", "Support the center", "Develop before deciding whether to advance e5"],
    commonMistakes: ["Closing the center without a plan for the pawn chain"],
    keySquares: ["e6", "d5", "d4"],
    priority: "common"
  },
  {
    id: "french-d4",
    parentId: "french",
    name: "French Center",
    eco: "C00",
    moveFromParent: "d2d4",
    purpose: "Occupy the center before choosing the structure.",
    plans: ["Nc3", "Nf3", "Understand the d4/e4 pawn chain"],
    commonMistakes: ["Memorizing a variation before understanding the center"],
    keySquares: ["d4", "e4", "d5"],
    priority: "core",
    preferred: true
  },

  {
    id: "italian-bc5",
    parentId: "italian-bc4",
    name: "Giuoco Piano: ...Bc5",
    eco: "C50",
    moveFromParent: "f8c5",
    purpose: "Black develops naturally and mirrors pressure on the center.",
    plans: ["Play d3", "Castle", "Prepare c3 and d4"],
    commonMistakes: ["Rushing d4 before the position is ready"],
    keySquares: ["c5", "d4", "f7"],
    priority: "core"
  },
  {
    id: "italian-d3-bc5",
    parentId: "italian-bc5",
    name: "Italian: d3 shell",
    eco: "C50",
    moveFromParent: "d2d3",
    purpose: "Stabilize e4 and prepare a controlled c3+d4 expansion.",
    plans: ["Castle", "c3", "Re1", "d4 when development supports it"],
    commonMistakes: ["Treating the quiet center as permission to waste tempi"],
    keySquares: ["d3", "e4", "d4"],
    priority: "core",
    preferred: true
  },
  {
    id: "italian-d6",
    parentId: "italian-d3-bc5",
    name: "Italian: ...d6",
    eco: "C50",
    moveFromParent: "d7d6",
    purpose: "Black reinforces e5 and keeps the center compact.",
    plans: ["Continue with c3 and prepare d4"],
    commonMistakes: ["Attacking before the queenside knight and king are developed"],
    keySquares: ["d6", "e5", "d4"],
    priority: "common"
  },
  {
    id: "italian-c3",
    parentId: "italian-d6",
    name: "Italian: c3 expansion",
    eco: "C50",
    moveFromParent: "c2c3",
    purpose: "Prepare the thematic d4 break while keeping the center under control.",
    plans: ["Castle", "Re1", "d4 when Black cannot exploit the center"],
    commonMistakes: ["Playing c3 without following through with central expansion"],
    keySquares: ["c3", "d4", "e4"],
    priority: "core",
    preferred: true
  },
  {
    id: "italian-nf6",
    parentId: "italian-bc4",
    name: "Italian: ...Nf6",
    eco: "C50",
    moveFromParent: "g8f6",
    purpose: "Black develops with pressure on e4.",
    plans: ["Play d3", "Castle", "Keep e4 secure"],
    commonMistakes: ["Defending e4 with passive pawn moves instead of normal development"],
    keySquares: ["f6", "e4", "d4"],
    priority: "common"
  },
  {
    id: "italian-d3-nf6",
    parentId: "italian-nf6",
    name: "Italian: calm center versus ...Nf6",
    eco: "C50",
    moveFromParent: "d2d3",
    purpose: "Protect e4 and retain the option of a later d4 break.",
    plans: ["Castle", "c3", "Re1"],
    commonMistakes: ["Forcing Ng5 tactics without enough development"],
    keySquares: ["d3", "e4", "f7"],
    priority: "core",
    preferred: true
  },
  {
    id: "alapin-d5",
    parentId: "sicilian-alapin",
    name: "Alapin: immediate ...d5",
    eco: "B22",
    moveFromParent: "d7d5",
    purpose: "Black challenges the center before White completes d4.",
    plans: ["Capture on d5", "Develop with tempo on the queen"],
    commonMistakes: ["Protecting e4 passively instead of clarifying the center"],
    keySquares: ["d5", "e4", "d4"],
    priority: "core"
  },
  {
    id: "alapin-exd5",
    parentId: "alapin-d5",
    name: "Alapin: exd5",
    eco: "B22",
    moveFromParent: "e4d5",
    purpose: "Clarify the center and force Black to spend a queen move recapturing.",
    plans: ["Play d4 after ...Qxd5", "Develop Nf3"],
    commonMistakes: ["Trying to hold d5 instead of using the development tempo"],
    keySquares: ["d5", "d4", "f3"],
    priority: "core",
    preferred: true
  },
  {
    id: "alapin-qxd5",
    parentId: "alapin-exd5",
    name: "Alapin: ...Qxd5",
    eco: "B22",
    moveFromParent: "d8d5",
    purpose: "Black restores material but exposes the queen to central development.",
    plans: ["Play d4", "Develop Nf3 and Be2"],
    commonMistakes: ["Chasing the queen with irrelevant pawn moves"],
    keySquares: ["d5", "d4", "c3"],
    priority: "common"
  },
  {
    id: "alapin-d4",
    parentId: "alapin-qxd5",
    name: "Alapin: broad center",
    eco: "B22",
    moveFromParent: "d2d4",
    purpose: "Use the tempo on Black's queen to occupy the center.",
    plans: ["Nf3", "Be2", "Castle"],
    commonMistakes: ["Overextending before completing development"],
    keySquares: ["d4", "e5", "c5"],
    priority: "core",
    preferred: true
  },
  {
    id: "alapin-nf6",
    parentId: "sicilian-alapin",
    name: "Alapin: ...Nf6",
    eco: "B22",
    moveFromParent: "g8f6",
    purpose: "Black attacks e4 before White has played d4.",
    plans: ["Gain space with e5", "Support the center with d4"],
    commonMistakes: ["Allowing ...Nxe4 without gaining something concrete"],
    keySquares: ["f6", "e4", "e5"],
    priority: "common"
  },
  {
    id: "alapin-e5",
    parentId: "alapin-nf6",
    name: "Alapin: e5 space",
    eco: "B22",
    moveFromParent: "e4e5",
    purpose: "Gain space and drive the f6 knight before building d4.",
    plans: ["d4", "Nf3", "Develop without chasing the knight repeatedly"],
    commonMistakes: ["Pushing more pawns instead of developing after e5"],
    keySquares: ["e5", "d4", "f6"],
    priority: "core",
    preferred: true
  },
  {
    id: "caro-d5-white",
    parentId: "caro-d4",
    name: "Caro-Kann: ...d5",
    eco: "B12",
    moveFromParent: "d7d5",
    purpose: "Black attacks e4 and asks White to define the center.",
    plans: ["Choose the Advance setup with e5"],
    commonMistakes: ["Exchanging automatically without understanding the resulting structure"],
    keySquares: ["d5", "e4", "e5"],
    priority: "core"
  },
  {
    id: "caro-e5",
    parentId: "caro-d5-white",
    name: "Caro-Kann Advance",
    eco: "B12",
    moveFromParent: "e4e5",
    purpose: "Gain space and build a pawn chain that points toward the kingside.",
    plans: ["Develop Nf3", "Support d4", "Prepare kingside play without neglecting development"],
    commonMistakes: ["Using the space advantage as an excuse to delay development"],
    keySquares: ["e5", "d4", "f4"],
    priority: "core",
    preferred: true
  },
  {
    id: "french-d5",
    parentId: "french-d4",
    name: "French: ...d5",
    eco: "C02",
    moveFromParent: "d7d5",
    purpose: "Black challenges e4 and creates the defining central tension.",
    plans: ["Advance e5", "Support d4 with c3"],
    commonMistakes: ["Closing the center without knowing which pawn break each side wants"],
    keySquares: ["d5", "e4", "e5"],
    priority: "core"
  },
  {
    id: "french-e5",
    parentId: "french-d5",
    name: "French Advance",
    eco: "C02",
    moveFromParent: "e4e5",
    purpose: "Claim space and fix the central pawn chain.",
    plans: ["c3", "Nf3", "Meet ...c5 by supporting d4"],
    commonMistakes: ["Attacking on the kingside before stabilizing d4"],
    keySquares: ["e5", "d4", "c5"],
    priority: "core",
    preferred: true
  },
  {
    id: "french-c5",
    parentId: "french-e5",
    name: "French Advance: ...c5",
    eco: "C02",
    moveFromParent: "c7c5",
    purpose: "Black attacks the base of White's pawn chain.",
    plans: ["Support d4 with c3", "Develop Nf3"],
    commonMistakes: ["Defending d4 with pieces before using the natural c3 support"],
    keySquares: ["c5", "d4", "e5"],
    priority: "common"
  },
  {
    id: "french-c3",
    parentId: "french-c5",
    name: "French Advance: c3",
    eco: "C02",
    moveFromParent: "c2c3",
    purpose: "Reinforce d4 and preserve the e5 space chain.",
    plans: ["Nf3", "Bd3", "Castle"],
    commonMistakes: ["Treating the chain as static instead of preparing development and pawn breaks"],
    keySquares: ["c3", "d4", "e5"],
    priority: "core",
    preferred: true
  },

  {
    id: "black-caro-root",
    name: "Caro-Kann Defense",
    eco: "B10",
    purpose: "Use ...c6 and ...d5 to challenge White's center without trapping the light bishop.",
    structure: "A resilient ...c6/...d5 center designed to challenge e4 while preserving the c8 bishop.",
    tacticalMotifs: ["Pressure on e4", "Bf5 development with tempo", "...c5 freeing break"],
    concepts: [
      { title: "Solid does not mean passive", body: "The point of ...c6 is an immediate central challenge with ...d5." },
      { title: "Develop the bishop", body: "Unlike the French, the c8 bishop usually gets outside the pawn chain before ...e6." }
    ],
    plans: ["...d5", "Develop Bf5 or Bg4", "...e6", "Nd7 and Ngf6"],
    commonMistakes: ["Playing ...e6 before developing the c8 bishop", "Holding onto c6 when ...c5 is the freeing break"],
    keySquares: ["d5", "c6", "f5"],
    priority: "core"
  },
  {
    id: "black-caro-e4",
    parentId: "black-caro-root",
    name: "Against 1.e4",
    eco: "B10",
    moveFromParent: "e2e4",
    purpose: "White occupies the center; execute the repertoire immediately.",
    plans: ["Play ...c6"],
    commonMistakes: ["Drifting into ...e5 systems instead of the chosen repertoire"],
    keySquares: ["e4", "d5"],
    priority: "core"
  },
  {
    id: "black-caro-c6",
    parentId: "black-caro-e4",
    name: "1.e4 c6",
    eco: "B10",
    moveFromParent: "c7c6",
    purpose: "Prepare ...d5 while keeping the light bishop free.",
    plans: ["...d5 next", "Respond to White's center rather than hunt pawns"],
    commonMistakes: ["Delaying ...d5"],
    keySquares: ["c6", "d5"],
    priority: "core",
    preferred: true
  },
  {
    id: "black-caro-d4",
    parentId: "black-caro-c6",
    name: "1.e4 c6 2.d4",
    eco: "B10",
    moveFromParent: "d2d4",
    purpose: "White builds the classical center.",
    plans: ["Challenge it immediately with ...d5"],
    commonMistakes: ["Playing a waiting move instead of the thematic break"],
    keySquares: ["d4", "d5"],
    priority: "core"
  },
  {
    id: "black-caro-d5",
    parentId: "black-caro-d4",
    name: "Caro-Kann Main Position",
    eco: "B10",
    moveFromParent: "d7d5",
    purpose: "Attack e4 and establish the defining Caro-Kann structure.",
    plans: ["Develop Bf5 before ...e6 when possible", "Use ...c5 later as a freeing break"],
    commonMistakes: ["Blocking the c8 bishop too early"],
    keySquares: ["d5", "e4", "f5"],
    priority: "core",
    preferred: true
  },

  {
    id: "black-caro-nc3",
    parentId: "black-caro-d5",
    name: "Caro-Kann: 3.Nc3",
    eco: "B15",
    moveFromParent: "b1c3",
    purpose: "White develops and increases support for e4.",
    plans: ["Clarify the center with ...dxe4"],
    commonMistakes: ["Keeping the tension forever while White develops freely"],
    keySquares: ["c3", "e4", "d5"],
    priority: "core"
  },
  {
    id: "black-caro-dxe4",
    parentId: "black-caro-nc3",
    name: "Caro-Kann: ...dxe4",
    eco: "B15",
    moveFromParent: "d5e4",
    purpose: "Release the central tension and prepare active bishop development.",
    plans: ["After Nxe4, develop Bf5 before ...e6"],
    commonMistakes: ["Playing ...e6 too early and trapping the light bishop"],
    keySquares: ["e4", "f5", "d5"],
    priority: "core",
    preferred: true
  },
  {
    id: "black-caro-nxe4",
    parentId: "black-caro-dxe4",
    name: "Caro-Kann: 4.Nxe4",
    eco: "B15",
    moveFromParent: "c3e4",
    purpose: "White restores the pawn and centralizes the knight.",
    plans: ["Develop Bf5 with tempo and complete development"],
    commonMistakes: ["Blocking the bishop with ...e6 before it develops"],
    keySquares: ["e4", "f5", "c7"],
    priority: "common"
  },
  {
    id: "black-caro-bf5",
    parentId: "black-caro-nxe4",
    name: "Caro-Kann: ...Bf5",
    eco: "B15",
    moveFromParent: "c8f5",
    purpose: "Develop the light bishop outside the pawn chain before ...e6.",
    plans: ["...e6", "Nd7", "Ngf6", "Be7", "castle"],
    commonMistakes: ["Trading the bishop without a reason and losing its structural benefit"],
    keySquares: ["f5", "e6", "d7"],
    priority: "core",
    preferred: true
  },

  {
    id: "black-qgd-root",
    name: "Queen's Gambit Declined Setup",
    eco: "D30",
    purpose: "Against 1.d4, build a classical ...d5/...e6 center and develop reliably.",
    structure: "Classical d5/e6 chain: stable center first, then solve the c8 bishop and challenge with ...c5.",
    tacticalMotifs: ["Pressure on c4", "...c5 central break", "Pins with ...Bb4 or ...Bg4"],
    concepts: [
      { title: "Keep the center stable", body: "The QGD gives a dependable structure so you can focus on development and plans rather than move-order tricks." },
      { title: "Free the c8 bishop", body: "The main strategic task is solving the light-squared bishop after ...e6." }
    ],
    plans: ["...d5", "...e6", "Nf6", "Be7", "Castle", "Prepare ...c5"],
    commonMistakes: ["Passively copying moves without preparing ...c5", "Taking c4 and trying to hold the pawn"],
    keySquares: ["d5", "e6", "c5"],
    priority: "core"
  },
  {
    id: "black-qgd-d4",
    parentId: "black-qgd-root",
    name: "Against 1.d4",
    eco: "D00",
    moveFromParent: "d2d4",
    purpose: "Meet the queen-pawn opening with immediate central control.",
    plans: ["Play ...d5"],
    commonMistakes: ["Using a different defense every game"],
    keySquares: ["d4", "d5"],
    priority: "core"
  },
  {
    id: "black-qgd-d5",
    parentId: "black-qgd-d4",
    name: "1.d4 d5",
    eco: "D00",
    moveFromParent: "d7d5",
    purpose: "Occupy the center symmetrically.",
    plans: ["Meet c4 with ...e6", "Develop Nf6"],
    commonMistakes: ["Chasing the c-pawn instead of developing"],
    keySquares: ["d5", "c4", "e4"],
    priority: "core",
    preferred: true
  },
  {
    id: "black-qgd-c4",
    parentId: "black-qgd-d5",
    name: "Queen's Gambit",
    eco: "D06",
    moveFromParent: "c2c4",
    purpose: "White challenges d5 from the flank.",
    plans: ["Support d5 with ...e6", "Do not try to keep an extra c4 pawn"],
    commonMistakes: ["Playing ...dxc4 and then spending tempi defending the pawn"],
    keySquares: ["c4", "d5", "e6"],
    priority: "core"
  },
  {
    id: "black-qgd-e6",
    parentId: "black-qgd-c4",
    name: "Queen's Gambit Declined",
    eco: "D30",
    moveFromParent: "e7e6",
    purpose: "Reinforce d5 and create a stable classical center.",
    plans: ["Nf6", "Be7", "O-O", "...c5 at the right moment"],
    commonMistakes: ["Forgetting the c8 bishop needs a plan"],
    keySquares: ["e6", "d5", "c5"],
    priority: "core",
    preferred: true
  },
  {
    id: "black-qgd-nc3",
    parentId: "black-qgd-e6",
    name: "QGD: 3.Nc3",
    eco: "D35",
    moveFromParent: "b1c3",
    purpose: "White develops pressure on d5 and prepares e4 ideas.",
    plans: ["Develop Nf6", "Keep d5 stable", "Prepare Be7 and castling"],
    commonMistakes: ["Reacting to Nc3 with passive pawn moves"],
    keySquares: ["c3", "d5", "e4"],
    priority: "core"
  },
  {
    id: "black-qgd-nf6",
    parentId: "black-qgd-nc3",
    name: "QGD: ...Nf6",
    eco: "D35",
    moveFromParent: "g8f6",
    purpose: "Develop toward the center, reinforce d5 and prepare castling.",
    plans: ["Be7", "O-O", "Prepare ...c5"],
    commonMistakes: ["Playing ...c5 before development is ready to support the tension"],
    keySquares: ["f6", "d5", "e4"],
    priority: "core",
    preferred: true
  },
  {
    id: "black-qgd-nf3",
    parentId: "black-qgd-nf6",
    name: "QGD: 4.Nf3",
    eco: "D35",
    moveFromParent: "g1f3",
    purpose: "White continues normal development and supports the center.",
    plans: ["Develop Be7 and castle"],
    commonMistakes: ["Chasing c4 instead of completing development"],
    keySquares: ["f3", "d4", "e5"],
    priority: "common"
  },
  {
    id: "black-qgd-be7",
    parentId: "black-qgd-nf3",
    name: "QGD: ...Be7",
    eco: "D35",
    moveFromParent: "f8e7",
    purpose: "Complete kingside development and prepare castling before the central break.",
    plans: ["O-O", "...c5", "Solve the c8 bishop with b6/Bb7 or Bd7"],
    commonMistakes: ["Delaying castling while moving already-developed pieces"],
    keySquares: ["e7", "c5", "d5"],
    priority: "core",
    preferred: true
  }
];

function deriveNodes() {
  const nodes: Record<string, OpeningNode> = {};

  for (const seed of seeds) {
    const parent = seed.parentId ? nodes[seed.parentId] : undefined;
    const chess = new Chess(parent?.fen ?? rootFen);
    let sanFromParent: string | undefined;

    if (seed.moveFromParent) {
      const move = chess.move({
        from: seed.moveFromParent.slice(0, 2),
        to: seed.moveFromParent.slice(2, 4),
        promotion: seed.moveFromParent.slice(4, 5) || "q",
      });
      if (!move) throw new Error(`Illegal repertoire move: ${seed.moveFromParent}`);
      sanFromParent = move.san;
    }

    nodes[seed.id] = {
      id: seed.id,
      parentId: seed.parentId,
      name: seed.name,
      eco: seed.eco,
      fen: chess.fen(),
      ply: parent ? parent.ply + 1 : 0,
      moveFromParent: seed.moveFromParent,
      sanFromParent,
      sideToMove: chess.turn(),
      purpose: seed.purpose,
      structure: seed.structure ?? parent?.structure,
      tacticalMotifs: seed.tacticalMotifs ?? parent?.tacticalMotifs ?? [],
      concepts: seed.concepts ?? [],
      plans: seed.plans ?? [],
      commonMistakes: seed.commonMistakes ?? [],
      keySquares: seed.keySquares ?? [],
      children: [],
      priority: seed.priority ?? "common",
    };
  }

  for (const seed of seeds) {
    if (!seed.parentId) continue;
    nodes[seed.parentId].children.push(seed.id);
    if (seed.preferred) nodes[seed.parentId].preferredChildId = seed.id;
  }

  return nodes;
}

export const openingNodes = deriveNodes();

export const repertoires: OpeningRepertoire[] = [
  {
    id: "white-e4-simple",
    name: "Simple 1.e4 Repertoire",
    color: "w",
    versus: "As White",
    summary: "Italian versus ...e5, Alapin versus the Sicilian, and principled central setups versus the Caro-Kann and French.",
    rootNodeId: "white-start",
    nodeIds: seeds
      .filter((seed) =>
        seed.id.startsWith("white-") ||
        seed.id.startsWith("italian-") ||
        seed.id.startsWith("sicilian") ||
        seed.id.startsWith("alapin-") ||
        seed.id === "caro" ||
        seed.id.startsWith("caro-") ||
        seed.id === "french" ||
        seed.id.startsWith("french-"),
      )
      .map((seed) => seed.id),
  },
  {
    id: "black-caro",
    name: "Caro-Kann versus 1.e4",
    color: "b",
    versus: "Black vs 1.e4",
    summary: "A stable, understandable defense built around ...c6 and ...d5.",
    rootNodeId: "black-caro-root",
    nodeIds: seeds.filter((seed) => seed.id.startsWith("black-caro-")).map((seed) => seed.id),
  },
  {
    id: "black-qgd",
    name: "QGD Setup versus 1.d4",
    color: "b",
    versus: "Black vs 1.d4",
    summary: "A classical ...d5/...e6 structure with a clear development plan and ...c5 break.",
    rootNodeId: "black-qgd-root",
    nodeIds: seeds.filter((seed) => seed.id.startsWith("black-qgd-")).map((seed) => seed.id),
  },
];

export const repertoireById = Object.fromEntries(
  repertoires.map((repertoire) => [repertoire.id, repertoire]),
);

export function pathToNode(nodeId: string) {
  const path: OpeningNode[] = [];
  let current: OpeningNode | undefined = openingNodes[nodeId];

  while (current) {
    path.unshift(current);
    current = current.parentId ? openingNodes[current.parentId] : undefined;
  }

  return path;
}
