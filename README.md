# RPG Maker MV MCP Server

A detailed **Model Context Protocol (MCP)** server that enables Gemini CLI (and any other MCP-compatible AI client) to finely interact with RPG Maker MV projects.

Exposes **71 tools** covering every major aspect of an RPG Maker MV project:
actors, classes, skills, items, weapons, armors, enemies, states, troops, common events, maps, map events, system settings, plugins, and data validation.

---

## Features

| Category | Tools |
|---|---|
| **Core Data Files** | `list_data_files`, `list_map_files`, `read_data_file`, `write_data_file` |
| **Actors** | `get_actor`, `list_actors`, `upsert_actor`, `delete_actor` |
| **Classes** | `get_class`, `list_classes`, `upsert_class`, `delete_class` |
| **Skills** | `get_skill`, `list_skills`, `upsert_skill`, `delete_skill` |
| **Items** | `get_item`, `list_items`, `upsert_item`, `delete_item` |
| **Weapons** | `get_weapon`, `list_weapons`, `upsert_weapon`, `delete_weapon` |
| **Armors** | `get_armor`, `list_armors`, `upsert_armor`, `delete_armor` |
| **Enemies** | `get_enemy`, `list_enemies`, `upsert_enemy`, `delete_enemy` |
| **States** | `get_state`, `list_states`, `upsert_state`, `delete_state` |
| **Troops** | `get_troop`, `list_troops`, `upsert_troop`, `delete_troop` |
| **Common Events** | `get_common_event`, `list_common_events`, `upsert_common_event`, `delete_common_event` |
| **Maps** | `list_maps`, `get_map`, `update_map_properties`, `update_map_info` |
| **Map Events** | `list_map_events`, `get_map_event`, `upsert_map_event`, `delete_map_event`, `search_event_commands` |
| **System** | `get_system`, `update_system`, `get_switches`, `update_switch_name`, `get_variables`, `update_variable_name`, `get_elements`, `get_skill_types`, `get_weapon_types`, `get_armor_types` |
| **Plugins** | `list_plugins`, `get_plugin`, `set_plugin_status`, `update_plugin_parameter`, `upsert_plugin`, `remove_plugin` |
| **Validation** | `validate_project`, `find_references` |

---

## Requirements

- **Node.js** v18 or later
- An **RPG Maker MV** project directory (containing a `data/` folder)

---

## Installation

```bash
# Clone the repo
git clone https://github.com/Banjo5k/RPGMAKERMVMCP.git
cd RPGMAKERMVMCP

# Install dependencies
npm install

# Build the server
npm run build
```

---

## Usage with Gemini CLI

