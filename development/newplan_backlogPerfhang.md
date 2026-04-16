First: move all completed tasks and plans into development>implementationplan>completed.

Next,
Determine the axiomatic, axiological, and teleological intent of each of the following requests to create industry leading solutions for each request.
Then, in Development>ImplementationPlan, create an industry leading implementationplan and tasks markdown using [x] and [ ] to ensure that each request and solution are brought to a full, error free fruition exactly as intended. 
Ensure .md file names (plan and tasks) have appropriate file name appends, _descriptive, to ensure other plans are not overwritten. 
When editing preexisting code, Ensure only careful targeted changes, avoid rewrites of preexisting code unless explicitly requested.

Ensure each phase practices good coding practices where applicable.
Ensure each phase includes running linting and verification/QA checks, and unit/integration tests where applicable.
Ensure each phase concludes with a pause for user feedback and QA checkpoint.

Upon plan construction, predict connections, features, ideas and requests I am not addressing and output them as suggestions but do not add them to the plan unless explicitly requested.
Predict more industry standard and industry leading expansive components and ideas to each new feature as enrichment, suggest them but do not add them to the plan unless I explicity request it.
Requests:

lag spike on room placement- determine if this is purely React Virtual DOM Reconciliation. Every time you place a room, it adds a new object to the Zustand state array. React then forcibly recalculates the entire SimulationNodes tree, the shadow casting, the WebAudio nodes, and the HTML GUI overlays to re-draw the world.
Identify other room placement related lag spikes and determine if they are related to the same issue or something else and fix them.

