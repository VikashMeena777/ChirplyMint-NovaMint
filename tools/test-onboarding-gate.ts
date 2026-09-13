/** Verify the onboarding gate: rules, assembler, and reply-path behavior. */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { agentSetupMissing, assemblePersona } from "../src/lib/ai/agent-setup";
import { generateAgentReply } from "../src/lib/ai/agent-reply";

function check(label: string, cond: boolean) {
  console.log(`${cond ? "✓" : "✗ FAIL"}  ${label}`);
  if (!cond) process.exitCode = 1;
}

function unitTests() {
  // ── 1. completeness rules ──
  const placeholder = {
    agent_name: "Assistant",
    persona: "You are a friendly and helpful assistant.",
    about_text: "",
  };
  check("placeholder agent is gated", agentSetupMissing(placeholder).length >= 3);

  const realAgent = {
    agent_name: "Vikash",
    persona: "x".repeat(80),
    about_text: "I am a travel creator sharing budget trips across India.",
  };
  check("real agent passes the gate", agentSetupMissing(realAgent).length === 0);

  const handEditedButEmptyAbout = {
    agent_name: "Vikash",
    persona: "Some custom persona text that is definitely long enough to pass the length check here.",
    about_text: "too short",
  };
  check(
    "hand-edited persona without about text stays gated",
    agentSetupMissing(handEditedButEmptyAbout).includes("about")
  );

  // ── 2. persona assembler output ──
  const persona = assemblePersona({
    agentName: "Vikash",
    about: "I'm a travel creator sharing budget trips and hidden spots across India.",
    contentTopics: "budget travel reels, packing hacks, café reviews",
    offers: "Travel planning guide — ₹199, brand collabs — DM 'rates'",
  });
  console.log("\n--- assembled persona ---");
  console.log(persona);
  console.log("-------------------------\n");
  check("persona contains the about text", persona.includes("travel creator"));
  check("persona contains topics", persona.includes("packing hacks"));
  check("persona contains offers", persona.includes("₹199"));
  check("persona has the no-invention rule", persona.includes("Never invent"));

  const noOfferPersona = assemblePersona({
    agentName: "Riya",
    about: "I'm an artist sharing watercolor paintings and process videos.",
  });
  check("no offers → helpful-content default", noOfferPersona.includes("nothing is being sold"));
}

async function main() {
  unitTests();

  // ── 3. reply-path gate on the live DB (the owner's agent is currently
  //      gated — generateAgentReply must return null and write nothing) ──
  const r = await generateAgentReply({
    userId: "40557153-2cc4-4d12-b876-e7851e762593",
    senderIgId: "gate_test_sender",
    senderUsername: "gate_test_lead",
    incomingMessage: "Ap ky ky kar skte ho?",
  });
  check("gated agent returns null reply", r === null);

  console.log("\nAll checks done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
