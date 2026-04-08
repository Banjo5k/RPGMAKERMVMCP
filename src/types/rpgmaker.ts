/**
 * RPG Maker MV type definitions
 * These types represent the JSON data structures used by RPG Maker MV.
 */

// ──────────────────────────────────────────────
// Shared / primitives
// ──────────────────────────────────────────────

export interface RPGNote {
  note: string;
}

export interface RPGEffect {
  /** Effect code (see RPG Maker MV documentation) */
  code: number;
  dataId: number;
  value1: number;
  value2: number;
}

export interface RPGTrait {
  /** Trait code (see RPG Maker MV documentation) */
  code: number;
  dataId: number;
  value: number;
}

export interface RPGDamage {
  /** 0: None, 1: HP Damage, 2: MP Damage, 3: HP Recover, 4: MP Recover, 5: HP Drain, 6: MP Drain */
  type: number;
  /** 0: Fixed, 1: Actor, 2: Enemy */
  elementId: number;
  formula: string;
  variance: number;
  critical: boolean;
}

export interface RPGUseEffect {
  code: number;
  dataId: number;
  value1: number;
  value2: number;
}

// ──────────────────────────────────────────────
// Actor
// ──────────────────────────────────────────────

export interface RPGEquipment {
  weaponId: number;
  armorId: number;
}

export interface RPGActor {
  id: number;
  battlerName: string;
  characterIndex: number;
  characterName: string;
  classId: number;
  description?: string;
  equips: number[];
  faceIndex: number;
  faceName: string;
  traits: RPGTrait[];
  initialLevel: number;
  maxLevel: number;
  name: string;
  nickname: string;
  note: string;
  profile: string;
}

// ──────────────────────────────────────────────
// Class
// ──────────────────────────────────────────────

export interface RPGLearning {
  level: number;
  note: string;
  skillId: number;
}

export interface RPGClass {
  id: number;
  expParams: [number, number, number, number];
  traits: RPGTrait[];
  learnings: RPGLearning[];
  name: string;
  note: string;
  params: number[][];
}

// ──────────────────────────────────────────────
// Skill
// ──────────────────────────────────────────────

export interface RPGSkill {
  id: number;
  animationId: number;
  damage: RPGDamage;
  description: string;
  effects: RPGEffect[];
  hitType: number;
  iconIndex: number;
  message1: string;
  message2: string;
  mpCost: number;
  name: string;
  note: string;
  occasion: number;
  repeats: number;
  requiredWtypeId1: number;
  requiredWtypeId2: number;
  scope: number;
  speed: number;
  stypeId: number;
  successRate: number;
  tpCost: number;
  tpGain: number;
}

// ──────────────────────────────────────────────
// Item
// ──────────────────────────────────────────────

export interface RPGItem {
  id: number;
  animationId: number;
  consumable: boolean;
  damage: RPGDamage;
  description: string;
  effects: RPGEffect[];
  hitType: number;
  iconIndex: number;
  itypeId: number;
  name: string;
  note: string;
  occasion: number;
  price: number;
  repeats: number;
  scope: number;
  speed: number;
  successRate: number;
  tpGain: number;
}

// ──────────────────────────────────────────────
// Weapon
// ──────────────────────────────────────────────

export interface RPGWeapon {
  id: number;
  animationId: number;
  description: string;
  etypeId: number;
  traits: RPGTrait[];
  iconIndex: number;
  name: string;
  note: string;
  params: number[];
  price: number;
  wtypeId: number;
}

// ──────────────────────────────────────────────
// Armor
// ──────────────────────────────────────────────

export interface RPGArmor {
  id: number;
  atypeId: number;
  description: string;
  etypeId: number;
  traits: RPGTrait[];
  iconIndex: number;
  name: string;
  note: string;
  params: number[];
  price: number;
}

// ──────────────────────────────────────────────
// Enemy
// ──────────────────────────────────────────────

export interface RPGEnemyAction {
  conditionParam1: number;
  conditionParam2: number;
  conditionType: number;
  rating: number;
  skillId: number;
}

export interface RPGEnemyDropItem {
  dataId: number;
  denominator: number;
  kind: number;
}

