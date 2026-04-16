**First:** move all completed tasks and plans into development>implementationplan>completed.
**Next,**
Determine the axiomatic, axiological, and teleological intent of each of the following requests to create industry leading solutions for each request.
**Then,**
In Development>ImplementationPlan, create an industry leading implementationplan and associated tasks markdown files using [x] and [ ] to ensure that each request and solution are brought to a full, error free fruition exactly as intended. Additionally save the user's prompt word-for-word as a prompt.md file.
- Ensure all .md file names (plan, tasks, prompt) have appropriate file name appends [_descriptiveAppend], to ensure other plans are not overwritten.
where [_descriptiveAppend] is a two-word or less description of the plan purpose.
- Ensure when editing preexisting code, Ensure only careful targeted changes, avoid rewrites of preexisting code unless explicitly requested.
- Ensure each phase has Run linting and verification/QA checks.
**Requests:**

I need a tenancy system accessible by the GUI that uses the room information panel to generate/handle dialogues for choosing room occupants.  we'll call this the toom tenancy gui
Let the room selection overlay's previous 'rotation' handle now feature an icon that looks like a person's silhouette. let it behave identically to the radial menu but allow tenancy/occupancy choices based on room type as a quick menu. we'll call this the room selection overlay tenancy gui

both of these gui's should be unified on the same tenancy handling system and the tenancy system should be entirely modular within features in compliance with feature slice design.

I Also need a robust finance/resource handling system for all of the rooms. Let this sytem also be entirely modular within features in compliance with feature slice design.

I'd like to create a robust finance and resources system for my simulator to accomodate construction price, empty(no income), interior tennants monthly income(which will be set by types of tennants in the future but for now lets just have one default)
It needs to ensure rooms requirements by type or type/quantity are actually used and quantified such as 'laundry:yes(or1)' and 'internet:2' which will balance from a tower-wide pool displayed in the main toolbar.

Right now i have statics displays for money and resoures but I need  to bring these alive in an industry standard tower-simulator way, and then fid out howt o improve on it to really make it industry leading.
We don't yet have sims/people or a tenants system so lets build the foundations.

Please analyze other historical tower simulators like Sim Tower, Yoot Tower, Project Highrise, etc and determine how this is handled with performance and continuity in mind(we dont want resource/money glitches)

ensure per-room construction cost (price) values are read from roomManifest json
