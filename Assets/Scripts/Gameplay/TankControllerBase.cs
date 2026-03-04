// TankControllerBase.cs
// Base class for tank movement, aiming, and projectile firing.
// Includes offensive power-up hold/consume flow with fairness guardrails.

using System;
using UnityEngine;

public enum OffensivePowerupType
{
    None = 0,
    Ricochet = 1,
    BlockBuster = 2
}

public abstract class TankControllerBase : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] protected float moveSpeed = 5f;
    [SerializeField] protected float rotateSpeed = 100f;
    [SerializeField] protected Transform cannonTransform;

    [Header("Firing")]
    [SerializeField] protected GameObject projectilePrefab;
    [SerializeField] protected float projectileSpeed = 22f;
    [SerializeField] protected float shotsPerSecond = 2f;

    [Header("Power-Up Fairness")]
    [SerializeField, Min(0f)] private float heldPowerupExpirySeconds = 12f;

    protected Vector3 targetDirection = Vector3.forward;
    protected bool isFiring;

    private float lastFireTime = float.NegativeInfinity;
    private OffensivePowerupType heldOffensivePowerup = OffensivePowerupType.None;
    private float heldPowerupExpiresAt = float.NegativeInfinity;

    public event Action<bool> BlockBusterReadyChanged;

    public bool IsHoldingOffensivePowerup =>
        heldOffensivePowerup != OffensivePowerupType.None && !HasHeldPowerupExpired();

    public bool IsBlockBusterReady =>
        heldOffensivePowerup == OffensivePowerupType.BlockBuster && !HasHeldPowerupExpired();

    public OffensivePowerupType HeldOffensivePowerup =>
        HasHeldPowerupExpired() ? OffensivePowerupType.None : heldOffensivePowerup;

    protected virtual void Update()
    {
        RefreshHeldPowerupExpiry();
        Move();
        Aim();

        if (isFiring)
        {
            Fire();
        }
    }

    protected virtual void Move()
    {
        // Derived classes implement movement logic.
    }

    protected virtual void Aim()
    {
        // Derived classes can override aiming logic.
        if (cannonTransform == null)
        {
            return;
        }

        Vector3 direction = targetDirection.sqrMagnitude <= 0.0001f ? transform.forward : targetDirection;
        cannonTransform.LookAt(cannonTransform.position + direction.normalized);
    }

    protected virtual void Fire()
    {
        if (projectilePrefab == null)
        {
            return;
        }

        float cooldownSeconds = 1f / Mathf.Max(0.01f, shotsPerSecond);
        if (Time.time < lastFireTime + cooldownSeconds)
        {
            return;
        }

        lastFireTime = Time.time;
        SpawnProjectile();
    }

    protected virtual GameObject SpawnProjectile()
    {
        Vector3 firePosition = GetFirePosition();
        Vector3 fireDirection = GetFireDirection();
        if (fireDirection.sqrMagnitude <= 0.0001f)
        {
            fireDirection = transform.forward;
        }

        GameObject projectile = Instantiate(
            projectilePrefab,
            firePosition,
            Quaternion.LookRotation(fireDirection.normalized, Vector3.up));

        var rb = projectile.GetComponent<Rigidbody>();
        if (rb != null)
        {
            rb.velocity = fireDirection.normalized * projectileSpeed;
        }

        ApplyAndConsumeOffensivePowerup(projectile);
        return projectile;
    }

    public void SetTargetDirection(Vector3 direction)
    {
        if (direction.sqrMagnitude <= 0.0001f)
        {
            return;
        }

        targetDirection = direction.normalized;
    }

    public void SetFiring(bool firing)
    {
        isFiring = firing;
    }

    public bool TryGrantBlockBusterShot()
    {
        return TryGrantOffensivePowerup(OffensivePowerupType.BlockBuster);
    }

    public bool TryGrantOffensivePowerup(OffensivePowerupType powerupType)
    {
        if (powerupType == OffensivePowerupType.None)
        {
            return false;
        }

        RefreshHeldPowerupExpiry();

        // Fairness guardrail: one held offensive power-up max.
        if (heldOffensivePowerup != OffensivePowerupType.None)
        {
            return false;
        }

        heldOffensivePowerup = powerupType;
        heldPowerupExpiresAt = Time.time + heldPowerupExpirySeconds;

        if (powerupType == OffensivePowerupType.BlockBuster)
        {
            BlockBusterReadyChanged?.Invoke(true);
        }

        return true;
    }

    private void RefreshHeldPowerupExpiry()
    {
        if (!HasHeldPowerupExpired())
        {
            return;
        }

        bool wasBlockBusterReady = heldOffensivePowerup == OffensivePowerupType.BlockBuster;
        heldOffensivePowerup = OffensivePowerupType.None;
        heldPowerupExpiresAt = float.NegativeInfinity;

        if (wasBlockBusterReady)
        {
            BlockBusterReadyChanged?.Invoke(false);
        }
    }

    private bool HasHeldPowerupExpired()
    {
        return heldOffensivePowerup != OffensivePowerupType.None &&
               heldPowerupExpiresAt > 0f &&
               Time.time >= heldPowerupExpiresAt;
    }

    private void ApplyAndConsumeOffensivePowerup(GameObject projectile)
    {
        RefreshHeldPowerupExpiry();

        if (heldOffensivePowerup == OffensivePowerupType.None)
        {
            return;
        }

        if (heldOffensivePowerup == OffensivePowerupType.BlockBuster)
        {
            var tankProjectile = projectile.GetComponent<TankProjectile>();
            if (tankProjectile != null)
            {
                tankProjectile.EnableBlockBusterBreach();
            }
            else
            {
                Debug.LogWarning("Block-Buster fired, but projectile has no TankProjectile component.");
            }

            BlockBusterReadyChanged?.Invoke(false);
        }

        heldOffensivePowerup = OffensivePowerupType.None;
        heldPowerupExpiresAt = float.NegativeInfinity;
    }

    public abstract Vector3 GetFirePosition();
    public abstract Vector3 GetFireDirection();
}
