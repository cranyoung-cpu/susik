// The workspace needs AST parsing and structural edits, not the full calculator.
import {create,parseDependencies} from 'mathjs/number';
const math=create({parseDependencies});
export default math;
