import { Grid } from "../engine/models/grid/grid"
import { TileType } from "../engine/models/grid/itile"
import { Tile } from "../engine/models/grid/tile"

const TileDictionary = {
    'B': TileType.Block,
    'G': TileType.Grass,
    'F': TileType.Forest,
    'M': TileType.Mountain,
    'W': TileType.Water
}

// export const parseJsonToGrid: Grid = (jsonArr: string[][]) => {
//     const parsedGrid = jsonArr.map((arr) => {
        
//     })

//     return parsedGrid
// }