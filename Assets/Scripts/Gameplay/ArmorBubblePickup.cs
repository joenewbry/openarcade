// ArmorBubblePickup.cs
// Pickup that grants Armor Bubble and reserves the single held power-up slot.

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class ArmorBubblePickup : MonoBehaviour
{
    [SerializeField] private string eligibleTag = "Player";
    [SerializeField] private bool autoAttachShieldIfMissing = true;
    [SerializeField] private bool consumeIfAlreadyShielded = false;
    [SerializeField] private bool consumeIfPowerupRejected = false;

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

        TankControllerBase tank = other.GetComponentInParent<TankControllerBase>();
        if (tank == null)
        {
            return;
        }

        var shield = other.GetComponentInParent<ArmorBubbleShield>();

        if (shield == null && autoAttachShieldIfMissing)
        {
            var host = other.attachedRigidbody != null ? other.attachedRigidbody.gameObject : other.gameObject;
            shield = host.AddComponent<ArmorBubbleShield>();
        }

        if (shield == null)
        {
            return;
        }

        if (shield.IsShieldActive)
        {
            if (consumeIfAlreadyShielded)
            {
                Destroy(gameObject);
            }

            return;
        }

        bool granted = tank.TryGrantArmorPowerup();
        if (!granted)
        {
            if (consumeIfPowerupRejected)
            {
                Destroy(gameObject);
            }

            return;
        }

        bool activated = shield.ActivateShield();
        if (!activated)
        {
            tank.ClearHeldPowerupIfMatches(OffensivePowerupType.Armor);

            if (consumeIfAlreadyShielded)
            {
                Destroy(gameObject);
            }

            return;
        }

        Destroy(gameObject);
    }
}
