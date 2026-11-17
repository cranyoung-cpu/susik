# Continuous zero endpoints in definite integrals

Base: main ae8ec33caa4933b4480288bb9d4ba6707a7ac2a7.

Reproduced: sqrt(x) and x^(1/2), integrated from 0 to 1, were rejected as undefined/improper despite being continuous on that closed interval.

Fix: only definite integration distinguishes nonnegative affine bases for square roots and positive fractional powers from strictly positive bases for logs and negative fractional powers. Derivative and indefinite-integral conditions remain unchanged. Negative-domain, reciprocal-pole and unsupported improper-integral rejection remain in place.

Validation: 9 focused advanced-math tests and all 445 tests passed. Added zero endpoints, reversed bounds, affine roots, positive fractional powers, zero-width interval, negative domains, negative fractional powers, logarithms, reciprocals and mixed singular expressions. Production build succeeded. dist/calculus-tools.js is the maintained module imported by the workspace source; scripts/build.mjs bundles it into the hashed workspace asset and updates dist/index.html. Parser asset unchanged.

This records local module/DOM tests and build, not public browser or physical-phone validation. No storage schema, saved user data or account settings changed.
