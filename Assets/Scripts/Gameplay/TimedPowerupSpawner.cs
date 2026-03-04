// TimedPowerupSpawner.cs
// PM3 power-up spawn director with weighted timed spawns and anti-hoarding gating.

using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class TimedPowerupSpawnRule
{
    public PowerupType type = PowerupType.Armor;
    public GameObject pickupPrefab;
    [Min(0f)] public float weight = 1f;
    [Min(1)] public int maxConcurrent = 1;
    [Min(0f)] public float perTypeCooldownSeconds = 18f;

    [NonSerialized] public float nextEligibleSpawnAt;
}

public class TimedPowerupSpawner : MonoBehaviour
{
    [Header("Spawn Timing")]
    [SerializeField, Min(0f)] private float initialDelaySeconds = 2f;
    [SerializeField, Min(0.1f)] private float minSpawnIntervalSeconds = 8f;
    [SerializeField, Min(0.1f)] private float maxSpawnIntervalSeconds = 13f;
    [SerializeField, Min(0.05f)] private float retryIntervalSeconds = 1f;

    [Header("Spawn Limits")]
    [SerializeField, Min(1)] private int maxConcurrentPickups = 2;
    [SerializeField, Min(0f)] private float minDistanceFromTanks = 4f;
    [SerializeField, Min(0f)] private float minDistanceFromOtherPickups = 2f;

    [Header("Spawn Locations")]
    [SerializeField] private Transform[] spawnPoints;
    [SerializeField] private bool allowRandomFallback = true;
    [SerializeField] private Vector2 randomSpawnHalfExtents = new Vector2(12f, 8f);

    [Header("Anti-Hoarding")]
    [SerializeField] private bool suppressWhenNoEligibleCollectors = true;

    [Header("Weighted Rules")]
    [SerializeField] private List<TimedPowerupSpawnRule> spawnRules = new List<TimedPowerupSpawnRule>();

    private struct SpawnedPickupRecord
    {
        public PowerupType Type;
        public GameObject Instance;
    }

    private readonly List<SpawnedPickupRecord> activePickups = new List<SpawnedPickupRecord>();
    private readonly List<TimedPowerupSpawnRule> weightedCandidates = new List<TimedPowerupSpawnRule>();

    private float nextSpawnAt;

    private void Start()
    {
        nextSpawnAt = Time.time + Mathf.Max(0f, initialDelaySeconds);

        for (int i = 0; i < spawnRules.Count; i++)
        {
            if (spawnRules[i] != null)
            {
                spawnRules[i].nextEligibleSpawnAt = 0f;
            }
        }
    }

    private void Update()
    {
        CleanupDestroyedPickups();

        float nowSeconds = Time.time;
        if (nowSeconds < nextSpawnAt)
        {
            return;
        }

        if (activePickups.Count >= Mathf.Max(1, maxConcurrentPickups))
        {
            ScheduleRetry(nowSeconds);
            return;
        }

        if (!TryChooseSpawnRule(nowSeconds, out TimedPowerupSpawnRule rule))
        {
            ScheduleRetry(nowSeconds);
            return;
        }

        if (!TryPickSpawnPosition(out Vector3 spawnPosition))
        {
            ScheduleRetry(nowSeconds);
            return;
        }

        GameObject spawnedPickup = Instantiate(rule.pickupPrefab, spawnPosition, Quaternion.identity, transform);
        activePickups.Add(new SpawnedPickupRecord
        {
            Type = rule.type,
            Instance = spawnedPickup
        });

        rule.nextEligibleSpawnAt = nowSeconds + Mathf.Max(0f, rule.perTypeCooldownSeconds);
        ScheduleNextSpawn(nowSeconds);
    }

    private void CleanupDestroyedPickups()
    {
        for (int i = activePickups.Count - 1; i >= 0; i--)
        {
            if (activePickups[i].Instance == null)
            {
                activePickups.RemoveAt(i);
            }
        }
    }

