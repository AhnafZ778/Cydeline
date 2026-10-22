import { ControlPlaneClient } from "../types/contracts";
import { LiveHttpControlClient } from "./liveHttpClient";
import { StatefulSimulationClient } from "./simulationClient";

export const simulationClient = new StatefulSimulationClient();
export const liveHttpClient = new LiveHttpControlClient();

export function getControlClient(mode: "simulation" | "live" = "simulation"): ControlPlaneClient {
  if (mode === "live" || import.meta.env.VITE_API_MODE === "live") {
    return liveHttpClient;
  }
  return simulationClient;
}
