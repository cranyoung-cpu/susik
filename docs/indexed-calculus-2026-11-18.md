# Indexed calculus variables

Base main: 6e595452618b2ce14bc3b675c98783f01d467c14.

Existing indexed symbols such as a_1 were valid in expressions but unavailable as differentiation/integration variables: both the form and engine allowed only ten fixed letters. This prevented computing the derivative of a_1^2 with respect to a_1.

The variable selector now retains the existing preferred order, includes other supported real-variable letters, and adds indexed variables parsed from the current expression. Text and keypad edits refresh only the selector; incomplete edits preserve the selected variable and do not recreate the input field. Constants e, pi and i remain unavailable as variables. Valid indexed symbols such as i_1 remain independent real variables.

The engine shares the symbol validator, differentiates/integrates indexed variables, and renders the differential variable with its actual LaTeX subscript. Existing unsupported nested/expression subscripts remain unsupported. No save schema or migration is added.

Validation: 12 focused engine/DOM tests and 452 full tests passed; production build succeeded. Covers first/second derivatives, indefinite/definite integrals, integration-constant name collision, invalid/reserved variable rejection, selector discovery, incomplete typing, calculation, saved entry reload/edit, and changing to definite integration. Existing matrix, auxiliary-history and prior calculus regressions passed. Parser bundle unchanged.

Tests are local module and simulated DOM tests, not a physical phone or public browser interaction.
