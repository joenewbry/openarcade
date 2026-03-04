// TankProjectile.cs
// Generic projectile behavior with optional Block-Buster breach mode and Ricochet bounce mode.

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class TankProjectile : MonoBehaviour
{
    [SerializeField] private int baseDamage = 20;
    [SerializeField] private float maxLifetimeSeconds = 5f;
    [SerializeField] private bool destroyOnAnyCollision = true;
    [SerializeField] private string destructibleBlockTag = "Block";

    [Header("Ricochet")]
    [SerializeField, Min(0f)] private float postBounceSurfaceOffset = 0.02f;

    private bool blockBusterArmed;
    private int ricochetBouncesRemaining;
    private bool hasResolvedHit;

    public bool IsBlockBusterArmed => blockBusterArmed;
    public int RicochetBouncesRemaining => ricochetBouncesRemaining;
    public bool IsRicochetArmed => ricochetBouncesRemaining > 0;
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

    public void EnableRicochetBounce(int bounceCount = 1)
    {
        ricochetBouncesRemaining = Mathf.Max(0, bounceCount);
    }

    private void OnCollisionEnter(Collision collision)
    {
        Vector3 hitNormal = collision.contactCount > 0
            ? collision.GetContact(0).normal
            : -transform.forward;

        ResolveImpact(collision.collider, hitNormal);
    }

    private void OnTriggerEnter(Collider other)
    {
        ResolveImpact(other, null);
    }

    // Exposed for deterministic edit-mode tests without physics simulation.
    public void SimulateImpactForTests(Collider hitCollider)
    {
        ResolveImpact(hitCollider, null);
    }

    // Exposed for deterministic ricochet tests.
    public void SimulateCollisionForTests(Collider hitCollider, Vector3 hitNormal)
    {
        ResolveImpact(hitCollider, hitNormal);
    }

    private void ResolveImpact(Collider hitCollider, Vector3? hitNormal)
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
            hitProcessed = ApplyStandardDamage(hitCollider);
        }

        if (!hitProcessed && hitNormal.HasValue && TryRicochet(hitNormal.Value))
        {
            return;
        }

        if (destroyOnAnyCollision || hitProcessed)
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

    private bool ApplyStandardDamage(Collider hitCollider)
    {
        var destructible = hitCollider.GetComponentInParent<DestructibleObject>();
        if (destructible != null)
        {
            destructible.TakeDamage(baseDamage);
            return true;
        }

        return false;
    }

    private bool TryRicochet(Vector3 hitNormal)
    {
        if (ricochetBouncesRemaining <= 0)
        {
            return false;
        }

        Rigidbody rb = GetComponent<Rigidbody>();
        if (rb == null)
        {
            return false;
        }

        Vector3 incomingVelocity = rb.velocity;
        if (incomingVelocity.sqrMagnitude <= 0.0001f)
        {
            return false;
        }

        Vector3 normalizedNormal = hitNormal.sqrMagnitude <= 0.0001f
            ? -incomingVelocity.normalized
            : hitNormal.normalized;

        rb.velocity = Vector3.Reflect(incomingVelocity, normalizedNormal);

        if (postBounceSurfaceOffset > 0f)
        {
            transform.position += normalizedNormal * postBounceSurfaceOffset;
        }

        ricochetBouncesRemaining = Mathf.Max(0, ricochetBouncesRemaining - 1);
        return true;
    }
}
