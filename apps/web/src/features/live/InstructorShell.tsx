import { Shield } from "lucide-react";
import { InstructorDesk } from "./TrainingDesk";
import { ModeSwitch } from "./ModeSwitch";
import { useTitle } from "../console/Chrome";

export function InstructorShell() {
  useTitle("Instructor workspace · Northstar");
  return <div className="soc instructor-shell">
    <header className="instructor-top"><a className="soc__brand" href="#/live/instructor"><Shield size={20} />Northstar <span>Instructor</span></a><ModeSwitch /></header>
    <nav className="instructor-tabs" aria-label="Instructor tools"><a href="#/live/instructor" aria-current="page">Training management</a><a href="#/live/observer">Live observation</a></nav>
    <main id="main" tabIndex={-1}><InstructorDesk /></main>
  </div>;
}
