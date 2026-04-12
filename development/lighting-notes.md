Cascaded Shadow Maps (CSM) combined with PCFSoftShadowMap with a directional light
threejs has a light layer system 0-31 that you can use to tell specific lights to ignore certain objects.
Put your main tower shell on Layer 0. Put all interior room objects (furniture, floors) on Layer 1.


Individual room lighting: Create an AmbientLight or a dim DirectionalLight and set it to only affect Layer 1.
To turn a room's light "ON," you move that room's furniture/interior meshes into Layer 1. To turn it "OFF," you move them to a layer the light doesn't see (e.g., Layer 2).
NOTE: By default, the camera only sees Layer 0. You must tell your camera to see all layers you use: 
camera.layers.enable(1); camera.layers.enable(2); etc.

**performance**
Selective Lighting (LOD): Only enable lights for the active floor the player is currently viewing. 
If the player is on Floor 50, all lights on Floor 1 should be completely disabled.

Light Culling (LOD)
Proximity Culling: Only add/enable the light objects for rooms immediately near the player's camera.
Visibility Check: If a room is behind the tower or off-screen, set its light's visible property to false.
This stops the GPU from calculating that light's contribution entirely. 

**ideas**
emissive windows? to make the windows glow(wont cast light)
emissive lamps and objects in rooms with a single per room 