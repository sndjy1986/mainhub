/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  name: string;
  email?: string;
}

export const SHIFT_TEAMS: Record<string, { lead: string; members: string[] }> = {
  "Alpha": {
    lead: "Crystal Culbertson",
    members: ["Courtney Fletcher", "Brian Blair"]
  },
  "Bravo": {
    lead: "Corrine Skelly",
    members: ["Dayonna"]
  },
  "Charlie": {
    lead: "Joey Sanders",
    members: ["Michael Senn", "Rea Roberson"]
  },
  "Delta": {
    lead: "Erin Brandenburg",
    members: ["Asha Williams", "Darren Chestein"]
  }
};

export const TEAM_MEMBERS: string[] = [
  ...Object.values(SHIFT_TEAMS).flatMap(team => [team.lead, ...team.members]),
  "Donna Wiles"
];

export const ALSSUP_OPTIONS: string[] = [
  "(A-1) Shanda Shore",
  "(B-1) Joe Kennedy",
  "(C-1) Jared Bingel",
  "(D-1) Alex Kay",
  "Other"
];

export const MEDSUP_MAP: Record<string, string> = {
  "Hunter Shore": "hshore1@medshore.com",
  "Jeff Patterson": "jpatterson2@medshore.com",
  "James Howard": "jhoward@medshore.com",
  "Robert Huff": "rhuff@medshore.com",
  "David Howard": "dhoward@medshore.com",
  "Matthew Dean": "mdean@medshore.com"
};

export const MEDSUP_OPTIONS = Object.keys(MEDSUP_MAP);

export const BASE_REPORT_EMAILS = "gwilliams@medshore.com; rbrooks@medshore.com";
export const CC_EMAIL = "asanders@medshore.com";

export const SHIFTS = ["A-Shift", "B-Shift", "C-Shift", "D-Shift"];

export type ShiftReportData = {
  name: string;
  date: string;
  shift: string;
  channel1: string;
  channel2: string;
  thirdPerson: string;
  zuluPrimary: string;
  zuluSecondary: string;
  alssup: string;
  medsup: string;
  truck911: string;
  truckGT: string;
  truckALS: string;
  truckCountyQRV: string;
  lateTrucks: string;
  outOfChute: string;
  issues: string;
  pasteNotes: string;
};

export const INITIAL_DATA: ShiftReportData = {
  name: "",
  date: new Date().toISOString().split('T')[0],
  shift: "C-Shift",
  channel1: "",
  channel2: "",
  thirdPerson: "",
  zuluPrimary: "",
  zuluSecondary: "",
  alssup: "",
  medsup: "",
  truck911: "0",
  truckGT: "0",
  truckALS: "",
  truckCountyQRV: "0",
  lateTrucks: "",
  outOfChute: "",
  issues: "",
  pasteNotes: ""
};
