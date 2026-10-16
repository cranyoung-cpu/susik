import math from '@math-runtime';
import {startWorkspace} from '../dist/workspace-app.js';
window.math=math;
export const ready=Promise.resolve(startWorkspace()).then(()=>performance.mark('workspace-ready'));