export interface RPGEnemy {
  id: number;
  actions: RPGEnemyAction[];
  battlerHue: number;
  battlerName: string;
  dropItems: RPGEnemyDropItem[];
  exp: number;
  traits: RPGTrait[];
  gold: number;
  name: string;
  note: string;
  params: number[];
}

// ──────────────────────────────────────────────
// Troop
// ──────────────────────────────────────────────

export interface RPGTroopMember {
  enemyId: number;
  x: number;
  y: number;
  hidden: boolean;
}

export interface RPGTroopPage {
  conditions: {
    actorHp: number;
    actorId: number;
    actorValid: boolean;
    enemyHp: number;
    enemyIndex: number;
    enemyValid: boolean;
    switch1Id: number;
    switch1Valid: boolean;
    switch2Id: number;
    switch2Valid: boolean;
    turnA: number;
    turnB: number;
    turnEnding: boolean;
    turnValid: boolean;
  };
  list: RPGEventCommand[];
  span: number;
}

export interface RPGTroop {
  id: number;
  members: RPGTroopMember[];
  name: string;
  pages: RPGTroopPage[];
}

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────

export interface RPGState {
  id: number;
  autoRemovalTiming: number;
  chanceByDamage: number;
  iconIndex: number;
  maxTurns: number;
  message1: string;
  message2: string;
  message3: string;
  message4: string;
  minTurns: number;
  motion: number;
  name: string;
  note: string;
  overlay: number;
  priority: number;
  removeAtBattleEnd: boolean;
  removeByDamage: boolean;
  removeByRestriction: boolean;
  removeByWalking: boolean;
  restriction: number;
  stepsToRemove: number;
  traits: RPGTrait[];
}

// ──────────────────────────────────────────────
// Animation
// ──────────────────────────────────────────────

export interface RPGAnimationFrame {
  /** Array of cell data: [pattern, x, y, scale, rotation, mirror, opacity, blendMode] */
  [index: number]: number[];
}

export interface RPGAnimationTiming {
  flashColor: [number, number, number, number];
  flashDuration: number;
  flashScope: number;
  frame: number;
  se: RPGAudioFile;
}

export interface RPGAnimation {
  id: number;
  animation1Hue: number;
  animation1Name: string;
  animation2Hue: number;
  animation2Name: string;
  frames: RPGAnimationFrame[][];
  name: string;
  position: number;
  timings: RPGAnimationTiming[];
}

// ──────────────────────────────────────────────
// Tileset
// ──────────────────────────────────────────────

export interface RPGTileset {
  id: number;
  flags: number[];
  mode: number;
  name: string;
  note: string;
  tilesetNames: string[];
}

// ──────────────────────────────────────────────
// Common Event
// ──────────────────────────────────────────────

export interface RPGEventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

export interface RPGCommonEvent {
  id: number;
  list: RPGEventCommand[];
  name: string;
  switchId: number;
  /** 0: None, 1: Autorun, 2: Parallel */
  trigger: number;
}

// ──────────────────────────────────────────────
// Map
// ──────────────────────────────────────────────

export interface RPGAudioFile {
  name: string;
  pan: number;
  pitch: number;
  volume: number;
}

export interface RPGMapEventPageConditions {
  actorId: number;
  actorValid: boolean;
  itemId: number;
  itemValid: boolean;
  selfSwitchCh: string;
  selfSwitchValid: boolean;
  switch1Id: number;
  switch1Valid: boolean;
  switch2Id: number;
  switch2Valid: boolean;
  variableId: number;
  variableValid: boolean;
  variableValue: number;
}

export interface RPGMapEventPageImage {
  characterIndex: number;
  characterName: string;
  direction: number;
  pattern: number;
  tileId: number;
}

export interface RPGMoveRoute {
  list: RPGEventCommand[];
  repeat: boolean;
  skippable: boolean;
  wait: boolean;
}

export interface RPGMapEventPage {
  conditions: RPGMapEventPageConditions;
  directionFix: boolean;
  image: RPGMapEventPageImage;
  list: RPGEventCommand[];
  moveFrequency: number;
  moveRoute: RPGMoveRoute;
  moveSpeed: number;
  moveType: number;
  priorityType: number;
  stepAnime: boolean;
  through: boolean;
  trigger: number;
  walkAnime: boolean;
}

