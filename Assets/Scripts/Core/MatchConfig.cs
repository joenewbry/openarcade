// MatchConfig.cs

using System;
using UnityEngine;

[Serializable]
public class PowerupWeightConfig
{
    public PowerupType type = PowerupType.Armor;
    [Min(0f)] public float weight = 1f;
}

[Serializable]
public class PowerupSpawnConfig
{
    [Min(0f)] public float initialDelaySeconds = 2f;
    [Min(0.1f)] public float minSpawnIntervalSeconds = 8f;
    [Min(0.1f)] public float maxSpawnIntervalSeconds = 13f;
    [Min(0f)] public float antiChainPickupLockoutSeconds = 5f;
    [Min(1)] public int maxConcurrentPickups = 2;
    public PowerupWeightConfig[] weights = new PowerupWeightConfig[]
    {
        new PowerupWeightConfig { type = PowerupType.Ricochet, weight = 1f },
        new PowerupWeightConfig { type = PowerupType.Armor, weight = 1.3f },
        new PowerupWeightConfig { type = PowerupType.BlockBuster, weight = 1f }
    };
}

[Serializable]
public class MatchConfig
{
    public int maxPlayers;
    public float matchDuration;
    public string mapName;
    public bool allowSpectators;
    public string[] allowedTankTypes;
    public PowerupSpawnConfig powerups = new PowerupSpawnConfig();
}
