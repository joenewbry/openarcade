// TankControllerBase.cs
// Base class for tank movement, aiming, and projectile firing.
// Includes single-slot held power-up inventory with fairness guardrails.

using System;
using UnityEngine;

public enum OffensivePowerupType
{
    None = 0,
    Ricochet = 1,
    BlockBuster = 2,
    Armor = 3
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

    [Header("Ricochet")]
    [SerializeField, Min(1)] private int ricochetShotsPerPickup = 3;
    [SerializeField, Min(1)] private int ricochetBouncesPerShot = 1;

    protected Vector3 targetDirection = Vector3.forward;
    protected bool isFiring;

    private float lastFireTime = float.NegativeInfinity;
    private OffensivePowerupType heldOffensivePowerup = OffensivePowerupType.None;
    private float heldPowerupExpiresAt = float.NegativeInfinity;
    private int ricochetShotsRemaining;

    public event Action<bool> BlockBusterReadyChanged;
    public event Action<OffensivePowerupType> HeldPowerupChanged;

    public bool IsHoldingOffensivePowerup =>
        heldOffensivePowerup != OffensivePowerupType.None && !HasHeldPowerupExpired();

    public bool IsBlockBusterReady =>
        heldOffensivePowerup == OffensivePowerupType.BlockBuster && !HasHeldPowerupExpired();

    public bool IsRicochetReady =>
        heldOffensivePowerup == OffensivePowerupType.Ricochet &&
        ricochetShotsRemaining > 0 &&
        !HasHeldPowerupExpired();

    public bool IsArmorReady =>
        heldOffensivePowerup == OffensivePowerupType.Armor &&
        !HasHeldPowerupExpired();

    public int RicochetShotsRemaining => IsRicochetReady ? ricochetShotsRemaining : 0;

    public OffensivePowerupType HeldOffensivePowerup =>
        HasHeldPowerupExpired() ? OffensivePowerupType.None : heldOffensivePowerup;

    // Alias for unified single-slot HUD/state consumers.
    public OffensivePowerupType HeldPowerup => HeldOffensivePowerup;

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

    public bool TryGrantRicochetShot()
    {
        return TryGrantOffensivePowerup(OffensivePowerupType.Ricochet);
    }

    public bool TryGrantRicochetShots()
    {
        return TryGrantRicochetShot();
    }

    public bool TryGrantBlockBusterShot()
    {
        return TryGrantOffensivePowerup(OffensivePowerupType.BlockBuster);
    }

    public bool TryGrantArmorPowerup()
    {
        return TryGrantOffensivePowerup(OffensivePowerupType.Armor);
    }

    public bool ClearHeldPowerupIfMatches(OffensivePowerupType powerupType)
    {
        RefreshHeldPowerupExpiry();

        if (heldOffensivePowerup != powerupType)
        {
            return false;
        }

        ClearHeldPowerupInternal(deactivateArmorShield: true);
        return true;
    }

    public void NotifyArmorShieldConsumed()
    {
        RefreshHeldPowerupExpiry();

        if (heldOffensivePowerup == OffensivePowerupType.Armor)
        {
            ClearHeldPowerupInternal(deactivateArmorShield: false);
        }
    }

    public bool TryGrantOffensivePowerup(OffensivePowerupType powerupType)
    {
        if (powerupType == OffensivePowerupType.None)
        {
            return false;
        }

        RefreshHeldPowerupExpiry();

        // Fairness guardrail: one held power-up max.
        if (heldOffensivePowerup != OffensivePowerupType.None)
        {
            return false;
        }

        heldOffensivePowerup = powerupType;
        heldPowerupExpiresAt = Time.time + heldPowerupExpirySeconds;
        ricochetShotsRemaining = powerupType == OffensivePowerupType.Ricochet
            ? Mathf.Max(1, ricochetShotsPerPickup)
            : 0;

        if (powerupType == OffensivePowerupType.BlockBuster)
        {
            BlockBusterReadyChanged?.Invoke(true);
        }

        HeldPowerupChanged?.Invoke(powerupType);
        return true;
    }

    private void RefreshHeldPowerupExpiry()
    {
        if (!HasHeldPowerupExpired())
        {
            return;
        }

        ClearHeldPowerupInternal(deactivateArmorShield: true);
    }

    private bool HasHeldPowerupExpired()
    {
        return heldOffensivePowerup != OffensivePowerupType.None &&
               heldPowerupExpiresAt > 0f &&
               Time.time >= heldPowerupExpiresAt;
    }

    private void ClearHeldPowerupInternal(bool deactivateArmorShield)
    {
        if (heldOffensivePowerup == OffensivePowerupType.None)
        {
            return;
        }

        bool wasBlockBusterReady = heldOffensivePowerup == OffensivePowerupType.BlockBuster;
        bool wasArmor = heldOffensivePowerup == OffensivePowerupType.Armor;

        if (deactivateArmorShield && wasArmor)
        {
            var shield = GetComponent<ArmorBubbleShield>();
            if (shield != null)
            {
                shield.DeactivateShield();
            }
        }

        heldOffensivePowerup = OffensivePowerupType.None;
        heldPowerupExpiresAt = float.NegativeInfinity;
        ricochetShotsRemaining = 0;

        if (wasBlockBusterReady)
        {
            BlockBusterReadyChanged?.Invoke(false);
        }

        HeldPowerupChanged?.Invoke(OffensivePowerupType.None);
    }

    private void ApplyAndConsumeOffensivePowerup(GameObject projectile)
    {
        RefreshHeldPowerupExpiry();

        if (heldOffensivePowerup == OffensivePowerupType.None || heldOffensivePowerup == OffensivePowerupType.Armor)
        {
            return;
        }

        var tankProjectile = projectile.GetComponent<TankProjectile>();

        if (heldOffensivePowerup == OffensivePowerupType.BlockBuster)
        {
            if (tankProjectile != null)
            {
                tankProjectile.EnableBlockBusterBreach();
            }
            else
            {
                Debug.LogWarning("Block-Buster fired, but projectile has no TankProjectile component.");
            }

            ClearHeldPowerupInternal(deactivateArmorShield: false);
            return;
        }

        if (heldOffensivePowerup == OffensivePowerupType.Ricochet)
        {
            if (tankProjectile != null)
            {
                tankProjectile.EnableRicochetBounce(ricochetBouncesPerShot);
            }
            else
            {
                Debug.LogWarning("Ricochet shot fired, but projectile has no TankProjectile component.");
            }

            ricochetShotsRemaining = Mathf.Max(0, ricochetShotsRemaining - 1);
            if (ricochetShotsRemaining <= 0)
            {
                ClearHeldPowerupInternal(deactivateArmorShield: false);
            }
        }
    }

    public abstract Vector3 GetFirePosition();
    public abstract Vector3 GetFireDirection();
}
