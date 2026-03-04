// BlockBusterPickup.cs
// Pickup that grants exactly one queued breach shot.

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class BlockBusterPickup : MonoBehaviour
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

        bool granted = tank.TryGrantBlockBusterShot();
        if (!granted && !consumeIfPowerupRejected)
        {
            return;
        }

        Destroy(gameObject);
    }
}
