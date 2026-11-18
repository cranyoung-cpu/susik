# Exact quarter-turn trigonometric domain checks

Base main: d86a49e753c64afd1575a8162f2d1de9a0b1272d.

Reproduced: 1/sin(pi)+x, tan(pi/2)+x, and ln(sin(pi))+x differentiated to 1, although each original expression is undefined. Math.sin(Math.PI) and Math.cos(Math.PI/2) leave tiny nonzero floating-point values; Math.tan(Math.PI/2) returns a large finite value.

Fix: share the existing exact rational-multiple-of-pi quarter-turn recognizer between symbolic simplification and internal numeric evaluation. Exact sine/cosine zeros are now zero during domain checks, and exact tangent poles throw a clear error. Validate constant tangent terms before differentiation or integration can erase them. Definite-integral bounds use the same evaluator. No epsilon threshold is used, so nearby valid angles remain valid.

Validation: 14 focused tests and 450 total tests passed; production build succeeded. Covers positive/negative tangent poles, reciprocal/log zeros, zero-multiplied undefined terms, invalid integral bounds, exact valid bounds, near-pole valid inputs, existing derivatives and zero-endpoint integration. Parser bundle unchanged; no storage/schema/settings changes. This is local module/DOM testing, not public browser interaction or a physical-phone test.

Scope: exact syntactic rational multiples of pi recognized by the existing helper, not a complete symbolic trigonometric identity/domain solver.
