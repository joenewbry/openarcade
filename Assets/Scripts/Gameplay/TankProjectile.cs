// TankProjectile.cs
// Generic projectile behavior with optional Block-Buster breach mode.

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class TankProjectile : MonoBehaviour
{
    [SerializeField] private int baseDamage = 20;
    [SerializeField] private float maxLifetimeSeconds = 5f;
    [SerializeField] private bool destroyOnAnyCollision = true;
    [SerializeField] private string destructibleBlockTag = "Block";

    private bool blockBusterArmed;
    private bool hasResolvedHit;

    public bool IsBlockBusterArmed => blockBusterArmed;
    public bool HasResolvedHit => hasResolvedHit;

    private void Start()
    {
        if (maxLifetimeSeconds > 0f)
        {
            Destroy(gameObject, maxLifetimeSeconds);
        }
    }

    public void EnableBlockBusterBreach()
    {
        blockBusterArmed = true;
    }

    private void OnCollisionEnter(Collision collision)
    {
        ResolveImpact(collision.collider);
    }

    private void OnTriggerEnter(Collider other)
    {
        ResolveImpact(other);
    }

    // Exposed for deterministic edit-mode tests without physics simulation.
    public void SimulateImpactForTests(Collider hitCollider)
    {
        ResolveImpact(hitCollider);
    }

    private void ResolveImpact(Collider hitCollider)
    {
        if (hasResolvedHit || hitCollider == null)
        {
            return;
        }

        bool hitProcessed = false;

        if (blockBusterArmed)
        {
            hitProcessed = TryResolveBlockBusterImpact(hitCollider);
        }

        if (!hitProcessed)
        {
            ApplyStandardDamage(hitCollider);
            hitProcessed = true;
        }

        if (hitProcessed && destroyOnAnyCollision)
        {
            hasResolvedHit = true;
            Destroy(gameObject);
        }
    }

    private bool TryResolveBlockBusterImpact(Collider hitCollider)
    {
        blockBusterArmed = false;

        var destructible = hitCollider.GetComponentInParent<DestructibleObject>();
        if (destructible != null)
        {
            // Breach shot guarantees destruction of destructible cover.
            destructible.TakeDamage(int.MaxValue);
            return true;
        }

        if (!string.IsNullOrEmpty(destructibleBlockTag) && hitCollider.CompareTag(destructibleBlockTag))
        {
            Destroy(hitCollider.transform.root.gameObject);
            return true;
        }

        return false;
    }

    private void ApplyStandardDamage(Collider hitCollider)
    {
        var destructible = hitCollider.GetComponentInParent<DestructibleObject>();
        if (destructible != null)
        {
            destructible.TakeDamage(baseDamage);
        }
    }
}