Add the following entry to your Gemini CLI MCP configuration file (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "rpgmaker-mv": {
      "command": "node",
      "args": ["/absolute/path/to/RPGMAKERMVMCP/dist/index.js"]
    }
  }
}
```

Then start Gemini CLI. You can use natural language to interact with your project:

```
> List all actors in my RPG Maker MV project at /path/to/my/game
> Create a new skill called "Fireball" for the mage class
> Show me all events on Map 3
> Rename switch 5 to "BossDefeated"
> Enable the YEP_CoreEngine plugin and set Screen Width to 1280
> Search for all "Show Message" commands containing "Hello"
> Validate my project for data integrity issues
```

---

## Usage with Other MCP Clients

The server communicates over **stdio** using the MCP protocol. Run it as:

```bash
node dist/index.js
```

Or during development (no build required):

```bash
npm run dev
```

---

## Tool Reference

### Core Data File Tools

#### `list_data_files`
Lists all JSON files in the project's `data/` directory.

#### `list_map_files`
Lists all `MapXXX.json` files in the project.

#### `read_data_file`
Reads the raw JSON content of any data file.

| Parameter | Type | Description |
|---|---|---|
| `projectPath` | string | Absolute path to the RPG Maker MV project root |
| `fileName` | string | File name without extension (`Actors`) or with (`Actors.json`) |

#### `write_data_file`
Overwrites any data file with new JSON content. Creates a `.bak` backup automatically.

| Parameter | Type | Description |
|---|---|---|
| `projectPath` | string | Project root path |
| `fileName` | string | File name (e.g. `Actors`) |
| `content` | string | Valid JSON string to write |

---

### Entity Tools

Each entity type (`Actor`, `Class`, `Skill`, `Item`, `Weapon`, `Armor`, `Enemy`, `State`, `Troop`, `CommonEvent`) provides four tools:

#### `get_X` (e.g. `get_actor`)
Gets a single record by 1-based ID.

#### `list_Xs` (e.g. `list_actors`)
Lists all records showing ID and name.

#### `upsert_X` (e.g. `upsert_actor`)
Creates or updates a record. Pass `"id": 0` to create a new record (assigned the next available ID). Pass an existing ID to replace it.

**Actor fields example:**
```json
{
  "id": 0,
  "name": "Luna",
  "classId": 2,
  "initialLevel": 1,
  "maxLevel": 99,
  "equips": [0, 0, 0, 0, 0],
  "traits": [],
  "faceName": "Actor2",
  "faceIndex": 0,
  "characterName": "Actor2",
  "characterIndex": 0,
  "battlerName": "",
  "profile": "A brilliant mage.",
  "nickname": "The Mage",
  "note": ""
}
```

#### `delete_X` (e.g. `delete_actor`)
Deletes a record (sets its array slot to `null`).

---

### Map Tools

#### `list_maps`
Lists all maps from `MapInfos.json`.

#### `get_map`
Gets full map data. Set `includeTileData: true` to include the raw tile array (large).

#### `update_map_properties`
Updates map metadata without changing tiles or events.

```json
{ "displayName": "Forest", "encounterStep": 30, "tilesetId": 2 }
```

#### `search_event_commands`
Searches all events for commands matching a code or keyword.

| Code | Command |
|---|---|
| 101 | Show Message |
| 102 | Show Choices |
| 121 | Control Switches |
| 122 | Control Variables |
| 201 | Transfer Player |
| 301 | Battle Processing |

---

### System Tools

#### `get_system` / `update_system`
Read or update `System.json`.

```json
{ "gameTitle": "My Epic RPG", "currencyUnit": "Gil", "optSideView": true }
```

#### `get_switches` / `update_switch_name`
List switch names or rename one by 1-based ID.

#### `get_variables` / `update_variable_name`
List variable names or rename one by 1-based ID.

#### `get_elements` / `get_skill_types` / `get_weapon_types` / `get_armor_types`
List the type names defined in `System.json`.

---

### Plugin Tools

RPG Maker MV stores plugins in `js/plugins.js` (a JS assignment, not pure JSON). The server handles this automatically.

#### `list_plugins`
Lists plugins with enabled (✓) / disabled (✗) status.

#### `set_plugin_status`
Enable or disable a plugin.

#### `update_plugin_parameter`
Update a single plugin parameter value.

#### `upsert_plugin`
Add or replace a plugin entry:

```json
{
  "name": "YEP_CoreEngine",
  "status": true,
  "description": "Core engine enhancements.",
  "parameters": { "Screen Width": "1280", "Screen Height": "720" }
}
```

#### `remove_plugin`
Remove a plugin entry entirely.

---

### Validation Tools

#### `validate_project`
Runs integrity checks across all data files:
- System settings completeness
- Actor→Class cross-references
- ID consistency in all database arrays
- Map dimension and tile data integrity
- Missing names, negative prices

#### `find_references`
Finds all files referencing a specific ID.

```
referenceType: "skillId", referenceId: 5
→ Shows which actors, classes, enemies, maps reference skill 5
```

---

## Data Safety

- All write operations create a `.bak` backup before overwriting and use an atomic temp-file + rename to prevent partial-write corruption on crash.
- File-name parameters are sanitized to prevent path traversal outside the project's `data/` directory.
- Tool errors are returned as MCP error responses instead of crashing the server process.
- Backup files are excluded from git via `.gitignore`.

---

## Development

```bash
# Development mode (runs TypeScript directly via tsx)
npm run dev

# Build for production
npm run build

# Start the built server
npm start
```

---

## RPG Maker MV Event Command Code Reference

| Code | Name | Code | Name |
|---|---|---|---|
| 101 | Show Message | 201 | Transfer Player |
| 102 | Show Choices | 203 | Set Event Location |
| 111 | Conditional Branch | 212 | Show Animation |
| 117 | Call Common Event | 221 | Fadeout Screen |
| 121 | Control Switches | 222 | Fadein Screen |
| 122 | Control Variables | 230 | Wait |
| 123 | Control Self Switch | 231 | Show Picture |
| 125 | Change Gold | 245 | Play BGM |
| 126 | Change Items | 250 | Play SE |
| 127 | Change Weapons | 301 | Battle Processing |
| 128 | Change Armors | 302 | Shop Processing |
| 129 | Change Party Member | 311 | Change HP |
| 132 | Change Battle BGM | 312 | Change MP |
| 133 | Change Victory ME | 313 | Change State |
| 134 | Change Save Access | 314 | Recover All |
| 135 | Change Menu Access | 315 | Change EXP |
| 136 | Change Encounter | 316 | Change Level |
| 150 | If Win | 317 | Change Parameters |
| 151 | If Escape | 318 | Change Skills |
| 152 | If Lose | 319 | Change Equipment |
| 160 | Return to Title Screen | 320 | Change Name |
| 164 | Game Over | 321 | Change Class |

---

## License

ISC
