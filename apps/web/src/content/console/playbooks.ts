import type { Step } from "../../lib/playbook";

const tail: Step[] = [
  {
    id: "artifacts",
    kind: "artifacts",
    title: "Add artifacts",
    body: "Record the indicators you would hand to the next shift. Add a row for each value, say what it is, and pick a type. These rows are kept on the case and are not scored.",
  },
  {
    id: "note",
    kind: "note",
    title: "Analyst note",
    body: "Write the note you would paste into the ticket: what you saw, what you decided, and what you changed. The note is not scored.",
  },
  {
    id: "confirm",
    kind: "confirm",
    title: "Finish playbook",
    body: "Confirm to save your answers and close this case. You can still close the alert from Monitoring, and the score appears only then.",
  },
];

export const PLAYBOOKS: Record<string, Step[]> = {
  phish: [
    {
      id: "parse",
      kind: "info",
      title: "Parse the email",
      body: "Open Email security in another tab. Find the message that matches this alert and read the sender, recipient, subject, SMTP address, attachment, and the gateway's final action.",
    },
    {
      id: "attachments",
      kind: "yesno",
      title: "Are there attachments or URLs in the email?",
      body: "Choose Yes if the message carries a file or a link. Choose No if it is text only.",
    },
    {
      id: "analyze",
      kind: "verdict",
      title: "Analyze the URL and attachment",
      body: "Open the stand-in scanners from the links below, or from the attachment in Email security. Mark Malicious if a scanner flags the file or the link.",
    },
    {
      id: "delivered",
      kind: "choice",
      title: "Was the mail delivered to the user?",
      body: "The alert's device action and the mailbox Final Action column can disagree. Decide whether the person actually received the message.",
      options: ["Delivered", "Not Delivered"],
    },
    {
      id: "delete",
      kind: "check",
      check: "deleted",
      mailId: "mail-voucher",
      title: "Remove the message from the mailbox",
      body: "The message reached the mailbox. Delete it in Email security, then come back and continue.",
      when: { id: "delivered", equals: "Delivered" },
    },
    {
      id: "contain",
      kind: "check",
      check: "contained",
      hostId: "ws-priya",
      title: "Contain the workstation",
      body: "If the attachment was opened, contain that host in Endpoint security before you continue.",
      when: { id: "delivered", equals: "Delivered" },
    },
    ...tail,
  ],
  malware: [
    {
      id: "look",
      kind: "info",
      title: "Inspect the endpoint",
      body: "Open Endpoint security for the host named in the alert. Note the file, its hash, and whether protection quarantined it.",
    },
    {
      id: "quarantine",
      kind: "yesno",
      title: "Did endpoint protection quarantine the file?",
      body: "Use the file verdict on the host. Yes means protection already isolated it.",
    },
    {
      id: "analyze",
      kind: "verdict",
      title: "Is the file malicious?",
      body: "Check the hash in Multiscan or detonate it in Detonate Lab.",
    },
    {
      id: "contain",
      kind: "check",
      check: "contained",
      hostId: "*",
      title: "Contain the workstation",
      body: "Contain the host in Endpoint security if the file is still active.",
    },
    ...tail,
  ],
  proxy: [
    {
      id: "look",
      kind: "info",
      title: "Read the proxy log",
      body: "Open Log management and search the source or destination from the alert. Confirm who talked to whom and what the gateway did.",
    },
    {
      id: "blocked",
      kind: "yesno",
      title: "Did the control block the traffic?",
      body: "Use the action field in the log line, not the severity of the alert.",
    },
    {
      id: "analyze",
      kind: "verdict",
      title: "Is the remote end malicious?",
      body: "Look the address or domain up in IP Check and Threat intel before you decide.",
    },
    ...tail,
  ],
  web: [
    {
      id: "look",
      kind: "info",
      title: "Read the web request",
      body: "Open Log management and find the request URL from the alert. Note the status and whether a payload landed.",
    },
    {
      id: "success",
      kind: "yesno",
      title: "Did the request succeed?",
      body: "A 2xx or a created object means it succeeded. A block or a 4xx means it did not.",
    },
    {
      id: "analyze",
      kind: "verdict",
      title: "Is this an attack?",
      body: "Decide from the URL and the host, not from the severity label alone.",
    },
    ...tail,
  ],
  forward: [
    {
      id: "look",
      kind: "info",
      title: "Read the forwarding rule",
      body: "Open Email security and Log management. See where the copy is sent and whether that destination is inside the company.",
    },
    {
      id: "leaves",
      kind: "yesno",
      title: "Does the forward leave the company?",
      body: "Yes if the destination is outside northstar.example. No if it stays on an internal mailbox.",
    },
    {
      id: "analyze",
      kind: "verdict",
      title: "Is the destination malicious?",
      body: "Check the destination domain in Threat intel before you decide.",
    },
    ...tail,
  ],
  responder: [
    {
      id: "look",
      kind: "info",
      title: "Confirm the live host",
      body: "This alert is for the incident responder role. Open Endpoint security, confirm the process that no longer matches its file, then contain the laptop.",
    },
    {
      id: "contain",
      kind: "check",
      check: "contained",
      hostId: "ws-finance",
      title: "Contain the finance laptop",
      body: "Contain WS-FINANCE in Endpoint security. A live shell is optional and only after containment.",
    },
    ...tail,
  ],
};
