// RicochetPickup.cs
// Pickup that grants one held Ricochet offensive charge.

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class RicochetPickup : MonoBehaviour
{
    [SerializeField] private string eligibleTag = "Player";
    [SerializeField] private bool consumeIfPowerupRejected = false;
    [SerializeField, Min(0f)] private float pickupLockoutSeconds = 5f;

    private void Reset()
    {
        var col = GetComponent<Collider>();
        if (col != null)
        {
            col.isTrigger = true;
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (!string.IsNullOrEmpty(eligibleTag) && !other.CompareTag(eligibleTag))
        {
            return;
        }

        TankControllerBase tank = other.GetComponentInParent<TankControllerBase>();
        if (tank == null)
        {
            return;
        }

        GameObject pickupOwner = ResolvePickupOwner(other, tank);
        float nowSeconds = Time.time;

        if (PowerupPickupLockout.IsLocked(pickupOwner, nowSeconds, out _))
        {
            return;
        }

        bool granted = tank.TryGrantOffensivePowerup(OffensivePowerupType.Ricochet);
        if (!granted && !consumeIfPowerupRejected)
        {
            return;
        }

        PowerupPickupLockout.RegisterSuccessfulPickup(pickupOwner, pickupLockoutSeconds, nowSeconds);
        Destroy(gameObject);
    }

    private static GameObject ResolvePickupOwner(Collider other, TankControllerBase tank)
    {
        if (other != null && other.attachedRigidbody != null)
        {
            return other.attachedRigidbody.gameObject;
        }

        if (tank != null)
        {
            return tank.gameObject;
        }

        return other != null ? other.gameObject : null;
    }
}
