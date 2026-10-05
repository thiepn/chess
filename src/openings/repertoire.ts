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
    id: "black-caro-root",
    name: "Caro-Kann Defense",
    eco: "B10",
    purpose: "Use ...c6 and ...d5 to challenge White's center without trapping the light bishop.",
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
    id: "black-qgd-root",
    name: "Queen's Gambit Declined Setup",
    eco: "D30",
    purpose: "Against 1.d4, build a classical ...d5/...e6 center and develop reliably.",
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
        ["white-start","white-e4","italian-e5","italian-nf3","italian-nc6","italian-bc4","sicilian","sicilian-alapin","caro","caro-d4","french","french-d4"].includes(seed.id),
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
    nodeIds: ["black-caro-root","black-caro-e4","black-caro-c6","black-caro-d4","black-caro-d5"],
  },
  {
    id: "black-qgd",
    name: "QGD Setup versus 1.d4",
    color: "b",
    versus: "Black vs 1.d4",
    summary: "A classical ...d5/...e6 structure with a clear development plan and ...c5 break.",
    rootNodeId: "black-qgd-root",
    nodeIds: ["black-qgd-root","black-qgd-d4","black-qgd-d5","black-qgd-c4","black-qgd-e6"],
  },
];

export const repertoireById = Object.fromEntries(
  repertoires.map((repertoire) => [repertoire.id, repertoire]),
);

export function pathToNode(nodeId: string) {
  const path: OpeningNode[] = [];
  let current = openingNodes[nodeId];

  while (current) {
    path.unshift(current);
    current = current.parentId ? openingNodes[current.parentId] : undefined;
  }

  return path;
}
