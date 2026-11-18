# Avoid an integration-variable/constant name collision

Base main: 4a36e521b81cc825ad1c6554923570a7957629a0.

Follow-up regression after expanding the calculus variable selector: integrating the constant 1 with respect to c produced `c + c` and called c an arbitrary constant. The old constant allocator excluded symbols in the integrand, but not an integration variable absent from the integrand.

Fix: exclude the selected integration variable as well as all symbols in the original integrand. The example now returns `c + k`, with k the arbitrary constant. If all existing constant names are occupied, retain the explicit unsupported-capacity error rather than alias a variable.

Validation: 13 focused tests and 453 full tests passed; production build succeeded. Added 18 constant-integrand cases (0, 1, 2 for c, k, h, r, s, a_1) and differentiated the resulting primitives with an independent full mathjs instance. Verified exhausted-name rejection and existing UI/reload/indexed-variable behavior. Parser asset unchanged. No saved data is rewritten or deleted.

These are local module/DOM tests, not public browser interaction or a physical-phone test.
