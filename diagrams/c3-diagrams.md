# C3 Diagram: Components

```mermaid
C4Component
  title Component diagram for Frontend Web Application

  Container_Boundary(FrontendApp, "Frontend Web Application") {
    Component(GameManager, "Game Manager", "JavaScript", "Orchestrates game states and flow.")
    Component(StateManager, "State Handlers", "JavaScript", "Manages specific game states (Boot, Gameplay, etc.).")
    Component(EntityManager, "Entity Manager", "JavaScript", "Manages game entities (Player, Enemies, Bullets).")
    Component(Entities, "Entity Classes", "JavaScript", "Define behavior of game objects (Player.js, Enemy.js).")
    Component(Renderer, "Rendering Engine", "three.js", "Draws game scene via WebGL.")
    Component(InputHandler, "Input Handler", "JavaScript", "Captures player input.")
    Component(AssetLoader, "Asset Loader", "JavaScript", "Loads images, models, sounds.")
    Component(UIManager, "UI Manager", "JavaScript/HTML/CSS", "Displays UI elements (score, menus).")
    Component(Utils, "Utilities", "JavaScript", "Helper functions.")

    Rel(GameManager, StateManager, "Manages")
    Rel(StateManager, EntityManager, "Uses")
    Rel(StateManager, UIManager, "Updates")
    Rel(EntityManager, Entities, "Manages Instances Of")
    Rel(EntityManager, InputHandler, "Receives Input For")
    Rel(Entities, Renderer, "Provides Data To")
    Rel(Renderer, AssetLoader, "Uses Loaded")
    Rel(InputHandler, GameManager, "Sends Input To")
    Rel(UIManager, Renderer, "Uses For Display")
    Rel(GameManager, UIManager, "Controls")

    BiRel(Renderer, Entities, "Renders/Updates")

    UpdateRelStyle(GameManager, StateManager, $textColor="black", $lineColor="black")
    UpdateRelStyle(StateManager, EntityManager, $textColor="black", $lineColor="black")
    UpdateRelStyle(EntityManager, Entities, $textColor="black", $lineColor="black")
    UpdateRelStyle(Entities, Renderer, $textColor="black", $lineColor="black")
    UpdateRelStyle(Renderer, AssetLoader, $textColor="black", $lineColor="black")
    UpdateRelStyle(InputHandler, GameManager, $textColor="black", $lineColor="black")

    %% Relationships involving multiple components often use Utils
    Rel(GameManager, Utils, "Uses")
    Rel(StateManager, Utils, "Uses")
    Rel(EntityManager, Utils, "Uses")
    Rel(Entities, Utils, "Uses")
    Rel(Renderer, Utils, "Uses")
  }

```

<!--
This C3 diagram zooms into the 'Frontend Web Application' container from the C2 diagram.

- **Components**: Major structural blocks (modules, classes, etc.) within the container.
- **Relationships**: Interactions between components.

Updated to ensure all key components are understood.
-->
