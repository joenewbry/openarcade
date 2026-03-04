// EnemyTankAI.cs
// Patrol + chase AI with lightweight LOS checks and disengage rules.

using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class EnemyTankAI : MonoBehaviour
{
    private enum AiState
    {
        Patrol,
        Chase,
    }

    [Header("Patrol")]
    [SerializeField] private float moveSpeed = 3f;
    [SerializeField] private float chaseSpeedMultiplier = 1.1f;
    [SerializeField] private float rotationSpeed = 8f;
    [SerializeField] private float gridCellSize = 1f;
    [SerializeField] private int patrolRadiusInCells = 6;
    [SerializeField] private float waypointReachDistance = 0.15f;
    [SerializeField] private Vector2 dwellSecondsRange = new Vector2(0.4f, 1.1f);

    [Header("Collision")]
    [SerializeField] private float pathProbeHeight = 0.5f;
    [SerializeField] private float pathProbeRadius = 0.3f;
    [SerializeField] private float repathCooldownSeconds = 0.2f;

    [Header("Perception + Chase")]
    [SerializeField] private float detectionRange = 8f;
    [SerializeField] private float loseSightRange = 11f;
    [SerializeField] private float losCheckIntervalSeconds = 0.12f;
    [SerializeField] private float disengageAfterLostSeconds = 2.2f;
    [SerializeField] private float maxChaseDistanceFromOrigin = 14f;
    [SerializeField] private float chaseStopDistance = 1.2f;

    [Header("Player Interaction")]
    [SerializeField] private string playerTag = "Player";
    [SerializeField] private float playerHitImpulse = 2f;

    private const int MaxPatrolSamples = 20;
    private const int MaxChaseFallbackSamples = 10;
    private const float PlayerLookupIntervalSeconds = 0.5f;

    private readonly RaycastHit[] losHits = new RaycastHit[8];
    private readonly RaycastHit[] pathHits = new RaycastHit[8];
    private readonly Collider[] overlapHits = new Collider[16];

    private Rigidbody rb;
    private Transform playerTransform;

    private AiState state = AiState.Patrol;

    private Vector3 originCell;
    private Vector3 targetCell;
    private Vector3 lastKnownPlayerCell;

    private float nextRepathAllowedAt;
    private float dwellUntil;
    private float nextLosCheckAt;
    private float nextPlayerLookupAt;
    private float lastSeenPlayerAt = -9999f;

    private bool hasLineOfSight;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.constraints |= RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;

        originCell = SnapToGrid(transform.position);
        targetCell = originCell;
        lastKnownPlayerCell = originCell;
    }

    private void Start()
    {
        ChooseNextPatrolCell();
    }

    private void Update()
    {
        TryResolvePlayer();
        UpdatePerception();

        if (state == AiState.Patrol)
        {
            UpdatePatrolState();
            return;
        }

        UpdateChaseState();
    }

    private void FixedUpdate()
    {
        if (state == AiState.Patrol && Time.time < dwellUntil)
        {
            return;
        }

        Vector3 navTarget = state == AiState.Chase ? lastKnownPlayerCell : targetCell;
        MoveTowardsTarget(navTarget);
    }

    private void UpdatePatrolState()
    {
        if (Time.time < dwellUntil)
        {
            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);
            return;
        }

        if (Vector3.Distance(Flatten(transform.position), targetCell) <= waypointReachDistance)
        {
            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);
            dwellUntil = Time.time + Random.Range(dwellSecondsRange.x, dwellSecondsRange.y);
            ChooseNextPatrolCell();
        }

        if (hasLineOfSight && playerTransform != null)
        {
            float toPlayer = Vector3.Distance(Flatten(transform.position), Flatten(playerTransform.position));
            if (toPlayer <= detectionRange)
            {
                EnterChase();
            }
        }
    }

    private void UpdateChaseState()
    {
        if (ShouldDisengage())
        {
            ExitChase();
        }
    }

    private void MoveTowardsTarget(Vector3 worldTarget)
    {
        Vector3 current = Flatten(transform.position);
        Vector3 toTarget = worldTarget - current;

        if (toTarget.sqrMagnitude < 0.0001f)
        {
            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);
            return;
        }

        float distance = toTarget.magnitude;
        Vector3 moveDir = toTarget / distance;

        if (Time.time >= nextRepathAllowedAt && IsPathBlocked(moveDir))
        {
            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);
            nextRepathAllowedAt = Time.time + repathCooldownSeconds;

            if (state == AiState.Chase)
            {
                ChooseChaseFallbackCell();
            }
            else
            {
                ChooseNextPatrolCell();
            }

            return;
        }

        float speed = moveSpeed;
        if (state == AiState.Chase)
        {
            speed *= chaseSpeedMultiplier;
            if (distance <= chaseStopDistance)
            {
                speed = 0f;
            }
        }

        rb.velocity = new Vector3(moveDir.x * speed, rb.velocity.y, moveDir.z * speed);

        Vector3 lookDir = moveDir;
        if (state == AiState.Chase && playerTransform != null)
        {
            Vector3 toPlayer = Flatten(playerTransform.position) - current;
            if (toPlayer.sqrMagnitude > 0.01f)
            {
                lookDir = toPlayer.normalized;
            }
        }

        RotateTowards(lookDir);
    }

    private void RotateTowards(Vector3 lookDir)
    {
        if (lookDir.sqrMagnitude < 0.0001f)
        {
            return;
        }

        Quaternion targetRotation = Quaternion.LookRotation(lookDir, Vector3.up);
        rb.MoveRotation(Quaternion.Slerp(rb.rotation, targetRotation, rotationSpeed * Time.fixedDeltaTime));
    }

    private void UpdatePerception()
    {
        if (Time.time < nextLosCheckAt)
        {
            return;
        }

        nextLosCheckAt = Time.time + losCheckIntervalSeconds;

        if (playerTransform == null)
        {
            hasLineOfSight = false;
            return;
        }

        hasLineOfSight = HasLineOfSightToPlayer(out float distanceToPlayer);

        if (hasLineOfSight)
        {
            lastSeenPlayerAt = Time.time;
            if (distanceToPlayer <= loseSightRange)
            {
                lastKnownPlayerCell = SnapToGrid(playerTransform.position);
            }
        }
    }

    private void TryResolvePlayer()
    {
        if (playerTransform != null)
        {
            return;
        }

        if (Time.time < nextPlayerLookupAt)
        {
            return;
        }

        nextPlayerLookupAt = Time.time + PlayerLookupIntervalSeconds;
        GameObject player = GameObject.FindGameObjectWithTag(playerTag);
        if (player != null)
        {
            playerTransform = player.transform;
            lastKnownPlayerCell = SnapToGrid(playerTransform.position);
            lastSeenPlayerAt = Time.time;
        }
    }

    private void EnterChase()
    {
        state = AiState.Chase;
        dwellUntil = 0f;
        nextRepathAllowedAt = 0f;

        if (playerTransform != null)
        {
            lastKnownPlayerCell = SnapToGrid(playerTransform.position);
            lastSeenPlayerAt = Time.time;
        }
    }

    private void ExitChase()
    {
        state = AiState.Patrol;
        rb.velocity = new Vector3(0f, rb.velocity.y, 0f);
        dwellUntil = Time.time + Random.Range(dwellSecondsRange.x, dwellSecondsRange.y);
        ChooseNextPatrolCell();
    }

    private bool ShouldDisengage()
    {
        if (playerTransform == null)
        {
            return true;
        }

        if (Time.time - lastSeenPlayerAt > disengageAfterLostSeconds)
        {
            return true;
        }

        float distFromOrigin = Vector3.Distance(Flatten(transform.position), originCell);
        if (!hasLineOfSight && distFromOrigin > maxChaseDistanceFromOrigin)
        {
            return true;
        }

        return false;
    }

    private bool HasLineOfSightToPlayer(out float distanceToPlayer)
    {
        distanceToPlayer = float.PositiveInfinity;

        if (playerTransform == null)
        {
            return false;
        }

        Vector3 origin = transform.position + Vector3.up * pathProbeHeight;
        Vector3 target = playerTransform.position + Vector3.up * pathProbeHeight;
        Vector3 toTarget = target - origin;

        distanceToPlayer = toTarget.magnitude;
        if (distanceToPlayer <= 0.001f)
        {
            return true;
        }

        if (distanceToPlayer > loseSightRange)
        {
            return false;
        }

        Vector3 dir = toTarget / distanceToPlayer;
        int hitCount = Physics.RaycastNonAlloc(origin, dir, losHits, distanceToPlayer, ~0, QueryTriggerInteraction.Ignore);
        if (hitCount <= 0)
        {
            return false;
        }

        float closestDistance = float.MaxValue;
        Collider closestCollider = null;

        for (int i = 0; i < hitCount; i++)
        {
            Collider col = losHits[i].collider;
            if (col == null)
            {
                continue;
            }

            if (col.attachedRigidbody == rb || col.transform == transform || col.transform.IsChildOf(transform))
            {
                continue;
            }

            if (losHits[i].distance < closestDistance)
            {
                closestDistance = losHits[i].distance;
                closestCollider = col;
            }
        }

        if (closestCollider == null)
        {
            return false;
        }

        return IsPlayerCollider(closestCollider);
    }

    private bool IsPlayerCollider(Collider col)
    {
        if (col.CompareTag(playerTag))
        {
            return true;
        }

        if (playerTransform == null)
        {
            return false;
        }

        return col.transform == playerTransform || col.transform.IsChildOf(playerTransform);
    }

    private void OnCollisionEnter(Collision collision)
    {
        GameObject other = collision.gameObject;

        if (other.CompareTag("Block"))
        {
            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);

            if (state == AiState.Chase)
            {
                ChooseChaseFallbackCell();
            }
            else
            {
                ChooseNextPatrolCell();
            }

            return;
        }

        if (other.CompareTag(playerTag))
        {
            Vector3 away = (Flatten(transform.position) - Flatten(other.transform.position)).normalized;
            if (away.sqrMagnitude > 0.001f)
            {
                rb.AddForce(away * playerHitImpulse, ForceMode.Impulse);
            }

            rb.velocity = new Vector3(0f, rb.velocity.y, 0f);

            if (state == AiState.Chase)
            {
                lastSeenPlayerAt = Time.time;
                lastKnownPlayerCell = SnapToGrid(other.transform.position);
            }
            else
            {
                ChooseNextPatrolCell();
            }
        }
    }

    private void ChooseNextPatrolCell()
    {
        for (int i = 0; i < MaxPatrolSamples; i++)
        {
            int dx = Random.Range(-patrolRadiusInCells, patrolRadiusInCells + 1);
            int dz = Random.Range(-patrolRadiusInCells, patrolRadiusInCells + 1);

            if (dx == 0 && dz == 0)
            {
                continue;
            }

            Vector3 candidate = originCell + new Vector3(dx * gridCellSize, 0f, dz * gridCellSize);
            if (IsCellWalkable(candidate))
            {
                targetCell = candidate;
                return;
            }
        }

        targetCell = originCell;
    }

    private void ChooseChaseFallbackCell()
    {
        // When direct path is blocked during chase, pick a nearby offset around
        // the last seen player location to prevent jittering against obstacles.
        const int fallbackRadiusCells = 2;

        for (int i = 0; i < MaxChaseFallbackSamples; i++)
        {
            int dx = Random.Range(-fallbackRadiusCells, fallbackRadiusCells + 1);
            int dz = Random.Range(-fallbackRadiusCells, fallbackRadiusCells + 1);

            Vector3 candidate = lastKnownPlayerCell + new Vector3(dx * gridCellSize, 0f, dz * gridCellSize);
            if (IsCellWalkable(candidate))
            {
                lastKnownPlayerCell = candidate;
                return;
            }
        }
    }

    private bool IsPathBlocked(Vector3 moveDir)
    {
        float probeDistance = Mathf.Max(gridCellSize * 0.75f, 0.5f);
        Vector3 origin = transform.position + Vector3.up * pathProbeHeight;

        int hitCount = Physics.SphereCastNonAlloc(origin, pathProbeRadius, moveDir, pathHits, probeDistance, ~0, QueryTriggerInteraction.Ignore);
        for (int i = 0; i < hitCount; i++)
        {
            Collider hitCollider = pathHits[i].collider;
            if (hitCollider == null || hitCollider.attachedRigidbody == rb)
            {
                continue;
            }

            if (IsBlockingCollider(hitCollider))
            {
                return true;
            }
        }

        return false;
    }

    private bool IsCellWalkable(Vector3 worldCell)
    {
        Vector3 probeCenter = new Vector3(worldCell.x, transform.position.y + pathProbeHeight, worldCell.z);
        int overlapCount = Physics.OverlapSphereNonAlloc(probeCenter, pathProbeRadius, overlapHits, ~0, QueryTriggerInteraction.Ignore);

        for (int i = 0; i < overlapCount; i++)
        {
            Collider col = overlapHits[i];
            if (col == null || col.attachedRigidbody == rb)
            {
                continue;
            }

            if (IsBlockingCollider(col))
            {
                return false;
            }
        }

        return true;
    }

    private bool IsBlockingCollider(Collider col)
    {
        return col.CompareTag("Block") || col.CompareTag(playerTag);
    }

    private Vector3 SnapToGrid(Vector3 worldPosition)
    {
        float x = Mathf.Round(worldPosition.x / gridCellSize) * gridCellSize;
        float z = Mathf.Round(worldPosition.z / gridCellSize) * gridCellSize;
        return new Vector3(x, 0f, z);
    }

    private static Vector3 Flatten(Vector3 value)
    {
        return new Vector3(value.x, 0f, value.z);
    }
}
