// EnemyTankAI.cs
// Grid-based random patrol AI with basic collision handling for blocks and player.

using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class EnemyTankAI : MonoBehaviour
{
    [Header("Patrol")]
    [SerializeField] private float moveSpeed = 3f;
    [SerializeField] private float rotationSpeed = 8f;
    [SerializeField] private float gridCellSize = 1f;
    [SerializeField] private int patrolRadiusInCells = 6;
    [SerializeField] private float waypointReachDistance = 0.15f;
    [SerializeField] private Vector2 dwellSecondsRange = new Vector2(0.4f, 1.1f);

    [Header("Collision")]
    [SerializeField] private float pathProbeHeight = 0.5f;
    [SerializeField] private float pathProbeRadius = 0.3f;
    [SerializeField] private float repathCooldownSeconds = 0.2f;

    [Header("Player Interaction")]
    [SerializeField] private string playerTag = "Player";
    [SerializeField] private float playerHitImpulse = 2f;

    private Rigidbody rb;
    private Vector3 originCell;
    private Vector3 targetCell;
    private float nextRepathAllowedAt;
    private float dwellUntil;

    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        rb.constraints |= RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;

        originCell = SnapToGrid(transform.position);
        targetCell = originCell;
    }

    private void Start()
    {
        ChooseNextPatrolCell();
    }

    private void Update()
    {
        if (Time.time < dwellUntil)
        {
            rb.velocity = Vector3.zero;
            return;
        }

        if (Vector3.Distance(Flatten(transform.position), targetCell) <= waypointReachDistance)
        {
            rb.velocity = Vector3.zero;
            dwellUntil = Time.time + Random.Range(dwellSecondsRange.x, dwellSecondsRange.y);
            ChooseNextPatrolCell();
        }
    }

    private void FixedUpdate()
    {
        if (Time.time < dwellUntil)
        {
            return;
        }

        Vector3 current = Flatten(transform.position);
        Vector3 toTarget = targetCell - current;

        if (toTarget.sqrMagnitude < 0.0001f)
        {
            rb.velocity = Vector3.zero;
            return;
        }

        Vector3 moveDir = toTarget.normalized;

        // Lightweight probe so AI doesn't keep driving directly into blocks.
        if (Time.time >= nextRepathAllowedAt && IsPathBlocked(moveDir))
        {
            rb.velocity = Vector3.zero;
            nextRepathAllowedAt = Time.time + repathCooldownSeconds;
            ChooseNextPatrolCell();
            return;
        }

        rb.velocity = new Vector3(moveDir.x * moveSpeed, rb.velocity.y, moveDir.z * moveSpeed);

        Quaternion targetRotation = Quaternion.LookRotation(moveDir, Vector3.up);
        rb.MoveRotation(Quaternion.Slerp(rb.rotation, targetRotation, rotationSpeed * Time.fixedDeltaTime));
    }

    private void OnCollisionEnter(Collision collision)
    {
        GameObject other = collision.gameObject;

        if (other.CompareTag("Block"))
        {
            // Basic block collision response: stop and pick a new cell.
            rb.velocity = Vector3.zero;
            ChooseNextPatrolCell();
            return;
        }

        if (other.CompareTag(playerTag))
        {
            // Basic player collision response: brief bounce + repath.
            Vector3 away = (Flatten(transform.position) - Flatten(other.transform.position)).normalized;
            if (away.sqrMagnitude > 0.001f)
            {
                rb.AddForce(away * playerHitImpulse, ForceMode.Impulse);
            }

            rb.velocity = Vector3.zero;
            ChooseNextPatrolCell();
        }
    }

    private bool IsPathBlocked(Vector3 moveDir)
    {
        float probeDistance = Mathf.Max(gridCellSize * 0.75f, 0.5f);
        Vector3 origin = transform.position + Vector3.up * pathProbeHeight;

        RaycastHit[] hits = Physics.SphereCastAll(origin, pathProbeRadius, moveDir, probeDistance, ~0, QueryTriggerInteraction.Ignore);
        for (int i = 0; i < hits.Length; i++)
        {
            Collider hitCollider = hits[i].collider;
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

    private void ChooseNextPatrolCell()
    {
        const int maxAttempts = 20;

        for (int i = 0; i < maxAttempts; i++)
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

        // Fallback if all sampled cells look blocked.
        targetCell = originCell;
    }

    private bool IsCellWalkable(Vector3 worldCell)
    {
        Vector3 probeCenter = new Vector3(worldCell.x, transform.position.y + pathProbeHeight, worldCell.z);
        Collider[] overlaps = Physics.OverlapSphere(probeCenter, pathProbeRadius, ~0, QueryTriggerInteraction.Ignore);

        for (int i = 0; i < overlaps.Length; i++)
        {
            Collider col = overlaps[i];
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
