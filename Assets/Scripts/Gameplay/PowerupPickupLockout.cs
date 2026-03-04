// PowerupPickupLockout.cs
// Global anti-chain lockout tracker keyed by pickup owner GameObject.

using System.Collections.Generic;
using UnityEngine;

public static class PowerupPickupLockout
{
    private static readonly Dictionary<int, float> NextPickupAllowedAtByActorId = new Dictionary<int, float>();

    public static bool IsLocked(GameObject pickupActor, float nowSeconds, out float remainingSeconds)
    {
        remainingSeconds = 0f;

        if (pickupActor == null)
        {
            return false;
        }

        int actorId = pickupActor.GetInstanceID();
        if (!NextPickupAllowedAtByActorId.TryGetValue(actorId, out float unlockAt))
        {
            return false;
        }

        if (nowSeconds >= unlockAt)
        {
            NextPickupAllowedAtByActorId.Remove(actorId);
            return false;
        }

        remainingSeconds = unlockAt - nowSeconds;
        return true;
    }

    public static void RegisterSuccessfulPickup(GameObject pickupActor, float lockoutSeconds, float nowSeconds)
    {
        if (pickupActor == null || lockoutSeconds <= 0f)
        {
            return;
        }

        int actorId = pickupActor.GetInstanceID();
        NextPickupAllowedAtByActorId[actorId] = nowSeconds + lockoutSeconds;
    }

    public static void ClearLockout(GameObject pickupActor)
    {
        if (pickupActor == null)
        {
            return;
        }

        NextPickupAllowedAtByActorId.Remove(pickupActor.GetInstanceID());
    }

    public static void ClearAllForTests()
    {
        NextPickupAllowedAtByActorId.Clear();
    }
}
