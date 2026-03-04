using NUnit.Framework;
using UnityEngine;

public class PowerupSpawnerRulesTests
{
    private class TestTankController : TankControllerBase
    {
        public override Vector3 GetFirePosition()
        {
            return transform.position;
        }

        public override Vector3 GetFireDirection()
        {
            return transform.forward;
        }
    }

    [SetUp]
    public void SetUp()
    {
        PowerupPickupLockout.ClearAllForTests();
    }

    [TearDown]
    public void TearDown()
    {
        PowerupPickupLockout.ClearAllForTests();
    }

    [Test]
    public void Lockout_BlocksPickupUntilDurationExpires()
    {
        var tankGo = new GameObject("tank");

        PowerupPickupLockout.RegisterSuccessfulPickup(tankGo, lockoutSeconds: 5f, nowSeconds: 10f);

        Assert.IsTrue(PowerupPickupLockout.IsLocked(tankGo, nowSeconds: 12f, out float remaining));
        Assert.Greater(remaining, 0f);
        Assert.IsFalse(PowerupPickupLockout.IsLocked(tankGo, nowSeconds: 16f, out _));

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void OffensiveSpawnEligibility_FalseWhenTankAlreadyHoldingOffensivePowerup()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        Assert.IsTrue(tank.TryGrantBlockBusterShot());
        Assert.IsFalse(PowerupSpawnEligibility.CanTankReceivePowerup(tank, PowerupType.Ricochet, nowSeconds: 0f));

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void ArmorSpawnEligibility_FalseWhenArmorAlreadyActive()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();
        var shield = tankGo.AddComponent<ArmorBubbleShield>();

        Assert.IsTrue(shield.ActivateShield());
        Assert.IsFalse(PowerupSpawnEligibility.CanTankReceivePowerup(tank, PowerupType.Armor, nowSeconds: 0f));

        Object.DestroyImmediate(tankGo);
    }

    [Test]
    public void SpawnEligibility_FalseWhenGlobalPickupLockoutIsActive()
    {
        var tankGo = new GameObject("tank");
        var tank = tankGo.AddComponent<TestTankController>();

        PowerupPickupLockout.RegisterSuccessfulPickup(tankGo, lockoutSeconds: 5f, nowSeconds: 20f);

        Assert.IsFalse(PowerupSpawnEligibility.CanTankReceivePowerup(tank, PowerupType.BlockBuster, nowSeconds: 22f));
        Assert.IsTrue(PowerupSpawnEligibility.CanTankReceivePowerup(tank, PowerupType.BlockBuster, nowSeconds: 26f));

        Object.DestroyImmediate(tankGo);
    }
}
