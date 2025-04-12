# C2 Diagram: Containers

```mermaid
C4Container
  title Container diagram for PewPew Game System

  Person(Player, "Player", "Plays the game.")
  System_Boundary(GameSystem, "PewPew Game") {
    Container(FrontendApp, "Frontend Web Application", "JavaScript, three.js", "Handles game logic, rendering, and user input.")
    Container(WebServer, "Web Server", "e.g., Node.js/Express, Python/Flask, Static Server", "Serves static files (HTML, JS, CSS, assets).")
    ContainerDb(AssetStorage, "Asset Storage", "File System", "Stores game assets (images, models, sounds).")
  }

  Rel(Player, FrontendApp, "Uses", "HTTPS")
  Rel(FrontendApp, WebServer, "Requests Assets", "HTTPS")
  Rel_R(WebServer, AssetStorage, "Reads/Serves")

  UpdateRelStyle(Player, FrontendApp, $textColor="black", $lineColor="black", $offsetX="-40")
  UpdateRelStyle(FrontendApp, WebServer, $textColor="black", $lineColor="black", $offsetY="40")
  UpdateRelStyle(WebServer, AssetStorage, $textColor="black", $lineColor="black")
```

<!--
This C2 diagram zooms into the 'PewPew Game' system from the C1 diagram.

- **Containers**: High-level technical building blocks (applications, data stores, etc.).
- **Relationships**: Interactions and data flow between containers.

Updated when there are flow changes to large systems.
-->
