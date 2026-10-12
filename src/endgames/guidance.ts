import type {EndgamePosition} from "./types";
type EndgameGuidance=Pick<EndgamePosition,
  "recognitionOptions"|"processCues"|"successNote"|"failureNote">;
let loading:Promise<ReadonlyMap<string,EndgameGuidance>>|undefined;
export function validateEndgameGuidance(input:unknown):ReadonlyMap<string,EndgameGuidance>{
 const raw=input as {schema?:string;items?:(EndgameGuidance&{id:string})[]} | null;
 if(raw?.schema!=="chess.p91.endgame-guidance.v1" ||
    !Array.isArray(raw.items)||raw.items.length!==18)throw Error("Invalid endgame teaching corpus");
 const out=new Map<string,EndgameGuidance>();
 for(const entry of raw.items) {
   if(!entry||!entry.id ||out.has(entry.id) ||
      !Array.isArray(entry.recognitionOptions) ||
      entry.recognitionOptions.length<3 ||
      entry.recognitionOptions.some(o=>!o.id||!o.label?.trim()||!o.explanation?.trim()) ||
      !Array.isArray(entry.processCues) || entry.processCues.length<3 ||
      entry.processCues.some(c=>typeof c!=="string"||!c.trim()) ||
      !entry.successNote?.trim() || !entry.failureNote?.trim())
     throw Error("Incomplete original endgame guidance");
   out.set(entry.id,entry);
 }
 return out;
}
export function loadEndgameGuidance(){
 return loading??=fetch(`${import.meta.env.BASE_URL}data/endgames/guidance-v1.json`)
   .then(r=>{if(!r.ok)throw Error("Endgame guidance unavailable");return r.json();})
   .then(validateEndgameGuidance)
   .catch(e=>{loading=undefined;throw e;});
}
