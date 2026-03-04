// ArmorBubblePickup.cs
// Pickup that grants Armor Bubble (one-hit shield).

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class ArmorBubblePickup : MonoBehaviour
{
    [SerializeField] private string eligibleTag = "Player";
    [SerializeField] private bool autoAttachShieldIfMissing = true;
    [SerializeField] private bool consumeIfAlreadyShielded = false;

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

        bool activated = shield.ActivateShield();
        if (!activated && !consumeIfAlreadyShielded)
        {
            return;
        }

        Destroy(gameObject);
    }
}
