import { Result } from "../../utils/resultclass";

export interface IUnitReader {
    getUnitById(id: string): Result<Unit>;
}