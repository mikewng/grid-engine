# Introduction
This application is to provide a lightweight and modular game engine for 2D-Grid Combat Games.
Currently, I am modeling its gameplay structure and loop based off of series such as Fire Emblem and Advanced Wars.

# File Structure after src/app/:
- assets/ - image, icons, svg files for the game.
- components/ - UI components related to the game.
- context/ - React global and scoped contexts needed for website state management
- data/ - Hardcoded data of units, weapons, skills, etc
- engine/ - Core logic of the game engine
  - managers/ - CRUD level management of specific game objects
  - models/ - Interfaced models and implementations of game objects
- utils/ - Pure functions used across all layers, also contains default game rules that can be swapped for differentcustom implementations
- screens/ - UI Screens for the game, including a sandbox test page

# Engine Models and Relationships
## Grid
### Object
- Core object to represent a "grid", which consists of a number of tile objects arranged in an n x n square.
- Contains an array of tile objects.
### Grid Manager
- Reusable logic on a Grid object that does CRUD of tiles, change tile types, and getting units on tiles.
  - Set Grid Size
  - Get Grid Size
  - Get Tile(s)
  - Change Tile Type
  - Check for Tile Occupation
  - Moving units on the grid

## Tile
### Object
- Core object to represent a "tile" within a larger grid.
- Contains important data such as (x,y) positions, and entity occupations

## Unit
### Object
- Core object to represent either a playable character, enemy, or NPC.

### Unit Manager
- Reusable logic on a dictionary map of units that does CRUD on unit(s) and their attributes
- Adding Unit(s) (Set())
- Get Unit By:
  - Id, Position, Faction, All Units
- Set Unit Position
- Patch Unit Data
- Mark Unit Acted

## Combat
### Manager
- Service logic on combat logic modeled after the Fire Emblem series
- Initiate Attack() - Combat flow orchestration
- Calculate Hit Rate
- Calculate Double Hit
- Calculate Crit Rate
- Calculate Has Hit
- Calculate Has Crit Hit
- Can Counter Attack
- Calculate Damage
- Damage Unit

## Items
TBD

## Weapons
TBD

## Movement
### Manager
- Structure and logic TBD

## Status Effects
### Manager
- TBD

## Game Manager
### Manager
- TBD

# Running Instructions
To Run:
1. Clone Repository
2. npm install
3. npm run dev
4. Web application will run on localhost 3000 by default.
