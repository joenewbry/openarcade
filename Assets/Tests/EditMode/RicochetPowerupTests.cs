using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

public class RicochetPowerupTests
{
    private class TestTankController : TankControllerBase
    {
        public readonly List<GameObject> SpawnedProjectiles = new List<GameObject>();
        public GameObject LastSpawnedProjectile { get; private set; }

        public void AssignProjectilePrefab(GameObject prefab)
        {
            projectilePrefab = prefab;
        }

        public void SpawnProjectileForTests()
        {
            LastSpawnedProjectile = base.SpawnProjectile();
            SpawnedProjectiles.Add(LastSpawnedProjectile);
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

    [Test]
    public void TryGrantRicochetShots_RejectsSecondHeldOffensivePowerup()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        Assert.IsTrue(tank.TryGrantRicochetShots(), "First Ricochet pickup should be granted.");
        Assert.IsFalse(tank.TryGrantBlockBusterShot(), "Second held offensive pickup should be rejected for fairness.");
        Assert.IsFalse(tank.TryGrantRicochetShots(), "Cannot stack another Ricochet while one is active.");

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void RicochetGrant_ArmsNextThreeShots_ThenExpires()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        var projectilePrefab = new GameObject("projectile-prefab");
        projectilePrefab.AddComponent<SphereCollider>();
        projectilePrefab.AddComponent<Rigidbody>();
        projectilePrefab.AddComponent<TankProjectile>();

        tank.AssignProjectilePrefab(projectilePrefab);
        Assert.IsTrue(tank.TryGrantRicochetShots());

        for (int i = 0; i < 3; i++)
        {
            tank.SpawnProjectileForTests();
            var firedProjectile = tank.LastSpawnedProjectile.GetComponent<TankProjectile>();

            Assert.IsNotNull(firedProjectile);
            Assert.IsTrue(firedProjectile.IsRicochetArmed, $"Shot {i + 1} should be armed for ricochet.");
            Assert.AreEqual(1, firedProjectile.RicochetBouncesRemaining, "Each ricochet shot should have one bounce.");
            Assert.AreEqual(2 - i, tank.RicochetShotsRemaining, "Ricochet charges should decrement after each shot.");
        }

        Assert.AreEqual(OffensivePowerupType.None, tank.HeldOffensivePowerup,
            "Held offensive state should clear after the third ricochet shot is fired.");

        foreach (var spawnedProjectile in tank.SpawnedProjectiles)
        {
            Object.DestroyImmediate(spawnedProjectile);
        }

        Object.DestroyImmediate(tankGo);
        Object.DestroyImmediate(projectilePrefab);
    }

    [Test]
    public void RicochetProjectile_BouncesOnce_ThenExpiresOnNextWallHit()
    {
        var projectileGo = new GameObject("projectile");
        projectileGo.AddComponent<SphereCollider>();
        var rb = projectileGo.AddComponent<Rigidbody>();
        var projectile = projectileGo.AddComponent<TankProjectile>();

        rb.velocity = Vector3.forward * 12f;
        projectile.EnableRicochetBounce(1);

        var wallGo = new GameObject("wall");
        var wallCollider = wallGo.AddComponent<BoxCollider>();

        projectile.SimulateCollisionForTests(wallCollider, Vector3.back);

        Assert.IsFalse(projectile.HasResolvedHit, "Projectile should stay alive for a ricochet bounce.");
        Assert.AreEqual(0, projectile.RicochetBouncesRemaining, "Bounce budget should be consumed after one ricochet.");
        Assert.Less(rb.velocity.z, 0f, "Velocity should be reflected after ricochet.");

        projectile.SimulateCollisionForTests(wallCollider, Vector3.forward);
        Assert.IsTrue(projectile.HasResolvedHit, "Projectile should expire once ricochet budget is exhausted.");

        Object.DestroyImmediate(projectileGo);
        Object.DestroyImmediate(wallGo);
    }
}
