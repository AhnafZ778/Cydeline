import { FlowKind } from "../lib/flow";

export interface NodeLesson {
  kind: string;
  /** Matches the column header on the canvas. */
  stage: string;
  /** What this thing is, in plain words. */
  what: string;
  /** Questions to ask yourself. Never answers. */
  ask: string[];
}

/** Educational copy for the workflow node details dock. Questions and reasons, never verdicts. */
export const NODE_LESSON: Record<FlowKind, NodeLesson> = {
  ai: {
    kind: "AI adversary",
    stage: "Adversary",
    what: "The simulated attacker. It picks one move at a time, sees what the logs and your controls let it do, and adapts. You only see it here because the Adversary Lens is on.",
    ask: ["Which move did it just make, and what would that look like in the logs?", "What would you expect it to try next?"],
  },
  ip: {
    kind: "Source IP",
    stage: "Source IP",
    what: "The network address a request came from. Normal users usually keep the same address for a while; a change is worth a look but is not proof of anything on its own.",
    ask: ["Does this address belong to one session or several?", "Has this address appeared before this shift?", "What client (user agent) is behind it?"],
  },
  session: {
    kind: "Session",
    stage: "Session",
    what: "The server's memory that someone already signed in. Every request carries its token, and whoever holds the token is treated as that user.",
    ask: ["Does it always arrive from the same address and client?", "Does it ask for the same kinds of things as the other sessions?", "How does its rhythm compare with the others?"],
  },
  gateway: {
    kind: "API gateway",
    stage: "Authorize",
    what: "The checkpoint every request passes. It checks that the session is valid and allowed to read the route, then lets the request through or refuses it with a 4xx status.",
    ask: ["Who is being refused here, and for what?", "Is every refusal suspicious, or are some just typos and stale links?"],
  },
  route: {
    kind: "API route",
    stage: "Route",
    what: "A group of endpoints on the API. Routes tell you what kind of thing a session is trying to do: check its status, browse shared files, or reach restricted data.",
    ask: ["Which sessions use this route, and how often?", "Is any session reaching further than the rest?"],
  },
  refused: {
    kind: "Refused requests",
    stage: "Outcome",
    what: "Requests the gateway turned away. 404 means the file was not found and is often harmless. 403 means the server understood and said no, which is more interesting.",
    ask: ["Which status codes dominate?", "Did the same session keep trying after it was refused?"],
  },
  asset: {
    kind: "Protected file",
    stage: "Outcome",
    what: "The document you are defending. Every successful read of it ends here. It is the thing the mission is about.",
    ask: ["Who has read it, and from where?", "Should that session be reading it at all?"],
  },
  response: {
    kind: "Your response",
    stage: "Your action",
    what: "The control you applied. It changes what the gateway will accept. The workflow shows its effect: traffic from the target session should start ending at Refused.",
    ask: ["Did it stop what you wanted to stop?", "Is anyone else affected by it?"],
  },
};
