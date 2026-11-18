# Original domains after constant-parameter calculus

Base main: a4a21b3f94d8fa87e89b143eccec256ddc7647f0.

Reproduced: differentiating y^(-1) or asin(y) with respect to x returned 0 with only real-variable conditions. acos(y)+x returned 1 without the original inverse-trigonometric domain. The numeric derivative was correct only where the original expression existed, but that condition was lost.

The existing original-domain traversal now also records power and asin/acos conditions before simplification. Integer nonpositive powers require a nonzero base; positive fractional powers allow a nonnegative base, negative fractional powers and symbolic powers retain the application's positive-base real-power convention. Inverse sine/cosine preserve their closed input domain; their variable-dependent derivatives still carry the stricter open domain. This does not extend the app to negative-base fractional-power conventions.

Validation: 11 focused tests and all 447 tests passed; production build passed. Tests cover parameters, zero-multiplied eliminated terms, constant-parameter antiderivatives, inverse-trig derivative boundaries, invalid numeric inputs and the prior zero-endpoint definite-integral regression. Parser bundle unchanged. No storage, user data or account changes.

Validation is local module/DOM testing and a production build, not browser interaction or a physical-phone test.
