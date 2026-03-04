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

        protected override void DestroyObject()
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
        Assert.IsFalse(tank.TryGrantBlockBusterShot(), "Second held offensive pickup should be rejected for fairness.");

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
        Assert.IsFalse(tank.IsBlockBusterReady, "Held Block-Buster state should be consumed immediately after firing.");

        Object.DestroyImmediate(tankGo);
        Object.DestroyImmediate(projectilePrefab);
        Object.DestroyImmediate(tank.LastSpawnedProjectile);
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
