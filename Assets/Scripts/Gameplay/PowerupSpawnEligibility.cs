// PowerupSpawnEligibility.cs
// Shared anti-hoarding eligibility rules for timed PM3 power-up spawns.

using UnityEngine;

public static class PowerupSpawnEligibility
{
    public static bool CanTankReceivePowerup(TankControllerBase tank, PowerupType type, float nowSeconds)
    {
        if (tank == null)
        {
            return false;
        }

        if (PowerupPickupLockout.IsLocked(tank.gameObject, nowSeconds, out _))
        {
            return false;
        }

        switch (type)
        {
            case PowerupType.Armor:
            {
                var shield = tank.GetComponent<ArmorBubbleShield>();
                return shield == null || !shield.IsShieldActive;
            }

            case PowerupType.Ricochet:
            case PowerupType.BlockBuster:
                return !tank.IsHoldingOffensivePowerup;

            default:
                return false;
        }
    }
}
