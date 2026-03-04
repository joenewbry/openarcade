// RicochetPickup.cs
// Pickup that grants a queued Ricochet effect (next 3 shots bounce).

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class RicochetPickup : MonoBehaviour
{
    [SerializeField] private string eligibleTag = "Player";
    [SerializeField] private bool consumeIfPowerupRejected = false;

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

        bool granted = tank.TryGrantRicochetShot();
        if (!granted && !consumeIfPowerupRejected)
        {
            return;
        }

        Destroy(gameObject);
    }
}
