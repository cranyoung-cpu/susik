import math from '@math-runtime';
import {startWorkspace} from '../dist/workspace-app.js';
window.math=math;
startWorkspace();
performance.mark('workspace-ready');
