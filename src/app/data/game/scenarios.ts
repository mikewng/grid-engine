import { Scenario } from "@/engine/gamesetup";
import { borderFortScenario } from "./borderfort";
import { testScenario } from "./testscenario";

export interface ScenarioEntry {
    id: string;
    name: string;
    /** One line, for the map picker. */
    description: string;
    scenario: Scenario;
}

/** The maps the sandbox can play. The first is the default. */
export const SCENARIOS: ScenarioEntry[] = [
    {
        id: "border-fort",
        name: "Border Fort",
        description: "9 units and 3 allies against 18 raiders, brigands and a castle garrison",
        scenario: borderFortScenario,
    },
    {
        id: "skirmish",
        name: "Skirmish",
        description: "2 units against 2, on a small field",
        scenario: testScenario,
    },
];
