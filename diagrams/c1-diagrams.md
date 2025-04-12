# C1 Diagram: System Context

```mermaid
C4Context
  title System Context diagram for PewPew Game

  Person(Player, "Player", "Plays the Gradius-inspired shooter game.")
  System(PewPewGame, "PewPew Game", "Web-based 2.5D shooter game application.")
  System_Ext(Browser, "Web Browser", "Runtime environment on the player's machine.")

  Rel(Player, PewPewGame, "Interacts with", "HTTPS")
  Rel(Player, Browser, "Uses")
  Rel(Browser, PewPewGame, "Executes and Renders")

  UpdateRelStyle(Player, PewPewGame, $textColor="black", $lineColor="black", $offsetX="-40")
  UpdateRelStyle(Browser, PewPewGame, $textColor="black", $lineColor="black", $offsetY="-40")
```

<!-- 
This C1 diagram shows the highest level view of the system landscape.

- **Actors**: External users or systems.
- **Systems**: The software system itself and external systems it interacts with.
- **Relationships**: Interactions between actors and systems.

Updated when major product changes occur.
-->