    private bool TryChooseSpawnRule(float nowSeconds, out TimedPowerupSpawnRule chosenRule)
    {
        chosenRule = null;
        weightedCandidates.Clear();

        float totalWeight = 0f;

        for (int i = 0; i < spawnRules.Count; i++)
        {
            TimedPowerupSpawnRule rule = spawnRules[i];
            if (rule == null)
            {
                continue;
            }

            if (rule.pickupPrefab == null || rule.weight <= 0f)
            {
                continue;
            }

            if (nowSeconds < rule.nextEligibleSpawnAt)
            {
                continue;
            }

            int activeForType = GetActivePickupCount(rule.type);
            if (activeForType >= Mathf.Max(1, rule.maxConcurrent))
            {
                continue;
            }

            if (suppressWhenNoEligibleCollectors && !HasEligibleCollector(rule.type, nowSeconds))
            {
                continue;
            }

            totalWeight += rule.weight;
            weightedCandidates.Add(rule);
        }

        if (weightedCandidates.Count == 0 || totalWeight <= 0f)
        {
            return false;
        }

        float roll = UnityEngine.Random.value * totalWeight;
        for (int i = 0; i < weightedCandidates.Count; i++)
        {
            TimedPowerupSpawnRule candidate = weightedCandidates[i];
            roll -= candidate.weight;
            if (roll <= 0f)
            {
                chosenRule = candidate;
                return true;
            }
        }

        chosenRule = weightedCandidates[weightedCandidates.Count - 1];
        return true;
    }

    private int GetActivePickupCount(PowerupType type)
    {
        int count = 0;
        for (int i = 0; i < activePickups.Count; i++)
        {
            if (activePickups[i].Type == type)
            {
                count += 1;
            }
        }

        return count;
    }

    private bool HasEligibleCollector(PowerupType type, float nowSeconds)
    {
        TankControllerBase[] tanks = FindObjectsOfType<TankControllerBase>();
        if (tanks == null || tanks.Length == 0)
        {
            return true;
        }

        for (int i = 0; i < tanks.Length; i++)
        {
            if (PowerupSpawnEligibility.CanTankReceivePowerup(tanks[i], type, nowSeconds))
            {
                return true;
            }
        }

        return false;
    }

    private bool TryPickSpawnPosition(out Vector3 spawnPosition)
    {
        spawnPosition = Vector3.zero;

        if (spawnPoints != null && spawnPoints.Length > 0)
        {
            int start = UnityEngine.Random.Range(0, spawnPoints.Length);
            for (int offset = 0; offset < spawnPoints.Length; offset++)
            {
                Transform point = spawnPoints[(start + offset) % spawnPoints.Length];
                if (point == null)
                {
                    continue;
                }

                Vector3 candidate = point.position;
                if (IsSpawnPositionValid(candidate))
                {
                    spawnPosition = candidate;
                    return true;
                }
            }
        }

        if (!allowRandomFallback)
        {
            return false;
        }

        for (int attempt = 0; attempt < 16; attempt++)
        {
            Vector3 center = transform.position;
            Vector3 candidate = new Vector3(
                center.x + UnityEngine.Random.Range(-randomSpawnHalfExtents.x, randomSpawnHalfExtents.x),
                center.y,
                center.z + UnityEngine.Random.Range(-randomSpawnHalfExtents.y, randomSpawnHalfExtents.y));

            if (IsSpawnPositionValid(candidate))
            {
                spawnPosition = candidate;
                return true;
            }
        }

        return false;
    }

    private bool IsSpawnPositionValid(Vector3 candidate)
    {
        float minPickupSqr = minDistanceFromOtherPickups * minDistanceFromOtherPickups;
        for (int i = 0; i < activePickups.Count; i++)
        {
            GameObject pickup = activePickups[i].Instance;
            if (pickup == null)
            {
                continue;
            }

            if ((pickup.transform.position - candidate).sqrMagnitude < minPickupSqr)
            {
                return false;
            }
        }

        float minTankSqr = minDistanceFromTanks * minDistanceFromTanks;
        TankControllerBase[] tanks = FindObjectsOfType<TankControllerBase>();
        for (int i = 0; i < tanks.Length; i++)
        {
            if ((tanks[i].transform.position - candidate).sqrMagnitude < minTankSqr)
            {
                return false;
            }
        }

        return true;
    }

    private void ScheduleRetry(float nowSeconds)
    {
        nextSpawnAt = nowSeconds + Mathf.Max(0.05f, retryIntervalSeconds);
    }

    private void ScheduleNextSpawn(float nowSeconds)
    {
        float minSeconds = Mathf.Min(minSpawnIntervalSeconds, maxSpawnIntervalSeconds);
        float maxSeconds = Mathf.Max(minSpawnIntervalSeconds, maxSpawnIntervalSeconds);
        float interval = UnityEngine.Random.Range(minSeconds, maxSeconds);
        nextSpawnAt = nowSeconds + Mathf.Max(0.05f, interval);
    }
}