export interface RPGMapEvent {
  id: number;
  name: string;
  note: string;
  pages: RPGMapEventPage[];
  x: number;
  y: number;
}

export interface RPGMap {
  autoplayBgm: boolean;
  autoplayBgs: boolean;
  battleback1Name: string;
  battleback2Name: string;
  bgm: RPGAudioFile;
  bgs: RPGAudioFile;
  disableDashing: boolean;
  displayName: string;
  encounterList: RPGEncounter[];
  encounterStep: number;
  height: number;
  note: string;
  parallaxLoopX: boolean;
  parallaxLoopY: boolean;
  parallaxName: string;
  parallaxShow: boolean;
  parallaxSx: number;
  parallaxSy: number;
  scrollType: number;
  specifyBattleback: boolean;
  tilesetId: number;
  width: number;
  data: number[];
  events: (RPGMapEvent | null)[];
}

export interface RPGEncounter {
  regionSet: number[];
  troopId: number;
  weight: number;
}

// ──────────────────────────────────────────────
// Map Info
// ──────────────────────────────────────────────

export interface RPGMapInfo {
  id: number;
  expanded: boolean;
  name: string;
  order: number;
  parentId: number;
  scrollX: number;
  scrollY: number;
}

// ──────────────────────────────────────────────
// System
// ──────────────────────────────────────────────

export interface RPGSystemAttackMotion {
  type: number;
  weaponImageId: number;
}

export interface RPGSystemVehicle {
  bgm: RPGAudioFile;
  characterIndex: number;
  characterName: string;
  startMapId: number;
  startX: number;
  startY: number;
}

export interface RPGSystem {
  airship: RPGSystemVehicle;
  armorTypes: string[];
  attackMotions: RPGSystemAttackMotion[];
  battleBgm: RPGAudioFile;
  battleback1Name: string;
  battleback2Name: string;
  battlerHue: number;
  battlerName: string;
  boat: RPGSystemVehicle;
  currencyUnit: string;
  defeatMe: RPGAudioFile;
  displaytp: boolean;
  elements: string[];
  equipTypes: string[];
  gameTitle: string;
  gameoverMe: RPGAudioFile;
  locale: string;
  magicSkills: number[];
  menuCommands: boolean[];
  messageSpeed: number;
  optDisplayTp: boolean;
  optDrawTitle: boolean;
  optExtraExp: boolean;
  optFloorDeath: boolean;
  optFollowers: boolean;
  optSideView: boolean;
  optSlipDeath: boolean;
  optTransparent: boolean;
  partyMembers: number[];
  ship: RPGSystemVehicle;
  skillTypes: string[];
  sounds: RPGAudioFile[];
  startMapId: number;
  startX: number;
  startY: number;
  switches: string[];
  terms: RPGSystemTerms;
  testBattlers: RPGTestBattler[];
  testTroopId: number;
  title1Name: string;
  title2Name: string;
  titleBgm: RPGAudioFile;
  variables: string[];
  versionId: number;
  victoryMe: RPGAudioFile;
  weaponTypes: string[];
  windowTone: [number, number, number, number];
}

export interface RPGSystemTerms {
  basic: string[];
  commands: string[];
  params: string[];
  messages: Record<string, string>;
}

export interface RPGTestBattler {
  actorId: number;
  equips: number[];
  level: number;
}

// ──────────────────────────────────────────────
// Plugin
// ──────────────────────────────────────────────

export interface RPGPlugin {
  name: string;
  status: boolean;
  description: string;
  parameters: Record<string, string>;
}

// ──────────────────────────────────────────────
// Database file arrays (RPG Maker MV uses null at index 0)
// ──────────────────────────────────────────────

export type RPGDatabaseArray<T> = [null, ...T[]];

export type DataFileName =
  | "Actors"
  | "Animations"
  | "Armors"
  | "Classes"
  | "CommonEvents"
  | "Enemies"
  | "Items"
  | "MapInfos"
  | "Skills"
  | "States"
  | "System"
  | "Tilesets"
  | "Troops"
  | "Weapons";
