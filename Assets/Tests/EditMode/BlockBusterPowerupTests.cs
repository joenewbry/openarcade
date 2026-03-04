using NUnit.Framework;
using UnityEngine;

public class BlockBusterPowerupTests
{
    private class TestTankController : TankControllerBase
    {
        public GameObject LastSpawnedProjectile { get; private set; }

        public void AssignProjectilePrefab(GameObject prefab)
        {
            projectilePrefab = prefab;
        }

        public void FireOnceForTests()
        {
            Fire();
        }

        protected override GameObject SpawnProjectile()
        {
            LastSpawnedProjectile = base.SpawnProjectile();
            return LastSpawnedProjectile;
        }

        public override Vector3 GetFirePosition()
        {
            return transform.position;
        }

        public override Vector3 GetFireDirection()
        {
            return transform.forward;
        }
    }

    private class TestDestructibleBlock : DestructibleObject
    {
        public bool WasDestroyed { get; private set; }

        protected override void Destroy()
        {
            WasDestroyed = true;
        }
    }

    [Test]
    public void TryGrantBlockBusterShot_RejectsSecondHeldPowerup()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        Assert.IsTrue(tank.TryGrantBlockBusterShot(), "First Block-Buster pickup should be granted.");
        Assert.IsFalse(tank.TryGrantBlockBusterShot(), "Second held pickup should be rejected for fairness.");

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void TryGrantArmorPowerup_RejectsWhenAnotherHeldPowerupExists()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        Assert.IsTrue(tank.TryGrantRicochetShot(), "Should grant Ricochet when slot is empty.");
        Assert.IsFalse(tank.TryGrantArmorPowerup(), "Armor should be rejected when a power-up is already held.");
        Assert.AreEqual(OffensivePowerupType.Ricochet, tank.HeldPowerup);

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void FiringWithBlockBuster_ArmsProjectile_AndConsumesHeldState()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        var projectilePrefab = new GameObject("projectile-prefab");
        projectilePrefab.AddComponent<SphereCollider>();
        projectilePrefab.AddComponent<TankProjectile>();

        tank.AssignProjectilePrefab(projectilePrefab);
        Assert.IsTrue(tank.TryGrantBlockBusterShot());

        tank.FireOnceForTests();

        var firedProjectile = tank.LastSpawnedProjectile.GetComponent<TankProjectile>();
        Assert.IsNotNull(firedProjectile);
        Assert.IsTrue(firedProjectile.IsBlockBusterArmed, "Next fired projectile should be armed as breach shot.");
        Assert.AreEqual(OffensivePowerupType.None, tank.HeldPowerup, "Held power-up should be consumed immediately after firing.");

        Object.DestroyImmediate(tankGo);
        Object.DestroyImmediate(projectilePrefab);
        Object.DestroyImmediate(tank.LastSpawnedProjectile);
    }

    [Test]
    public void FiringWithRicochet_UsesOneCharge_AndKeepsHeldStateUntilEmpty()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        var projectilePrefab = new GameObject("projectile-prefab");
        projectilePrefab.AddComponent<SphereCollider>();
        projectilePrefab.AddComponent<TankProjectile>();

        tank.AssignProjectilePrefab(projectilePrefab);
        Assert.IsTrue(tank.TryGrantRicochetShot());

        tank.FireOnceForTests();

        Assert.AreEqual(OffensivePowerupType.Ricochet, tank.HeldPowerup, "Ricochet should remain held until all charges are used.");
        Assert.AreEqual(2, tank.RicochetShotsRemaining, "One ricochet charge should be consumed per fired shot.");

        Object.DestroyImmediate(tankGo);
        Object.DestroyImmediate(projectilePrefab);
        Object.DestroyImmediate(tank.LastSpawnedProjectile);
    }

    [Test]
    public void ArmorShieldConsumed_ClearsHeldArmorState()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();
        var shield = tankGo.AddComponent<ArmorBubbleShield>();

        Assert.IsTrue(tank.TryGrantArmorPowerup());
        Assert.IsTrue(shield.ActivateShield());
        Assert.AreEqual(OffensivePowerupType.Armor, tank.HeldPowerup);

        bool absorbed = shield.TryAbsorbHit(10);

        Assert.IsTrue(absorbed, "Armor shield should absorb one hit.");
        Assert.AreEqual(OffensivePowerupType.None, tank.HeldPowerup, "Held armor state should clear after shield consumption.");

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void BlockBusterProjectile_BreachesDestructible_ThenExpires()
    {
        var projectileGo = new GameObject("projectile");
        projectileGo.AddComponent<SphereCollider>();
        var projectile = projectileGo.AddComponent<TankProjectile>();
        projectile.EnableBlockBusterBreach();

        var blockGo = new GameObject("block");
        var blockCollider = blockGo.AddComponent<BoxCollider>();
        var destructible = blockGo.AddComponent<TestDestructibleBlock>();

        projectile.SimulateImpactForTests(blockCollider);

        Assert.IsTrue(destructible.WasDestroyed, "Breach shot should destroy destructible block/object.");
        Assert.IsTrue(projectile.HasResolvedHit, "Projectile should expire after breach impact.");

        Object.DestroyImmediate(projectileGo);
        Object.DestroyImmediate(blockGo);
    }
}
