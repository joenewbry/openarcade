// ArmorBubblePickup.cs
// Pickup that grants Armor Bubble (one-hit shield).

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class ArmorBubblePickup : MonoBehaviour
{
    [SerializeField] private string eligibleTag = "Player";
    [SerializeField] private bool autoAttachShieldIfMissing = true;
    [SerializeField] private bool consumeIfAlreadyShielded = false;
    [SerializeField, Min(0f)] private float pickupLockoutSeconds = 5f;

    private void Reset()
    {
        var collider = GetComponent<Collider>();
        if (collider != null)
        {
            collider.isTrigger = true;
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (!string.IsNullOrEmpty(eligibleTag) && !other.CompareTag(eligibleTag))
        {
            return;
        }

        GameObject pickupOwner = ResolvePickupOwner(other);
        float nowSeconds = Time.time;

        if (PowerupPickupLockout.IsLocked(pickupOwner, nowSeconds, out _))
        {
            return;
        }

        var shield = other.GetComponentInParent<ArmorBubbleShield>();

        if (shield == null && autoAttachShieldIfMissing && pickupOwner != null)
        {
            shield = pickupOwner.GetComponent<ArmorBubbleShield>();
            if (shield == null)
            {
                shield = pickupOwner.AddComponent<ArmorBubbleShield>();
            }
        }

        if (shield == null)
        {
            return;
        }

        bool activated = shield.ActivateShield();
        if (!activated && !consumeIfAlreadyShielded)
        {
            return;
        }

        PowerupPickupLockout.RegisterSuccessfulPickup(pickupOwner, pickupLockoutSeconds, nowSeconds);
        Destroy(gameObject);
    }

    private static GameObject ResolvePickupOwner(Collider other)
    {
        if (other == null)
        {
            return null;
        }

        if (other.attachedRigidbody != null)
        {
            return other.attachedRigidbody.gameObject;
        }

        var tank = other.GetComponentInParent<TankControllerBase>();
        if (tank != null)
        {
            return tank.gameObject;
        }

        return other.gameObject;
    }
}
