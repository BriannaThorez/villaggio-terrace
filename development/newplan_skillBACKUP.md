First: move all completed tasks, plans, and their associated prompt markdown files into development>implementationplan>completed. Put them in a subfolder named based on the descriptive portion of the relative development-implementation-plan's title.

# Determine intent
Next,
Determine the axiomatic, axiological, and teleological intent of each of the following requests to create industry leading solutions for each request.
# Create development-sources-of-truth
Then, 
In Development>ImplementationPlan, create an industry leading spec-driven development-implementation-plan and associated development-tasks markdown files, using [x] and [ ] to ensure that each request and associated solution are brought to a full, error free fruition exactly as intended. Ensure that the development-implementation-plan is broken down into phases and sub-phases as needed. 
Ensure the development-implementation-plan and development-tasks markdown files circularly reference eachother for updates and changes to ensure continuity and completeness as the agent follows the plan.

Create an associated development-prompt markdown file which will contain the user's prompt(word-for-word)followed by the AI's analysis of the prompt, including the axiomatic, axiological, and teleological intent of the request.

Fidelity:
Let development-tasks be phase, step, and sub-step granular step by step. To ensure that if a lesser model must implement the plan, it can do so with absolute fidelity and no nuances missed. 
Ensure tasks includes cues to review contextually important processes, files, their contents, and other relevant information as needed. such as example of reviewing texture pipeline and prewarmer logic prior to working on it.

Ensure .md file names (development-implementation-plan, development-tasks, development-prompt) have appropriate descriptive file name appends, "-[description].md", to ensure other files/plans are not overwritten. Ensure the development plan and tasks header indicates "source-of-truth" for the current goals.

Next,
When editing preexisting code, Ensure only careful targeted changes, avoid rewrites of preexisting code unless explicitly requested. Ensure this direction is reflected in each phase's description.

Ensure each phase contains instructios to adhere to good coding practices where applicable.
Ensure each phase includes running linting, verification/QA checks, unit/integration tests where applicable, and that these are all appropriately reflected in the tasks.
Ensure each phase concludes with a pause for user feedback and QA checkpoint and will not resume unless a user explicitly requests it.

Iterative improvement and Predicitons:
Upon plan creation, predict more industry standard and industry leading expansive components, connections, features, ideas and requests I am not addressing- as new features or as enrichment of existing features. 
Prediction output:
Output aforementioned predictions as suggestions but do not add them to the plan unless I explicity request it. Append the predictions, using a tool(do not edit), as either new features or as enrichments to existing features, at the end of development>implementationplan>feature-predictions.md, which serves as an accumulation point for all predicted ideas.

# Artifact augmentation section
Utilize Antigravity's internal implementation plan and tasks **artifact system** to create artifact-implementation-plans and artifact-tasks.
Ensure artifact-implementation-plan and artifact-tasks are in 1:1 parity with the current specific phase of its respective source of truth (development-implementation-plan.md and development-tasks.md). 
For the purpose of serving as persistent augmentation of the development sources of truth. 
Ensure artifact-implementation-plan and artifact-tasks feature explicit calls to query the associated development-tasks for updates and changes.

Ensure that each artifact's completion/transitionary component has a binding/handshake component to serve as return instruction to the associated development-implementation-plan and development-tasks:
```
Artifact Augmentation of development-[implementation-plan or tasks]-[name].md; Return to source of truth at each completion/transitionary checkpoint and ensure parity.
```
Ensure every development-source-of-truth phase and associated tasks includes this "Artifact Augmentation Section" verbatim as as tooling inspiration and prompt. 

# Requests:
