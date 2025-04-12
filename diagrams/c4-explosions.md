# C4 Diagram: Explosion Lifecycle (Pooling)

This diagram shows the sequence of events for creating, updating, and reusing an explosion from the object pool.

```mermaid
sequenceDiagram
    participant GP as Gameplay
    participant EP as Explosion Pool <br> (Array in Gameplay)
    participant EX as Explosion Instance
    participant ER as ExplosionRenderer

    Note over GP: Game Initialization
    GP->>GP: initExplosionSystem()
    loop Create Pool
        GP->>EX: new Explosion(scene)
        EX->>GP: Returns Explosion Instance
        GP->>EP: explosionPool.push(instance)
    end
    GP->>ER: static preloadModel()

    Note over GP: Bullet-Asteroid Collision
    GP->>GP: handleBulletAsteroidCollision(data)
    GP->>GP: getExplosion(point, size)
    GP->>EP: Find inactive Explosion in pool
    alt Found Inactive
        EP-->>GP: Return inactive Explosion (EX)
    else Pool Full / All Active
        GP->>EP: Reuse oldest Explosion (EX)
    end
    GP->>EX: explode(x, y, z, size)
    EX->>ER: resetExplosion(size)
    ER->>ER: Reset lifetime, size, visibility
    ER->>ER: Reset material (opacity, emissive)
    ER->>ER: Reset animation (stop, reset, play)
    ER->>ER: Reset light
    ER-->>EX: 
    EX->>EX: isActive = true
    EX-->>GP: Return EX
    GP->>GP: Add EX to active `explosions` list

    Note over GP: Game Update Loop (Each Frame)
    GP->>GP: updateExplosions(deltaTime)
    loop For each Explosion in active `explosions` list
        GP->>EX: update(deltaTime)
        EX->>ER: update(deltaTime)
        ER->>ER: lifetime -= deltaTime
        ER->>ER: animationMixer.update(deltaTime)
        ER->>ER: Update material (fade)
        ER->>ER: Update light (fade)
        ER-->>EX: return isActive = (lifetime > 0)
        alt Explosion Finished (isActive is false)
            EX->>EX: isActive = false
            EX->>ER: model.visible = false
            EX->>ER: light.visible = false
            EX-->>GP: return false
            GP->>GP: Remove EX from active `explosions` list <br>(Returns to pool implicitly)
        else Explosion Still Active
            EX-->>GP: return true
        end
    end

    Note over GP: Gameplay Cleanup
    GP->>GP: destroy()
    loop For each Explosion in explosionPool
        GP->>EX: destroy()
        EX->>ER: dispose()
        ER->>ER: Remove model & light from scene
        ER->>ER: Dispose geometry & material
        ER->>ER: Stop animations
        ER-->>EX: 
        EX->>EX: Nullify references
    end
    GP->>GP: Clear explosionPool list
