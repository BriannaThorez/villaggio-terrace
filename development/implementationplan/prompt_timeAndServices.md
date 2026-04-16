Determine the axiomatic, axiological, and teleological intent of each of the following requests to create industry leading solutions for each request.
Then, in Development>ImplementationPlan, create an industry leading implementationplan and tasks markdown using [x] and [ ] to ensure that each request and solution are brought to a full, error free fruition exactly as intended. 
Ensure .md file names (plan and tasks) have appropriate file name appends, _descriptive, to ensure other plans are not overwritten. 
When editing preexisting code, Ensure only careful targeted changes, avoid rewrites of preexisting code unless explicitly requested.
Ensure each phase has Run linting and verification/QA checks.

First,
Create an industry standard day-night cycle and work week+weekend system based on the likeness of the notable tower simulated 'project highrise' and with inspiration from yoot tower/sim tower.
utilizing the preexisting solar time light movement logic, ensure the clock moves/follows along.

Add simulation speed controls, a [M,T,W,T,F,S,S] workweek indicator and a small digital clock(game time) to the right side of the maintoolbar. use a vertical divider to separate it from the rest. 

At normal speed I would like 10 in-game minutes for every 1 real-world second, a full 24-hour day would last exactly 2 minutes and 24 seconds.
Please ensure all time and day/night cycle code(existing and new) is modularized and in accordance with feature slice design. Utilize good code practices as applicable.


Appended additions
Next,
Smartly append/integrate the following to our plan and tasks as a follow on addition

Add faster and super as additional speeds to the toolbar.
Set the game time default start to 6am.
As part of our smart tooltip system ensure each game speed button has a tooltip with title(pause, normal, fast, faster, super etc.)
Ensure subsequent speeds after 'normal' (1x) are multiples faster.
Let fast be 2x, faster be 5x, super 10x. Let this be reflected in the tooltip description as well as the in-game hour and day to real-world time minute and second measurements for users to understand time conversions easily.

Verify that simulation speed (normal or otherwise) is in no way tied to frame rate.

AlsoRemove the 'export data' button from the main toolbar and remove its functionality if any remains in the code this is a feature from nonexistant software..

Pause implementation here before continuing to allow me to review changes thus far.

Then, carefully using targeted modifications and ensuring complete data preservation, restructure all service room definitions in roomMetadata.json to 
a)provide a corresponding service (using the variable names from the masterTraitSchema table in roomManifest.json
b)in accordance with the following structure template but using the data from each service, this is only a structural example:
```json
    {
      "id": "services-plumber-basic",
      "class": "Services",
      "name": "Plumber",
      "price": 0,
      "dimensions": {
        "width": 5,
        "height": 1
      },
      "metadata": {
        "type": "Standard",
        "variant": "Basic",
        "serviceDomain": "Apartment",
        "average_rent": 0,
        "upkeep_cost": 1500,
        "services_provided": {
          "plumber_services": {
            "quantity": 15,
            "radius_cellswidth_floorheight": [3,20]
          }
        }
      },
      "specificDescription": "A high-efficiency standard plumber module."
    }
```
currently i have the plumber service id set up as the template.

Use tools where you can such as structural changes to ensure data is correctly moved/restructured without data-loss.
importantly, ensure no data is changed or lost.


Next,
as a separate phase ensure the game logic is adjusted to take full advantage of the new roomMetadata.json structure.
Ensure if any field reads numerically zero such as average rent it is not displayed in the GUI.
Ensure upkeep is displayed in the GUI and calculated financially as a negative number.

Ensure each week is the cycle from which all finances currently tick, so any incomes or expenses happen (incomes first) at the end of the work week(friday)
Update all income/upkeep referenes in the gui to indicate /wk

Finally, 
Perform a thorough review of all changes made in this phase, ensuring no data has been lost or corrupted and that all references to old data structures have been updated appropriately. This includes verifying that all game logic correctly interacts with the new `roomMetadata.json` structure and that all financial calculations are accurate.
Predict connections, features, ideas and requests I am not addressing and output them as suggestions to add to this plan.

Finally (Appended Addition Phase 5):
Smartly append/integrate the following to our plan and tasks as a follow-on addition:
1. Ensure lobbies, empty floors, foot traffic etc do not contain tenancy logic or gui tenancy/occupant status.
2. Ensure the smarttooltips feature is entirely modular and in accordance with feature slice design. Ensure its incompliance with best practices for code writing.
3. Update build menu individual room tooltips to include price to build and estimated income.
4. Update the build menu individual room buttons to show the build price after the room name before the number of stars.
5. Ensure these are all referenced from the source of truth roomMetadata.json fields.
6. Ensure build menu services individually list services they provide in their respective tooltips.
7. Predict additional items I'm not asking for the purpose of better elevating the game GUI and intuitiveness - propose them prior to addition for my review.

